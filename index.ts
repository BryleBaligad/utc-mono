// API v1

import { log } from "./log"

Bun.serve({
    port: 47838,
    routes: {
        "/api/v1/heartbeat": () => {
            return new Response("Success")
        }
    }
})

log(`Started API v1 on port ${("U".charCodeAt(0) * "T".charCodeAt(0) * "C".charCodeAt(0)) / 10}`)