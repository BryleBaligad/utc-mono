import { getIPFromRequest } from "../util/getIPFromRequest"
import { getRoleFromToken } from "../util/sessions/getRoleFromToken"
import { verifySession } from "../util/sessions/verifySession"
import type { AccountsPOSTRequest } from "./accounts.types"

export async function accountsRouter(req: Bun.BunRequest): Promise<Response> {
    switch(req.method) {
        case "POST":
            return accountsPOST(req)
    }
    return new Response("400 Bad Request", { status: 400 })
}

async function accountsPOST(req: Bun.BunRequest): Promise<Response> {
    let role;
    let sessionToken = req.cookies.get("UTC-Session")
    if (verifySession(sessionToken, getIPFromRequest(req))) {
        sessionToken = sessionToken as string
        role = getRoleFromToken(sessionToken)
    }

    let body = await req.json()
    if (isAccountsPOSTBody(body)) {
        // TODO: create account
    }
    return new Response()
}

function isAccountsPOSTBody(body: any): body is AccountsPOSTRequest {
    return body && typeof body.username == "string" && typeof body.password == "string"
}