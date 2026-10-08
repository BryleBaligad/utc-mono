import { sendCORSOptions } from ".."
import { getDb } from "../db"
import { censor, log } from "../log"
import { Brevo } from "../util/email/brevo"
import { sendActivationEmail } from "../util/email/sendActivationEmail"
import { getIPFromRequest } from "../util/getIPFromRequest"
import { getAccountFromToken } from "../util/sessions/getAccountFromToken"
import { getRoleFromToken } from "../util/sessions/getRoleFromToken"
import { verifySession } from "../util/sessions/verifySession"
import type { AccountsPOSTRequest } from "./accounts.types"

export async function accountsRouter(req: Bun.BunRequest): Promise<Response> {
    let res = new Response("400 Bad Request", { status: 400 });

    switch(req.method) {
        case "GET":
            res = await accountsGET(req)
            break
        case "DELETE":
            res = await accountsDELETE(req)
            break
        case "PATCH":
            res = await accountsPATCH(req)
            break
        case "POST":
            res = await accountsPOST(req)
            break
        case "OPTIONS":
            res = await sendCORSOptions()
    }

    res.headers.set("Access-Control-Allow-Credentials", "true")
    if (req.headers.get("Origin")?.includes("baligad.net")) {
        res.headers.set("Access-Control-Allow-Origin", req.headers.get("Origin") || "*")
    }

    return res
}

async function accountsGET(req: Bun.BunRequest): Promise<Response> {
    let db = getDb()

    let role
    let reqAccount
    let sessionToken = req.cookies.get("UTC-Session")
    console.log(sessionToken)
    if (verifySession(sessionToken, getIPFromRequest(req))) {
        sessionToken = sessionToken as string
        role = getRoleFromToken(sessionToken)

        reqAccount = getAccountFromToken(sessionToken)
    } else {
        return new Response("401 Unauthorized", { status: 401 })
    }

    if (role == "customer" && req.params.id == reqAccount.id) {
        let responseJson = {
            id: reqAccount.id,
            username: reqAccount.username,
            role: reqAccount.role,
            activated: reqAccount.activated == 1 ? "Yes" : "No",
            created_at: new Date(parseInt(reqAccount.created_at)).toLocaleString("sv"),
            name: reqAccount.name,
            account_details: null
        }

        let accountDetails: any = db.query("SELECT first_name, middle_name, last_name, mobile_number, email_address, note, extra_fields FROM account_details WHERE account_id = ?").get(reqAccount.id)

        if (accountDetails) {
            responseJson.account_details = accountDetails
        }
        
        return Response.json(responseJson)
    }

    if (role != "admin" && role != "manager" && role != "driver") {
        if (reqAccount) {
            log(`User ${censor(reqAccount.username, 2)} (${getIPFromRequest(req)}) attempted retrieving accounts list`)
        } else {
            log(`IP ${getIPFromRequest(req)} attempted retrieving accounts list`)
        }
        return new Response("403 Forbidden", { status: 403 })
    }

    if (req.params.id) {
        let account: any = db.query("SELECT id, username, role, activated, created_at, name FROM accounts WHERE id = ?").get(req.params.id)

        if (!account) {
            return new Response("404 Not Found", { status: 404 })
        }

        let responseJson = {
            id: account.id,
            username: account.username,
            role: account.role,
            activated: account.activated == 1 ? "Yes" : "No",
            created_at: new Date(parseInt(account.created_at)).toLocaleString("sv"),
            name: account.name,
            account_details: null
        }

        let accountDetails: any = db.query("SELECT first_name, middle_name, last_name, mobile_number, email_address, note, extra_fields FROM account_details WHERE account_id = ?").get(req.params.id)

        if (accountDetails) {
            responseJson.account_details = accountDetails
        }

        if (role == "driver") {
            let tripsAssignedToDriverAndCustomer = db.query("SELECT * FROM trips WHERE account_id = ? AND driver_id = ?").all(req.params.id, account.id)

            if (!tripsAssignedToDriverAndCustomer) {
                return new Response("404 Not Found", { status: 404 })
            }

            // hide username/email address from driver
            delete responseJson["username"]
            if (responseJson.account_details) {
                delete responseJson.account_details["email_address"]
            }
        }

        log(`User ${reqAccount.username} (${getIPFromRequest(req)}) retrieved details of account ${req.params.id}`)

        return Response.json(responseJson)
    }

    if (role == "driver") {
        log(`User ${reqAccount.username, 2} (${getIPFromRequest(req)}) attempted retrieving accounts list`)
        return new Response("403 Forbidden", { status: 403 })
    }

    let accounts = db.query("SELECT id, username, role, activated, created_at, name FROM accounts").all()

    let responseJson = []

    for (let i = 0; i < accounts.length; i++) {
        const account: any = accounts[i]
        let account_details: any = db.query("SELECT first_name, middle_name, last_name, mobile_number, email_address, note, extra_fields FROM account_details WHERE account_id = ?").get(account.id)
        responseJson.push({
            id: account.id,
            username: account.username,
            role: account.role,
            activated: account.activated == 1 ? "Yes" : "No",
            created_at: new Date(parseInt(account.created_at)).toLocaleString("sv"),
            name: account.name,
            account_details
        })
    }

    log(`User ${reqAccount.username} (${getIPFromRequest(req)}) retrieved accounts list`)

    return Response.json(responseJson)
}

async function accountsDELETE(req: Bun.BunRequest): Promise<Response> {
    let db = getDb()

    let role
    let account
    let sessionToken = req.cookies.get("UTC-Session")
    if (verifySession(sessionToken, getIPFromRequest(req))) {
        sessionToken = sessionToken as string
        role = getRoleFromToken(sessionToken)

        account = getAccountFromToken(sessionToken)
    } else {
        return new Response("401 Unauthorized", { status: 401 })
    }

    if (role != "admin") {
        return new Response("403 Forbidden", { status: 403 })
    }

    if (!req.params.id) {
        return new Response("400 Bad Request", { status: 400 })
    }

    if (req.params.id == "1" && !req.url.includes("details")) {
        return new Response("400 Bad Request", { status: 400 })
    }

    if ((role != "admin" && req.params.id != account.id) || role != "admin") {
        if (account) {
            log(`User ${censor(account.username, 2)} (${getIPFromRequest(req)}) attempted deleting account ${req.params.id}`)
        } else {
            log(`IP ${getIPFromRequest(req)} attempted deleting account ${req.params.id}`)
        }
        return new Response("403 Forbidden", { status: 403 })
    }

    if (req.url.includes("details")) {
        db.query("DELETE FROM account_details WHERE account_id = ?").run(req.params.id)

        log(`User ${censor(account.username, 2)} (${getIPFromRequest(req)}) deleted details for account ${req.params.id}`)
        return new Response("200 OK")
    }

    let accountDetails = db.query("SELECT * FROM account_details WHERE account_id = ?").get(req.params.id);
    if (accountDetails) {
        db.query("DELETE FROM account_details WHERE account_id = ?").run(req.params.id)
    }

    try {
        db.query("DELETE FROM sessions WHERE account_id = ?").run(req.params.id)
        db.query("DELETE FROM accounts WHERE id = ?").run(req.params.id)
        log(`User ${censor(account.username, 2)} (${getIPFromRequest(req)}) deleted account ${req.params.id}`)

        return new Response(null, { status: 204 })
    } catch (error) {
        // account cannot be deleted properly (e.g., has trips/vehicles attached to it)
        console.error(error)
        return new Response("409 Conflict", { status: 409 })
    }
}

async function accountsPATCH(req: Bun.BunRequest): Promise<Response> {
    let db = getDb()

    let role
    let account
    let sessionToken = req.cookies.get("UTC-Session")
    if (verifySession(sessionToken, getIPFromRequest(req))) {
        sessionToken = sessionToken as string
        role = getRoleFromToken(sessionToken)

        account = getAccountFromToken(sessionToken)
    } else {
        return new Response("401 Unauthorized", { status: 401 })
    }

    if (!req.params.id) {
        return new Response("400 Bad Request", { status: 400 })
    }

    if (role != "admin" || (role != "admin" && req.params.id != account.id)) {
        if (account) {
            log(`User ${censor(account.username, 2)} (${getIPFromRequest(req)}) attempted updating account ${req.params.id}`)
        } else {
            log(`IP ${getIPFromRequest(req)} attempted updating account ${req.params.id}`)
        }
        return new Response("403 Forbidden", { status: 403 })
    }

    let body = await req.json()
    if (Object.keys(body).includes("role") && role == "admin" && req.params.id != "1") {
        db.query("UPDATE accounts SET role = ? WHERE id = ?").run(body.role, req.params.id)
    }

    if (Object.keys(body).includes("name") && (role == "admin" || req.params.id == account.id)) {
        db.query("UPDATE accounts SET name = ? WHERE id = ?").run(body.name, req.params.id)
    }

    if (Object.keys(body).includes("activated") && role == "admin" && req.params.id != "1") {
        db.query("UPDATE accounts SET activated = ? WHERE id = ?").run(body.activated == true ? 1 : 0, req.params.id)
    }

    if (Object.keys(body).includes("password") && role == "admin") {
        if (body.password.trim() != "") {
            let hash = await Bun.password.hash(body.password)
            db.query("UPDATE accounts SET password = ? WHERE id = ?").run(hash, req.params.id)
        }
    }

    let requiredFieldCount = 0
    if (body.first_name) requiredFieldCount++
    if (body.last_name) requiredFieldCount++
    if (body.mobile_number) requiredFieldCount++

    if (requiredFieldCount != 3 && requiredFieldCount > 0) {
        console.log("not all required fields present")
        return new Response("400 Bad Request", { status: 400 })
    }

    if (body.first_name && body.last_name && body.mobile_number) {
        let account_details = db.query("SELECT * FROM account_details WHERE account_id = ?").get(req.params.id)
        if (!account_details) {
            db.query("INSERT INTO account_details (account_id, first_name, last_name, mobile_number) VALUES (?, ?, ?, ?)").run(req.params.id, body.first_name, body.last_name, body.mobile_number)
        }
        account_details = db.query("SELECT * FROM account_details WHERE account_id = ?").get(req.params.id)

        if (Object.keys(body).includes("middle_name") && (role == "admin" || req.params.id == account.id)) {
            db.query("UPDATE account_details SET middle_name = ? WHERE account_id = ?").run(body.middle_name, req.params.id)
        }

        if (Object.keys(body).includes("email_address") && (role == "admin" || req.params.id == account.id)) {
            db.query("UPDATE account_details SET email_address = ? WHERE account_id = ?").run(body.email_address, req.params.id)
        }

        if (Object.keys(body).includes("note") && (role == "admin" || req.params.id == account.id)) {
            db.query("UPDATE account_details SET note = ? WHERE account_id = ?").run(body.note, req.params.id)
        }

        if (Object.keys(body).includes("extra_fields") && (role == "admin" || req.params.id == account.id)) {
            db.query("UPDATE account_details SET extra_fields = ? WHERE account_id = ?").run(body.extra_fields, req.params.id)
        }
    }

    log(`User ${censor(account.username, 2)} (${getIPFromRequest(req)}) updated details for account ${req.params.id}`)
    return new Response("200 OK")
}

async function accountsPOST(req: Bun.BunRequest): Promise<Response> {
    let db = getDb()

    let role
    let reqAccount
    let sessionToken = req.cookies.get("UTC-Session")
    if (verifySession(sessionToken, getIPFromRequest(req))) {
        sessionToken = sessionToken as string
        role = getRoleFromToken(sessionToken)
        reqAccount = getAccountFromToken(sessionToken)
    } else {
        return new Response("401 Unauthorized", { status: 401 })
    }

    let body: AccountsPOSTRequest = await req.json()
    // Body has activated/role specified and role doesn't exist (unauthenticated) or isn't admin
    // Only role "admin" can create accounts with specified role
    if ((Object.hasOwn(body, "activated") || Object.hasOwn(body, "role")) && role == "") {
        return new Response("401 Unauthorized", { status: 401 })
    }

    if ((Object.hasOwn(body, "activated") || Object.hasOwn(body, "role")) && role != "admin") {
        return new Response("403 Forbidden", { status: 403 })
    }

    let isExists: any = db.query(`SELECT COUNT(*) as count FROM accounts WHERE username = ?`).get(body.username)
    if (isExists.count != 0) {
        return new Response("409 Conflict", { status: 409 })
    }

    let activationCode = crypto.randomUUID()
    let password = await Bun.password.hash(body.password + "")

    // Body _should_ be from registration form here; no role and pre-activation
    // username is assumed to be an email address
    if (!Object.keys(body).includes("activated") && !Object.keys(body).includes("role")) {
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

        log(`${censor(body.username, 2)} (${getIPFromRequest(req)}) created new account`)

        let account: any = db.query("SELECT * FROM accounts WHERE username = ?").get(body.username)

        sendActivationEmail(body.username, activationCode, new Brevo())

        return new Response("201 Created", { 
            headers: {
                Location: `/api/v1/accounts/${account.id}`,
                "Content-Type": "application/json"
            },
            status: 201
        })
    }

    // body is from admin, and has all required fields

    if (!body.role) {
        return new Response("400 Bad Request", { status: 400 })
    }

    if (!("activated" in body)) {
        console.log("No activated")
        return new Response("400 Bad Request", { status: 400 })
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
            ?, 
            ?, 
            ?,
            ?
        )`)
    .run(body.username, password, body.role, activationCode, body.activated as string, Date.now())

    log(`${censor(reqAccount.username, 2)} (${getIPFromRequest(req)}) created new account`)

    let account: any = db.query("SELECT * FROM accounts WHERE username = ?").get(body.username)

    if (body.account_details) {
        db.query(`
            INSERT INTO account_details (
                account_id,
                first_name, 
                middle_name, 
                last_name, 
                mobile_number,
                email_address,
                note,
                extra_fields
            ) VALUES (
                ?, 
                ?, 
                ?, 
                ?, 
                ?, 
                ?, 
                ?, 
                ?
            )`)
        .run(account.id, body.account_details.first_name, body.account_details.middle_name, body.account_details.last_name, body.account_details.mobile_number, body.account_details.email_address, body.account_details.note, body.account_details.additional_fields)
    }

    return new Response("200 OK")
}