import { sendCORSOptions } from ".."
import { getDb } from "../db"
import { getIPFromRequest } from "../util/getIPFromRequest"
import { getAccountFromToken } from "../util/sessions/getAccountFromToken"
import { verifySession } from "../util/sessions/verifySession"

export async function miscRouter(req: Bun.BunRequest): Promise<Response> {
    let res = new Response("400 Bad Request", { status: 400 })
    switch(req.method) {
        case "GET":
            res = await miscGET(req)
            break
        case "OPTIONS":
            res = await sendCORSOptions()
            break
    }

    res.headers.set("Access-Control-Allow-Credentials", "true")
    if (req.headers.get("Origin")?.includes("baligad.net")) {
        res.headers.set("Access-Control-Allow-Origin", req.headers.get("Origin") || "*")
    }

    return res
}

export async function miscGET(req: Bun.BunRequest): Promise<Response> {
    let db = getDb()

    let account
    let sessionToken = req.cookies.get("UTC-Session")
    if (verifySession(sessionToken, getIPFromRequest(req))) {
        sessionToken = sessionToken as string
        account = getAccountFromToken(sessionToken)
    } else {
        return new Response("401 Unauthorized", { status: 401 })
    }

    if (!account.role) {
        return new Response("403 Forbidden", { status: 403 })
    }

    let search = new URL(req.url).searchParams
    // bodge for getting misc details
    if (search.has("homekpi")) {
        if (account.role != "admin" && account.role != "manager") {
            return new Response("403 Forbidden", { status: 403 })
        }

        let customerAccountsCount = (db.query("SELECT COUNT(*) as count FROM accounts WHERE role = 'customer'").get() as any).count ?? 0 ;
        let vehiclesCount = (db.query("SELECT COUNT(*) as count FROM vehicles").get() as any).count ?? 0 ;
        let uncheckedTripsCount = (db.query("SELECT COUNT(*) as count FROM trips WHERE status = 'CREATED'").get() as any).count ?? 0 ;
        let confirmedTripsCount = (db.query("SELECT COUNT(*) as count FROM trips WHERE status = 'CONFIRMED'").get() as any).count ?? 0 ;
        let completedTripsCount = (db.query("SELECT COUNT(*) as count FROM trips WHERE status = 'COMPLETED'").get() as any).count ?? 0 ;

        return Response.json({
            customer: customerAccountsCount,
            vehicle: vehiclesCount,
            unchecked: uncheckedTripsCount,
            confirmed: confirmedTripsCount,
            completed: completedTripsCount
        })
    }

    return new Response("400 Bad Request", { status: 400 })
}