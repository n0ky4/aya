import Logger, { InferedConfigSchema, InternalSettings } from '..'

export type PluginExposedMethods = {
    addSpecialMessage: (message: string) => void
    hasSpecialMessage: (specialMessage: string, messages: unknown[]) => boolean
    getSpecialMessage: (specialMessage: string) => string
    filterSpecialMessages: (messages: unknown[]) => unknown[]
    config: () => InferedConfigSchema
    internal: () => InternalSettings
    pfx: () => any
}

export default class LoggerPlugin {
    name: string = 'MyPlugin'
    protected logger!: Logger
    protected exm!: PluginExposedMethods

    apply(logger: Logger, exposedMethods: PluginExposedMethods): Logger {
        this.logger = logger
        this.exm = exposedMethods
        return this.init()
    }

    protected init(): Logger {
        return this.logger
    }
}
