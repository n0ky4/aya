export class ExitHandler {
    private static instance: ExitHandler
    private callbacks: (() => void)[] = []

    private constructor() {
        const EXIT_EVENTS = [
            'beforeExit',
            'SIGINT',
            'SIGUSR1',
            'SIGUSR2',
            'uncaughtException',
            'SIGTERM'
        ] as const

        EXIT_EVENTS.forEach((event) => {
            process.on(event, () => {
                this.callbacks.forEach((cb) => cb())
            })
        })
    }

    static getInstance(): ExitHandler {
        if (!ExitHandler.instance) ExitHandler.instance = new ExitHandler()
        return ExitHandler.instance
    }

    addCallback(callback: () => void): void {
        this.callbacks.push(callback)
    }
}
