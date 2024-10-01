import Logger from '..'

const log = new Logger({
    format: 'json'
})

log.debug('this is a debug message that will be logged as JSON in the console', { some: 'data' })

// for classes, you will have to make something to serialize it or it will be logged as an empty object
log.error('check it by yourself!!', new Error('this is an error'))

log.info('so you can parse it and do whatever you want with it', Symbol('symbol'))

log.warn('it has a timestamp, a level, and the message', BigInt(1234567890))

// OUTPUT:
// {"level":"debug","messages":["this is a debug message that will be logged as JSON in the console",{"some":"data"}],"timestamp":"2024-09-30T21:59:44.110Z"}
// {"level":"error","messages":["check it by yourself!!",{}],"timestamp":"2024-09-30T21:59:44.112Z"}
// {"level":"info","messages":["so you can parse it and do whatever you want with it","Symbol(symbol)"],"timestamp":"2024-09-30T21:59:44.113Z"}
// {"level":"warn","messages":["it has a timestamp, a level, and the message","1234567890n"],"timestamp":"2024-09-30T21:59:44.113Z"}
