const pg = require('pg');
require('dotenv').config({ path: '.env' });
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  // Upgrade Opus to 4.7
  await client.query("UPDATE agent_definitions SET model = 'claude-opus-4-7' WHERE id IN ('opus', 'lume')");
  // Verify all models
  const r = await client.query('SELECT id, name, model FROM agent_definitions ORDER BY id');
  console.log('\nAgent models:');
  r.rows.forEach(a => console.log(` ${a.id.padEnd(8)} ${a.name.padEnd(15)} → ${a.model}`));
  await client.end();
}).catch(e => { console.error(e.message); process.exit(1); });
