import { getDb } from "../../db"

/**
 * Gets account from a given session token
 * @param sessionToken Session token is assumed to already be verified before using this function
 * @returns Account or null
 */
export function getAccountFromToken(sessionToken: string): any {
    let db = getDb()
    let accountId: any = db.query("SELECT account_id FROM sessions WHERE token = ?").get(sessionToken)

    if (!accountId) {
        return null
    }

    let account: any = db.query("SELECT * FROM accounts WHERE id = ?").get(accountId.account_id)

    return account
}