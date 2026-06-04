import pg from 'pg';
import bcrypt from 'bcryptjs';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:root@localhost:5432/phishguard'
});

async function update() {
  const hash = bcrypt.hashSync('1234', 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [hash, 'veemehlo']);
  console.log('✅ Password updated for veemehlo');
  await pool.end();
}

update();