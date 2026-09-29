import { getDb } from "../../db"

/**
 * Returns true or false if the session is valid given a token and an IP address.
 * Automatically flags session as expired in database if any mismatch is found.
 * @param sessionToken Session token provided in UTC-Session cookie
 * @param ip Request IP (X-Forwarded-For or server.requestIP)
 */
export function verifySession(sessionToken: string | null, ip: string): boolean {
    if (!sessionToken) {
        return false
    }

    let db = getDb()

    let sessionExpired = db.query("SELECT expired FROM sessions WHERE token = ?").get(sessionToken)
    if (sessionExpired == 1) {
        return false
    }

    let sessionGeneratedIP = db.query("SELECT ip_address FROM sessions WHERE token = ?").get(sessionToken)
    if (sessionGeneratedIP != ip) {
        db.query("INSERT INTO sessions(expired) VALUES (TRUE) WHERE token = ?").run(sessionToken)
        return false
    }

    // Extend expiry by 15 mins (900000ms)
    db.query("INSERT INTO sessions(expiry) VALUES (?)").run(Date.now() + 900000)
    return true
}