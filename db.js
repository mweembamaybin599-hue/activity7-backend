require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

// Resolve relative paths from the backend folder.
const configuredPath =
  process.env.DATABASE_PATH || "./data/support.db";

const databasePath = path.resolve(
  __dirname,
  configuredPath
);

// Create the database's parent folder if necessary.
fs.mkdirSync(
  path.dirname(databasePath),
  { recursive: true }
);

// Open SQLite. The database file is created if absent.
const db = new Database(databasePath);

try {
  const schema = fs.readFileSync(
    path.join(__dirname, "schema.sql"),
    "utf8"
  );

  const seed = fs.readFileSync(
    path.join(__dirname, "seed.sql"),
    "utf8"
  );

  // Create tables and seed data in one transaction.
  const initialize = db.transaction(() => {
    db.exec(schema);

    const alreadySeeded = db.prepare(`
      SELECT name
      FROM app_migrations
      WHERE name = ?
    `).get("initial-records-v1");

    if (!alreadySeeded) {
      db.exec(seed);

      db.prepare(`
        INSERT INTO app_migrations (name)
        VALUES (?)
      `).run("initial-records-v1");
    }
  });

  initialize();

  console.log("SQLite database initialized successfully.");
} catch (error) {
  db.close();
  throw error;
}

module.exports = db;