const pool = require('../config/db');

/**
 * Create a notification and emit it via Socket.io in real-time.
 * @param {Object} io - Socket.io server instance
 * @param {Object} opts - { userId, type, title, message, data }
 */
async function createNotification(io, { userId, type, title, message, data }) {
    const { rows: [notification] } = await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, data)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [userId, type, title, message, data ? JSON.stringify(data) : null]
    );

    // Emit to the specific user's room
    if (io) {
        io.to(`user:${userId}`).emit('notification:new', notification);
    }

    return notification;
}

module.exports = { createNotification };
