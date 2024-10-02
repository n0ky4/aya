import chalk from 'chalk'
import fileSizeParser from 'filesize-parser'
import * as fs from 'fs'
import path from 'path'
import { EventEmitter } from 'stream'
import { inspect } from 'util'
import { z } from 'zod'
import { getFormattedDate, pad } from './core/common'
import { y } from './core/formatting'
import LoggerPlugin from './core/plugin'
import { AyaMessage, Color, FgColor, LoggerLevel, MessageType } from './core/types'

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
            prefix: z.custom<Color>().default(DEFAULT_CONFIG.colors.prefix),
            debug: z.custom<Color>().default(DEFAULT_CONFIG.colors.debug),
            info: z.custom<Color>().default(DEFAULT_CONFIG.colors.info),
            warn: z.custom<Color>().default(DEFAULT_CONFIG.colors.warn),
            error: z.custom<Color>().default(DEFAULT_CONFIG.colors.error)
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
type AyaOptions = z.input<typeof configSchema>

export interface InternalSettings {
    internalPrefix: string
    internalPrefixColor: FgColor
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
    private errorCallbacks: ((messages: MessageType[]) => void)[]
    private warnCallbacks: ((messages: MessageType[]) => void)[]
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

    private specialMessageFormat = '<{instanceId}::{message}>'

    private ansiRegex =
        // eslint-disable-next-line no-control-regex
        /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g

    private internalSettings: InternalSettings = {
        internalPrefix: '[aya]',
        internalPrefixColor: 'magenta',
        excludeInspectTypes: ['string'],
        toInspectJsonFormat: ['bigint', 'symbol', 'function'],
        inspectConfig: {
            depth: 2,
            maxArrayLength: 10,
            breakLength: 120
        }
    }

    private ayaPfx = y({
        ayaMsg: this.internalSettings.internalPrefix,
        fgColor: this.internalSettings.internalPrefixColor
    })

    constructor(options?: AyaOptions) {
        this.cfg = configSchema.parse(options || {})

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

    // #region special messages
    private addSpecialMessage(message: string) {
        if (!this.specialMessages.includes(message)) this.specialMessages.push(message)
    }

    private hasSpecialMessage(specialMessage: string, messages: MessageType[]) {
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

    private filterSpecialMessages(messages: MessageType[]) {
        return messages.filter((m) => {
            if (typeof m !== 'string') return true
            return !this.specialMessages.map(this.getSpecialMessage).includes(m)
        })
    }
    // #endregion

    private pluginExposedMethods = {
        addSpecialMessage: this.addSpecialMessage.bind(this),
        hasSpecialMessage: this.hasSpecialMessage.bind(this),
        getSpecialMessage: this.getSpecialMessage.bind(this),
        filterSpecialMessages: this.filterSpecialMessages.bind(this),
        config: () => this.cfg,
        internal: () => this.internalSettings,
        pfx: () => this.ayaPfx
    }

    // #region file methods
    private checkPath() {
        if (!fs.existsSync(this.cfg.file.path)) {
            console.log('creating path')
            fs.mkdirSync(this.cfg.file.path, { recursive: true })
        }
    }

    private getFileName() {
        return this.cfg.file.nameFormat
            .replaceAll('YYYY', new Date().getFullYear().toString())
            .replaceAll('MM', pad(new Date().getMonth() + 1))
            .replaceAll('DD', pad(new Date().getDate()))
            .replaceAll('HH', pad(new Date().getHours()))
            .replaceAll('mm', pad(new Date().getMinutes()))
            .replaceAll('ss', pad(new Date().getSeconds()))
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
    // #endregion

    private finalize() {
        if (this.fileStream) this.fileStream.close()
    }

    private setupCallbacks() {
        this.em.on('error', (messages) => {
            this.errorCallbacks.forEach((cb) => cb(messages))
        })

        this.em.on('warn', (messages) => {
            this.warnCallbacks.forEach((cb) => cb(messages))
        })
    }

    //                                     👇 this is so cool i didnt know about this...!!
    private isAyaMessage = (message: any): message is AyaMessage => {
        return (message as AyaMessage).ayaMsg !== undefined
    }

    private removeAnsiFormatting(str: string) {
        return str.replace(this.ansiRegex, '')
    }

    private parseMessage(messages: MessageType[], noFormatting: boolean = false) {
        return messages
            .map((m) => {
                if (this.isAyaMessage(m)) return noFormatting ? m.ayaMsg : y(m)
                if (typeof m === 'object')
                    return inspect(m, {
                        ...this.internalSettings.inspectConfig,
                        colors: true
                    })
                return m
            })
            .join(' ')
    }

    private logToFile(level: LoggerLevel, messages: MessageType[]) {
        if (!this.useLogFile) return
        if (!this.fileStream) return

        const parsedMessage = this.removeAnsiFormatting(
            this.parseMessage(this.filterSpecialMessages(messages), true)
        )

        let msg: string = this.cfg.file.logFormat
            .replaceAll('{prefix}', this.cfg.prefix)
            .replaceAll('{level}', level.toUpperCase())
            .replaceAll('{message}', parsedMessage)

        if (this.useTimestampOnFile) msg = msg.replaceAll('{timestamp}', getFormattedDate())

        const toWrite = msg + '\n'

        this.fileStream.write(toWrite)
        this.estimatedSize += Buffer.byteLength(toWrite)

        if (this.estimatedSize >= this.maxSize) {
            this.makeNewFile()
            this.estimatedSize = 0
        }
    }

    private log(level: LoggerLevel, messages: MessageType[]) {
        const { levels, format, logFormat, levelPrefixes, prefix, colors, boldLevel } = this.cfg

        if (!levels.includes(level)) return

        this.logToFile(level, messages)

        if (format === 'json') {
            const json = JSON.stringify({
                level,
                messages: this.filterSpecialMessages(messages).map((x) => {
                    if (this.isAyaMessage(x)) return (x as MessageType).ayaMsg
                    if (this.internalSettings.toInspectJsonFormat.includes(typeof x))
                        return inspect(x, {
                            ...this.internalSettings.inspectConfig,
                            colors: false
                        })
                    return x
                }),
                timestamp: new Date().toISOString()
            })

            process.stdout.write(json + '\n')
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

            if (this.useTimestamp) msg = msg.replaceAll('{timestamp}', getFormattedDate())

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

    // #region public methods
    debug(...messages: MessageType[]) {
        this.log('debug', messages)
    }

    info(...messages: MessageType[]) {
        this.log('info', messages)
    }

    warn(...messages: MessageType[]) {
        this.log('warn', messages)
    }

    error(...messages: MessageType[]) {
        this.log('error', messages)
    }

    onError(cb: (messages: MessageType[]) => void) {
        this.errorCallbacks.push(cb)
    }

    onWarn(cb: (messages: MessageType[]) => void) {
        this.warnCallbacks.push(cb)
    }

    use(plugin: any) {
        if (plugin instanceof LoggerPlugin) {
            this.plugins.push(plugin)
            return plugin.apply(this, this.pluginExposedMethods)
        }
        throw new TypeError('Plugin must be an instance of LoggerPlugin')
    }
    // #endregion
}

export default Logger
