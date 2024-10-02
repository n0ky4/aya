import { MessageType } from '@/core/types'
import Logger from '@/index'
import { z } from 'zod'
import { discordWebhookOptionsSchema } from './options'

export interface EmbedModelType {
    title: string
    color: number
}

export interface EmbedType extends EmbedModelType {
    timestamp: string
    description: string
}

export type WebhookQueueItem = {
    embedModel: EmbedModelType
    webhookOptions: SendWebhookOptions
}

export interface SendWebhookOptions {
    logger: Logger
    url: string
    username: string
    avatarUrl: string | undefined
    messages: MessageType[]
    waitBetweenRequests?: number
}

export type DiscordWebhookOptions = z.input<typeof discordWebhookOptionsSchema>
export type InferedDiscordWebhookOptions = z.infer<typeof discordWebhookOptionsSchema>
