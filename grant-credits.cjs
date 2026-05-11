const pg = require('pg');
require('dotenv').config({ path: '.env' });
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

const MATTHEW_EMAIL = 'pcdirect97@gmail.com';
const CREDITS_TO_GRANT = 2200; // $20 equivalent at new pricing

client.connect().then(async () => {
  // 1. Check whitelist
  const wl = await client.query('SELECT * FROM ecosystem_whitelist WHERE email = $1', [MATTHEW_EMAIL]);
  console.log('Whitelist entry:', wl.rows.length ? '✅ Found' : '❌ Not found');
  if (wl.rows[0]) console.log(' ', JSON.stringify(wl.rows[0]));

  // 2. Check if he has a chat_users account
  const user = await client.query('SELECT id, email, display_name, role FROM chat_users WHERE email = $1', [MATTHEW_EMAIL]);
  console.log('\nchat_users entry:', user.rows.length ? '✅ Found' : '⚠️  Not registered yet');
  
  if (user.rows[0]) {
    const userId = user.rows[0].id;
    console.log(' User ID:', userId);

    // 3. Check current credit balance
    const bal = await client.query('SELECT * FROM ai_credit_balances WHERE user_id = $1', [userId]);
    console.log(' Current balance:', bal.rows[0]?.credits ?? 'No balance record');

    // 4. Upsert credit balance
    if (bal.rows[0]) {
      const newTotal = Math.max(bal.rows[0].credits, CREDITS_TO_GRANT);
      await client.query(
        'UPDATE ai_credit_balances SET credits = $1, total_purchased = total_purchased + $2, updated_at = NOW() WHERE user_id = $3',
        [newTotal, CREDITS_TO_GRANT, userId]
      );
      console.log(` ✅ Updated balance to ${newTotal} credits`);
    } else {
      await client.query(
        'INSERT INTO ai_credit_balances (user_id, credits, total_purchased, total_used) VALUES ($1, $2, $2, 0)',
        [userId, CREDITS_TO_GRANT]
      );
      console.log(` ✅ Created balance: ${CREDITS_TO_GRANT} credits`);
    }

    // 5. Log transaction
    await client.query(
      `INSERT INTO ai_credit_transactions (user_id, type, amount, balance_after, description, category)
       VALUES ($1, 'grant', $2, $2, 'Beta tester grant — equivalent to $20 Builder pack', 'promo')`,
      [userId, CREDITS_TO_GRANT]
    );
    console.log(' ✅ Transaction logged');
  } else {
    console.log('\n⚠️  Matthew has not registered yet. Credits will be granted when he signs up.');
    console.log('   Run this script again after he registers.');
  }

  // 6. Also show RJ balance for reference
  const rj = await client.query("SELECT id FROM chat_users WHERE email = 'rj@darkwavestudios.io' LIMIT 1");
  if (rj.rows[0]) {
    const rjBal = await client.query('SELECT credits FROM ai_credit_balances WHERE user_id = $1', [rj.rows[0].id]);
    console.log('\nRJ current credits:', rjBal.rows[0]?.credits ?? 'owner bypass (999999)');
  }

  await client.end();
}).catch(e => { console.error(e.message); process.exit(1); });
