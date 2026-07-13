import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:root@localhost:5432/phishguard'
});

async function show() {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position;");
    console.log('columns:', res.rows.map(r => r.column_name));
  } catch (err) {
    console.error('Error querying columns:', err.message);
  } finally {
    pool.end();
  }
}

show();
