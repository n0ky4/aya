import { choose, l, tryToRemovePrefixDelimiters } from '@/core/common.js'
import LoggerPlugin from '@/core/plugin.js'
import { MessageType } from '@/core/types'
import { inspect } from 'node:util'
import Logger, { InternalSettings } from '../..'
import { DEFAULT_DISCORD_WEBHOOK_OPTIONS, discordWebhookOptionsSchema } from './options'
import DiscordQueueManager from './queue'
import {
    DiscordWebhookOptions,
    EmbedModelType,
    EmbedType,
    InferedDiscordWebhookOptions
} from './types'

interface BatchedMessage {
    level: string
    messages: MessageType[]
}

export const GLOBAL_INTERVAL = 1000

export class DiscordWebhookPlugin extends LoggerPlugin {
    name: string = 'DiscordWebhook'

    private settings: DiscordWebhookOptions
    private enabled = true
    private enabledLevels: string[] = []
    private qmanager: DiscordQueueManager
    private batchMessages: BatchedMessage[] = []

    private processing = false
    private processingInterval: NodeJS.Timeout | null = null

    // add a special message to the logger to prevent logging to Discord.
    // it's useful to avoid infinite loops when an error ocurred in this Discord plugin.
    private doNotLogSpecialMessage = 'doNotSendToDiscord'
    private smkey: string = ''

    private internalSettings!: InternalSettings

    constructor(settings: InferedDiscordWebhookOptions, queueManager: DiscordQueueManager) {
        super()
        this.qmanager = queueManager
        this.settings = settings
    }

    private isValidColor = (color: number): boolean => {
        return !isNaN(color) && color >= 0 && color <= 0xffffff
    }

    private parseColor = (color: string | number): number => {
        if (typeof color === 'number') return color

        let parsed
        if (color.startsWith('#')) parsed = parseInt(color.slice(1), 16)
        else parsed = parseInt(color, 16)

        return this.isValidColor(parsed) ? parsed : 0x000000
    }

    private getColor = (color: 'warn' | 'error'): number => {
        const colorValue =
            this.settings.colors?.[color] ||
            discordWebhookOptionsSchema.shape.colors._def.defaultValue()[color] ||
            0

        return this.parseColor(colorValue)
    }

    private setup = () => {
        l.info('DiscordWebhookPlugin created')

        this.internalSettings = this.exm.internal()
        this.exm.addSpecialMessage(this.doNotLogSpecialMessage)
        this.smkey = this.exm.getSpecialMessage(this.doNotLogSpecialMessage)

        if (!this.settings.levels || !this.settings.levels.length) {
            this.logger.error(this.exm.pfx(), 'No levels specified in Discord plugin, disabling it')
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

    private shouldLog = (messages: MessageType[]): boolean => {
        return !this.exm.hasSpecialMessage(this.doNotLogSpecialMessage, messages)
    }

    private getCommonSettings = () => {
        return {
            logger: this.logger,
            url: this.settings.url,
            username:
                this.settings.username || tryToRemovePrefixDelimiters(this.exm.config().prefix)
        }
    }

    private disableWebhook = () => {
        if (!this.enabled) return

        this.logger.error(
            this.exm.pfx(),
            'Invalid Discord webhook URL, disabling plugin',
            this.smkey
        )
        this.enabled = false
    }

    private getWarnEmbedModel = (): EmbedModelType => ({
        title: this.settings?.labels?.warn || DEFAULT_DISCORD_WEBHOOK_OPTIONS.labels.warn,
        color: this.getColor('warn')
    })

    private getErrorEmbedModel = (): EmbedModelType => ({
        title: this.settings?.labels?.error || DEFAULT_DISCORD_WEBHOOK_OPTIONS.labels.error,
        color: this.getColor('error')
    })

    private processMessages = (
        embedModel: EmbedModelType,
        messages: MessageType[]
    ): EmbedType[] => {
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

            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    avatar_url: avatarUrl,
                    embeds: embedGroup
                })
            })
                .then(async (res) => {
                    const { status, statusText } = res

                    if (status >= 200 && status < 300) return resolve()

                    const errorText = await res.text()
                    throw new Error(`${status} ${statusText} - ${errorText}`)
                })
                .catch((err) => {
                    const error = err?.message || 'NO_RESPONSE'

                    if (error.includes('400') || error.includes('404')) {
                        return reject('INVALID_URL')
                    }

                    return reject(error)
                })
        })
    }

    private batchMessage = (level: string, messages: MessageType[]) => {
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
        }

        if (!this.enabled) return stopProcessing()

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
                            this.exm.pfx(),
                            'Could not send Discord webhook',
                            this.smkey,
                            err
                        )

                    return 0
                })
        )

        stopProcessing()

        if (this.batchMessages.length === 0) this.disableInterval()
    }

    // when this is called, the this.logger and this.exm are already set
    protected init(): Logger {
        this.setup()

        if (!this.enabled) return this.logger

        if (this.settings.showLoadMessage)
            this.logger.info(this.exm.pfx(), 'Discord plugin initialized!')

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
    const queueManager = DiscordQueueManager.getInstance()
    return new DiscordWebhookPlugin(settings, queueManager)
}
