import { getDb } from "../../db"

/**
 * Gets account role from a given session token
 * @param sessionToken Session token is assumed to already be verified before using this function
 * @returns Blank string if token or account doesn't exist, role if found
 */
export function getRoleFromToken(sessionToken: string): string {
    let db = getDb()
    let accountId: any = db.query("SELECT account_id FROM sessions WHERE token = ?").get(sessionToken)

    if (!accountId) {
        return ""
    }

    let role: any = db.query("SELECT role FROM accounts WHERE id = ?").get(accountId.account_id)

    if (role) {
        return role.role
    }

    return ""
}