import { sendCORSOptions } from ".."
import { getDb } from "../db"
import { censor, log } from "../log"
import { getIPFromRequest } from "../util/getIPFromRequest"
import { getAccountFromToken } from "../util/sessions/getAccountFromToken"
import { getRoleFromToken } from "../util/sessions/getRoleFromToken"
import { verifySession } from "../util/sessions/verifySession"
import type { SessionsPOSTRequest } from "./sessions.types"

export async function sessionsRouter(req: Bun.BunRequest): Promise<Response> {
    let res = new Response("400 Bad Request", { status: 400 })
    switch(req.method) {
        case "GET":
            res = await sessionsGET(req)
            break
        case "POST":
            res = await sessionsPOST(req)
            break
        case "DELETE":
            res = await sessionsDELETE(req)
            break
        case "OPTIONS":
            res = await sendCORSOptions()
            break
    }

    res.headers.set("Access-Control-Allow-Origin", "*")

    return res
}

async function sessionsGET(req: Bun.BunRequest): Promise<Response> {
    let sessionToken = req.cookies.get("UTC-Session")
    if (verifySession(sessionToken, getIPFromRequest(req))) {
        sessionToken = sessionToken as string

        req.cookies.set("UTC-Session", sessionToken, {
            httpOnly: true,
            maxAge: 900,
            path: "/",
            sameSite: "none",
            domain: ".baligad.net",
            secure: true
        })

        return Response.json({ role: getRoleFromToken(sessionToken), id: getAccountFromToken(sessionToken).id })
    }

    return new Response("401 Unauthorized", { status: 401 })
}

async function sessionsDELETE(req: Bun.BunRequest): Promise<Response> {
    let db = getDb()

    let sessionToken = req.cookies.get("UTC-Session")
    if (verifySession(sessionToken, getIPFromRequest(req))) {
        sessionToken = sessionToken as string

        db.query("UPDATE sessions SET expired = TRUE WHERE token = ?").run(sessionToken)

        req.cookies.delete("UTC-Session")

        return new Response("200 OK")
    }

    return new Response("400 Bad Request", { status: 400 })
}

async function sessionsPOST(req: Bun.BunRequest): Promise<Response> {
    let db = getDb()

    let body = await req.json()
    if (isSessionsPOSTBody(body)) {
        let account: any = db.query("SELECT * FROM accounts WHERE username = ?").get(body.username)

        if (!account) {
            return new Response("404 Not Found", { status: 404 })
        }

        if (!(await Bun.password.verify(body.password, account.password))) {
            return new Response("401 Unauthorized", { status: 401 })
        }

        if (account.activated == 0) {
            return new Response("403 Forbidden", { status: 403 })
        }

        let accountId = account.id
        let newSessionToken = crypto.randomUUID()
        let ip = getIPFromRequest(req)
        let expiry = Date.now() + 900000
        let created_at = Date.now()

        db.query('INSERT INTO sessions (account_id, token, ip_address, expiry, expired, created_at) VALUES (?, ?, ?, ?, FALSE, ?)').run(accountId, newSessionToken, ip, expiry, created_at)

        let sessionToken = req.cookies.get("UTC-Session")
        if (verifySession(sessionToken, ip)) {
            sessionToken = sessionToken as string

            // set old session as expired since they're requesting a new one
            db.query("UPDATE sessions SET expired = TRUE WHERE token = ?").run(sessionToken)
        }

        req.cookies.set("UTC-Session", newSessionToken, {
            httpOnly: true,
            maxAge: 900,
            path: "/",
            sameSite: "none",
            domain: ".baligad.net",
            secure: true
        })

        log(`${censor(body.username, 2)} (${getIPFromRequest(req)}) logged in`)

        return Response.json({ role: getRoleFromToken(newSessionToken), id: getAccountFromToken(newSessionToken).id })
    }

    return new Response("400 Bad Request", { status: 400 })
}

function isSessionsPOSTBody(body: any): body is SessionsPOSTRequest {
    return body && typeof body.username == "string" && typeof body.password == "string"
}