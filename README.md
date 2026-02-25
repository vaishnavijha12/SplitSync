# SplitSync 💸

A full-stack group expense sharing platform (Splitwise clone) with **Smart Settlement**, **Built-in Wallet**, and **OCR Receipt Scanning**.

## Features 🚀

- **Group Expenses**: Create groups, add members, and track shared expenses.
- **Smart Settlements**: Algorithm to minimize the number of transactions needed to settle debts.
- **Built-in Wallet**: Simulated wallet system to pay friends directly within the app.
- **Receipt Scanning**: Upload bill images and auto-extract details (OCR placeholder ready).
- **Split Strategies**: Equal, Unequal, and Percentage splits.
- **Real-time Updates**: Instant notifications via Socket.io when expenses are added or debts settled.

## Tech Stack 🛠️

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Auth**: JWT + bcrypt
- **Real-time**: Socket.io

## Prerequisites

- Node.js (v16+)
- PostgreSQL (running locally or cloud)

## Getting Started

### 1. Database Setup

Create a PostgreSQL database named `splitsync`:

```sql
CREATE DATABASE splitsync;
```

### 2. Backend Setup

```bash
cd server
npm install

# Run database migrations
npm run migrate

# Start the server (runs on port 5000)
npm run dev
```

*Note: Check `server/.env.example` and create a `.env` file with your DB credentials.*

### 3. Frontend Setup

```bash
cd client
npm install

# Start the frontend (runs on port 3000)
npm run dev
```

## Project Structure

```
splitsync/
├── server/                 # Node.js Express Backend
│   ├── src/
│   │   ├── config/         # DB config
│   │   ├── controllers/    # Route logic
│   │   ├── db/             # Schema & Migrations
│   │   ├── middleware/     # Auth & Validation
│   │   ├── routes/         # API Endpoints
│   │   ├── services/       # Smart algorithms (settlement, notifications)
│   │   └── index.js        # Entry point
│   └── uploads/            # Receipt images
│
└── client/                 # React Frontend
    ├── src/
    │   ├── api/            # Axios client
    │   ├── components/     # UI Components (Modals, Sidebar)
    │   ├── context/        # Auth & Socket Context
    │   ├── pages/          # Main Pages (Dashboard, Group, Wallet)
    │   └── App.jsx         # Routing
    └── tailwind.config.js
```
