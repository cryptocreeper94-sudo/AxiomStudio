import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    console.log("Altering agent_conversations table...");
    await pool.query(`
      ALTER TABLE agent_conversations
      ADD COLUMN IF NOT EXISTS active_starter JSONB,
      ADD COLUMN IF NOT EXISTS checklist JSONB;
    `);
    console.log("Success!");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
