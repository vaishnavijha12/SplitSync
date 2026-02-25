const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function migrate() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    try {
        console.log('🚀 Running database migrations...');
        await pool.query(schema);
        console.log('✅ Database schema created successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
