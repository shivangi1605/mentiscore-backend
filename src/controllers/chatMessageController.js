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

    const ref = await db.collection("chat_messages").add({
      chat_id,
      sender_role,
      sender_id,
      encrypted_message: encryptedMessage,
      sent_at: new Date().toISOString(),
    });

    return res.status(201).json({
      message_id: ref.id,
      chat_id,
      sender_role,
      sender_id,
      message,
      sent_at: new Date().toISOString(),
    });
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

exports.deleteMessage = async (req, res) => {
  try {
    const { chat_id, message_id } = req.params;
    const userId = req.user?.auth_id;

    const ref = db.collection("chat_messages").doc(message_id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Message not found" });
    }

    const data = doc.data();

    if (data.chat_id !== chat_id) {
      return res.status(400).json({ message: "Message does not belong to this chat" });
    }

    if (data.sender_id !== userId) {
      return res.status(403).json({ message: "You can only delete your own messages" });
    }

    await ref.delete();

    return res.json({
      message: "Message deleted successfully",
      message_id,
      chat_id,
    });
  } catch (err) {
    console.error("deleteMessage error:", err);
    return res.status(500).json({ message: "Failed to delete message" });
  }
};