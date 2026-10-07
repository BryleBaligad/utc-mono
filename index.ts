// API v1

import { init } from "./initdb"
import { log } from "./log"
import { accountsRouter } from "./routes/accounts"
import { activation } from "./routes/activation"
import { sessionsRouter } from "./routes/sessions"
import { tripsRouter } from "./routes/trips"
import { vehiclesRouter } from "./routes/vehicles"

await init()

export let server = Bun.serve({
    port: ("U".charCodeAt(0) * "T".charCodeAt(0) * "C".charCodeAt(0)) / 10,
    routes: {
        // static routes
        "/": () => {
            return new Response(Bun.file("./static/index.html"))
        },
        "/*": {
            dir: "./static"
        },

        // api routes
        "/api/v1/heartbeat": () => {
            return new Response("Success")
        },
        "/api/v1/accounts": accountsRouter,
        "/api/v1/accounts/:id": accountsRouter,
        "/api/v1/accounts/:id/details": accountsRouter,
        "/api/v1/accounts/activation": activation,
        "/api/v1/sessions": sessionsRouter,
        "/api/v1/vehicles": vehiclesRouter,
        "/api/v1/vehicles/:id": vehiclesRouter,
        "/api/v1/vehicles/:id/image": vehiclesRouter,
        "/api/v1/trips": tripsRouter,
        "/api/v1/trips/:id": tripsRouter
    }
})

export function sendCORSOptions() {
    return new Response(null, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS"
        }
    })
}

log(`Started API v1 on port ${server.port}`)