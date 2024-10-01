import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sleep } from '../src/core/common'
import Logger from './../src/index'
import { discordWebhook, DiscordWebhookPlugin } from './../src/plugins/discordWebhook'
import { DiscordWebhookOptions } from './../src/plugins/discordWebhook/types'

describe('DiscordWebhookPlugin', () => {
    let logger: Logger
    let settings: DiscordWebhookOptions

    beforeEach(() => {
        settings = {
            url: 'https://discord.com/api/webhooks/1234567890/ABCDEFGHIJKLMN',
            levels: ['warn', 'error'],
            username: 'TestBot',
            avatarUrl: 'https://example.com/avatar.png',
            showLoadMessage: true
        }
        logger = new Logger()
    })

    const getPlugin = () => logger['plugins'][0] as unknown as DiscordWebhookPlugin

    it('should initialize correctly using logger.use with valid settings', () => {
        logger.use(discordWebhook(settings))

        const plugin = getPlugin()

        expect(plugin['enabled']).toBe(true)
        expect(plugin['enabledLevels']).toContain('warn')
        expect(plugin['enabledLevels']).toContain('error')
    })

    it('should disable plugin if no levels are specified', () => {
        const emptySettings = { ...settings, levels: [] }
        logger.use(discordWebhook(emptySettings))

        const plugin = getPlugin()
        expect(plugin['enabled']).toBe(false)
    })

    it('should batch messages on warn event', () => {
        logger.use(discordWebhook(settings))

        const plugin = getPlugin()
        const batchMessageSpy = vi.spyOn(plugin as any, 'batchMessage')

        logger.warn(['Warning message'])

        expect(batchMessageSpy).toHaveBeenCalled()
        expect(plugin['batchMessages'].length).toBe(1)
    })

    it('should batch messages on error event', () => {
        logger.use(discordWebhook(settings))

        const plugin = getPlugin()
        const batchMessageSpy = vi.spyOn(plugin as any, 'batchMessage')

        logger.error('Error message')
        logger.error('Error message')
        logger.error('Error message')

        expect(batchMessageSpy).toHaveBeenCalled()
        expect(plugin['batchMessages'].length).toBe(3)
    })

    it('should process batch messages correctly', async () => {
        logger.use(discordWebhook(settings))

        const plugin = getPlugin()
        const processBatchMessagesSpy = vi.spyOn(plugin as any, 'processBatchMessages')

        plugin['batchMessage']('warn', ['Test message'])
        await plugin['processBatchMessages']()

        expect(processBatchMessagesSpy).toHaveBeenCalled()
    })

    it('should disable webhook on invalid URL', async () => {
        logger.use(discordWebhook(settings))

        const plugin = getPlugin()
        const spy = vi.spyOn(plugin as any, 'disableWebhook')

        logger.error('Test error message')

        await sleep(2000)

        expect(plugin['enabled']).toBe(false)
        expect(spy).toHaveBeenCalled()
    })

    it('should handle successful embed sending', async () => {
        logger.use(discordWebhook(settings))

        const plugin = getPlugin()
        const sendEmbedGroupSpy = vi
            .spyOn(plugin as any, 'sendEmbedGroup')
            .mockResolvedValue(undefined)

        const result = await plugin['sendEmbedGroup']([])

        expect(sendEmbedGroupSpy).toHaveBeenCalled()
        expect(result).toBeUndefined()
    })
})
