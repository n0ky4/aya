import { beforeEach, describe, expect, it, vi } from 'vitest'
import Logger from '../src'
import { __LOG_INTERNAL__ } from '../src/core/common'
import LoggerPlugin from '../src/core/plugin'

describe('Logger', () => {
    let logger: Logger
    beforeEach(() => {
        logger = new Logger()
    })

    describe('filterSpecialMessages', () => {
        it('should filter out special messages', () => {
            const messages = ['normal message', __LOG_INTERNAL__.specialMessagesKeys[0]]
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
                constructor() {
                    super({
                        name: 'TestPlugin'
                    })
                }

                init(): Logger {
                    if (!this.logger) throw new Error('Logger not initialized')
                    console.log('Hello from TestPlugin')
                    return this.logger
                }
            }

            const plugin = new TestPlugin()
            const spy = vi.spyOn(plugin, 'apply')

            logger.use(plugin)
            expect(spy).toHaveBeenCalledWith(logger)
        })

        it('should throw an error if plugin is not an instance of LoggerPlugin', () => {
            expect(() => logger.use({} as LoggerPlugin)).toThrow(TypeError)
        })
    })
})
