require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const groupRoutes = require('./routes/groups');
const expenseRoutes = require('./routes/expenses');
const paymentRoutes = require('./routes/payments');
const upiRoutes = require('./routes/upi');
const ocrRoutes = require('./routes/ocr');
const notificationRoutes = require('./routes/notifications');

const app = express();
const httpServer = http.createServer(app);

// ── Socket.io setup ──────────────────────────────────────────
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
    },
});

// Attach io to app so controllers can access it
app.set('io', io);

// Track connected users: userId -> socketId
const connectedUsers = new Map();

io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Client authenticates their socket
    socket.on('authenticate', (userId) => {
        connectedUsers.set(userId, socket.id);
        socket.userId = userId;
        socket.join(`user:${userId}`);
        console.log(`👤 User ${userId} authenticated on socket`);
    });

    socket.on('join_group', (groupId) => {
        socket.join(`group:${groupId}`);
    });

    socket.on('leave_group', (groupId) => {
        socket.leave(`group:${groupId}`);
    });

    socket.on('disconnect', () => {
        if (socket.userId) {
            connectedUsers.delete(socket.userId);
        }
        console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
});

// ── Middleware ───────────────────────────────────────────────
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payments/upi', upiRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── Global error handler ─────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('💥 Unhandled error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
    });
});

// ── Start server ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`🚀 SplitSync server running on http://localhost:${PORT}`);
});

module.exports = { app, io };
