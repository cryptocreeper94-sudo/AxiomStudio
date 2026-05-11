const pg = require('pg');
require('dotenv').config({ path: '.env' });
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  const notes = 'First external user — pre-granted 2200 credits ($20 Builder pack)';
  await client.query(
    'UPDATE ecosystem_whitelist SET notes = $1, updated_at = NOW() WHERE email = $2',
    [notes, 'pcdirect97@gmail.com']
  );
  const r = await client.query('SELECT email, notes FROM ecosystem_whitelist WHERE email = $1', ['pcdirect97@gmail.com']);
  console.log('Updated:', r.rows[0]);
  await client.end();
}).catch(e => { console.error(e.message); process.exit(1); });
