import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    plugins: [tsconfigPaths()],
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
