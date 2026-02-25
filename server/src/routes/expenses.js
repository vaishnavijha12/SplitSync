const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { createNotification } = require('../services/notifications');

// Multer config for receipt uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `receipt-${Date.now()}${ext}`);
    },
});
const upload = multer({
    storage,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|pdf|webp/;
        cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
    },
});

router.use(authMiddleware);

// ── POST /api/expenses ───────────────────────────────────────
router.post('/', upload.single('receipt'), async (req, res, next) => {
    const client = await pool.connect();
    try {
        const {
            group_id, title, description, amount,
            split_type = 'equal', splits, date,
        } = req.body;

        if (!group_id || !title || !amount) {
            return res.status(400).json({ error: 'group_id, title, and amount are required' });
        }

        // Verify requester is in the group
        const membership = await client.query(
            'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
            [group_id, req.user.id]
        );
        if (!membership.rows[0]) return res.status(403).json({ error: 'Not a member' });

        const amountCents = Math.round(parseFloat(amount) * 100);
        const receipt_url = req.file ? `/uploads/${req.file.filename}` : null;

        // Parse splits JSON if sent as string
        let parsedSplits = splits;
        if (typeof splits === 'string') {
            parsedSplits = JSON.parse(splits);
        }

        await client.query('BEGIN');

        // Create expense
        const { rows: [expense] } = await client.query(
            `INSERT INTO expenses (group_id, paid_by, title, description, amount, split_type, receipt_url, date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [group_id, req.user.id, title, description, amountCents, split_type, receipt_url, date || new Date()]
        );

        // Calculate and insert splits
        const splitRows = computeSplits(split_type, amountCents, parsedSplits, req.user.id);

        for (const s of splitRows) {
            await client.query(
                `INSERT INTO expense_splits (expense_id, user_id, owed_amount, paid_amount)
         VALUES ($1, $2, $3, $4)`,
                [expense.id, s.user_id, s.owed_amount, s.paid_amount]
            );
        }

        await client.query('COMMIT');

        // Real-time notification: broadcast to group room
        const io = req.app.get('io');
        io.to(`group:${group_id}`).emit('expense:new', { expense, splits: splitRows });

        // Notify each member who owes money
        const { rows: members } = await pool.query(
            `SELECT user_id FROM group_members WHERE group_id = $1 AND user_id != $2`,
            [group_id, req.user.id]
        );
        for (const m of members) {
            await createNotification(io, {
                userId: m.user_id,
                type: 'expense_added',
                title: 'New Expense',
                message: `${req.user.name} added "${title}" — ₹${(amountCents / 100).toFixed(2)}`,
                data: { expense_id: expense.id, group_id },
            });
        }

        res.status(201).json({ ...expense, splits: splitRows });
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
});

// ── GET /api/expenses?group_id= ──────────────────────────────
router.get('/', async (req, res, next) => {
    try {
        const { group_id } = req.query;
        if (!group_id) return res.status(400).json({ error: 'group_id query param required' });

        // Verify membership
        const membership = await pool.query(
            'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
            [group_id, req.user.id]
        );
        if (!membership.rows[0]) return res.status(403).json({ error: 'Not a member' });

        const { rows } = await pool.query(`
      SELECT e.*, u.name AS paid_by_name, u.avatar_url AS paid_by_avatar,
        (SELECT json_agg(json_build_object(
          'user_id', es.user_id, 'name', usr.name,
          'owed_amount', es.owed_amount, 'is_settled', es.is_settled
        )) FROM expense_splits es JOIN users usr ON usr.id = es.user_id
        WHERE es.expense_id = e.id) AS splits
      FROM expenses e
      JOIN users u ON u.id = e.paid_by
      WHERE e.group_id = $1 AND e.deleted_at IS NULL
      ORDER BY e.date DESC, e.created_at DESC
    `, [group_id]);

        res.json(rows);
    } catch (err) {
        next(err);
    }
});

// ── GET /api/expenses/:id ────────────────────────────────────
router.get('/:id', async (req, res, next) => {
    try {
        const { rows: [expense] } = await pool.query(`
      SELECT e.*, u.name AS paid_by_name,
        (SELECT json_agg(json_build_object(
          'user_id', es.user_id, 'name', usr.name,
          'owed_amount', es.owed_amount, 'paid_amount', es.paid_amount, 'is_settled', es.is_settled
        )) FROM expense_splits es JOIN users usr ON usr.id = es.user_id
        WHERE es.expense_id = e.id) AS splits
      FROM expenses e JOIN users u ON u.id = e.paid_by
      WHERE e.id = $1 AND e.deleted_at IS NULL
    `, [req.params.id]);

        if (!expense) return res.status(404).json({ error: 'Expense not found' });
        res.json(expense);
    } catch (err) {
        next(err);
    }
});

// ── PUT /api/expenses/:id ────────────────────────────────────
router.put('/:id', async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { title, description, amount, splits, split_type } = req.body;

        const { rows: [expense] } = await client.query(
            'SELECT * FROM expenses WHERE id = $1 AND deleted_at IS NULL', [req.params.id]
        );
        if (!expense) return res.status(404).json({ error: 'Expense not found' });
        if (expense.paid_by !== req.user.id) return res.status(403).json({ error: 'Only payer can edit' });

        await client.query('BEGIN');

        const amountCents = amount ? Math.round(parseFloat(amount) * 100) : expense.amount;
        const { rows: [updated] } = await client.query(
            `UPDATE expenses SET title = COALESCE($1, title), description = COALESCE($2, description),
       amount = $3, split_type = COALESCE($4, split_type), updated_at = NOW()
       WHERE id = $5 RETURNING *`,
            [title, description, amountCents, split_type, req.params.id]
        );

        if (splits) {
            // Recalculate splits
            await client.query('DELETE FROM expense_splits WHERE expense_id = $1', [req.params.id]);
            const splitRows = computeSplits(updated.split_type, amountCents, splits, req.user.id);
            for (const s of splitRows) {
                await client.query(
                    `INSERT INTO expense_splits (expense_id, user_id, owed_amount, paid_amount)
           VALUES ($1, $2, $3, $4)`,
                    [updated.id, s.user_id, s.owed_amount, s.paid_amount]
                );
            }
        }

        await client.query('COMMIT');

        const io = req.app.get('io');
        io.to(`group:${expense.group_id}`).emit('expense:updated', updated);

        res.json(updated);
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
});

// ── DELETE /api/expenses/:id (soft delete) ───────────────────
router.delete('/:id', async (req, res, next) => {
    try {
        const { rows: [expense] } = await pool.query(
            'SELECT * FROM expenses WHERE id = $1 AND deleted_at IS NULL', [req.params.id]
        );
        if (!expense) return res.status(404).json({ error: 'Not found' });
        if (expense.paid_by !== req.user.id) return res.status(403).json({ error: 'Only payer can delete' });

        await pool.query('UPDATE expenses SET deleted_at = NOW() WHERE id = $1', [req.params.id]);

        const io = req.app.get('io');
        io.to(`group:${expense.group_id}`).emit('expense:deleted', { id: expense.id });

        res.json({ message: 'Expense deleted' });
    } catch (err) {
        next(err);
    }
});

// ────────────────────────────────────────────────────────────
// Helper: compute split rows based on split_type
// ────────────────────────────────────────────────────────────
function computeSplits(splitType, totalCents, splits, payerId) {
    const result = [];

    if (splitType === 'equal') {
        // splits = array of user_ids
        const count = splits.length;
        const each = Math.floor(totalCents / count);
        const remainder = totalCents - each * count;

        splits.forEach((userId, idx) => {
            result.push({
                user_id: userId,
                owed_amount: userId === payerId ? 0 : each + (idx === 0 ? remainder : 0),
                paid_amount: userId === payerId ? totalCents : 0,
            });
        });
    } else if (splitType === 'unequal') {
        // splits = [{ user_id, amount }] — amounts in rupees/dollars
        splits.forEach(s => {
            const owed = Math.round(parseFloat(s.amount) * 100);
            result.push({
                user_id: s.user_id,
                owed_amount: s.user_id === payerId ? 0 : owed,
                paid_amount: s.user_id === payerId ? totalCents : 0,
            });
        });
    } else if (splitType === 'percentage') {
        // splits = [{ user_id, percentage }]
        splits.forEach(s => {
            const owed = Math.round((s.percentage / 100) * totalCents);
            result.push({
                user_id: s.user_id,
                owed_amount: s.user_id === payerId ? 0 : owed,
                paid_amount: s.user_id === payerId ? totalCents : 0,
            });
        });
    }

    return result;
}

module.exports = router;
