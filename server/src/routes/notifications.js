const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// ── GET /api/notifications ───────────────────────────────────
router.get('/', async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

// ── PATCH /api/notifications/:id/read ───────────────────────
router.patch('/:id/read', async (req, res, next) => {
    try {
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        );
        res.json({ message: 'Marked as read' });
    } catch (err) {
        next(err);
    }
});

// ── PATCH /api/notifications/read-all ───────────────────────
router.patch('/read-all', async (req, res, next) => {
    try {
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = $1',
            [req.user.id]
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
