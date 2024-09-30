import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        dir: './tests'
    },
    resolve: {
        alias: {
            '@/': new URL('./src/', import.meta.url).pathname
        }
    }
})
