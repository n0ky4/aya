import chalk, { Chalk } from 'chalk'
import { AyaMessage } from './types'

export const y = (cfg: AyaMessage): string => {
    let formatter: Chalk = chalk
    if (cfg.fgColor) formatter = formatter[cfg.fgColor]
    if (cfg.bgColor) formatter = formatter[cfg.bgColor]
    if (cfg.bold) formatter = formatter.bold
    if (cfg.italic) formatter = formatter.italic
    if (cfg.underline) formatter = formatter.underline
    if (cfg.dim) formatter = formatter.dim
    if (cfg.inverse) formatter = formatter.inverse
    return formatter(cfg.ayaMsg)
}
