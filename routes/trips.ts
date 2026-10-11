import { sendCORSOptions } from ".."
import { getDb } from "../db"
import { censor, log } from "../log"
import { getIPFromRequest } from "../util/getIPFromRequest"
import { getAccountFromToken } from "../util/sessions/getAccountFromToken"
import { verifySession } from "../util/sessions/verifySession"

export async function tripsRouter(req: Bun.BunRequest): Promise<Response> {
    let res = new Response("400 Bad Request", { status: 400 })
    switch(req.method) {
        case "GET":
            res = await tripsGET(req)
            break
        case "POST":
            res = await tripsPOST(req)
            break
        case "PATCH":
            res = await tripsPATCH(req)
            break
        case "DELETE":
            res = await tripsDELETE(req)
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

export async function tripsGET(req: Bun.BunRequest): Promise<Response> {
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

    if (req.params.id) {
        let trip: any = db.query("SELECT * FROM trips WHERE id = ?").get(req.params.id)
        if (!trip) {
            return new Response("404 Not Found", { status: 404 })
        }
        if (account.role == "customer" && trip.id != account.id) {
            return new Response("403 Forbidden", { status: 403 })
        }

        log(`${censor(account.username, 2)} (${getIPFromRequest(req)}) retrieved details of trip ${req.params.id}`)

        return Response.json(trip)
    }

    log(`${censor(account.username, 2)} (${getIPFromRequest(req)}) retrieved vehicles`)

    let search = new URL(req.url).searchParams

    if (search.has("count")) {
        let count: any = db.query("SELECT COUNT(*) as count FROM trips").get();
        return new Response(count.count)
    }

    let limit = "30";
    if (search.has("limit")) {
        limit = search.get("limit") ?? limit
    }
    let offset = "0";
    if (search.has("offset")) {
        offset = search.get("offset") ?? offset
    }

    let trips: any
    if (account.role == "customer") {
        trips = db.query("SELECT * FROM trips WHERE account_id = ? ORDER BY id DESC").all(account.id);
    } else if (account.role == "driver") {
        trips = db.query("SELECT * FROM trips WHERE driver_id = ? ORDER BY id DESC").all(account.id);
    } else {
        if (search.has("vehicleID")) {
            trips = db.query("SELECT * FROM trips WHERE vehicle_id = ?").all(search.get("vehicleID"))
        } else {
            trips = db.query("SELECT * FROM trips ORDER BY id DESC LIMIT ? OFFSET ?").all(limit, offset)
        }
    }

    return Response.json(trips)
}

export async function tripsPOST(req: Bun.BunRequest): Promise<Response> {
    let db = getDb()

    let account
    let sessionToken = req.cookies.get("UTC-Session")
    if (verifySession(sessionToken, getIPFromRequest(req))) {
        sessionToken = sessionToken as string
        account = getAccountFromToken(sessionToken)
    }

    let body = await req.json()

    if (!("status" in body) && !("booking_type" in body) && !("service_type" in body) && !("service_subtype" in body)) {
        return new Response("400 Bad Request", { status: 400 })
    }

    let query = db.query(`INSERT INTO trips (
        status,
        booking_type,   
        service_type,   
        service_subtype,
        created_at,     
        account_id,     
        driver_id,      
        vehicle_id,     
        start_at,       
        end_at,         
        start_location,
        end_location,
        luggage_count,  
        passenger_count,
        flight_number,  
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
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?
    )`).run(body.status, body.booking_type, body.service_type, body.service_subtype, Date.now(), body.account_id, body.driver_id, body.vehicle_id, body.start_at, body.end_at, body.start_location, body.end_location, body.luggage_count, body.passenger_count, body.flight_number, body.note, body.additional_fields)

    if (account) {
        log(`${censor(account.username, 2)} (${getIPFromRequest(req)}) created new trip ${query.lastInsertRowid}`)
    } else {
        log(`${getIPFromRequest(req)} created new trip ${query.lastInsertRowid}`)
    }

    let trip = db.query("SELECT * FROM trips WHERE id = ?").get(query.lastInsertRowid)

    return Response.json(trip, { status: 201 })
}

export async function tripsPATCH(req: Bun.BunRequest): Promise<Response> {
    let db = getDb()

    let account
    let sessionToken = req.cookies.get("UTC-Session")
    if (verifySession(sessionToken, getIPFromRequest(req))) {
        sessionToken = sessionToken as string
        account = getAccountFromToken(sessionToken)
    }

    if (!req.params.id) {
        return new Response("400 Bad Request", { status: 400 })
    }

    let currentTrip: any = db.query("SELECT * FROM trips WHERE id = ?").get(req.params.id)

    if (!currentTrip) {
        return new Response("404 Not Found", { status: 404 })
    }

    if ((account.role == "customer" && currentTrip.account_id != account.id) && (account.role != "manager" && account.role != "admin")) {
        return new Response("403 Forbidden", { status: 403 })
    }

    let body = await req.json()

    if (body.status) db.query("UPDATE trips SET status = ? WHERE id = ?").run(body.status, req.params.id)
    if (body.booking_type) db.query("UPDATE trips SET booking_type = ? WHERE id = ?").run(body.booking_type, req.params.id)
    if (body.service_type) db.query("UPDATE trips SET service_type = ? WHERE id = ?").run(body.service_type, req.params.id)
    if (body.service_subtype) db.query("UPDATE trips SET service_subtype = ? WHERE id = ?").run(body.service_subtype, req.params.id)
    if ("account_id" in body) db.query("UPDATE trips SET account_id = ? WHERE id = ?").run(body.account_id, req.params.id)
    if (body.driver_id) db.query("UPDATE trips SET driver_id = ? WHERE id = ?").run(body.driver_id, req.params.id)
    if (body.vehicle_id) db.query("UPDATE trips SET vehicle_id = ? WHERE id = ?").run(body.vehicle_id, req.params.id)
    if (body.start_at) db.query("UPDATE trips SET start_at = ? WHERE id = ?").run(body.start_at, req.params.id)
    if (body.end_at) db.query("UPDATE trips SET end_at = ? WHERE id = ?").run(body.end_at, req.params.id)
    if (body.start_location) db.query("UPDATE trips SET start_location = ? WHERE id = ?").run(body.start_location, req.params.id)
    if (body.end_location) db.query("UPDATE trips SET end_location = ? WHERE id = ?").run(body.end_location, req.params.id)
    if (body.luggage_count) db.query("UPDATE trips SET luggage_count = ? WHERE id = ?").run(body.luggage_count, req.params.id)
    if (body.passenger_count) db.query("UPDATE trips SET passenger_count = ? WHERE id = ?").run(body.passenger_count, req.params.id)
    if (body.flight_number) db.query("UPDATE trips SET flight_number = ? WHERE id = ?").run(body.flight_number, req.params.id)
    if (body.note) db.query("UPDATE trips SET note = ? WHERE id = ?").run(body.note, req.params.id)
    if (body.extra_fields) db.query("UPDATE trips SET extra_fields = ? WHERE id = ?").run(body.extra_fields, req.params.id)

    log(`${censor(account.username, 2)} (${getIPFromRequest(req)}) updated details for trip ${req.params.id}`)

    let trip = db.query("SELECT * FROM trips WHERE id = ?").get(req.params.id)

    return Response.json(trip, { status: 200 })
}

export async function tripsDELETE(req: Bun.BunRequest): Promise<Response> {
    let db = getDb()

    let account
    let sessionToken = req.cookies.get("UTC-Session")
    if (verifySession(sessionToken, getIPFromRequest(req))) {
        sessionToken = sessionToken as string
        account = getAccountFromToken(sessionToken)
    }

    if (account.role != "manager" && account.role != "admin") {
        return new Response("403 Forbidden", { status: 403 })
    }

    if (!req.params.id) {
        return new Response("400 Bad Request", { status: 400 })
    }

    let currentTrip = db.query("SELECT * FROM trips WHERE id = ?").get(req.params.id)

    if (!currentTrip) {
        return new Response("404 Not Found", { status: 404 })
    }

    try {
        db.query("DELETE FROM trips WHERE id = ?").run(req.params.id)
        log(`User ${censor(account.username, 2)} (${getIPFromRequest(req)}) deleted trip ${req.params.id}`)

        return new Response(null, { status: 204 })
    } catch (error) {
        console.error(error)
        return new Response("409 Conflict", { status: 409 })
    }
}