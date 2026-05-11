const pg = require('pg');
require('dotenv').config({ path: '.env' });
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  await client.query("UPDATE agent_definitions SET model = 'claude-sonnet-4-5' WHERE id = 'sonnet'");
  await client.query("UPDATE agent_definitions SET model = 'claude-opus-4-5' WHERE id IN ('opus', 'lume')");
  const r = await client.query('SELECT id, model FROM agent_definitions ORDER BY id');
  r.rows.forEach(a => console.log(a.id, '->', a.model));
  await client.end();
}).catch(e => { console.error(e.message); process.exit(1); });
