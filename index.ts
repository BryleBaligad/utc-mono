// API v1

import { init } from "./initdb";
import { log } from "./log"

await init();

Bun.serve({
    port: 47838,
    routes: {
        "/api/v1/heartbeat": () => {
            return new Response("Success")
        }
    }
})

log(`Started API v1 on port ${("U".charCodeAt(0) * "T".charCodeAt(0) * "C".charCodeAt(0)) / 10}`)