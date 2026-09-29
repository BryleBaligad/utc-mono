import { getDb } from "../db"
import { censor, log } from "../log"

export function activation(req: Bun.BunRequest): Response {
    let activationCode = new URL(req.url).searchParams.get("code")

    let db = getDb()
    let account: any = db.query("SELECT * FROM accounts WHERE activation_code = ?").get(activationCode)
    if (account.activated != 0) {
        return new Response(Bun.file("./static/already_activated.html"))
    }

    db.query("UPDATE accounts SET activated = 1, activated_at = ? WHERE activation_code = ? LIMIT 1").get(Date.now(), activationCode)
    log(`${censor(account.username, 2)} activated account`)

    return new Response(Bun.file("./static/activated.html"))
}