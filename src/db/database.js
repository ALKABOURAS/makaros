const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function database() {
    const db = await open({
        // Δημιουργία της βάσης μέσα στον φάκελο src/db
        filename: path.join(__dirname, 'database.db'),
        driver: sqlite3.Database
    });

    // Ενεργοποίηση Foreign Keys για να λειτουργούν οι συσχετίσεις
    await db.get("PRAGMA foreign_keys = ON");

    // 1. Πίνακας Χρηστών
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
                                             id INTEGER PRIMARY KEY AUTOINCREMENT,
                                             email TEXT UNIQUE NOT NULL,
                                             password TEXT NOT NULL,
                                             fullName TEXT,
                                             am TEXT UNIQUE,
                                             phone TEXT,
                                             role TEXT CHECK(role IN ('admin', 'professor', 'student')) DEFAULT 'student',
                                             avatar_path TEXT DEFAULT '/img/default-avatar.png',
                                             created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 2. Πίνακας Μαθημάτων
    await db.exec(`
        CREATE TABLE IF NOT EXISTS lessons (
                                               id INTEGER PRIMARY KEY AUTOINCREMENT,
                                               title TEXT NOT NULL,
                                               description TEXT,
                                               banner_path TEXT DEFAULT '/img/default-lesson-banner.png',
                                               professor_id INTEGER,
                                               created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                               FOREIGN KEY (professor_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // 3. Πίνακας Κεφαλαίων
    await db.exec(`
        CREATE TABLE IF NOT EXISTS chapters (
                                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                lesson_id INTEGER,
                                                title TEXT NOT NULL,
                                                content TEXT,
                                                order_num INTEGER,
                                                FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
        )
    `);

    // 4. Πίνακας Ερωτήσεων (για τον αλγόριθμο)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS questions (
                                                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                 chapter_id INTEGER,
                                                 question_text TEXT NOT NULL,
                                                 type TEXT CHECK(type IN ('multiple_choice', 'text_input', 'matching')),
                                                 difficulty INTEGER CHECK(difficulty BETWEEN 1 AND 5), -- 1: Εύκολο, 5: Πολύ Δύσκολο
                                                 correct_answer TEXT,
                                                 options TEXT, -- Εδώ αποθηκεύουμε τις επιλογές σε μορφή JSON string
                                                 FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
        )
    `);

    return db;
}

module.exports = database;