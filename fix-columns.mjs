import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:root@localhost:5432/phishguard'
});

async function fix() {
  try {
    await pool.query(`ALTER TABLE users RENAME COLUMN "passwordHash" TO password_hash;`);
    console.log('✅ Renamed passwordHash to password_hash');
    await pool.query(`ALTER TABLE users RENAME COLUMN "createdAt" TO created_at;`);
    console.log('✅ Renamed createdAt to created_at');
  } catch (err) {
    console.error('Note:', err.message);
  } finally {
    pool.end();
  }
}

fix();