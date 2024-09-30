import Logger from '..'

export default class LoggerPlugin {
    name: string
    logger: Logger | undefined = undefined

    constructor(options: { name: string }) {
        this.name = options.name
    }

    protected init(): Logger {
        if (!this.logger) throw new Error('Logger not initialized')
        return this.logger
    }

    apply(logger: Logger): Logger {
        this.logger = logger
        return this.init()
    }
}
