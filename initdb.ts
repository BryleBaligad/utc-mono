import { log } from "./log"
import { getDb } from "./db"

export async function init() {
    const db = getDb()

    try {
        let query: any = db.query("SELECT COUNT(*) AS 'value' FROM sqlite_master WHERE type='table' AND name='accounts'").get()
        if (query.value == 0) {
            db.run(`
            CREATE TABLE accounts (
                id              INTEGER     PRIMARY KEY,
                username        TEXT        NOT NULL        UNIQUE,
                password        TEXT        NOT NULL,
                role            TEXT        NOT NULL,
                activation_code TEXT,
                activated       BOOLEAN     NOT NULL,
                created_at      TEXT        NOT NULL,
                activated_at    TEXT,
                name            TEXT
            )`)
            log("Created accounts table")
        }
    } catch (error) {
        console.error(error)
    }

    try {
        let adminQuery = db.query(`SELECT * FROM accounts WHERE username = "admin"`).get(1)
        if (!adminQuery) {
            let insertQuery = db.query(`INSERT INTO accounts (username, password, role, activated, created_at, activated_at)
                VALUES ("admin", ?, "admin", TRUE, ?, ?)
            `)
    
            if (Bun.env.ADMINPASSWORD) {
                let password = await Bun.password.hash(Bun.env.ADMINPASSWORD)
                insertQuery.run(password, Date.now(), Date.now())
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
        let query: any = db.query("SELECT COUNT(*) AS 'value' FROM sqlite_master WHERE type='table' AND name='account_details'").get()
        if (query.value == 0) {
            db.run(`
            CREATE TABLE account_details (
                id              INTEGER     PRIMARY KEY,
                account_id      INTEGER     NOT NULL,
                first_name      TEXT        NOT NULL,
                middle_name     TEXT,
                last_name       TEXT        NOT NULL,
                mobile_number   TEXT        NOT NULL,
                email_address   TEXT,
                note            TEXT,
                extra_fields    TEXT,

                FOREIGN KEY (account_id) REFERENCES accounts (id)
            )`)
            log("Created account_details table")
        }
    } catch (error) {
        console.error(error)
    }

    try {
        let query: any = db.query("SELECT COUNT(*) AS 'value' FROM sqlite_master WHERE type='table' AND name='sessions'").get()
        if (query.value == 0) {
            db.run(`
            CREATE TABLE sessions (
                id          INTEGER     PRIMARY KEY,
                account_id  INTEGER     NOT NULL,
                token       TEXT        NOT NULL        UNIQUE,
                ip_address  TEXT        NOT NULL,
                expiry      TEXT        NOT NULL,
                expired     BOOLEAN     NOT NULL,
                created_at  TEXT        NOT NULL,

                FOREIGN KEY (account_id) REFERENCES accounts (id)
            )`)
            log("Created sessions table")
        }
    } catch (error) {
        console.error(error)
    }

    try {
        let query: any = db.query("SELECT COUNT(*) AS 'value' FROM sqlite_master WHERE type='table' AND name='vehicles'").get()
        if (query.value == 0) {
            db.run(`
            CREATE TABLE vehicles (
                id              INTEGER     PRIMARY KEY,
                plate_number    TEXT        NOT NULL,
                make_model      TEXT        NOT NULL,
                type            TEXT        NOT NULL,
                or_number       TEXT,
                cr_number       TEXT,
                registrant_name TEXT,
                image           TEXT,
                note            TEXT,
                extra_fields    TEXT
            )`)
            log("Created vehicles table")
        }
    } catch (error) {
        console.error(error)
    }

    try {
        let query: any = db.query("SELECT COUNT(*) AS 'value' FROM sqlite_master WHERE type='table' AND name='trips'").get()
        if (query.value == 0) {
            db.run(`
            CREATE TABLE trips (
                id              INTEGER     PRIMARY KEY,
                status          TEXT        NOT NULL,
                type            TEXT        NOT NULL,
                driver_id       INTEGER,
                vehicle_id      INTEGER,
                vehicle_type    TEXT        NOT NULL,
                start_at        TEXT,
                end_at          TEXT,
                start_location  TEXT,
                end_location    TEXT,
                passenger_count INTEGER     NOT NULL,
                flight_number   TEXT,
                note            TEXT,
                extra_fields    TEXT,

                FOREIGN KEY (driver_id) REFERENCES accounts (id),
                FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
            )`)
            log("Created trips table")
        }
    } catch (error) {
        console.error(error)
    }
}