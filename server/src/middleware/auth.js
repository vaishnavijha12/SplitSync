const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// JWT authentication middleware
// Validates Bearer token from Authorization header
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user to request
        const { rows } = await pool.query(
            'SELECT id, name, email, avatar_url, wallet_balance FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (!rows[0]) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = rows[0];
        next();
    } catch (err) {
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        next(err);
    }
};

// Must be used AFTER authMiddleware
// Checks if the authenticated user is an admin of the group specified by req.params.groupId
const requireGroupAdmin = async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2`,
            [req.params.groupId, req.user.id]
        );
        if (!rows[0] || rows[0].role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = { authMiddleware, requireGroupAdmin };
