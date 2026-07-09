import pg from 'pg';
import bcrypt from 'bcryptjs';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/phishguard'
});

async function createAdmin() {
  const passwordHash = bcrypt.hashSync('1234', 10);
  try {
    const result = await pool.query(
      `INSERT INTO users (username, "passwordHash", email, "fullName", role, "createdAt")
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (username) DO UPDATE SET "passwordHash" = $2
       RETURNING *`,
      ['veemehlo', passwordHash, 'admin@phishguard.com', 'Administrator', 'admin']
    );
    console.log('Admin user created/updated:', result.rows[0]);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    pool.end();
  }
}

createAdmin();