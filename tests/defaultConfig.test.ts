import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from './../src/index'

describe('DEFAULT_CONFIG', () => {
    it('should have the correct default prefix', () => {
        expect(DEFAULT_CONFIG.prefix).toBe('(aya)')
    })

    it('should have the correct default levels', () => {
        expect(DEFAULT_CONFIG.levels).toEqual(['debug', 'info', 'warn', 'error'])
    })

    it('should have the correct default logFormat', () => {
        expect(DEFAULT_CONFIG.logFormat).toBe('{prefix} {level} {message}')
    })

    it('should have the correct default format', () => {
        expect(DEFAULT_CONFIG.format).toBe('text')
    })

    it('should have the correct default levelPrefixes', () => {
        expect(DEFAULT_CONFIG.levelPrefixes).toEqual({
            debug: '[🐛 debug]',
            info: '[🔍 info]',
            warn: '[☢️  warn]',
            error: '[❌ error]'
        })
    })

    it('should have the correct default boldLevel', () => {
        expect(DEFAULT_CONFIG.boldLevel).toBe(true)
    })

    it('should have the correct default colors', () => {
        expect(DEFAULT_CONFIG.colors).toEqual({
            prefix: 'blue',
            debug: 'green',
            info: 'cyan',
            warn: 'yellow',
            error: 'red'
        })
    })

    it('should have the correct default file configuration', () => {
        expect(DEFAULT_CONFIG.file).toEqual({
            use: false,
            path: './logs',
            maxSize: '10MB',
            nameFormat: 'YYYY-MM-DD_HH-mm-ss',
            logFormat: '{prefix} [{timestamp}] [{level}]: {message}'
        })
    })
})
