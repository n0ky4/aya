import { discordWebhook } from '@/plugins/discordWebhook'
import Logger from '..'

const log = new Logger().use(
    discordWebhook({
        url: 'https://discord.com/api/webhooks/1234567890/ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        username: 'Rei',
        avatarUrl: 'https://i.imgur.com/L2vBNwc.jpeg',
        showLoadMessage: true,
        levels: ['error'] // Only send messages with the level 'error' to Discord
    })
)

log.debug('Hello, World!')
log.info('Hello, World!')
log.warn('Hello, World!')

// Only this message will be sent to Discord (with an embed)
log.error('Hello, World!')
