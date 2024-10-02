import Logger, { InferedConfigSchema, InternalSettings } from '..'
import { MessageType } from './types'

export type PluginExposedMethods = {
    addSpecialMessage: (message: string) => void
    hasSpecialMessage: (specialMessage: string, messages: MessageType[]) => boolean
    getSpecialMessage: (specialMessage: string) => string
    filterSpecialMessages: (messages: MessageType[]) => MessageType[]
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
