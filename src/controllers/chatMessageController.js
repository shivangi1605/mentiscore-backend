const { db } = require("../config/firebase");
const { encrypt, decrypt } = require("../utils/encryption");

exports.sendMessage = async (req, res) => {
  try {
    const { chat_id } = req.params;
    const { sender_role, sender_id, message } = req.body;

    if (!chat_id || !sender_role || !sender_id || !message) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const encryptedMessage = encrypt(message);

    await db.collection("chat_messages").add({
      chat_id,
      sender_role,
      sender_id,
      encrypted_message: encryptedMessage,
      sent_at: new Date().toISOString(),
    });

    return res.status(201).json({ message: "Message sent" });
  } catch (err) {
    console.error("sendMessage error:", err);
    return res.status(500).json({ message: "Failed to send message" });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { chat_id } = req.params;

    const snapshot = await db.collection("chat_messages")
      .where("chat_id", "==", chat_id)
      .orderBy("sent_at", "asc")
      .get();

    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        message_id: doc.id,
        sender_role: data.sender_role,
        sender_id: data.sender_id,
        message: decrypt(data.encrypted_message),
        encrypted_message: data.encrypted_message,
        sent_at: data.sent_at,
      };
    });

    return res.json(messages);
  } catch (err) {
    console.error("getMessages error:", err);
    return res.status(500).json({ message: "Failed to fetch messages" });
  }
};