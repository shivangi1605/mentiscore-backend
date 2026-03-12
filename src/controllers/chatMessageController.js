const db = require('../config/db');
const { encrypt, decrypt } = require('../utils/encryption');

/* SEND message */
exports.sendMessage = (req, res) => {
  const { chat_id } = req.params;
  const { sender_role, sender_id, message } = req.body;

  const sql = `
    INSERT INTO chat_messages
    (chat_id, sender_role, sender_id, encrypted_message)
    VALUES (?, ?, ?, ?)
  `;

  const encryptedMessage = encrypt(message);

  db.query(sql, [chat_id, sender_role, sender_id, encryptedMessage], (err) => {
    if (err) return res.status(400).json(err);
    res.status(201).json({ message: 'Message sent' });
  });
};

/* GET messages */
exports.getMessages = (req, res) => {
  const { chat_id } = req.params;

  const sql = `
    SELECT message_id, sender_role, sender_id, encrypted_message, sent_at
    FROM chat_messages
    WHERE chat_id = ?
    ORDER BY sent_at ASC
  `;

  db.query(sql, [chat_id], (err, rows) => {
    if (err) return res.status(500).json(err);

    const decrypted = rows.map(row => ({
      message_id:        row.message_id,
      sender_role:       row.sender_role,
      sender_id:         row.sender_id,
      message:           decrypt(row.encrypted_message), // ✅ plaintext for frontend
      encrypted_message: row.encrypted_message,          // ✅ kept for reference
      sent_at:           row.sent_at
    }));

    res.json(decrypted);
  });
};