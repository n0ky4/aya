import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Logger from '../src'

import fs from 'node:fs'
import { sleep } from '../src/core/common'
const promises = fs.promises

describe('Logger FileSystem', () => {
    let logger: Logger

    const tmp = os.tmpdir()
    const mainDir = path.resolve(tmp, 'logger__test')
    const DIR = path.join(mainDir, 'logs')

    const cleanup = async () =>
        promises.rm(mainDir, { recursive: true, force: true }).catch(() => {})

    beforeEach(async () => {
        await cleanup()

        logger = new Logger({
            file: {
                use: true,
                maxSize: '1KB',
                path: DIR
            }
        })
    })

    afterEach(async () => {
        await cleanup()
        expect(fs.existsSync(DIR)).toBe(false)
    })

    it('should create the log file and write logs to it', async () => {
        logger.info('Test log message')
        expect(fs.existsSync(DIR)).toBe(true)

        logger['finalize']()

        await sleep(100)
        const files = await promises.readdir(DIR)

        expect(files.length).toBe(1)

        const logFile = await promises.readFile(path.join(DIR, files[0]), 'utf-8')

        expect(logFile.toLowerCase()).toContain('info')
        expect(logFile).toContain('Test log message')
    })

    it('should rotate log file when max size is exceeded', async () => {
        // Simulate large log messages to exceed the max size quickly
        for (let i = 0; i < 50; i++) {
            logger.info('A very large log message '.repeat(50))
        }

        logger['finalize']()

        await sleep(100)
        const logFiles = await promises.readdir(DIR)

        expect(logFiles.length).toBeGreaterThan(1)
    })
})
