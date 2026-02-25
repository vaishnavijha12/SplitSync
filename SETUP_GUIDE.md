# 🚀 Quick Setup Guide

You are almost there! Follow these 4 steps to get the app running:

## 1. Configure Database Password 🔑
You are currently getting a `password authentication failed` error.
1. Open the file `server/.env` (it should be open in your editor).
2. Find the line: `DB_PASSWORD=root`
3. Change `root` to your **actual PostgreSQL password**.
   - *If you don't know it, try `postgres`, `admin`, or `password`.*

## 2. Create the Database 🗄️
The app needs a database named `splitsync`.
Run this command in your terminal (if you have PostgreSQL installed):
```powershell
createdb -U postgres splitsync
```
*If that doesn't work, open **pgAdmin** or **psql** and create a database named `splitsync` manually.*

## 3. Run Migrations 🏗️
Once the password is correct and database exists, set up the tables:
```powershell
cd server
npm run migrate
```
*(You should see "Database schema created successfully!")*

## 4. Start the App ⚡
You need two terminals:

**Terminal 1 (Backend):**
```powershell
cd server
npm run dev
```

**Terminal 2 (Frontend):**
```powershell
cd client
npm run dev
```

---
**Troubleshooting**
- If you see `database "splitsync" does not exist`, strictly follow Step 2.
- If you see `password authentication failed`, check Step 1.
