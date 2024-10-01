import Logger, { InferedConfigSchema, InternalSettings } from '..'

export type PluginExposedMethods = {
    addSpecialMessage: (message: string) => void
    hasSpecialMessage: (specialMessage: string, messages: unknown[]) => boolean
    getSpecialMessage: (specialMessage: string) => string
    filterSpecialMessages: (messages: unknown[]) => unknown[]
    getConfig: () => InferedConfigSchema
    getInternalSettings: () => InternalSettings
}

export default class LoggerPlugin {
    name: string = 'MyPlugin'
    protected logger!: Logger
    protected exposedMethods!: PluginExposedMethods

    apply(logger: Logger, exposedMethods: PluginExposedMethods): Logger {
        this.logger = logger
        this.exposedMethods = exposedMethods
        return this.init()
    }

    protected init(): Logger {
        return this.logger
    }
}
