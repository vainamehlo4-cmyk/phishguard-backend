import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import pg from 'pg';
import sqlite3 from 'sqlite3';
import { open as openSqlite } from 'sqlite';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const SQLITE_PATH = process.env.SQLITE_PATH
  ? path.resolve(process.env.SQLITE_PATH)
  : path.resolve(process.cwd(), 'phishguard.db');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL must be set for the Postgres target');
}

const { Pool } = pg;
const pool = new Pool({ connectionString: DATABASE_URL });

function log(msg, ...rest) {
  console.log(`[migrate] ${msg}`, ...rest);
}

function warn(msg, ...rest) {
  console.warn(`[migrate] ${msg}`, ...rest);
}

async function ensureTableUsers() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255),
      "fullName" VARCHAR(255),
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      department VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

async function ensureTableQuizResults() {
  // Used by the legacy SQLite server.js endpoints
  await pool.query(`
    CREATE TABLE IF NOT EXISTS quiz_results (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      score INTEGER NOT NULL,
      answers JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      passed INTEGER,
      quiz_id INTEGER,
      total_questions INTEGER DEFAULT 0

    )
  `);


  // Upgrade missing columns for older schemas
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='quiz_results' AND column_name='passed'
      ) THEN
        ALTER TABLE quiz_results ADD COLUMN passed INTEGER;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='quiz_results' AND column_name='quiz_id'
      ) THEN
        ALTER TABLE quiz_results ADD COLUMN quiz_id INTEGER;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='quiz_results' AND column_name='total_questions'
      ) THEN
        ALTER TABLE quiz_results ADD COLUMN total_questions INTEGER;
      END IF;
    END $$;
  `);
}




async function ensureTableForSQLite(sqliteTableName) {
  // Best-effort: only create the tables we know the app uses.
  // For everything else we will copy rows if creation exists (or skip).
  if (sqliteTableName === 'users') return ensureTableUsers();
  if (sqliteTableName === 'quiz_results') return ensureTableQuizResults();

  // Drizzle tables are expected to already exist (or be created by your Render build/start).
  return;
}

function normalizeRowKeys(row) {
  // Keep as-is but allow mapping of common name variants.
  // We'll detect these per column.
  return row;
}

async function copyUsers(sqlite, sqliteTableName) {
  const rows = await sqlite.all(`SELECT * FROM ${sqliteTableName}`);
  log(`Copying users: ${rows.length} rows`);

  for (const r of rows) {
    const passwordHash = r.password_hash ?? r.passwordHash;
    const createdAt = r.created_at ?? r.createdAt;

    if (!r.username) continue;

    // `users` may have either createdAt or created_at.
    // Drizzle schema expects password_hash and created_at.
    const passwordHashValue = passwordHash ?? null;
    if (!passwordHashValue) {
      warn(`Skipping user ${r.username} (missing password hash)`);
      continue;
    }

    const fullName = r.fullName ?? r.full_name ?? null;

    await pool.query(
      `INSERT INTO users (id, username, email, "fullName", password_hash, role, department, created_at)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6,'user'),$7,$8)
       ON CONFLICT (id) DO UPDATE SET
         username=EXCLUDED.username,
         email=EXCLUDED.email,
         "fullName"=EXCLUDED."fullName",
         password_hash=EXCLUDED.password_hash,
         role=EXCLUDED.role,
         department=EXCLUDED.department,
         created_at=EXCLUDED.created_at`,
      [
        r.id ?? undefined,
        r.username,
        r.email ?? null,
        fullName,
        passwordHashValue,
        r.role ?? null,
        r.department ?? null,
        createdAt ?? new Date().toISOString(),
      ],
    );
  }
}

async function copyQuizResults(sqlite, sqliteTableName) {
  const rows = await sqlite.all(`SELECT * FROM ${sqliteTableName}`);
  log(`Copying quiz_results: ${rows.length} rows`);

  for (const r of rows) {
    const createdAt = r.created_at ?? r.createdAt;
    const passed = r.passed ?? (r.score >= 70 ? 1 : 0);
    const answers = r.answers ?? r.Answers ?? null;

    // Normalize JSON text -> object for jsonb
    let answersJson = null;
    if (answers == null) {
      answersJson = null;
    } else if (typeof answers === 'string') {
      try {
        answersJson = JSON.parse(answers);
      } catch (e) {
        // If it's not valid JSON, store as a fallback wrapper
        answersJson = { raw: answers };
      }
    } else {
      answersJson = answers;
    }

    // Fix cases where SQLite stored double-serialized JSON like: "{\"{...}\"}"
    // or strings that include extra quotes/braces. Only if we ended up with a string.
    if (typeof answersJson === 'string') {
      const s = answersJson.trim();
      try {
        answersJson = JSON.parse(s);
      } catch {
        // keep as-is (we'll wrap below)
      }
    }

    // If it's still not valid for jsonb (e.g., contains a single JSON object embedded in a string),
    // store it as a wrapper object.
    if (answersJson == null || typeof answersJson === 'number' || typeof answersJson === 'boolean') {
      // ok
    } else if (typeof answersJson === 'string') {
      answersJson = { raw: answersJson };
    } else {
      // object/array ok
    }

    // Ensure jsonb value: provide a valid JSON string
    // pg driver will cast JS objects to json, but here we also guard against
    // malformed strings by always passing a stringified payload.
    let answersJsonbValue = null;
    if (answersJson === null) {
      answersJsonbValue = null;
    } else {
      try {
        // If it's already an object/array, stringify.
        if (typeof answersJson === 'object') {
          answersJsonbValue = JSON.stringify(answersJson);
        } else {
          // For strings/unknown types, wrap as raw.
          answersJsonbValue = JSON.stringify({ raw: answersJson });
        }
      } catch {
        answersJsonbValue = JSON.stringify({ raw: String(answersJson) });
      }
    }

    await pool.query(
      `INSERT INTO quiz_results (id, user_id, quiz_id, score, total_questions, passed, answers, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET
         user_id=EXCLUDED.user_id,
         quiz_id=EXCLUDED.quiz_id,
         score=EXCLUDED.score,
         total_questions=EXCLUDED.total_questions,
         passed=EXCLUDED.passed,
         answers=EXCLUDED.answers,
         created_at=EXCLUDED.created_at`,
      [
        r.id ?? undefined,
        r.user_id ?? r.userId ?? null,
        r.quiz_id ?? r.quizId ?? null,
        r.score,
        Number(r.total_questions ?? r.totalQuestions ?? (Array.isArray(answersJsonbValue) ? answersJsonbValue.length : 0) ?? 0),

        passed,
        answersJsonbValue,
        createdAt ?? new Date().toISOString(),
      ],
    );

  }
}


async function copyGeneric(_sqlite, _sqliteTableName) {
  // No generic copy implemented yet.
  // In this repo we only have SQLite-backed tables for:
  // - users
  // - quiz_results
  // Drizzle-backed tables (phishing/training/…) should be created normally via
  // your Render/Drizzle workflow.
  warn('Skipping generic copy for table:', _sqliteTableName);
}

async function main() {
  if (!fs.existsSync(SQLITE_PATH)) {
    throw new Error(`SQLite file not found at: ${SQLITE_PATH}`);
  }

  log(`Reading SQLite: ${SQLITE_PATH}`);
  const sqlite = await openSqlite({
    filename: SQLITE_PATH,
    driver: sqlite3.Database,
  });

  try {
    // Enumerate all tables in SQLite
    const sqliteTables = await sqlite.all(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );

    log(`Found ${sqliteTables.length} SQLite tables`);

    // Ensure known Postgres tables exist before insert
    for (const t of sqliteTables) {
      await ensureTableForSQLite(t.name);
    }

    // Copy rows for known tables.
    // Order matters due to FK: quiz_results.user_id -> users.id
    if (sqliteTables.some((t) => t.name === 'users')) {
      const usersTable = sqliteTables.find((t) => t.name === 'users');
      await copyUsers(sqlite, usersTable.name);
    }

    if (sqliteTables.some((t) => t.name === 'quiz_results')) {
      const qrTable = sqliteTables.find((t) => t.name === 'quiz_results');
      await copyQuizResults(sqlite, qrTable.name);
    }

    for (const t of sqliteTables) {
      if (t.name === 'users' || t.name === 'quiz_results') continue;
      await copyGeneric(sqlite, t.name);
    }


    log('✅ Migration completed');
  } finally {
    await sqlite.close();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[migrate] ❌ Failed:', err);
  process.exit(1);
});


