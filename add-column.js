const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function fixDatabase() {
  console.log('🔧 Fixing database...');
  
  const db = await open({
    filename: path.join(process.cwd(), 'phishguard.db'),
    driver: sqlite3.Database
  });

  try {
    await db.exec('ALTER TABLE users ADD COLUMN passwordHash TEXT');
    console.log('✅ Added passwordHash column');
  } catch (error) {
    console.log('Note:', error.message);
  }

  console.log('✨ Done!');
  await db.close();
}

fixDatabase();