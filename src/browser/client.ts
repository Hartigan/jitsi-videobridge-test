import * as types from './jvb_types'
import { Peer } from './peer'


interface JVBConfig {
    readonly endpoint: string
}

export function getPeerId(i: number) {
    return 'peer_' + i
}

export function getBundleId(i: number) {
    return 'bundle_' + getPeerId(i)
}

export class JVBClient {
    private readonly config: JVBConfig
  
    constructor(config: JVBConfig) {
      this.config = config
    }
  
    async createConference(peers: Peer[]) {
        const endpoint = this.config.endpoint + '/colibri/conferences'
        console.log('createConference: POST to ' + endpoint)

        var channels = []
        var sctpconnections = []
        var bundles = []
        var ssrcs = []

        for(let peer of peers) {
            let offer = await peer.createOffer()
            channels.push(offer.channel)
            sctpconnections.push(offer.sctpconnection)
            bundles.push(offer.bundle)
            ssrcs.push(offer.ssrc)
        }

        const body : string = JSON.stringify({
            contents: [
                {
                    name: 'audio',
                    channels: channels
                },
                {
                    name: 'data',
                    sctpconnections: sctpconnections
                }
            ],
            'channel-bundles': bundles
        })

        console.log('request: ' + body)

        const response = await fetch(endpoint, {
            method: 'POST',
            body: body,
            headers: { 'Content-Type': 'application/json' }
        })

        console.log('createConference: response status = ' + response.status)
        const reply = await response.text()

        console.log('response: ' + reply)

        const replyMsg = JSON.parse(reply)
        if (!response.ok) {
            console.log('createConference: reply msg = ' + reply)
        }

        return { answer: <types.CreateConferenceAnswer>replyMsg, ssrcs: ssrcs } 
    }
}
