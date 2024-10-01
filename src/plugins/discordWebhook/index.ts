import { choose, l, tryToRemovePrefixDelimiters } from '@/core/common.js'
import LoggerPlugin from '@/core/plugin.js'
import axios from 'axios'
import { inspect } from 'node:util'
import Logger from '../..'
import { discordWebhookOptionsSchema } from './options'
import QueueManager from './queue'
import {
    DiscordWebhookOptions,
    EmbedModelType,
    EmbedType,
    InferedDiscordWebhookOptions
} from './types'

export const GLOBAL_INTERVAL = 1000

// add a global queue manager, because maybe the user wants to use multiple logger instances,
// and if we create a new queue manager for each instance, we could get rate limited by Discord api
const queueManager = new QueueManager(GLOBAL_INTERVAL)

interface BatchedMessage {
    level: string
    messages: unknown[]
}

export class DiscordWebhookPlugin extends LoggerPlugin {
    name: string = 'DiscordWebhook'

    private settings: DiscordWebhookOptions
    private enabled = true
    private enabledLevels: string[] = []
    private qmanager: QueueManager
    private batchMessages: BatchedMessage[] = []

    private processing = false
    private processingInterval: NodeJS.Timeout | null = null

    // add a special message to the logger to prevent logging to Discord.
    // it's useful to avoid infinite loops when an error ocurred in this Discord plugin.
    private doNotLogSpecialMessage = 'doNotSendToDiscord'
    private smkey: string = ''

    private internalSettings = this.exposedMethods.getInternalSettings()

    constructor(settings: InferedDiscordWebhookOptions, queueManager: QueueManager) {
        super()
        this.qmanager = queueManager
        this.settings = settings
    }

    private setup = () => {
        l.info('DiscordWebhookPlugin created')
        this.exposedMethods.addSpecialMessage(this.doNotLogSpecialMessage)
        this.smkey = this.exposedMethods.getSpecialMessage(this.doNotLogSpecialMessage)

        if (!this.settings.levels || !this.settings.levels.length) {
            this.logger.error(
                this.internalSettings.internalPrefix,
                'No levels specified in Discord plugin, disabling it'
            )
            this.enabled = false
            return
        }

        if (this.settings.levels.includes('warn')) this.enabledLevels.push('warn')
        if (this.settings.levels.includes('error')) this.enabledLevels.push('error')

        l.info('Enabled levels:', this.enabledLevels)

        this.processingInterval = setInterval(() => this.processBatchMessages(), GLOBAL_INTERVAL)
    }

    private getAvatar = (): string | undefined => {
        if (!this.settings.avatarUrl) return undefined
        if (typeof this.settings.avatarUrl === 'string') return this.settings.avatarUrl
        return choose(this.settings.avatarUrl) || undefined
    }

    private shouldLog = (messages: unknown[]): boolean => {
        return !this.exposedMethods.hasSpecialMessage(this.doNotLogSpecialMessage, messages)
    }

    private getCommonSettings = () => {
        return {
            logger: this.logger,
            url: this.settings.url,
            username:
                this.settings.username ||
                tryToRemovePrefixDelimiters(this.exposedMethods.getConfig().prefix)
        }
    }

    private disableWebhook = () => {
        if (!this.enabled) return

        this.logger.error(
            this.internalSettings.internalPrefix,
            'Invalid Discord webhook URL, disabling plugin',
            this.smkey
        )
        this.enabled = false
    }

    private getWarnEmbedModel = (): EmbedModelType => ({
        title:
            this.settings?.labels?.warn ||
            discordWebhookOptionsSchema.shape.labels._def.defaultValue().warn,
        color:
            this.settings?.colors?.warn ||
            discordWebhookOptionsSchema.shape.colors._def.defaultValue().warn
    })

    private getErrorEmbedModel = (): EmbedModelType => ({
        title:
            this.settings?.labels?.error ||
            discordWebhookOptionsSchema.shape.labels._def.defaultValue().error,
        color:
            this.settings?.colors?.error ||
            discordWebhookOptionsSchema.shape.colors._def.defaultValue().error
    })

    private processMessages = (embedModel: EmbedModelType, messages: unknown[]): EmbedType[] => {
        const embeds: EmbedType[] = []
        let msgs = messages
            .map((msg) => {
                if (!this.internalSettings.excludeInspectTypes.includes(typeof msg)) {
                    const inspected = inspect(msg)
                    msg = typeof msg === 'object' ? ['```json', inspected, '```'].join('\n') : msg
                }
                return msg as string
            })
            .join(' ')
            .replaceAll('\n ', '\n')
            .trim()

        while (msgs.length > 0) {
            const currentDescription = msgs.substring(0, 4096 - 50)
            embeds.push({
                ...embedModel,
                description: currentDescription,
                timestamp: new Date().toISOString()
            })
            msgs = msgs.substring(4096 - 50)
        }

        return embeds
    }

    private sendEmbedGroup = async (embedGroup: EmbedType[]) => {
        return new Promise<void>((resolve, reject) => {
            if (!this.enabled) return reject()
            const { url, username } = this.getCommonSettings()
            const avatarUrl = this.getAvatar()

            axios
                .post(url, {
                    username,
                    avatar_url: avatarUrl,
                    embeds: embedGroup
                })
                .then((res) => {
                    const { status, statusText } = res

                    if (status >= 200 && status < 300) return resolve()

                    throw new Error(`${status} ${statusText}`)
                })
                .catch((err) => {
                    const res = err?.response
                    if (!res) return reject(err.message || 'NO_RESPONSE')

                    const { status, statusText } = res
                    const { data } = res

                    if (status === 400 || status === 404) return reject('INVALID_URL')

                    reject(`${status} ${statusText} - ${data}`)
                })
        })
    }

    private batchMessage = (level: string, messages: unknown[]) => {
        l.info('Batching message...')
        if (!this.enabled) return

        if (!this.processingInterval) {
            this.processingInterval = setInterval(
                () => this.processBatchMessages(),
                GLOBAL_INTERVAL
            )
            this.processBatchMessages()
        }

        this.batchMessages.push({ level, messages })
    }

    private getEmbedChunks = (embeds: EmbedType[], chunkSize: number): EmbedType[][] => {
        const chunks = []
        while (embeds.length > 0) {
            chunks.push(embeds.splice(0, chunkSize))
        }
        return chunks
    }

    private disableInterval = () => {
        if (this.processingInterval) {
            clearInterval(this.processingInterval)
            this.processingInterval = null
        }
    }

    private processBatchMessages = () => {
        if (this.processing) return
        this.processing = true

        const stopProcessing = () => {
            this.processing = false
            return this.disableInterval()
        }

        if (!this.enabled || this.batchMessages.length === 0) return stopProcessing()

        const embeds: EmbedType[] = []

        while (embeds.length < 10 && this.batchMessages.length > 0) {
            const msg = this.batchMessages.shift()
            if (!msg) continue

            const { level, messages } = msg

            const embedModel =
                level === 'warn' ? this.getWarnEmbedModel() : this.getErrorEmbedModel()
            const embedGroup = this.processMessages(embedModel, messages)
            embeds.push(...embedGroup)
        }

        if (embeds.length === 0) return stopProcessing()

        const chunks = this.getEmbedChunks(embeds, 10)

        this.qmanager.push(() =>
            Promise.all(chunks.map((chunk) => this.sendEmbedGroup(chunk)))
                .then(() => GLOBAL_INTERVAL)
                .catch((err) => {
                    switch (err) {
                        case 'NO_RESPONSE':
                            this.logger.error(
                                this.internalSettings.internalPrefix,
                                'Could not send Discord webhook: No response',
                                this.smkey
                            )
                            return 0
                        case 'INVALID_URL':
                            this.disableWebhook()
                            return 0
                    }

                    if (this.enabled)
                        this.logger.error(
                            this.internalSettings.internalPrefix,
                            'Could not send Discord webhook',
                            this.smkey,
                            err
                        )

                    return 0
                })
        )

        l.info('Batch messages processed')
        return stopProcessing()
    }

    // when this is called, the this.logger and this.exposedMethods are already set
    protected init(): Logger {
        this.setup()

        if (!this.enabled) return this.logger

        if (this.settings.showLoadMessage)
            this.logger.info(this.internalSettings.internalPrefix, 'Discord plugin initialized!')

        if (this.enabledLevels.includes('warn')) {
            this.logger.onWarn((msgs) => {
                if (!this.shouldLog(msgs)) return
                l.info('got warn')
                this.batchMessage('warn', msgs)
            })
        }

        if (this.enabledLevels.includes('error')) {
            this.logger.onError((msgs) => {
                if (!this.shouldLog(msgs)) return
                l.info('got error')
                this.batchMessage('error', msgs)
            })
        }

        return this.logger
    }
}

export const discordWebhook = (options: DiscordWebhookOptions) => {
    const settings = discordWebhookOptionsSchema.parse(options)
    return new DiscordWebhookPlugin(settings, queueManager)
}
