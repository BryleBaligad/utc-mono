import { getDb } from "../db"
import { censor, log } from "../log"
import { Brevo } from "../util/email/brevo"
import { sendActivationEmail } from "../util/email/sendActivationEmail"
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
    let db = getDb()

    let role;
    let sessionToken = req.cookies.get("UTC-Session")
    if (verifySession(sessionToken, getIPFromRequest(req))) {
        sessionToken = sessionToken as string
        role = getRoleFromToken(sessionToken)
    }

    let body = await req.json()
    if (isAccountsPOSTBody(body)) {
        // Body has activated/role specified and role doesn't exist (unauthenticated) or isn't admin
        // Only role "admin" can create accounts with specified role
        if (body.activated || body.role && role == "") {
            return new Response("401 Unauthorized", { status: 401 })
        }

        if (body.activated || body.role && role != "admin") {
            return new Response("403 Forbidden", { status: 403 })
        }

        let activationCode = crypto.randomUUID()
        let password = await Bun.password.hash(body.password + "")

        // Body _should_ be from registration form here; no role and pre-activation
        // username is assumed to be an email address
        if (!body.activated && !body.role) {
            let isExists = db.query(`SELECT COUNT(*) FROM accounts WHERE username = ?`).get(body.username);
            if (isExists != 0) {
                return new Response("409 Conflict", { status: 409 })
            }

            db.query(`
                INSERT INTO accounts (
                    username, 
                    password, 
                    role, 
                    activation_code, 
                    activated,
                    created_at
                ) VALUES (
                    ?, 
                    ?, 
                    'customer', 
                    ?, 
                    FALSE,
                    ?
                )`)
            .run(body.username, password, activationCode, Date.now())

            log(`${censor(body.username, 2)} created customer account`)

            let account: any = db.query("SELECT * FROM accounts WHERE username = ?").get(body.username);

            sendActivationEmail(body.username, activationCode, new Brevo());

            return new Response(JSON.stringify(account), { 
                headers: {
                    Location: `/api/v1/accounts/${account.id}`,
                    "Content-Type": "application/json"
                },
                status: 201
            })
        }
    }
    return new Response()
}

function isAccountsPOSTBody(body: any): body is AccountsPOSTRequest {
    return body && typeof body.username == "string" && typeof body.password == "string"
}