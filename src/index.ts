import chalk from 'chalk'
import fileSizeParser from 'filesize-parser'
import * as fs from 'fs'
import path from 'path'
import { EventEmitter } from 'stream'
import { inspect } from 'util'
import { z } from 'zod'
import LoggerPlugin from './core/plugin'
import { LoggerColor, LoggerLevel } from './core/types'

export const DEFAULT_CONFIG = {
    prefix: '(aya)',
    levels: ['debug', 'info', 'warn', 'error'],
    logFormat: '{prefix} {level} {message}',
    format: 'text',
    levelPrefixes: {
        debug: '[🐛 debug]',
        info: '[🔍 info]',
        warn: '[☢️  warn]',
        error: '[❌ error]'
    },
    boldLevel: true,
    colors: {
        prefix: 'blue',
        debug: 'green',
        info: 'cyan',
        warn: 'yellow',
        error: 'red'
    },
    file: {
        use: false,
        path: './logs',
        maxSize: '10MB',
        nameFormat: 'YYYY-MM-DD_HH-mm-ss',
        logFormat: '{prefix} [{timestamp}] [{level}]: {message}'
    }
} as const

export const configSchema = z.object({
    prefix: z.string().default(DEFAULT_CONFIG.prefix),
    levels: z.array(z.enum(['debug', 'info', 'warn', 'error'])).default([...DEFAULT_CONFIG.levels]),
    logFormat: z.string().default(DEFAULT_CONFIG.logFormat),
    format: z.enum(['json', 'text']).default(DEFAULT_CONFIG.format),
    levelPrefixes: z
        .object({
            debug: z.string().default(DEFAULT_CONFIG.levelPrefixes.debug),
            info: z.string().default(DEFAULT_CONFIG.levelPrefixes.info),
            warn: z.string().default(DEFAULT_CONFIG.levelPrefixes.warn),
            error: z.string().default(DEFAULT_CONFIG.levelPrefixes.error)
        })
        .default(DEFAULT_CONFIG.levelPrefixes),
    boldLevel: z.boolean().default(DEFAULT_CONFIG.boldLevel),
    colors: z
        .object({
            prefix: z.custom<LoggerColor>().default(DEFAULT_CONFIG.colors.prefix),
            debug: z.custom<LoggerColor>().default(DEFAULT_CONFIG.colors.debug),
            info: z.custom<LoggerColor>().default(DEFAULT_CONFIG.colors.info),
            warn: z.custom<LoggerColor>().default(DEFAULT_CONFIG.colors.warn),
            error: z.custom<LoggerColor>().default(DEFAULT_CONFIG.colors.error)
        })
        .default(DEFAULT_CONFIG.colors),
    file: z
        .object({
            use: z.boolean().default(DEFAULT_CONFIG.file.use),
            path: z.string().default(DEFAULT_CONFIG.file.path),
            maxSize: z.string().default(DEFAULT_CONFIG.file.maxSize),
            nameFormat: z.string().default(DEFAULT_CONFIG.file.nameFormat),
            logFormat: z.string().default(DEFAULT_CONFIG.file.logFormat)
        })
        .default(DEFAULT_CONFIG.file)
})

export type InferedConfigSchema = z.infer<typeof configSchema>
type LoggerOptions = z.input<typeof configSchema>

export interface InternalSettings {
    internalPrefix: string
    internalPrefixColor: chalk.Chalk
    excludeInspectTypes: string[]
    toInspectJsonFormat: string[]
    inspectConfig: {
        depth: number
        maxArrayLength: number
        breakLength: number
    }
}

export class Logger {
    private cfg: InferedConfigSchema
    private em: EventEmitter
    private errorCallbacks: ((messages: unknown[]) => void)[]
    private warnCallbacks: ((messages: unknown[]) => void)[]
    private plugins: LoggerPlugin[] = []

    private useTimestamp: boolean

    private useLogFile: boolean
    private fileStream: fs.WriteStream | null = null
    private fileBaseName: string | null = null
    private fileIndex: number = 0
    private filePath: string | null = null
    private estimatedSize: number = 0
    private maxSize: number = 0
    private useTimestampOnFile: boolean = false

    private instanceId: string = Math.random().toString(36).slice(2)
    private specialMessages: string[] = []

    private specialMessageFormat = '{instanceId}::{message}'

    private internalSettings: InternalSettings = {
        internalPrefix: '[aya]',
        internalPrefixColor: chalk.magenta,
        excludeInspectTypes: ['string'],
        toInspectJsonFormat: ['bigint', 'symbol', 'function'],
        inspectConfig: {
            depth: 2,
            maxArrayLength: 10,
            breakLength: 120
        }
    }

    private addSpecialMessage(message: string) {
        if (!this.specialMessages.includes(message)) this.specialMessages.push(message)
    }

    private hasSpecialMessage(specialMessage: string, messages: unknown[]) {
        return messages.some((m) => {
            if (typeof m !== 'string') return false
            return messages.includes(this.getSpecialMessage(specialMessage))
        })
    }

    private getSpecialMessage = (specialMessage: string) => {
        return this.specialMessageFormat
            .replaceAll('{instanceId}', this.instanceId)
            .replaceAll('{message}', specialMessage)
    }

    private filterSpecialMessages(messages: unknown[]) {
        return messages.filter((m) => {
            if (typeof m !== 'string') return true
            return !this.specialMessages.map(this.getSpecialMessage).includes(m)
        })
    }

    private pluginExposedMethods = {
        addSpecialMessage: this.addSpecialMessage.bind(this),
        hasSpecialMessage: this.hasSpecialMessage.bind(this),
        getSpecialMessage: this.getSpecialMessage.bind(this),
        filterSpecialMessages: this.filterSpecialMessages.bind(this),
        getConfig: () => this.cfg,
        getInternalSettings: () => this.internalSettings
    }

    private getOptions(config: object) {
        const options = configSchema.parse(config)
        return options
    }

    constructor(options?: LoggerOptions) {
        this.cfg = this.getOptions(options || {})

        this.em = new EventEmitter()
        this.errorCallbacks = []
        this.warnCallbacks = []
        this.useTimestamp = this.cfg.format !== 'json' && this.cfg.logFormat.includes('{timestamp}')

        this.useLogFile = this.cfg.file.use

        if (this.useLogFile) {
            this.maxSize = fileSizeParser(this.cfg.file.maxSize)
            if (this.maxSize < 128) throw new Error('Invalid max size')

            this.fileBaseName = this.getFileName()
            this.filePath = path.join(this.cfg.file.path, this.fileBaseName)
            this.checkPath()

            if (fs.existsSync(this.filePath)) {
                const stats = fs.statSync(this.filePath)
                this.estimatedSize = stats.size
                if (this.estimatedSize >= this.maxSize) this.makeNewFile()
            }

            this.fileStream = this.createWriteStream()
            this.useTimestampOnFile = this.cfg.file.logFormat.includes('{timestamp}')
        }

        this.setupCallbacks()

        // hook in exit event
        const EXIT_EVENTS = [
            'exit',
            'SIGINT',
            'SIGUSR1',
            'SIGUSR2',
            'uncaughtException',
            'SIGTERM'
        ] as const
        EXIT_EVENTS.forEach((event) => {
            process.on(event, () => {
                this.finalize()
            })
        })
    }

    private finalize() {
        if (this.fileStream) this.fileStream.close()
    }

    private checkPath() {
        console.log('this.cfg.file.path', this.cfg.file.path)
        if (!fs.existsSync(this.cfg.file.path)) {
            console.log('creating path')
            fs.mkdirSync(this.cfg.file.path, { recursive: true })
        }
    }

    private getFileName() {
        return this.cfg.file.nameFormat
            .replaceAll('YYYY', new Date().getFullYear().toString())
            .replaceAll('MM', this.pad(new Date().getMonth() + 1))
            .replaceAll('DD', this.pad(new Date().getDate()))
            .replaceAll('HH', this.pad(new Date().getHours()))
            .replaceAll('mm', this.pad(new Date().getMinutes()))
            .replaceAll('ss', this.pad(new Date().getSeconds()))
    }

    private makeNewFile() {
        this.fileIndex++
        this.filePath = path.join(this.cfg.file.path, `${this.fileBaseName}_${this.fileIndex}`)
        if (this.fileStream) this.fileStream.close()
        this.fileStream = this.createWriteStream()
    }

    private createWriteStream() {
        if (!this.filePath) return null
        return fs.createWriteStream(this.filePath + '.log', {
            flags: 'a'
        })
    }

    private setupCallbacks() {
        this.em.on('error', (messages) => {
            this.errorCallbacks.forEach((cb) => cb(messages))
        })

        this.em.on('warn', (messages) => {
            this.warnCallbacks.forEach((cb) => cb(messages))
        })
    }

    private pad(n: number) {
        return n.toString().padStart(2, '0')
    }

    private getFormattedDate() {
        const date = new Date()
        const year = date.getFullYear()
        const month = this.pad(date.getMonth() + 1)
        const day = this.pad(date.getDate())
        const hours = this.pad(date.getHours())
        const minutes = this.pad(date.getMinutes())
        const seconds = this.pad(date.getSeconds())
        const ms = date.getMilliseconds()
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`
    }

    private parseMessage(messages: unknown[]) {
        return messages
            .map((m) => {
                if (typeof m === 'object')
                    return inspect(m, {
                        ...this.internalSettings.inspectConfig,
                        colors: true
                    })
                return m
            })
            .join(' ')
    }

    private logToFile(level: LoggerLevel, messages: unknown[]) {
        if (!this.useLogFile) return
        if (!this.fileStream) return

        const parsedMessage = this.parseMessage(this.filterSpecialMessages(messages))

        let msg: string = this.cfg.file.logFormat
            .replaceAll('{prefix}', this.cfg.prefix)
            .replaceAll('{level}', level.toUpperCase())
            .replaceAll('{message}', parsedMessage)

        if (this.useTimestampOnFile) msg = msg.replaceAll('{timestamp}', this.getFormattedDate())

        this.fileStream.write(msg + '\n')
        this.estimatedSize += Buffer.byteLength(msg)

        if (this.estimatedSize >= this.maxSize) {
            this.makeNewFile()
            this.estimatedSize = 0
        }
    }

    private log(level: LoggerLevel, messages: unknown[]) {
        const { levels, format, logFormat, levelPrefixes, prefix, colors, boldLevel } = this.cfg

        if (!levels.includes(level)) return

        this.logToFile(level, messages)

        if (format === 'json') {
            const stringified = JSON.stringify({
                level,
                messages: this.filterSpecialMessages(messages).map((x) => {
                    if (this.internalSettings.toInspectJsonFormat.includes(typeof x))
                        return inspect(x, {
                            ...this.internalSettings.inspectConfig,
                            colors: false
                        })
                    return x
                }),
                timestamp: new Date().toISOString()
            })

            console.log(stringified)
        } else {
            const lvl = levelPrefixes[level]
            const parsedMessage = this.parseMessage(this.filterSpecialMessages(messages))

            let msg: string = logFormat
                .replaceAll('{prefix}', chalk[colors.prefix](prefix))
                .replaceAll(
                    '{level}',
                    boldLevel ? chalk.bold(chalk[colors[level]](lvl)) : chalk[colors[level]](lvl)
                )
                .replaceAll('{message}', parsedMessage)

            if (this.useTimestamp) msg = msg.replaceAll('{timestamp}', this.getFormattedDate())

            switch (level) {
                case 'error':
                    this.em.emit('error', messages)
                    break
                case 'warn':
                    this.em.emit('warn', messages)
                    break
            }
            console.log(msg)
        }
    }

    debug(...messages: unknown[]) {
        this.log('debug', messages)
    }

    info(...messages: unknown[]) {
        this.log('info', messages)
    }

    warn(...messages: unknown[]) {
        this.log('warn', messages)
    }

    error(...messages: unknown[]) {
        this.log('error', messages)
    }

    onError(cb: (messages: unknown[]) => void) {
        this.errorCallbacks.push(cb)
    }

    onWarn(cb: (messages: unknown[]) => void) {
        this.warnCallbacks.push(cb)
    }

    use(plugin: any) {
        if (plugin instanceof LoggerPlugin) {
            this.plugins.push(plugin)
            return plugin.apply(this, this.pluginExposedMethods)
        }
        throw new TypeError('Plugin must be an instance of LoggerPlugin')
    }
}

export default Logger
