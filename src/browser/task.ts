export class TaskCompletionSource<T> {
    private readonly promise: Promise<T>
    private resolve: null | ((value?: T) => void) = null
    private reject: null | ((reason?: any) => void) = null
  
    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve
            this.reject = reject
        })
    }
  
    task() {
        return this.promise
    }
  
    trySetResult(result: T) {
        if (!this.resolve) {
            return false
        }
        this.resolve(result)
        this.resolve = null
        return true
    }
  
    trySetException(error: Error) {
        if (!this.reject) {
            return false
        }
        this.reject(error)
        this.reject = null
        return true
    }
}