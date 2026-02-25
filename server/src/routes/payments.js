const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { createNotification } = require('../services/notifications');

router.use(authMiddleware);

/**
 * POST /api/payments/settle
 * 
 * Simulated in-app wallet payment flow:
 * 1. Create transaction record (status: pending)
 * 2. Validate sender has sufficient balance
 * 3. Deduct from sender, credit to receiver (atomic)
 * 4. Mark relevant expense splits as settled
 * 5. Update transaction status to success
 * 6. On any failure → rollback + mark transaction failed
 */
router.post('/settle', async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { to_user_id, amount, group_id, note } = req.body;

        if (!to_user_id || !amount || amount <= 0) {
            return res.status(400).json({ error: 'to_user_id and positive amount required' });
        }

        const amountCents = Math.round(parseFloat(amount) * 100);
        const fromId = req.user.id;

        await client.query('BEGIN');

        // Snapshot current balances
        const { rows: [sender] } = await client.query(
            'SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE', [fromId]
        );
        const { rows: [receiver] } = await client.query(
            'SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE', [to_user_id]
        );

        if (!receiver) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Receiver not found' });
        }

        // Create pending transaction (record intent)
        const { rows: [tx] } = await client.query(
            `INSERT INTO transactions 
         (from_user_id, to_user_id, group_id, amount, status, note, from_balance_before, to_balance_before)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7) RETURNING *`,
            [fromId, to_user_id, group_id || null, amountCents, note || null,
                sender.wallet_balance, receiver.wallet_balance]
        );

        // Validate sufficient balance
        if (sender.wallet_balance < amountCents) {
            // Mark as failed
            await client.query(
                `UPDATE transactions SET status = 'failed', completed_at = NOW() WHERE id = $1`,
                [tx.id]
            );
            await client.query('COMMIT');       // commit the 'failed' status
            return res.status(400).json({ error: 'Insufficient wallet balance', transaction: tx });
        }

        // Deduct from sender, credit receiver
        await client.query(
            'UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2',
            [amountCents, fromId]
        );
        await client.query(
            'UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2',
            [amountCents, to_user_id]
        );

        // Mark splits as settled (within the group if provided)
        if (group_id) {
            await client.query(`
        UPDATE expense_splits es
        SET is_settled = TRUE
        FROM expenses e
        WHERE es.expense_id = e.id
          AND e.group_id = $1
          AND es.user_id = $2
          AND e.paid_by = $3
          AND es.is_settled = FALSE
          AND e.deleted_at IS NULL
      `, [group_id, fromId, to_user_id]);
        }

        // Mark transaction as success
        await client.query(
            `UPDATE transactions SET status = 'success', completed_at = NOW() WHERE id = $1`,
            [tx.id]
        );

        await client.query('COMMIT');

        // Real-time notifications
        const io = req.app.get('io');
        const sentAmount = `₹${(amountCents / 100).toFixed(2)}`;

        await createNotification(io, {
            userId: to_user_id,
            type: 'payment_received',
            title: 'Payment Received',
            message: `${req.user.name} paid you ${sentAmount}`,
            data: { transaction_id: tx.id, group_id },
        });

        await createNotification(io, {
            userId: fromId,
            type: 'payment_sent',
            title: 'Payment Sent',
            message: `You paid ${sentAmount} — settlement complete`,
            data: { transaction_id: tx.id, group_id },
        });

        if (group_id) {
            io.to(`group:${group_id}`).emit('payment:settled', {
                from_user_id: fromId,
                to_user_id,
                amount: amountCents,
            });
        }

        res.json({ message: 'Payment successful', transaction: { ...tx, status: 'success' } });
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
});

// ── GET /api/payments/history ────────────────────────────────
router.get('/history', async (req, res, next) => {
    try {
        const { group_id } = req.query;
        let query = `
      SELECT t.*,
        u1.name AS from_name, u1.avatar_url AS from_avatar,
        u2.name AS to_name, u2.avatar_url AS to_avatar
      FROM transactions t
      JOIN users u1 ON u1.id = t.from_user_id
      JOIN users u2 ON u2.id = t.to_user_id
      WHERE (t.from_user_id = $1 OR t.to_user_id = $1)
    `;
        const params = [req.user.id];

        if (group_id) {
            params.push(group_id);
            query += ` AND t.group_id = $${params.length}`;
        }

        query += ' ORDER BY t.created_at DESC LIMIT 50';

        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
