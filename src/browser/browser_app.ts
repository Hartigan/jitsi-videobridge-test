import { Peer } from './peer'
import { JVBClient, getPeerId, getBundleId } from './client'
import * as types from './jvb_types'

const delay = (ms: number) => new Promise((resolve, reject) => setTimeout(resolve, ms))

interface ApplicationConfig {
    readonly jvbEndpoint: string
    readonly peersCount: number
    readonly sessionTime: number
    readonly noIceConnectivityChecks: boolean
    readonly noDataChannelOpenedChecks: boolean
    readonly noise: boolean
    readonly audioTrack: string | null
}

class Application {
    private readonly config: ApplicationConfig
    private readonly jvb: JVBClient

    onConferenceCreated = (id?: string, error?: Error) => { }
    onPeersJoined = (error?: Error) => { }
    onPeersConnected = (error?: Error) => { }
    onPeersLeft = (error?: Error) => { }

    constructor(config: ApplicationConfig) {
        this.jvb = new JVBClient({
            endpoint: config.jvbEndpoint
        })
        this.config = config
    }

    async run() {
        console.log('run: application is now running')

        const peers = []
        for (let i = 0; i < this.config.peersCount; i++) {

            let peerId = getPeerId(i)
            let bundleId = getBundleId(i)

            const peer = new Peer({
                expire: 60,
                peerId: peerId,
                bundleId: bundleId,
                noise: this.config.noise,
                audioFileUri: this.config.audioTrack
            })

            peers.push(peer)
        }


        let answer
        let ssrcs : string[]
        try {
            let result = await this.jvb.createConference(peers)
            answer = result.answer
            ssrcs = result.ssrcs
            console.log('run: create conference: ', answer.id)
            this.onConferenceCreated(answer.id)
        } catch (e) {
            this.onConferenceCreated(undefined, e)
            return;
        }

        const conferenceId : string = answer.id        

        try {

            for (let i = 0; i < peers.length; i++) {

                let peerId = getPeerId(i)
                let bundleId = getBundleId(i)
                let peer = peers[i];
    
                let bundle = answer['channel-bundles'].find(function (b: types.ChannelBundle) {
                    return b.id === bundleId
                })
    
                let endpoint = answer.endpoints.find(function (e: types.Endpoint) {
                    return e.id === peerId
                })
    
                let audio = answer.contents.find(function (c: types.Content) {
                    return c.name === 'audio'
                })
    
                let channels = audio ? (audio.channels ? audio.channels : []) : []
    
                let audioChannel = channels.find(function (ch: types.Channel) {
                    return ch.id === peerId
                })
    
                let data = answer.contents.find(function (c: types.Content) {
                    return c.name === 'data'
                })
    
                let sctpconnections = data ? (data.sctpconnections ? data.sctpconnections : []) : []
    
                let dataSctpConnection = sctpconnections.find(function (sctp: types.SctpConnection) {
                    return sctp.id === peerId
                })
    
                answer.contents.forEach(function (c: types.Content) {
                    if (c.name === 'audio' && c.channels) {
                        c.channels.forEach(function (ch: types.Channel) {
                            if (ch.endpoint === peerId) {
                                audioChannel = ch
                            }
                        })
                    } else if (c.name === 'data' && c.sctpconnections) {
                        c.sctpconnections.forEach(function (sctp: types.SctpConnection) {
                            if (sctp.endpoint === peerId) {
                                dataSctpConnection = sctp
                            }
                        })
                    }
                })
    
                if (bundle === undefined) {
                    console.log('run: bundle is undefined');
                    return;
                }
    
                if (endpoint === undefined) {
                    console.log('run: endpoint is undefined');
                    return;
                }
    
                if (audioChannel === undefined) {
                    console.log('run: audioChannel is undefined');
                    return;
                }
    
                if (dataSctpConnection === undefined) {
                    console.log('run: dataSctpConnection is undefined');
                    return;
                }
    
                var currentSsrcs = []

                for (let j = 0; j < peers.length; j++) {
                    if (i !== j) {
                        currentSsrcs.push(ssrcs[j]);
                    }
                }

                await peer.join(conferenceId, bundle, endpoint, audioChannel, dataSctpConnection, currentSsrcs)
    
                console.log("run: peer #" + i + " of " + peers.length + " / " + conferenceId + " joined")
    
                if (!this.config.noIceConnectivityChecks) {
                    await peer.waitIceConnected()
                    console.log("run: peer #" + i + " of " + peers.length + " / " + conferenceId + " ice connected")
                }
    
                if (!this.config.noDataChannelOpenedChecks) {
                    await peer.waitDataChannelOpen()
                    console.log("run: peer #" + i + " of " + peers.length + " / " + conferenceId + " data channel opened")
                }
            }

            console.log('run: all ' + peers.length + ' peers joined to conference ' + conferenceId)
            this.onPeersJoined()

            if (!this.config.noIceConnectivityChecks) {
                await Promise.all(peers.map(p => p.waitIceConnected()))
                console.log("run: all " + peers.length + " ice connected to conference " + conferenceId)
            }

            if (!this.config.noDataChannelOpenedChecks) {
                await Promise.all(peers.map(p => p.waitDataChannelOpen()))
                console.log("run: all " + peers.length + " opened data channel to conference " + conferenceId)
            }

            this.onPeersConnected()

            console.log("run: will keep peers in the conference " + conferenceId + " for " + this.config.sessionTime + " ms")
            await delay(this.config.sessionTime * 1000)
            this.peersSummary(peers)
        } catch (e) {
            console.error('run: application failed: ' + e)
            this.onPeersJoined(e)
            this.onPeersConnected(e)
        } finally {
            console.log('run: about to leave ' + peers.length + ' peers')
            try {
                for (let i = 0; i < peers.length; i++) {
                    await peers[i].leave()
                    console.log("run: left peer #" + i + " of " + peers.length + " to conference " + conferenceId)
                }

                console.log('run: ' + peers.length + ' peers has left ' + conferenceId)
                this.onPeersLeft()
            } catch (e) {
                console.error("run: error during leaving peers " + e)
                this.onPeersLeft(e)
            }

            console.log('run: application is completed')
        }
    }

    private peersSummary(peers: Array<Peer>) {
        let onAirCount = 0
        let noOnAirCount = 0
        for (let p of peers) {
            if (p.state === 'connected' && p.connectionStatus === 'on_air') {
                onAirCount++
            } else {
                noOnAirCount++
            }
        }
        console.log("peersSummary: connected (on_air) " + onAirCount + " rest peers " + noOnAirCount)
    }
}

console.log('main.js: starting');

interface ApplicationContext {
    provideConfig(): Promise<ApplicationConfig>
    onConferenceCreated(id?: string, error?: Error): Promise<void>;
    onAllPeersConnected(error?: Error): Promise<void>;
    onAllPeersJoined(error?: Error): Promise<void>;
    onAllPeersLeft(error?: Error): Promise<void>;
    onApplicationDone(error?: Error): Promise<void>;
}

(async (applicationContext: ApplicationContext) => {
    if (!applicationContext) {
        console.error("main.js: no application context")
        return
    }
    const config = await applicationContext.provideConfig()
    console.log("main.js: config is " + JSON.stringify(config))
    const application = new Application({
        peersCount: config.peersCount || 1,
        sessionTime: config.sessionTime || 10,
        jvbEndpoint: config.jvbEndpoint || 'http://127.0.0.1:8080',
        noise: config.noise,
        audioTrack: config.audioTrack,
        noIceConnectivityChecks: config.noIceConnectivityChecks || false,
        noDataChannelOpenedChecks: config.noDataChannelOpenedChecks || false
    })
    application.onConferenceCreated = (id?: string, error?: Error) => applicationContext.onConferenceCreated(id, error)
    application.onPeersConnected = (error?: Error) => applicationContext.onAllPeersConnected(error)
    application.onPeersJoined = (error?: Error) => applicationContext.onAllPeersJoined(error)
    application.onPeersLeft = (error?: Error) => applicationContext.onAllPeersLeft(error)
    try {
        await application.run()
        console.log('main.js: Applicatoin is completed')
        applicationContext.onApplicationDone()
    } catch (e) {
        console.error('main.js: Aplication is completed with error: ' + e)
        applicationContext.onApplicationDone(e)
    }
})(window as Window & ApplicationContext)
