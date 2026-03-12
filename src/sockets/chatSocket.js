const db = require("../config/db");
const { encrypt, decrypt } = require("../utils/encryption");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id);

    socket.on("join", (userId) => {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined room`);
    });

    socket.on("joinChat", ({ chat_id }) => {
      socket.join(`chat_${chat_id}`);
      console.log(`User joined chat_${chat_id}`);
    });

    socket.on("sendMessage", ({ chat_id, sender_role, sender_id, message }) => {
      if (!message) {
        console.error("❌ Message is undefined");
        return;
      }

      const encryptedMessage = encrypt(message);

      const sql = `
        INSERT INTO chat_messages
        (chat_id, sender_role, sender_id, encrypted_message)
        VALUES (?, ?, ?, ?)
      `;

      db.query(
        sql,
        [chat_id, sender_role, sender_id, encryptedMessage],
        (err, result) => {
          if (err) {
            console.error("DB Error:", err);
            return;
          }

          io.to(`chat_${chat_id}`).emit("receiveMessage", {
            message_id: result.insertId,
            chat_id,
            sender_role,
            sender_id,
            message: message,                  // ✅ plaintext for frontend display
            encrypted_message: encryptedMessage, // ✅ ciphertext stored in DB
            sent_at: new Date()
          });
        }
      );
    });

    socket.on("typing", ({ chat_id, sender_role }) => {
      socket.to(`chat_${chat_id}`).emit("userTyping", { sender_role });
    });

    socket.on("stopTyping", ({ chat_id, sender_role }) => {
      socket.to(`chat_${chat_id}`).emit("userStoppedTyping", { sender_role });
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
};