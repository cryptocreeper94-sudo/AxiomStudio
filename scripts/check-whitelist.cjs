require('dotenv').config();
const { Pool } = require('pg');

const p = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const check = await p.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='ecosystem_whitelist'`
    );
    if (check.rows.length > 0) {
      console.log('✅ ecosystem_whitelist table already exists');
      const rows = await p.query('SELECT id, email, apps, active, access_level FROM ecosystem_whitelist');
      console.log(`   ${rows.rows.length} row(s):`);
      rows.rows.forEach(r => console.log(`   - ${r.email} | apps=${r.apps} | level=${r.access_level}`));
    } else {
      console.log('❌ ecosystem_whitelist table does NOT exist — creating it now...');
      await p.query(`
        CREATE TABLE IF NOT EXISTS ecosystem_whitelist (
          id SERIAL PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          apps TEXT[] NOT NULL DEFAULT '{}',
          active BOOLEAN NOT NULL DEFAULT true,
          access_level TEXT NOT NULL DEFAULT 'full',
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ Table created successfully');
    }
  } catch (err) {
    console.error('DB ERROR:', err.message);
  } finally {
    await p.end();
  }
}

run();
