import { z } from 'zod'

export const DEFAULT_DISCORD_WEBHOOK_OPTIONS = {
    avatarUrl: [
        'https://i.imgur.com/ukfOGMB.jpeg',
        'https://i.imgur.com/gXVlBbC.jpeg',
        'https://i.imgur.com/ZQERluU.jpeg',
        'https://i.imgur.com/BP0lfa3.jpeg'
    ],
    levels: ['error'] as ['error'],
    labels: { warn: ':warning: Warning', error: ':x: Error' },
    colors: { warn: 16705372, error: 15548997 }, // Discord yellow and red
    showLoadMessage: false
}

export const discordWebhookOptionsSchema = z.object({
    url: z.string(),
    username: z.string().optional(),
    avatarUrl: z
        .union([z.string(), z.array(z.string())])
        .default(DEFAULT_DISCORD_WEBHOOK_OPTIONS.avatarUrl),
    levels: z.array(z.enum(['warn', 'error'])).default(DEFAULT_DISCORD_WEBHOOK_OPTIONS.levels),
    labels: z
        .object({
            warn: z.string().default(DEFAULT_DISCORD_WEBHOOK_OPTIONS.labels.warn),
            error: z.string().default(DEFAULT_DISCORD_WEBHOOK_OPTIONS.labels.error)
        })
        .default(DEFAULT_DISCORD_WEBHOOK_OPTIONS.labels),
    colors: z
        .object({
            warn: z
                .union([z.string(), z.number()])
                .default(DEFAULT_DISCORD_WEBHOOK_OPTIONS.colors.warn),
            error: z
                .union([z.string(), z.number()])
                .default(DEFAULT_DISCORD_WEBHOOK_OPTIONS.colors.error)
        })
        .default(DEFAULT_DISCORD_WEBHOOK_OPTIONS.colors),
    showLoadMessage: z.boolean().default(DEFAULT_DISCORD_WEBHOOK_OPTIONS.showLoadMessage)
})
