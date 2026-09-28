import { Database } from "bun:sqlite"

export function getDb(): Database {
    const db = new Database("utc.db")
    db.run("PRAGMA journal_mode = WAL;")
    db.run("PRAGMA foreign_keys = ON;")

    return db
}