// db for authentication data
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function createAuthDb() {
    // Open a database connection
    const db = await open({
        filename: './auth.db',
        driver: sqlite3.Database
    });

    // Create users table if it doesn't exist
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    console.log('Authentication database and users table created (if not exists).');
    return db;
}

module.exports = createAuthDb;