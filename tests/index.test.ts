import { beforeEach, describe, expect, it, vi } from 'vitest'
import Logger from '../src'
import LoggerPlugin from '../src/core/plugin'
import { AyaMessage } from '../src/core/types'

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

    describe('is aya message', () => {
        it('should return true for a valid AyaMessage', () => {
            const validMessage: AyaMessage = {
                ayaMsg: 'Hello, World!',
                fgColor: 'red',
                underline: true,
                bold: true
            }

            expect(logger['isAyaMessage'](validMessage)).toBe(true)
        })

        it('should return false for a message without ayaMsg', () => {
            const invalidMessage = {
                fgColor: 'red',
                bgColor: 'blue',
                bold: true
            }

            expect(logger['isAyaMessage'](invalidMessage)).toBe(false)
        })

        it('should return false for a non-object message', () => {
            expect(logger['isAyaMessage']('not an object')).toBe(false)
            expect(logger['isAyaMessage'](null)).toBe(false)
            expect(logger['isAyaMessage'](undefined)).toBe(false)
        })

        it('should return false for an empty object', () => {
            expect(logger['isAyaMessage']({})).toBe(false)
        })

        it('should return true for a message with ayaMsg as a non-string', () => {
            const validMessage: AyaMessage = {
                ayaMsg: 123,
                fgColor: 'red',
                underline: true,
                bold: true
            }
            expect(logger['isAyaMessage'](validMessage)).toBe(true)

            validMessage.ayaMsg = true
            expect(logger['isAyaMessage'](validMessage)).toBe(true)
        })
    })
})
