import { describe, expect, it, vi } from 'vitest'
import { ExitHandler } from '../src/core/exitHandler'

describe('ExitHandler Singleton', () => {
    it('should create only one instance', () => {
        const instance1 = ExitHandler.getInstance()
        const instance2 = ExitHandler.getInstance()
        expect(instance1).toBe(instance2)
    })

    it('should register callbacks correctly', () => {
        const exitHandler = ExitHandler.getInstance()
        const callback1 = vi.fn()
        const callback2 = vi.fn()

        exitHandler.addCallback(callback1)
        exitHandler.addCallback(callback2)

        expect(exitHandler['callbacks']).toHaveLength(2)
        expect(exitHandler['callbacks']).toContain(callback1)
        expect(exitHandler['callbacks']).toContain(callback2)
    })

    it('should call registered callbacks on exit event', () => {
        const exitHandler = ExitHandler.getInstance()
        const callback = vi.fn()

        exitHandler.addCallback(callback)

        process.emit('SIGINT')

        expect(callback).toHaveBeenCalled()
    })
})
