import { getDb } from "../../db"

/**
 * Gets account role from a given session token
 * @param sessionToken Session token is assumed to already be verified before using this function
 * @returns Blank string if token or account doesn't exist, role if found
 */
export function getRoleFromToken(sessionToken: string): string {
    let db = getDb()
    let accountId = db.query("SELECT account_id FROM sessions WHERE token = ?").get(sessionToken) as string | null
    if (!accountId) {
        return ""
    }

    let role = db.query("SELECT role FROM accounts WHERE id = ?").get(accountId) as string

    return role || ""
}