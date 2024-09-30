import type { BackgroundColor, ForegroundColor } from 'chalk'

export type LoggerLevel = 'debug' | 'info' | 'warn' | 'error'
export type LoggerFormat = 'json' | 'text'

export type LoggerColor = typeof ForegroundColor | typeof BackgroundColor
