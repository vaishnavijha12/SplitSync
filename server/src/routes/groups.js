const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware, requireGroupAdmin } = require('../middleware/auth');
const { computeSettlements } = require('../services/settlement');
const { createNotification } = require('../services/notifications');

router.use(authMiddleware);

// ── POST /api/groups ─────────────────────────────────────────
router.post('/', async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { name, description } = req.body;
        if (!name) return res.status(400).json({ error: 'Group name required' });

        await client.query('BEGIN');

        // Create group
        const { rows: [group] } = await client.query(
            `INSERT INTO groups (name, description, created_by)
       VALUES ($1, $2, $3) RETURNING *`,
            [name, description || null, req.user.id]
        );

        // Add creator as admin
        await client.query(
            `INSERT INTO group_members (group_id, user_id, role)
       VALUES ($1, $2, 'admin')`,
            [group.id, req.user.id]
        );

        await client.query('COMMIT');
        res.status(201).json(group);
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
});

// ── GET /api/groups ──────────────────────────────────────────
// Returns all groups the current user belongs to
router.get('/', async (req, res, next) => {
    try {
        const { rows } = await pool.query(`
      SELECT g.*, gm.role,
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count,
        (SELECT COUNT(*) FROM expenses WHERE group_id = g.id AND deleted_at IS NULL) AS expense_count
      FROM groups g
      JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $1
      ORDER BY g.created_at DESC
    `, [req.user.id]);

        res.json(rows);
    } catch (err) {
        next(err);
    }
});

// ── GET /api/groups/:groupId ──────────────────────────────────
router.get('/:groupId', async (req, res, next) => {
    try {
        const { groupId } = req.params;

        // Verify membership
        const membership = await pool.query(
            'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
            [groupId, req.user.id]
        );
        if (!membership.rows[0]) return res.status(403).json({ error: 'Not a member' });

        const { rows: [group] } = await pool.query(
            'SELECT * FROM groups WHERE id = $1', [groupId]
        );
        if (!group) return res.status(404).json({ error: 'Group not found' });

        // Get members
        const { rows: members } = await pool.query(`
      SELECT u.id, u.name, u.email, u.avatar_url, gm.role, gm.joined_at
      FROM group_members gm
      JOIN users u ON u.id = gm.user_id
      WHERE gm.group_id = $1
    `, [groupId]);

        res.json({ ...group, members });
    } catch (err) {
        next(err);
    }
});

// ── POST /api/groups/:groupId/invite ─────────────────────────
router.post('/:groupId/invite', async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const { email } = req.body;

        // Verify requester is admin
        const membership = await pool.query(
            'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
            [groupId, req.user.id]
        );
        if (!membership.rows[0] || membership.rows[0].role !== 'admin') {
            return res.status(403).json({ error: 'Admin required to invite' });
        }

        // Find user to invite
        const { rows: [invitee] } = await pool.query(
            'SELECT id, name, email FROM users WHERE email = $1', [email]
        );
        if (!invitee) return res.status(404).json({ error: 'User not found with that email' });

        // Check not already a member
        const already = await pool.query(
            'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
            [groupId, invitee.id]
        );
        if (already.rows[0]) return res.status(409).json({ error: 'User already in group' });

        await pool.query(
            `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member')`,
            [groupId, invitee.id]
        );

        // Notify invited user
        const io = req.app.get('io');
        await createNotification(io, {
            userId: invitee.id,
            type: 'group_invited',
            title: 'Group Invitation',
            message: `${req.user.name} added you to a group`,
            data: { group_id: groupId },
        });

        res.json({ message: `${invitee.name} added to group` });
    } catch (err) {
        next(err);
    }
});

// ── DELETE /api/groups/:groupId/members/:userId ───────────────
router.delete('/:groupId/members/:userId', async (req, res, next) => {
    try {
        const { groupId, userId } = req.params;

        const membership = await pool.query(
            'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
            [groupId, req.user.id]
        );
        if (!membership.rows[0] || membership.rows[0].role !== 'admin') {
            return res.status(403).json({ error: 'Admin required' });
        }

        await pool.query(
            'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
            [groupId, userId]
        );
        res.json({ message: 'Member removed' });
    } catch (err) {
        next(err);
    }
});

// ── GET /api/groups/:groupId/balances ─────────────────────────
router.get('/:groupId/balances', async (req, res, next) => {
    try {
        const { groupId } = req.params;

        // Get per-member net balance within the group
        const { rows } = await pool.query(`
      SELECT
        u.id, u.name, u.avatar_url,
        COALESCE(SUM(
          CASE WHEN e.paid_by = u.id AND es.user_id != u.id AND es.is_settled = FALSE
            THEN es.owed_amount ELSE 0 END
        ), 0) AS total_lent,
        COALESCE(SUM(
          CASE WHEN es.user_id = u.id AND e.paid_by != u.id AND es.is_settled = FALSE
            THEN es.owed_amount ELSE 0 END
        ), 0) AS total_borrowed
      FROM group_members gm
      JOIN users u ON u.id = gm.user_id
      LEFT JOIN expense_splits es ON es.user_id = u.id
      LEFT JOIN expenses e ON e.id = es.expense_id AND e.group_id = $1 AND e.deleted_at IS NULL
      WHERE gm.group_id = $1
      GROUP BY u.id, u.name, u.avatar_url
    `, [groupId]);

        const balances = rows.map(r => ({
            ...r,
            net_balance: parseInt(r.total_lent) - parseInt(r.total_borrowed),
        }));

        res.json(balances);
    } catch (err) {
        next(err);
    }
});

// ── GET /api/groups/:groupId/settlements ──────────────────────
// Smart settlement: minimum transactions to clear all debts
router.get('/:groupId/settlements', async (req, res, next) => {
    try {
        const { groupId } = req.params;

        // Compute net balances per user within this group
        const { rows } = await pool.query(`
      SELECT u.id, u.name, u.avatar_url,
        COALESCE(SUM(
          CASE WHEN e.paid_by = u.id AND es.user_id != u.id AND es.is_settled = FALSE
            THEN es.owed_amount ELSE 0 END
        ), 0)::int
        -
        COALESCE(SUM(
          CASE WHEN es.user_id = u.id AND e.paid_by != u.id AND es.is_settled = FALSE
            THEN es.owed_amount ELSE 0 END
        ), 0)::int AS net_balance
      FROM group_members gm
      JOIN users u ON u.id = gm.user_id
      LEFT JOIN expense_splits es ON es.user_id = u.id
      LEFT JOIN expenses e ON e.id = es.expense_id AND e.group_id = $1 AND e.deleted_at IS NULL
      WHERE gm.group_id = $1
      GROUP BY u.id, u.name, u.avatar_url
    `, [groupId]);

        const settlements = computeSettlements(rows);
        res.json(settlements);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
