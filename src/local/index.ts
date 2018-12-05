const program = require('commander')

import { Launcher } from './launcher'

const main = async (args : any) => {
    console.log("main: starting: ", args)
    const callsCount  = parseInt(args.calls)
    const sessionTimeSeconds = parseInt(args.time)
    const delayTimeMilliseconds = parseInt(args.delay)
    const peersCount = parseInt(args.peers)
    const audioTrack = args.audio
    const verbose = JSON.parse(args.verbose)
    
    console.log(`audioTrack ${audioTrack}`)

    const launcher = new Launcher({
        jvbEndpoint: args.endpoint,
        callsCount: callsCount,
        sessionTimeSeconds: sessionTimeSeconds,
        peersCount: peersCount,
        audioTrack: audioTrack,
        delayMilliseconds: delayTimeMilliseconds,
        verbose: verbose
    })

    try {
        await launcher.run()
    } catch (e) {
        console.log("main: error", e)
    }
    finally {
        console.log('main: done')
        process.exit(0)
    }
}

program
    .version(require('../package.json').version)
    .option('-c, --calls <C>', 'Number C of conference calls to create', 5)
    .option('-p, --peers <N>', 'Add N peers to each conference', 5)
    .option('-t, --time <S>', 'Session duration S seconds', 30)
    .option('-d, --delay <D>', 'Start call delay D ms', 2000)
    .option('-a, --audio <A>', 'A is uri to audio track', '')
    .option('-v, --verbose <V>', 'Verbose logging', false)
    .option('-e, --endpoint <E>', 'Jitsi-videobridge endpoint', 'http://localhost:8080')
    .parse(process.argv)

process.on("unhandledRejection", e => {
    console.log(e)
})
process.on("uncaughtException", e => {
    console.log(e)
})

main(program)
