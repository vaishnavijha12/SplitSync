const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// ─────────────────────────────────────────────────────────────
// POST /api/payments/upi/create
// Creates an external UPI payment request (pending approval)
// ─────────────────────────────────────────────────────────────
router.post('/create', async (req, res, next) => {
    try {
        const { to_user_id, amount, group_id, note } = req.body;
        const from_user_id = req.user.id;

        if (!to_user_id || !amount || amount <= 0) {
            return res.status(400).json({ error: 'to_user_id and amount are required' });
        }

        const amountCents = Math.round(parseFloat(amount) * 100);

        // Fetch receiver's UPI ID and name
        const { rows: toRows } = await pool.query(
            'SELECT id, name, upi_id FROM users WHERE id = $1',
            [to_user_id]
        );
        if (!toRows[0]) return res.status(404).json({ error: 'Recipient not found' });
        const toUser = toRows[0];

        // Build UPI deep link
        const upiId = toUser.upi_id || `${toUser.name.toLowerCase().replace(/\s+/g, '')}@upi`;
        const payerName = req.user.name || 'SplitSync User';
        const txNote = note || 'SplitSync Settlement';
        const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(toUser.name)}&am=${(amountCents / 100).toFixed(2)}&cu=INR&tn=${encodeURIComponent(txNote)}`;

        // Insert external transaction record
        const { rows } = await pool.query(
            `INSERT INTO external_transactions
        (from_user_id, to_user_id, group_id, amount, status, upi_link, note)
       VALUES ($1,$2,$3,$4,'pending',$5,$6)
       RETURNING *`,
            [from_user_id, to_user_id, group_id || null, amountCents, upiLink, txNote]
        );

        const tx = rows[0];

        // Notify recipient
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${to_user_id}`).emit('upi:payment_request', {
                id: tx.id,
                from: { id: req.user.id, name: req.user.name },
                amount: amountCents,
                note: txNote,
            });
        }

        res.json({
            transaction: tx,
            upi_link: upiLink,
            upi_id: upiId,
            to_name: toUser.name,
            amount_rupees: (amountCents / 100).toFixed(2),
        });
    } catch (err) {
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/payments/upi/confirm/:id
// Payer marks "I have paid" — moves to pending receiver approval
// ─────────────────────────────────────────────────────────────
router.post('/confirm/:id', async (req, res, next) => {
    try {
        const txId = req.params.id;
        const userId = req.user.id;

        const { rows } = await pool.query(
            'SELECT * FROM external_transactions WHERE id = $1',
            [txId]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Transaction not found' });
        const tx = rows[0];

        if (tx.from_user_id !== userId) {
            return res.status(403).json({ error: 'Only the payer can confirm' });
        }
        if (tx.status !== 'pending') {
            return res.status(400).json({ error: `Transaction already ${tx.status}` });
        }

        // Mark as "confirming" (waiting for receiver to approve)
        await pool.query(
            `UPDATE external_transactions SET status = 'pending', note = COALESCE(note,'') || ' [Payer confirmed]'
       WHERE id = $1`,
            [txId]
        );

        // Real-time notify receiver
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${tx.to_user_id}`).emit('upi:payer_confirmed', { tx_id: txId, from: req.user.name, amount: tx.amount });
        }

        res.json({ message: 'Payment confirmation sent. Waiting for receiver to approve.' });
    } catch (err) {
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/payments/upi/approve/:id
// Receiver approves — update expense splits as settled
// ─────────────────────────────────────────────────────────────
router.post('/approve/:id', async (req, res, next) => {
    const client = await pool.connect();
    try {
        const txId = req.params.id;
        const userId = req.user.id;

        await client.query('BEGIN');

        const { rows } = await client.query(
            'SELECT * FROM external_transactions WHERE id = $1 FOR UPDATE',
            [txId]
        );
        if (!rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Transaction not found' }); }
        const tx = rows[0];

        if (tx.to_user_id !== userId) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Only the recipient can approve' });
        }
        if (tx.status === 'confirmed') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Already confirmed' });
        }

        // Approve
        await client.query(
            `UPDATE external_transactions SET status='confirmed', confirmed_at=NOW() WHERE id=$1`,
            [txId]
        );

        // Mark relevant expense splits as settled (same logic as wallet payments)
        if (tx.group_id) {
            await client.query(
                `UPDATE expense_splits es
         SET is_settled = TRUE
         FROM expenses e
         WHERE es.expense_id = e.id
           AND e.group_id = $1
           AND es.user_id = $2
           AND e.paid_by  = $3
           AND es.is_settled = FALSE`,
                [tx.group_id, tx.from_user_id, tx.to_user_id]
            );
        }

        // Create notification for payer
        await client.query(
            `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, 'payment_approved', 'Payment Approved', $2, $3)`,
            [tx.from_user_id, `${req.user.name} approved your UPI payment of ₹${(tx.amount / 100).toFixed(2)}`, JSON.stringify({ tx_id: txId })]
        );

        await client.query('COMMIT');

        const io = req.app.get('io');
        if (io) {
            io.to(`user:${tx.from_user_id}`).emit('upi:approved', { tx_id: txId, by: req.user.name, amount: tx.amount });
        }

        res.json({ message: 'Payment approved. Balances updated.' });
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/payments/upi/reject/:id
// Receiver rejects — no balance change
// ─────────────────────────────────────────────────────────────
router.post('/reject/:id', async (req, res, next) => {
    try {
        const txId = req.params.id;
        const userId = req.user.id;

        const { rows } = await pool.query(
            'SELECT * FROM external_transactions WHERE id=$1', [txId]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Transaction not found' });
        const tx = rows[0];

        if (tx.to_user_id !== userId) {
            return res.status(403).json({ error: 'Only the recipient can reject' });
        }
        if (tx.status !== 'pending') {
            return res.status(400).json({ error: `Cannot reject a ${tx.status} transaction` });
        }

        await pool.query(
            `UPDATE external_transactions SET status='rejected' WHERE id=$1`, [txId]
        );

        const io = req.app.get('io');
        if (io) {
            io.to(`user:${tx.from_user_id}`).emit('upi:rejected', { tx_id: txId, by: req.user.name });
        }

        res.json({ message: 'Payment rejected.' });
    } catch (err) {
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/payments/upi/pending
// Returns pending UPI requests for current user (as receiver)
// ─────────────────────────────────────────────────────────────
router.get('/pending', async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT et.*, 
        fu.name AS from_name, fu.email AS from_email,
        tu.name AS to_name,
        g.name  AS group_name
       FROM external_transactions et
       JOIN users fu ON et.from_user_id = fu.id
       JOIN users tu ON et.to_user_id   = tu.id
       LEFT JOIN groups g ON et.group_id = g.id
       WHERE et.to_user_id = $1 AND et.status = 'pending'
       ORDER BY et.created_at DESC`,
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/payments/upi/my-requests
// Returns UPI requests initiated by current user
// ─────────────────────────────────────────────────────────────
router.get('/my-requests', async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT et.*,
        tu.name  AS to_name, tu.email AS to_email,
        g.name   AS group_name
       FROM external_transactions et
       JOIN users tu ON et.to_user_id = tu.id
       LEFT JOIN groups g ON et.group_id = g.id
       WHERE et.from_user_id = $1
       ORDER BY et.created_at DESC
       LIMIT 50`,
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/payments/upi/set-upi-id
// Lets user save their own UPI ID
// ─────────────────────────────────────────────────────────────
router.put('/set-upi-id', async (req, res, next) => {
    try {
        const { upi_id } = req.body;
        if (!upi_id || !upi_id.includes('@')) {
            return res.status(400).json({ error: 'Invalid UPI ID format. Must contain @' });
        }
        await pool.query('UPDATE users SET upi_id=$1 WHERE id=$2', [upi_id.trim(), req.user.id]);
        res.json({ message: 'UPI ID saved', upi_id: upi_id.trim() });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
