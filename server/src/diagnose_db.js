const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const passwords = ['postgres', 'password', 'root', 'admin', '1234', 'secret', ''];

async function check() {
    console.log('🔍 Diagnosing database connection...');

    for (const pass of passwords) {
        const client = new Client({
            user: 'postgres',
            host: 'localhost',
            database: 'postgres', // connect to default db first
            password: pass,
            port: 5432,
        });

        try {
            await client.connect();
            console.log(`✅ SUCCESS! Found working password: "${pass}"`);

            // Update .env
            const envPath = path.join(__dirname, '../../.env');
            if (fs.existsSync(envPath)) {
                let envContent = fs.readFileSync(envPath, 'utf8');
                envContent = envContent.replace(/DB_PASSWORD=.*/, `DB_PASSWORD=${pass}`);
                fs.writeFileSync(envPath, envContent);
                console.log('✨ Updated server/.env with the correct password.');

                // Try creating the splitsync database now that we have access
                try {
                    await client.query('CREATE DATABASE splitsync');
                    console.log('✨ Created database "splitsync"');
                } catch (dbErr) {
                    if (dbErr.code === '42P04') {
                        console.log('ℹ️ Database "splitsync" already exists');
                    } else {
                        console.error('⚠️ Could not create database:', dbErr.message);
                    }
                }
            }

            await client.end();
            process.exit(0);
        } catch (err) {
            await client.end().catch(() => { });
        }
    }

    console.log('❌ Could not find the password. You might need to reset it or reinstall PostgreSQL.');
    process.exit(1);
}

check();
