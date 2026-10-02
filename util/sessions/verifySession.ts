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

    let sessionExpired: any = db.query("SELECT expired FROM sessions WHERE token = ?").get(sessionToken)
    if (sessionExpired.expired == 1) {
        return false
    }

    let sessionGeneratedIP: any = db.query("SELECT ip_address FROM sessions WHERE token = ?").get(sessionToken)
    if (sessionGeneratedIP?.ip_address != ip) {
        db.query("UPDATE sessions SET expired = TRUE WHERE token = ?").run(sessionToken)
        return false
    }

    // Extend expiry by 15 mins (900000ms)
    db.query("UPDATE sessions SET expiry = ? WHERE token = ?").run(Date.now() + 900000, sessionToken)
    return true
}