import { beforeEach, describe, expect, it, vi } from 'vitest'
import Logger from '../src'
import LoggerPlugin from '../src/core/plugin'

describe('Logger', () => {
    let logger: Logger
    beforeEach(() => {
        logger = new Logger()
    })

    describe('filterSpecialMessages', () => {
        it('should filter out special messages', () => {
            logger['addSpecialMessage']('special message')

            const messages = ['normal message', logger['getSpecialMessage']('special message')]
            const filteredMessages = logger['filterSpecialMessages'](messages)

            expect(filteredMessages).toEqual(['normal message'])
        })
    })

    describe('parseMessage', () => {
        it('should parse and format messages correctly', () => {
            const messages = ['message', { key: 'value' }]
            const parsedMessage = logger['parseMessage'](messages)
            expect(parsedMessage).toContain('message')
            expect(parsedMessage).toContain('key: ')
            expect(parsedMessage).toContain('value')
            expect(parsedMessage).toContain('{ ')
            expect(parsedMessage).toContain(' }')
        })
    })

    describe('use', () => {
        it('should apply a plugin correctly', () => {
            class TestPlugin extends LoggerPlugin {
                name = 'TestPlugin'
                init(): Logger {
                    if (!this.logger) throw new Error('Logger not initialized')
                    console.log('Hello from TestPlugin')
                    return this.logger
                }
            }

            const plugin = new TestPlugin()
            const spy = vi.spyOn(plugin, 'apply')

            logger.use(plugin)

            expect(spy).toHaveBeenCalled()
            expect(logger['plugins']).toContain(plugin)
        })

        it('should throw an error if plugin is not an instance of LoggerPlugin', () => {
            expect(() => logger.use({} as LoggerPlugin)).toThrow(TypeError)
        })
    })
})
