const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// ── GET /api/users/me/balances ───────────────────────────────
// Returns overall net balance for the current user across all groups
router.get('/me/balances', async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Net balance = what others owe me - what I owe others
        const { rows } = await pool.query(`
      SELECT 
        COALESCE(
          (SELECT SUM(es.owed_amount) FROM expense_splits es
           JOIN expenses e ON es.expense_id = e.id
           WHERE e.paid_by = $1 AND es.user_id != $1 AND es.is_settled = FALSE AND e.deleted_at IS NULL),
          0
        ) AS total_owed_to_me,
        COALESCE(
          (SELECT SUM(es.owed_amount) FROM expense_splits es
           JOIN expenses e ON es.expense_id = e.id
           WHERE es.user_id = $1 AND e.paid_by != $1 AND es.is_settled = FALSE AND e.deleted_at IS NULL),
          0
        ) AS total_i_owe
    `, [userId]);

        const { total_owed_to_me, total_i_owe } = rows[0];
        const net = parseInt(total_owed_to_me) - parseInt(total_i_owe);

        res.json({
            total_owed_to_me: parseInt(total_owed_to_me),
            total_i_owe: parseInt(total_i_owe),
            net_balance: net,  // positive = I'm owed, negative = I owe
        });
    } catch (err) {
        next(err);
    }
});

// ── GET /api/users/:id ───────────────────────────────────────
router.get('/:id', async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, name, email, avatar_url, created_at FROM users WHERE id = $1',
            [req.params.id]
        );
        if (!rows[0]) return res.status(404).json({ error: 'User not found' });
        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
});

// ── GET /api/users/me/wallet ─────────────────────────────────
router.get('/me/wallet', async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            'SELECT wallet_balance FROM users WHERE id = $1',
            [req.user.id]
        );
        res.json({ wallet_balance: rows[0].wallet_balance });
    } catch (err) {
        next(err);
    }
});

// ── POST /api/users/me/wallet/deposit ────────────────────────
// Simulated wallet top-up
router.post('/me/wallet/deposit', async (req, res, next) => {
    try {
        const { amount } = req.body;  // amount in cents
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        const { rows } = await pool.query(
            'UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2 RETURNING wallet_balance',
            [amount, req.user.id]
        );
        res.json({ wallet_balance: rows[0].wallet_balance });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
