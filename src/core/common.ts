import { MessageType } from './types'

// little logger used for debugging
const verbose = false
export const l = {
    info: (...msgs: MessageType[]) => (verbose ? console.log('[info]', ...msgs) : null),
    warn: (...msgs: MessageType[]) => (verbose ? console.log('[warn]', ...msgs) : null),
    error: (...msgs: MessageType[]) => (verbose ? console.log('[error]', ...msgs) : null)
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
export const choose = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

const delimiters = ['{}', '[]', '()', '<>', '||']
export const tryToRemovePrefixDelimiters = (str: string) => {
    for (const delimiter of delimiters) {
        if (str.startsWith(delimiter[0]) && str.endsWith(delimiter[1])) return str.slice(1, -1)
    }
    return str
}

export const pad = (n: number) => {
    return n.toString().padStart(2, '0')
}

export const getFormattedDate = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = pad(date.getMonth() + 1)
    const day = pad(date.getDate())
    const hours = pad(date.getHours())
    const minutes = pad(date.getMinutes())
    const seconds = pad(date.getSeconds())
    const ms = date.getMilliseconds()
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`
}
