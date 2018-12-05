import { Call } from './call'

const delay = (ms: number) => new Promise((resolve, reject) => setTimeout(resolve, ms))

interface LauncherConfig {
    readonly jvbEndpoint: string,
    readonly peersCount: number,
    readonly callsCount: number,
    readonly sessionTime: number,
    readonly audioTrack? : string,
    readonly delay : number,
    readonly verbose : boolean
}

export class Launcher {
    private readonly config: LauncherConfig

    constructor(config: LauncherConfig) {
        this.config = config
    }

    async run() {
        var calls : any[] = []
        console.log(`calls count = ${this.config.callsCount}`)
        for (var i = 0; i < this.config.callsCount; i++) {
            var call = new Call(this.config, i)
            calls.push(call.startCall())
            await delay(this.config.delay)
        }

        console.log("Launcher.run : will wait until all simulations completed")
        await Promise.all(calls)
        console.log("Launcher.run : all simulations completed")
    }
}