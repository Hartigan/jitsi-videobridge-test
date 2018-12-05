export interface Fingerprint {
    readonly fingerprint            : string,
    readonly setup                  : string,
    readonly hash                   : string
}


export interface Candidate {
    readonly generation             : number,
    readonly component              : number,
    readonly protocol               : string,
    readonly port                   : number,
    readonly ip                     : string,
    readonly tcptype                : string,
    readonly foundation             : string,
    readonly id                     : string,
    readonly priority               : number,
    readonly type                   : string,
    readonly network                : number
}

export interface Transport {
    readonly candidates             : Candidate[],
    readonly xmlns                  : string,
    readonly ufrag                  : string,
    readonly "rtcp-mux"             : boolean,
    readonly pwd                    : string,
    readonly fingerprints           : Fingerprint[]
}

export interface ChannelBundle {
    readonly id                     : string,
    readonly transport              : Transport
}

export interface Endpoint {
    readonly id                     : string
}

export interface Channel {
    readonly endpoint               : string,
    readonly "channel-bundle-id"    : string,
    readonly sources                : number[],
    readonly ssrcs                  : number[],
    readonly "rtp-level-relay-type" : string,
    readonly expire                 : number,
    readonly initiator              : boolean,
    readonly id                     : string,
    readonly direction              : string
}

export interface SctpConnection {
    readonly endpoint               : string,
    readonly "channel-bundle-id"    : string,
    readonly port                   : number,
    readonly expire                 : number,
    readonly initiator              : boolean,
    readonly id                     : string
}

export interface Content {
    readonly name                   : string,
    readonly channels?              : Channel[],
    readonly sctpconnections?       : SctpConnection[]
}

export interface CreateConferenceAnswer {
    readonly "channel-bundles"  : ChannelBundle[],
    readonly endpoints          : Endpoint[],
    readonly contents           : Content[],
    readonly id                 : string
}