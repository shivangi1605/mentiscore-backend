const db = require('../config/db');
const { decrypt } = require('../utils/encryption');

/* START chat session */
exports.startChatSession = (req, res) => {
  const { booking_id } = req.body;

  if (!booking_id) {
    return res.status(400).json({ message: 'booking_id is required' });
  }

  const sql = `
    INSERT INTO chat_sessions (booking_id, chat_type, status)
    VALUES (?, 'scheduled', 'active')
  `;

  db.query(sql, [booking_id], (err, result) => {
    if (err) return res.status(400).json(err);
    res.status(201).json({
      message: 'Chat session started',
      chat_id: result.insertId
    });
  });
};

/* END chat session */
exports.endChatSession = (req, res) => {
  const { chat_id } = req.params;

  const sql = `
    UPDATE chat_sessions
    SET status = 'closed', ended_at = NOW(), ended_reason = 'manual'
    WHERE chat_id = ?
  `;

  db.query(sql, [chat_id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Chat session ended' });
  });
};

/* GET sessions for current user */
exports.getSessions = (req, res) => {
  const { auth_id, role } = req.query;

  if (!auth_id || !role) {
    return res.status(400).json({ message: 'auth_id and role are required' });
  }

  const isStudent = role === 'student';

  const sql = isStudent
    ? `
      SELECT
        cs.chat_id,
        cs.status,
        cs.started_at,
        cd.full_name              AS other_name,
        cd.counselor_id           AS other_id,
        cm.encrypted_message      AS last_encrypted,
        cm.sent_at                AS last_time
      FROM chat_sessions cs
      JOIN session_bookings sb    ON sb.booking_id   = cs.booking_id
      JOIN student_details  sd    ON sd.student_id   = sb.student_id
      JOIN counselor_details cd   ON cd.counselor_id = sb.counselor_id
      LEFT JOIN chat_messages cm  ON cm.message_id   = (
        SELECT message_id FROM chat_messages
        WHERE chat_id = cs.chat_id
        ORDER BY sent_at DESC LIMIT 1
      )
      WHERE sd.auth_id = ? AND cs.status = 'active'
      ORDER BY last_time DESC
    `
    : `
      SELECT
        cs.chat_id,
        cs.status,
        cs.started_at,
        CONCAT(sd.first_name, ' ', sd.last_name) AS other_name,
        sd.student_id                             AS other_id,
        cm.encrypted_message                      AS last_encrypted,
        cm.sent_at                                AS last_time
      FROM chat_sessions cs
      JOIN session_bookings sb    ON sb.booking_id   = cs.booking_id
      JOIN counselor_details cd   ON cd.counselor_id = sb.counselor_id
      JOIN student_details   sd   ON sd.student_id   = sb.student_id
      LEFT JOIN chat_messages cm  ON cm.message_id   = (
        SELECT message_id FROM chat_messages
        WHERE chat_id = cs.chat_id
        ORDER BY sent_at DESC LIMIT 1
      )
      WHERE cd.auth_id = ? AND cs.status = 'active'
      ORDER BY last_time DESC
    `;

  db.query(sql, [auth_id], (err, rows) => {
    if (err) return res.status(500).json(err);

    const sessions = rows.map(row => ({
      chat_id:      row.chat_id,
      other_name:   row.other_name,
      other_id:     row.other_id,
      status:       row.status,
      last_message: row.last_encrypted ? decrypt(row.last_encrypted) : null,
      last_time:    row.last_time,
    }));

    res.json(sessions);
  });
};