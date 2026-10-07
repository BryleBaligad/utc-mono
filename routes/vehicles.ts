import { sendCORSOptions } from ".."
import { getDb } from "../db"
import { censor, log } from "../log"
import { getIPFromRequest } from "../util/getIPFromRequest"
import { getAccountFromToken } from "../util/sessions/getAccountFromToken"
import { verifySession } from "../util/sessions/verifySession"

export async function vehiclesRouter(req: Bun.BunRequest): Promise<Response> {
    switch(req.method) {
        case "GET":
            return vehiclesGET(req)
        case "POST":
            return vehiclesPOST(req)
        case "PATCH":
            return vehiclesPATCH(req)
        case "DELETE":
            return vehiclesDELETE(req)
        case "OPTIONS":
            return sendCORSOptions()
    }
    return new Response("400 Bad Request", { status: 400 })
}

let imgCache: any = {}

export async function vehiclesGET(req: Bun.BunRequest): Promise<Response> {
    let db = getDb()

    let account
    let sessionToken = req.cookies.get("UTC-Session")
    if (verifySession(sessionToken, getIPFromRequest(req))) {
        sessionToken = sessionToken as string
        account = getAccountFromToken(sessionToken)
    } else {
        return new Response("401 Unauthorized", { status: 401 })
    }

    if (account.role != "manager" && account.role != "admin" && account.role != "driver") {
        return new Response("403 Forbidden", { status: 403 })
    }

    if (req.params.id) {
        if (req.url.includes("image")) {
            let query: any = db.query("SELECT image FROM vehicles WHERE id = ?").get(req.params.id)

            if (query.image) {
                if (!imgCache[req.params.id]) {
                    let img = await fetch(query.image)
                    let blob = await img.blob()
                    let file = new File([blob], "image", { type: blob.type })
                    imgCache[req.params.id] = file
                }

                return new Response(imgCache[req.params.id], {
                    headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" }
                })
            } else {
                return new Response("404 Not Found", { status: 404 })
            }
        }

        let vehicle = db.query("SELECT id, plate_number, make_model, type, or_number, cr_number, registrant_name, note, extra_fields FROM vehicles WHERE id = ?").get(req.params.id)
        if (!vehicle) {
            return new Response("404 Not Found", { status: 404 })
        }

        log(`${censor(account.username, 2)} (${getIPFromRequest(req)}) retrieved details of vehicle ${req.params.id}`)

        return Response.json(vehicle)
    }

    log(`${censor(account.username, 2)} (${getIPFromRequest(req)}) retrieved vehicles`)

    let vehicles = db.query("SELECT id, plate_number, make_model, type, or_number, cr_number, registrant_name, note, extra_fields FROM vehicles").all()
    return Response.json(vehicles)
}

export async function vehiclesPOST(req: Bun.BunRequest): Promise<Response> {
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

    let body = await req.json()

    if (!("plate_number" in body) && !("make_model" in body) && !("type" in body)) {
        return new Response("400 Bad Request", { status: 400 })
    }

    if (body.image) {
        let blob = await (await fetch(body.image)).blob()
        let image = await blob.image().resize(1024).webp({ quality: 60 }).dataurl()

        body.image = image
    }

    let query = db.query(`INSERT INTO vehicles (
            plate_number,
            make_model,
            type,
            or_number,
            cr_number,
            registrant_name,
            image,
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
            ?
        )`).run(body.plate_number, body.make_model, body.type, body.or_number, body.cr_number, body.registrant_name, body.image, body.note, body.extra_fields)

    log(`${censor(account.username, 2)} (${getIPFromRequest(req)}) created new vehicle ${query.lastInsertRowid}`)

    let vehicle = db.query("SELECT id, plate_number, make_model, type,or_number, cr_number, registrant_name, note, extra_fields FROM vehicles WHERE id = ?").get(query.lastInsertRowid)

    return Response.json(vehicle, { status: 201 })
}

export async function vehiclesPATCH(req: Bun.BunRequest): Promise<Response> {
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

    let currentVehicle = db.query("SELECT * FROM vehicles WHERE id = ?").get(req.params.id)

    if (!currentVehicle) {
        return new Response("404 Not Found", { status: 404 })
    }

    let body = await req.json()

    if (body.plate_number) db.query("UPDATE vehicles SET plate_number = ? WHERE id = ?").run(body.plate_number, req.params.id)
    if (body.make_model) db.query("UPDATE vehicles SET make_model = ? WHERE id = ?").run(body.make_model, req.params.id)
    if (body.type) db.query("UPDATE vehicles SET type = ? WHERE id = ?").run(body.type, req.params.id)
    if (body.or_number) db.query("UPDATE vehicles SET or_number = ? WHERE id = ?").run(body.or_number, req.params.id)
    if (body.cr_number) db.query("UPDATE vehicles SET cr_number = ? WHERE id = ?").run(body.cr_number, req.params.id)
    if (body.registrant_name) db.query("UPDATE vehicles SET registrant_name = ? WHERE id = ?").run(body.registrant_name, req.params.id)
    if (body.image) {
        let blob = await (await fetch(body.image)).blob()
        let image = await blob.image().resize(1024).webp({ quality: 60 }).dataurl()

        db.query("UPDATE vehicles SET image = ? WHERE id = ?").run(image, req.params.id)
        delete imgCache[req.params.id]
    }
    if (body.note) db.query("UPDATE vehicles SET note = ? WHERE id = ?").run(body.note, req.params.id)
    if (body.extra_fields) db.query("UPDATE vehicles SET extra_fields = ? WHERE id = ?").run(body.extra_fields, req.params.id)

    log(`${censor(account.username, 2)} (${getIPFromRequest(req)}) updated details for vehicle ${req.params.id}`)

    let vehicle = db.query("SELECT id, plate_number, make_model, type,or_number, cr_number, registrant_name, note, extra_fields FROM vehicles WHERE id = ?").get(req.params.id)

    return Response.json(vehicle, { status: 200 })
}

export async function vehiclesDELETE(req: Bun.BunRequest): Promise<Response> {
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

    let currentVehicle = db.query("SELECT * FROM vehicles WHERE id = ?").get(req.params.id)

    if (!currentVehicle) {
        return new Response("404 Not Found", { status: 404 })
    }

    try {
        db.query("DELETE FROM vehicles WHERE id = ?").run(req.params.id)
        log(`User ${censor(account.username, 2)} (${getIPFromRequest(req)}) deleted vehicle ${req.params.id}`)

        return new Response(null, { status: 204 })
    } catch (error) {
        // vehicle cannot be deleted properly (has trips attached to it)
        console.error(error)
        return new Response("409 Conflict", { status: 409 })
    }
}