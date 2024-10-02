import chalk from 'chalk'
import Logger from '..'

const log = new Logger({
    prefix: '(my-app)',
    levelPrefixes: {
        debug: '🐛 > debug✨🐜',
        info: '📢 > info🔊🔎',
        warn: '⚠️ > warn🚨⚡',
        error: '🚨 > error🔥💥'
    },
    file: {
        use: true,
        path: './logs',
        maxSize: '10MB', // max file size before rotation
        nameFormat: 'YYYY-MM-DD_HH-mm-ss',
        logFormat: '{prefix} [{timestamp}] [{level}]: {message}'
    }
})

log.debug('this is a debug message')
log.info("and i'm an info message!!")
log.warn(chalk.yellow('warning!! danger ahead!!'))
log.error(chalk.red('OH NOOOOO!! something went wrong!!'))

log.info({
    ayaMsg: "this is aya's message",
    fgColor: 'magenta',
    italic: true,
    bold: true,
    underline: true
})
