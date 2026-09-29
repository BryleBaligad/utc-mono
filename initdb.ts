import { log } from "./log"
import { getDb } from "./db"

export async function init() {
    const db = getDb()

    try {
        let query: any = db.query("SELECT COUNT(*) AS 'value' FROM sqlite_master WHERE type='table' AND name='accounts'").get()
        if (query.value == 0) {
            db.run(`
            CREATE TABLE accounts (
                id INTEGER PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                role TEXT NOT NULL,
                activation_code TEXT,
                activated BOOLEAN NOT NULL
            )`)
            log("Created accounts table")
        }
    } catch (error) {
        console.error(error)
    }

    try {
        let adminQuery = db.query(`SELECT * FROM accounts WHERE username = "admin"`).get(1)
        if (!adminQuery) {
            let insertQuery = db.query(`INSERT INTO accounts (username, password, role, activated)
                VALUES ("admin", ?, "admin", TRUE)
            `)
    
            if (Bun.env.ADMINPASSWORD) {
                let password = await Bun.password.hash(Bun.env.ADMINPASSWORD)
                insertQuery.run(password)
                log("Created admin account")
            } else {
                log("ERROR: Missing admin password in env")
                process.exit(0)
            }
        }
    } catch (error) {
        console.error(error)
    }

    try {
        let query: any = db.query("SELECT COUNT(*) AS 'value' FROM sqlite_master WHERE type='table' AND name='sessions'").get()
        if (query.value == 0) {
            db.run(`
            CREATE TABLE sessions (
                id INTEGER PRIMARY KEY,
                account_id INTEGER NOT NULL,
                token TEXT NOT NULL UNIQUE,
                ip_address TEXT NOT NULL,
                expiry TEXT NOT NULL,
                expired BOOLEAN NOT NULL,

                FOREIGN KEY (account_id) REFERENCES accounts (id)
            )`)
            log("Created sessions table")
        }
    } catch (error) {
        console.error(error)
    }
}