import type { BackgroundColor, ForegroundColor } from 'chalk'

export type LoggerLevel = 'debug' | 'info' | 'warn' | 'error'
export type LoggerFormat = 'json' | 'text'

export type FgColor = typeof ForegroundColor
export type BgColor = typeof BackgroundColor

export type Color = FgColor | BgColor

export interface AyaMessage {
    ayaMsg: string
    fgColor?: FgColor
    bgColor?: BgColor
    bold?: boolean
    italic?: boolean
    underline?: boolean
    dim?: boolean
    inverse?: boolean
}

export type MessageType = ({ ayaMsg: string } & AyaMessage) | any
