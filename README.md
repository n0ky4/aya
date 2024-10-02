<h1 align="center"><code>aya</code></h1>

<p align="center"><b>the logging library built to be pretty, not useful</b></p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/67a35b74-ad1e-43d3-9a1a-a6218642f568" alt="Example of the aya library which it shows a pretty console log" />
</p>

## ✨ Features

-   🌸 **Fully Customizable**: Want to change the prefix "error" to "success"? I don't know why anyone would do something this stupid, but you can if you want.....!!!!
-   🎨 **Colored**: Because plain text is boring :)
-   📝 **File Support**: You can write all your logs to a file (woww that's so cool and innovative)
-   👾 **Discord Webhook Support**: Are you a bad developer who's always breaking things? _(cof cof)_ You can receive a notification in Discord each time your server is exploding!! 💥💣

## 📩 Installation

```bash
$ npm install @nokya/aya  # Using npm
$ pnpm install @nokya/aya # Using pnpm
$ yarn add @nokya/aya     # Using yarn
```

## 👩‍💻 Basic Usage

```ts
import Logger from '@nokya/aya'
import chalk from 'chalk'

const log = new Logger({
    prefix: '(my-app)',
    levelPrefixes: {
        debug: '🐛 > debug✨🐜',
        info: '📢 > info🔊🔎',
        warn: '⚠️ > warn🚨⚡',
        error: '🚨 > error🔥💥'
    }
})

log.debug('this is a debug message')
log.info("and i'm an info message!!")
log.warn(chalk.yellow('warning!! danger ahead!!'))
log.error(chalk.red('OH NOOOOO!! something went wrong!!'))
```

> [!TIP]
> You can check more examples in the [examples](src/examples/) folder.

## 📚 Documentation

### Instantiating the Logger

```ts
import Logger from '@nokya/aya'

const log = new Logger(options)
```

### Options

```ts
const options = {
    // Prefix displayed before the level
    prefix: '(aya)',

    // Log levels that will be displayed
    levels: ['debug', 'info', 'warn', 'error'],

    // Format of the log message (check out the placeholders section)
    logFormat: '{prefix} {level} {message}',

    // Output format (text or JSON)
    format: 'text',

    // Prefixes for each level
    levelPrefixes: {
        debug: '[🐛 debug]',
        info: '[🔍 info]',
        warn: '[☢️  warn]',
        error: '[❌ error]'
    },

    // Bold levels in output
    boldLevel: true,

    // Colors for each level prefix (uses chalk)
    colors: {
        prefix: 'blue',
        debug: 'green',
        info: 'cyan',
        warn: 'yellow',
        error: 'red'
    },

    // File logging options
    file: {
        // Enable file logging
        use: false,

        // Path to save logs
        path: './logs',

        // Maximum file size before rotating
        maxSize: '10MB',

        // File name format
        nameFormat: 'YYYY-MM-DD_HH-mm-ss',

        // Log message format for file logs (check out the placeholders section)
        logFormat: '{prefix} [{timestamp}] [{level}]: {message}'
    }
}
```

### Placeholders

| Placeholder   | Description                                     | Example                 |
| ------------- | ----------------------------------------------- | ----------------------- |
| `{prefix}`    | Prefix displayed before the level               | (aya)                   |
| `{level}`     | Log message level                               | [🐛 debug]              |
| `{message}`   | Log message content                             | aya is so cool!!!       |
| `{timestamp}` | Current timestamp (YYYY-MM-DD HH:mm.SSS format) | 2024-12-31 23:59:59.999 |

### 🎨 Formatting

You can use the [chalk](https://github.com/chalk/chalk) library to format messages or you can pass an object with the `ayaMsg` key to use the formatter

```ts
log.info({
    ayaMsg: 'aya is so cool!!!',
    fgColor: 'blue',
    bold: true,
    underline: true,
    italic: true
})
```

Oh, and we also have the `y` formatter if you want to use for somethign else....

```ts
import { y } from '@nokya/aya/format'

console.log(
    y({
        ayaMsg: 'aya is so cool!!!',
        fgColor: 'blue',
        bold: true,
        underline: true,
        italic: true
    })
)
```

### Methods

#### `log.debug(...messages: MessageType[])`

Logs a debug message.

#### `log.info(...messages: MessageType[])`

Logs an info message.

#### `log.warn(...messages: MessageType[])`

Logs a warning message.

#### `log.error(...messages: MessageType[])`

Logs an error message.

#### `log.use(plugin: LoggerPlugin)`

Adds a plugin to the logger.

## 🔌 Plugins

### 👾 Discord Webhook

```ts
import { discordWebhook } from '@nokya/aya/plugins'

log.use(discordWebhook(options))
```

#### Options

```ts
const options = {
    // Webhook URL
    url: 'https://discord.com/api/webhooks/1234567890/ABCDEFGHIJKLMN',

    // Webhook username
    username: 'aya',

    // Webhook avatar (list of URLs to randomize or a single URL)
    avatarUrl: [
        'https://i.imgur.com/ukfOGMB.jpeg',
        'https://i.imgur.com/gXVlBbC.jpeg',
        'https://i.imgur.com/ZQERluU.jpeg',
        'https://i.imgur.com/BP0lfa3.jpeg'
    ],

    // Log levels to send (only 'warn' and 'error' are allowed)
    levels: ['error', 'warn'],

    // Embed labels for each level
    labels: {
        warn: ':warning: Warning',
        error: ':x: Error'
    },

    // Embed colors (hex or decimal format)
    colors: {
        warn: '#fee75c',
        error: '#ed4245'
    },

    // Display a message when the plugin is loaded
    showLoadMessage: false
}
```

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌱 Contributing

Pull requests are welcome!!!!!!!!!!!! Help meeeeee!!!! 🌸🌸🌸🌸🌸
