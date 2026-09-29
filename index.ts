// API v1

import { init } from "./initdb"
import { log } from "./log"
import { accountsRouter } from "./routes/accounts"

await init()

export let server = Bun.serve({
    port: ("U".charCodeAt(0) * "T".charCodeAt(0) * "C".charCodeAt(0)) / 10,
    routes: {
        "/api/v1/heartbeat": () => {
            return new Response("Success")
        },
        "/api/v1/accounts": accountsRouter
    }
})

log(`Started API v1 on port ${server.port}`)