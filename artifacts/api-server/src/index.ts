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

async function startServer() {
  logger.info({ port }, "Starting server");

  try {
    logger.info("Verifying database connectivity");
    await verifyDatabaseConnection();
    logger.info("Database connection verified");
  } catch (err) {
    logger.error({ err }, "Database connectivity check failed");
    process.exit(1);
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

startServer();
