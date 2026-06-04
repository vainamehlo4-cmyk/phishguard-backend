import pg from 'pg';
import bcrypt from 'bcryptjs';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:root@localhost:5432/phishguard'
});

async function setup() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        "passwordHash" VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        "fullName" VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        department VARCHAR(255),
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Table "users" is ready');

    const passwordHash = bcrypt.hashSync('1234', 10);

    const result = await pool.query(
      `INSERT INTO users (username, "passwordHash", email, "fullName", role, "createdAt")
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (username) DO UPDATE SET "passwordHash" = $2
       RETURNING *`,
      ['veemehlo', passwordHash, 'admin@phishguard.com', 'Administrator', 'admin']
    );
    console.log('✅ Admin user created/updated:', result.rows[0]);
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    pool.end();
  }
}

setup();