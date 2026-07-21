const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  try {
    await pool.query(sql);
    console.log('[DB] Migration OK — schema applied');
  } catch (err) {
    console.error('[DB] Migration failed:', err.message);
    throw err;
  }
}

module.exports = { migrate };
