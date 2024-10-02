import { MessageType } from '@/core/types'

export default class QueueManager {
    private queue: MessageType[] = []
    private isProcessing = false
    private wait = 0

    constructor(wait: number) {
        this.wait = wait
    }

    public push = (fn: () => Promise<number>) => {
        this.queue.push(fn)
        if (!this.isProcessing) this.process()
    }

    private sleep = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    private process = async () => {
        this.isProcessing = true

        while (this.queue.length > 0) {
            const fn = this.queue.shift() as () => Promise<number>

            let wait = this.wait
            if (fn) wait = await fn()

            if (wait) await this.sleep(wait)
        }

        this.isProcessing = false
    }
}
