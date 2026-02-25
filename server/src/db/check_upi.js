require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function check() {
    try {
        const colRes = await pool.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='upi_id'"
        );
        console.log('upi_id column:', colRes.rows.length ? '✅ EXISTS' : '❌ MISSING');

        const tblRes = await pool.query(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='external_transactions'"
        );
        console.log('external_transactions table:', parseInt(tblRes.rows[0].count) > 0 ? '✅ EXISTS' : '❌ MISSING');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

check();
