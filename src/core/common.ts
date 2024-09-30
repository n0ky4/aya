import chalk from 'chalk'

interface __LOG_INTERNAL__ {
    internalPrefix: string
    specialMessages: {
        doNotSendToDiscord: string
    }
    excludeInspectTypes: string[]
    inspectConfig: {
        depth: number
        maxArrayLength: number
        breakLength: number
    }
    specialMessagesKeys: string[]
}

const __LOG_INTERNAL__: __LOG_INTERNAL__ = {
    internalPrefix: chalk.gray('[log_internal]'),
    specialMessages: {
        doNotSendToDiscord: '__LOG_DO_NOT_SEND_TO_DISCORD__'
    },
    specialMessagesKeys: [],
    excludeInspectTypes: ['string'],
    inspectConfig: {
        depth: 2,
        maxArrayLength: 10,
        breakLength: 120
    }
}
__LOG_INTERNAL__.specialMessagesKeys = Object.values(__LOG_INTERNAL__.specialMessages)

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
export const choose = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

const delimiters = ['{}', '[]', '()', '<>', '||']
export const tryToRemovePrefixDelimiters = (str: string) => {
    for (const delimiter of delimiters) {
        if (str.startsWith(delimiter[0]) && str.endsWith(delimiter[1])) return str.slice(1, -1)
    }
    return str
}

const verbose = false
export const l = {
    info: (...msgs: unknown[]) => (verbose ? console.log('info', ...msgs) : null),
    warn: (...msgs: unknown[]) => (verbose ? console.log('warn', ...msgs) : null),
    error: (...msgs: unknown[]) => (verbose ? console.log('error', ...msgs) : null)
}

export { __LOG_INTERNAL__ }
