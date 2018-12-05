import { Call } from './call'

const delay = (ms: number) => new Promise((resolve, reject) => setTimeout(resolve, ms))

interface LauncherConfig {
    readonly jvbEndpoint: string,
    readonly peersCount: number,
    readonly callsCount: number,
    readonly sessionTimeSeconds: number,
    readonly audioTrack? : string,
    readonly delayMilliseconds : number,
    readonly verbose : boolean
}

export class Launcher {
    private readonly config: LauncherConfig

    constructor(config: LauncherConfig) {
        this.config = config
    }

    async run() {
        let calls: Promise<void>[] = []
        console.log(`calls count = ${this.config.callsCount}`)
        for (let i = 0; i < this.config.callsCount; i++) {
            let call = new Call(this.config, i)
            calls.push(call.startCall())
            await delay(this.config.delayMilliseconds)
        }

        console.log("Launcher.run : will wait until all simulations completed")
        await Promise.all(calls)
        console.log("Launcher.run : all simulations completed")
    }
}