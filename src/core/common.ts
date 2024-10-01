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
