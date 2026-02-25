const pool = require('../config/db');
const path = require('path');
const fs = require('fs');

async function migrateUpi() {
    const sql = fs.readFileSync(path.join(__dirname, 'migrate_upi.sql'), 'utf8');
    try {
        await pool.query(sql);
        console.log('✅ UPI migration applied successfully');
    } catch (err) {
        console.error('❌ UPI migration failed:', err.message);
    } finally {
        await pool.end();
    }
}

migrateUpi();
