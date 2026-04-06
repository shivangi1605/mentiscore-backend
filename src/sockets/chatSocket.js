const { db } = require("../config/firebase");
const { encrypt } = require("../utils/encryption");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id);

    socket.on("join", (payload) => {
      const userId = payload?.user_id ?? payload?.userId ?? payload;
      if (!userId) return socket.emit("errorMessage", "User ID required");
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined personal room`);
    });

    socket.on("joinChat", async (payload) => {
      const chatId = payload?.chat_id ?? payload?.chatId ?? payload?.room;
      const userId = payload?.user_id ?? payload?.userId;

      if (!chatId || !userId) return;

      try {
        const doc = await db.collection("chat_sessions").doc(chatId).get();
        if (!doc.exists) return console.error("❌ Chat not found");

        const chat = doc.data();
        if (chat.status !== "active") return console.error("❌ Cannot join closed chat");

        if (chat.student_id !== userId && chat.counselor_id !== userId) {
          return console.error("❌ Unauthorized join attempt");
        }

        socket.join(`chat_${chatId}`);
        console.log(`User ${userId} joined chat_${chatId}`);
      } catch (err) {
        console.error("❌ joinChat error:", err);
      }
    });

    socket.on("sendMessage", async (payload) => {
      const chatId = payload?.chat_id ?? payload?.chatId ?? payload?.room;
      const { sender_role, sender_id, message } = payload || {};

      if (!chatId || !sender_role || !sender_id || !message?.trim()) {
        return console.error("❌ Invalid payload", payload);
      }

      try {
        const chatDoc = await db.collection("chat_sessions").doc(chatId).get();
        if (!chatDoc.exists) return console.error("❌ Chat not found");

        const chat = chatDoc.data();
        if (chat.status !== "active") return console.error("❌ Chat is closed");

        if (
          (sender_role === "student" && chat.student_id !== sender_id) ||
          (sender_role === "counselor" && chat.counselor_id !== sender_id)
        ) {
          return console.error("❌ Unauthorized sender");
        }

        const encryptedMessage = encrypt(message);
        const sentAt = new Date().toISOString();

        const msgRef = await db.collection("chat_messages").add({
          chat_id: chatId,
          sender_role,
          sender_id,
          encrypted_message: encryptedMessage,
          sent_at: sentAt,
        });

        const messageData = {
          message_id: msgRef.id,
          chat_id: chatId,
          sender_role,
          sender_id,
          message,
          sent_at: sentAt,
        };

        io.to(`chat_${chatId}`).emit("receiveMessage", messageData);
        io.to(`user_${chat.student_id}`).emit("newMessage", messageData);
        io.to(`user_${chat.counselor_id}`).emit("newMessage", messageData);

      } catch (err) {
        console.error("❌ sendMessage error:", err);
      }
    });

    socket.on("typing", (payload) => {
      const chatId = payload?.chat_id ?? payload?.chatId ?? payload?.room;
      if (!chatId) return;
      socket.to(`chat_${chatId}`).emit("userTyping", { sender_role: payload?.sender_role });
    });

    socket.on("stopTyping", (payload) => {
      const chatId = payload?.chat_id ?? payload?.chatId ?? payload?.room;
      if (!chatId) return;
      socket.to(`chat_${chatId}`).emit("userStoppedTyping", { sender_role: payload?.sender_role });
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected:", socket.id);
    });
  });
};