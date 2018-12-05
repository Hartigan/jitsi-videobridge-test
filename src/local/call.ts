const puppeteer = require('puppeteer')
const path = require("path")

interface CallConfig {
    readonly peersCount: number,
    readonly sessionTimeSeconds: number,
    readonly verbose : boolean
}

export class Call {
    private readonly config: CallConfig
    private readonly callId: number
    private browser : any

    constructor(config: CallConfig, callId: number) {
        this.config = config
        this.callId = callId
    }

    private async startBrowser() {
        console.log("startBrowser: starting browser")
        const args = [
            '--disable-web-security',
            '--temp-profile',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            `${this.config.verbose ? '-v=1 --enable-logging' : ''}`,
        ]

        console.log("startBrowser: launching chrome with " + args.join(' '))

        this.browser = await puppeteer.launch({
            headless: true,
            dumpio: false,
            ignoreHTTPSErrors: true,
            args: args
        })
        console.log("startBrowser:" + await this.browser.version())
    }

    async startCall() {
        await this.startBrowser()
        const page = await this.browser.newPage()

        try {

            page.on('console', (msg : any) => console.log('LOG: [', this.callId, "]: ", msg.text()))

            await page.exposeFunction('provideConfig', (...args : any[]) => {
                console.log('simulateConferenceCall: provideConfig - providing configuration')
                const config: any = {}
                Object.assign(config, this.config)
                config.callId = this.callId
                console.log("simulateConferenceCall: provideConfig - ", config)
                return config
            })

            const conferenceCreatedPromise = new Promise((resolve, reject) => {
                page.exposeFunction('onConferenceCreated', (id : number, error? : Error) => {
                    console.log('onConferenceCreated: conference created ', id, error)
                    if (error) {
                        reject(error)
                    } else {
                        resolve(id)
                    }
                })
            })

            const allPeersJoinedPromise = new Promise(async (resolve, reject) => {
                console.log('simulateConferenceCall: registering onAllPeersJoined')
                await page.exposeFunction('onAllPeersJoined', (error? : Error) => {
                    console.log('simulateConferenceCall: onAllPeersJoined called')
                    if (error) {
                        reject(error)
                    } else {
                        resolve()
                    }
                })
            })
        
            const allPeersConnectedPromise = new Promise(async (resolve, reject) => {
                console.log('simulateConferenceCall: registering onAllPeersConnected')
                await page.exposeFunction('onAllPeersConnected', (error? : Error) => {
                    console.log('simulateConferenceCall: onAllPeersConnected called')
                    if (error) {
                        reject(error)
                    } else {
                        resolve()
                    }
                })
            })
        
            const allPeersLeftPromise = new Promise(async (resolve, reject) => {
                console.log('simulateConferenceCall: registering onAllPeersLeft')
                await page.exposeFunction('onAllPeersLeft', (error? : Error) => {
                    console.log('simulateConferenceCall: onAllPeersLeft called')
                    if (error) {
                        reject(error)
                    } else {
                        resolve()
                    }
                })
            })
        
            const donePromise = new Promise(async (resolve, reject) => {
                console.log('simulateConferenceCall: registering onApplicationDone')
                await page.exposeFunction('onApplicationDone', (error? : Error) => {
                    console.log('simulateConferenceCall: onApplicationDone called')
                    if (error) {
                        reject(error)
                    } else {
                        resolve()
                    }
                })
            })
        
            await page.addScriptTag({ path: path.join(__dirname, '../node_modules/requirejs/require.js') })
            console.log("simulateConferenceCall: added 'require.js'")
            await page.addScriptTag({ path: path.join(__dirname, 'browser_app.js') })
            console.log("simulateConferenceCall: added 'browser_app.js'")
            await page.addScriptTag({ content: "requirejs(['browser_app']);" })

            let conferenceId = await conferenceCreatedPromise
            console.log("simulateConferenceCall: conference created: ", conferenceId)
            await allPeersJoinedPromise
            console.log("simulateConferenceCall: all peers joined")
            await allPeersConnectedPromise
            console.log("simulateConferenceCall: all peers connected")
            await allPeersLeftPromise
            console.log("simulateConferenceCall: all peers left")
            await donePromise
            console.log("simulateConferenceCall: simulation completed")

        
        } catch (error) {
            console.error('startCall: error ', error)
        } finally {
            console.log("simulateConferenceCall: closing browser page")
            await page.close()
            await this.endCall()
        }

        console.log('startCall: done')
    }

    async endCall() {
        if (!this.browser) {
            console.error("endCall: no browser")
            return
        }
        console.log("endCall: closing browser")
        await this.browser.close()
        console.log("endCall: closed browser")
    }
}