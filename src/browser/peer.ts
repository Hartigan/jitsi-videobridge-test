import { TaskCompletionSource } from './task'
import { PromiseQueue } from './queue'
import * as types from './jvb_types'

const sdpPlan = 'unified-plan'

interface PeerConfig {
    readonly peerId: string
    readonly bundleId: string
    readonly expire: number
    readonly noise: boolean
    readonly audioFileUri: string | null
}

export class Peer {
    private readonly config: PeerConfig

    private readonly queue = new PromiseQueue()
    private readonly pc = new RTCPeerConnection(<any>{ rtcpMuxPolicy: "require", bundlePolicy: "max-bundle", sdpSemantics: sdpPlan })
    private readonly audioContext = new AudioContext()

    private isJoined = false
    private dataChannel: null | RTCDataChannel = null
    private audioTransceiver: null | RTCRtpTransceiver = null

    private connectedTaskCompletionSource = new TaskCompletionSource<null>()
    private iceConnectedTaskCompletionSource = new TaskCompletionSource<null>()
    private dataChannelOpenedTaskCompletionSource = new TaskCompletionSource<null>()

    constructor(
        config: PeerConfig) {
        this.config = config
    }

    private parseServerAnswer(
        bundle: types.ChannelBundle,
        dataSctpConnection: types.SctpConnection): string {
        var c: types.Candidate = bundle.transport.candidates[0]
        var fingerprint: types.Fingerprint

        bundle.transport.candidates.forEach(function (candidate: types.Candidate) {
            if (candidate.protocol === 'udp') {
                c = candidate
            }
        })

        fingerprint = bundle.transport.fingerprints[0]

        var dummyPort: number = 9

        return 'v=0\n' +
            `o=jvb ${1} 1 IN IP4 0.0.0.0\n` +
            's=-\n' +
            'c=IN IP4 0.0.0.0\n' +
            't=0 0\n' +
            'a=ice-options:trickle\n' +
            'a=group:BUNDLE 0 1\n' +
            'a=msid-semantic:WMS *\n' +

            `m=audio ${dummyPort} UDP/TLS/RTP/SAVPF 111\n` +
            `a=ice-pwd:${bundle.transport.pwd}\n` +
            `a=ice-ufrag:${bundle.transport.ufrag}\n` +
            'a=setup:passive\n' +
            `a=fingerprint:${fingerprint.hash} ${fingerprint.fingerprint}\n` +
            `a=candidate:${c.foundation} ${c.component} ${c.protocol} ${c.priority} ${c.ip} ${c.port} typ ${c.type} ${c.generation}\n` +
            'a=recvonly\n' +
            `a=rtcp:${dummyPort} IN IP4 0.0.0.0\n` +
            'a=mid:0\n' +
            'a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\n' +
            'a=rtpmap:111 opus/48000/2\n' +
            'a=fmtp:111 useinbandfec=1;minptime=10\n' +
            'a=rtcp-mux\n' +
            'a=bundle-only\n' +

            `m=application ${dummyPort} UDP/DTLS/SCTP webrtc-datachannel\n` +
            `a=sctp-port:${dataSctpConnection.port}\n` +
            'a=bundle-only\n' +
            'a=sendrecv\n' +
            'a=mid:1\n' +
            `a=ice-pwd:${bundle.transport.pwd}\n` +
            `a=ice-ufrag:${bundle.transport.ufrag}\n` +
            'a=setup:passive\n' +
            `a=fingerprint:${fingerprint.hash} ${fingerprint.fingerprint}\n`;
    }

    private parseServerOffer(
        bundle: types.ChannelBundle,
        dataSctpConnection: types.SctpConnection,
        ssrcs: string[]) {
        var c: types.Candidate = bundle.transport.candidates[0]
        var fingerprint: types.Fingerprint

        bundle.transport.candidates.forEach(function (candidate: types.Candidate) {
            if (candidate.protocol === 'udp') {
                c = candidate
            }
        })

        fingerprint = bundle.transport.fingerprints[0]

        var dummyPort: number = 9

        var audioWithSsrcs : string = ''
        var mids : string = '0 1'
        ssrcs.forEach((ssrc, index) => {
            audioWithSsrcs += `m=audio ${dummyPort} UDP/TLS/RTP/SAVPF 111\n` +
            `a=ice-pwd:${bundle.transport.pwd}\n` +
            `a=ice-ufrag:${bundle.transport.ufrag}\n` +
            'a=setup:passive\n' +
            `a=fingerprint:${fingerprint.hash} ${fingerprint.fingerprint}\n` +
            `a=candidate:${c.foundation} ${c.component} ${c.protocol} ${c.priority} ${c.ip} ${c.port} typ ${c.type} ${c.generation}\n` +
            'a=sendrecv\n' +
            `a=rtcp:${dummyPort} IN IP4 0.0.0.0\n` +
            `a=mid:${index + 2}\n` +
            'a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\n' +
            'a=rtpmap:111 opus/48000/2\n' +
            'a=fmtp:111 useinbandfec=1;minptime=10\n' +
            'a=rtcp-mux\n' +
            'a=bundle-only\n' +
            ssrc + '\n'
            mids += ` ${index + 2}`
        });

        return 'v=0\n' +
            `o=jvb ${1} 1 IN IP4 0.0.0.0\n` +
            's=-\n' +
            'c=IN IP4 0.0.0.0\n' +
            't=0 0\n' +
            'a=ice-options:trickle\n' +
            `a=group:BUNDLE ${mids}\n` +
            'a=msid-semantic:WMS *\n' +

            `m=audio ${dummyPort} UDP/TLS/RTP/SAVPF 111\n` +
            `a=ice-pwd:${bundle.transport.pwd}\n` +
            `a=ice-ufrag:${bundle.transport.ufrag}\n` +
            'a=setup:passive\n' +
            `a=fingerprint:${fingerprint.hash} ${fingerprint.fingerprint}\n` +
            `a=candidate:${c.foundation} ${c.component} ${c.protocol} ${c.priority} ${c.ip} ${c.port} typ ${c.type} ${c.generation}\n` +
            'a=recvonly\n' +
            `a=rtcp:${dummyPort} IN IP4 0.0.0.0\n` +
            'a=mid:0\n' +
            'a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\n' +
            'a=rtpmap:111 opus/48000/2\n' +
            'a=fmtp:111 useinbandfec=1;minptime=10\n' +
            'a=rtcp-mux\n' +
            'a=bundle-only\n' +

            `m=application ${dummyPort} UDP/DTLS/SCTP webrtc-datachannel\n` +
            `a=sctp-port:${dataSctpConnection.port}\n` +
            'a=bundle-only\n' +
            'a=sendrecv\n' +
            'a=mid:1\n' +
            `a=ice-pwd:${bundle.transport.pwd}\n` +
            `a=ice-ufrag:${bundle.transport.ufrag}\n` +
            'a=setup:passive\n' +
            `a=fingerprint:${fingerprint.hash} ${fingerprint.fingerprint}\n` +
            audioWithSsrcs
    }

    async createOffer() {
        let audioTrack: MediaStreamTrack
        if (this.config.audioFileUri) {
            audioTrack = await this.audioFile(this.config.audioFileUri)
        } else if (this.config.noise) {
            audioTrack = this.noise()
        } else {
            audioTrack = this.silence()
        }

        const stream = new MediaStream()
        this.audioTransceiver = this.pc.addTransceiver(audioTrack, { direction: 'sendonly' })
        console.log(`audioTransceiver ${JSON.stringify(this.audioTransceiver)}`)

        this.dataChannel = this.pc.createDataChannel('default', { id: 0 })
        this.dataChannel.onmessage = this.handleDataChannelMessage.bind(this)
        this.dataChannel.onopen = () => {
            console.log('joinConference: data channel is opened for peer ' + JSON.stringify(this.config.peerId))
            this.dataChannelOpenedTaskCompletionSource.trySetResult(null)
        }

        const offer = await this.pc.createOffer()
        await this.pc.setLocalDescription(offer)

        const sdp: string = offer.sdp ? offer.sdp : ''
        var ufragExp = new RegExp('(?<=a=ice-ufrag:)\\S+(?=\\s)', 'm')
        var pwdExp = new RegExp('(?<=a=ice-pwd:)\\S+(?=\\s)', 'm')
        var fingerprintExp = new RegExp('(?<=a=fingerprint:)\\S+\\s\\S+(?=\\s)', 'm')
        var ssrcIdExp = new RegExp('(?<=a=ssrc:)\\d+(?=\\s)', 'm')
        var ssrcExp = new RegExp('(a=ssrc:[^\\n]+(?=\\n))+', 'gm')
        var opusExp = new RegExp('(?<=a=rtpmap:111\\s)[^\\n]+(?=\\n)', 'm')
        var opusParamsExp = new RegExp('(?<=a=fmtp:111\\s)[^\\n]+(?=\\n)', 'm')
        var extmapExp = new RegExp('(?<=a=extmap:)[^\\n]+(?=\\n)', 'm')

        console.log(`local sdp offer:\n${sdp}`)

        const ufrag: string = (ufragExp.exec(sdp) || [''])[0]
        const pwd: string = (pwdExp.exec(sdp) || [''])[0]
        const buff = (fingerprintExp.exec(sdp) || [''])[0]
        const fingerprint: string = buff.split(' ')[1]
        const setup: string = 'active'
        const hash: string = buff.split(' ')[0]
        const ssrcId: number = parseInt((ssrcIdExp.exec(sdp) || [''])[0])
        const ssrc: string = (sdp.match(ssrcExp) || ['']).join('\n')
        const opus: string[] = (sdp.match(opusExp) || [''])[0].split('/')
        const extmap: string = (sdp.match(extmapExp) || [''])[0]
        const extMapId = parseInt(extmap.split(' ')[0])
        const extMapUri = extmap.split(' ')[1]

        var opusParams : any = { }
        var rawParams = (sdp.match(opusParamsExp) || [''])[0].split(';')
        for(let rawParam of rawParams) {
            const splited = rawParam.split('=')
            opusParams[splited[0]] = parseInt(splited[1])
        }

        return {
            channel: {
                expire: this.config.expire,
                endpoint: this.config.peerId,
                'channel-bundle-id': this.config.bundleId,
                initiator: false,
                'rtp-level-relay-type': 'translator',
                direction: 'sendrecv',
                sources: [
                    ssrcId
                ],
                'payload-types': [
                    {
                        id: 111,
                        name: opus[0],
                        clockrate: parseInt(opus[1]),
                        channels: parseInt(opus[2]),
                        parameters: opusParams
                    }
                ],
                'rtp-hdrexts': [
                    {
                        id: extMapId,
                        uri: extMapUri
                    }
                ]
            },
            sctpconnection: {
                expire: this.config.expire,
                endpoint: this.config.peerId,
                'channel-bundle-id': this.config.bundleId,
                initiator: false
            },
            bundle: {
                id: this.config.bundleId,
                transport: {
                    xmlns: 'urn:xmpp:jingle:transports:ice-udp:1',
                    'rtcp-mux': true,
                    ufrag: ufrag,
                    pwd: pwd,
                    fingerprints: [
                        {
                            fingerprint: fingerprint,
                            setup: setup,
                            hash: hash
                        }
                    ]
                }
            },
            ssrc: ssrc
        }
    }

    join(
        conferenceId: string,
        bundle: types.ChannelBundle,
        endpoint: types.Endpoint,
        audioChannel: types.Channel,
        dataSctpConnection: types.SctpConnection,
        ssrcs: string[]
    ) {
        return this.queue.execute(async () => {
            console.log('joinConference: joining confernce ' + conferenceId + ' as peer ' + JSON.stringify(endpoint.id))

            this.pc.oniceconnectionstatechange = (ev: Event): any => {
                const target = ev.target as RTCPeerConnection
                console.log('ICE connection state become ' + target.iceConnectionState)
                if (target.iceConnectionState === 'connected') {
                    this.iceConnectedTaskCompletionSource.trySetResult(null)
                } if (target.iceConnectionState === 'failed') {
                    const iceConnectionFailed = new Error('ICE connection of peer ' + JSON.stringify(endpoint.id) + ' to conference ' + conferenceId + ' has failed')
                    this.iceConnectedTaskCompletionSource.trySetException(iceConnectionFailed)
                    this.connectedTaskCompletionSource.trySetException(iceConnectionFailed)
                    this.dataChannelOpenedTaskCompletionSource.trySetException(iceConnectionFailed)
                }
            }

            let serverAnswer = this.parseServerAnswer(bundle, dataSctpConnection)
            console.log(`server sdp answer:\n${serverAnswer}`)

            await this.pc.setRemoteDescription({ sdp: serverAnswer, type: 'answer' })

            let serverOffer = this.parseServerOffer(bundle, dataSctpConnection, ssrcs)
            console.log(`server sdp offer:\n${serverOffer}`)
            await this.pc.setRemoteDescription({ sdp: serverOffer, type: 'offer' })

            const localAnswer = await this.pc.createAnswer()
            console.log(`local sdp answer:\n${localAnswer.sdp}`)
            await this.pc.setLocalDescription(localAnswer)

            const candidatesGathered = new Promise((resolve, reject) => {
                if (this.pc.iceGatheringState === 'complete') {
                    console.log("ICE gathering completed");
                    resolve();
                } else {
                    this.pc.onicegatheringstatechange = (ev: Event): any => {
                        const target = ev.target as RTCPeerConnection
                        if (target.iceGatheringState === 'complete') {
                            console.log("ICE gathering completed");
                            resolve();
                        }
                    };
                }
            })

            await candidatesGathered
            this.isJoined = true
        })
    }

    leave() {
        return this.queue.execute(async () => {
            if (!this.isJoined) {
                console.error('leave: not joined')
                return
            }
            this.isJoined = false
            this.pc.close()
            await this.audioContext.close()
        })
    }

    private handleDataChannelMessage({ data }: { data: string }) {
        console.log('handleDataChannelMessage: <- enqueuing: ' + data)
        return this.queue.execute(async () => {
            if (this.pc.signalingState === 'closed') {
                console.warn('handleDataChannelMessage: RTCPeerConnection is closed')
                return
            }
            let msg = JSON.parse(data)
            console.log('handleDataChannelMessage: <- handling: ' + msg)
        })
    }

    waitIceConnected(): Promise<null> {
        return this.iceConnectedTaskCompletionSource.task()
    }

    waitDataChannelOpen(): Promise<null> {
        return this.dataChannelOpenedTaskCompletionSource.task()
    }

    private silence(): MediaStreamTrack {
        let oscillator = this.audioContext.createOscillator()
        let dst = oscillator.connect(this.audioContext.createMediaStreamDestination()) as MediaStreamAudioDestinationNode
        oscillator.start()
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: true })
    }

    private noise(): MediaStreamTrack {
        const bufferSize = 2 * this.audioContext.sampleRate

        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
        const output = noiseBuffer.getChannelData(0)
        for (var i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1
        }

        const whiteNoise = this.audioContext.createBufferSource()
        whiteNoise.buffer = noiseBuffer
        whiteNoise.loop = true

        const dst = whiteNoise.connect(this.audioContext.createMediaStreamDestination()) as MediaStreamAudioDestinationNode
        whiteNoise.start(0)

        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: true })
    }

    private async audioFile(uri: string): Promise<MediaStreamTrack> {
        console.time("audioFile")

        console.log("audioFile: about to load audio file from " + uri)
        const response = await fetch(uri, {
            method: 'GET',
            cache: 'force-cache',
        })

        console.log("audioFile: got reply " + response.status)

        const audioData = await response.arrayBuffer()

        console.log("audioFile: downloaded audio file size in bytes is " + audioData.byteLength)

        const audioBuffer = await this.audioContext.decodeAudioData(audioData)
        const bufferSource = await this.audioContext.createBufferSource()

        bufferSource.buffer = audioBuffer
        bufferSource.loop = true
        const dst = bufferSource.connect(this.audioContext.createMediaStreamDestination()) as MediaStreamAudioDestinationNode
        bufferSource.start(0)

        console.timeEnd("audioFile")

        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: true })
    }
}