import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function verifyDatabaseConnection() {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
  } finally {
    client.release();
  }
}

async function ensureUsersTableExists() {
  // auth.ts uses raw SQL `SELECT * FROM users ...` so we must ensure table exists.
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        "fullName" VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        department VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    logger.info('✅ Ensured table "users" exists');
  } catch (err) {
    logger.error({ err }, 'Failed ensuring "users" table exists');
    throw err;
  }
}

async function startServer() {
  logger.info({ port }, "Starting server");

  try {
    logger.info("Verifying database connectivity");
    await verifyDatabaseConnection();
    logger.info("Database connection verified");

    await ensureUsersTableExists();
  } catch (err) {
    logger.error({ err }, "Database initialization failed");
    process.exit(1);
  }

  app.listen(port, "0.0.0.0", (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

startServer();
