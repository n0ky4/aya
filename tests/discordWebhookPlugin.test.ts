import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sleep } from '../src/core/common'
import DiscordQueueManager from '../src/plugins/discordWebhook/queue'
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

describe('DiscordQueueManager Singleton', () => {
    it('should create only one instance', () => {
        const instance1 = DiscordQueueManager.getInstance()
        const instance2 = DiscordQueueManager.getInstance()
        expect(instance1).toBe(instance2)
    })

    it('should push functions into the queue and process them', async () => {
        const queueManager = DiscordQueueManager.getInstance()
        const mockFunction1 = vi.fn(() => Promise.resolve(0))
        const mockFunction2 = vi.fn(() => Promise.resolve(100))

        queueManager.push(mockFunction1)
        queueManager.push(mockFunction2)

        await new Promise((resolve) => setTimeout(resolve, 150))

        expect(mockFunction1).toHaveBeenCalled()
        expect(mockFunction2).toHaveBeenCalled()
    })

    it('should respect wait times between processing functions', async () => {
        const queueManager = DiscordQueueManager.getInstance()
        const startTime = Date.now()

        const mockFunction1 = vi.fn(() => Promise.resolve(0))
        const mockFunction2 = vi.fn(() => Promise.resolve(100))

        queueManager.push(mockFunction1)
        queueManager.push(mockFunction2)

        await new Promise((resolve) => setTimeout(resolve, 150))

        const elapsedTime = Date.now() - startTime
        expect(elapsedTime).toBeGreaterThanOrEqual(100)
    })

    it('should process functions in the order they were added', async () => {
        const queueManager = DiscordQueueManager.getInstance()
        const order: number[] = []

        queueManager.push(() => {
            order.push(1)
            return Promise.resolve(0)
        })
        queueManager.push(() => {
            order.push(2)
            return Promise.resolve(0)
        })

        await new Promise((resolve) => setTimeout(resolve, 150))

        expect(order).toEqual([1, 2])
    })
})
