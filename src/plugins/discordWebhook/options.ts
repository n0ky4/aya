import { z } from 'zod'

export const discordWebhookOptionsSchema = z.object({
    url: z.string(),
    username: z.string().optional(),
    avatarUrl: z
        .union([z.string(), z.array(z.string())])
        .default([
            'https://i.imgur.com/ukfOGMB.jpeg',
            'https://i.imgur.com/gXVlBbC.jpeg',
            'https://i.imgur.com/ZQERluU.jpeg',
            'https://i.imgur.com/BP0lfa3.jpeg'
        ]),
    levels: z.array(z.enum(['warn', 'error'])).default(['error']),
    labels: z
        .object({
            warn: z.string(),
            error: z.string()
        })
        .default({
            warn: ':warning: Warning',
            error: ':x: Error'
        }),
    colors: z
        .object({
            warn: z.number(),
            error: z.number()
        })
        .default({
            warn: 16705372, // Discord yellow
            error: 15548997 // Discord red
        }),
    showLoadMessage: z.boolean().default(false)
})
