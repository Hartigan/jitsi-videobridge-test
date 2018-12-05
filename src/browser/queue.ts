import { TaskCompletionSource } from './task'

export class PromiseQueue {
    private readonly queue: Array<() => Promise<any>> = []
    private running: boolean

    constructor() {
        this.running = false
    }
  
    execute<T>(promiseFactory: () => Promise<T>) {
        const tcs = new TaskCompletionSource<T>()
        this.queue.push(async () => {
            try {
                const result = await Promise.resolve(promiseFactory())
                tcs.trySetResult(result)
            } catch (e) {
                tcs.trySetException(e)
            }
        })
        this.ensureRunning()
        return tcs.task()
    }
  
    async ensureRunning() {
        if (this.running) {
            return
        }
        this.running = true
  
        while (this.queue.length > 0) {
            let promiseFactory = this.queue.shift()
            try {
                if (promiseFactory) {
                    await promiseFactory()
                }
            } catch (e) {
                console.log('Error while executing promise: ' + e)
            }
        }

        this.running = false
    }
}
