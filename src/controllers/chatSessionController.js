// chatSessionController.js
const { db } = require("../config/firebase");
const { decrypt } = require("../utils/encryption");

exports.startChatSession = async (req, res) => {
  try {
    const { booking_id, student_id, counselor_id } = req.body;

    if (!booking_id) {
      return res.status(400).json({ message: "booking_id is required" });
    }

    const existingSnap = await db
      .collection("chat_sessions")
      .where("booking_id", "==", booking_id)
      .get();

    if (!existingSnap.empty) {
      const existingDoc = existingSnap.docs[0];
      return res.status(200).json({
        message: "Chat session already exists",
        chat_id: existingDoc.id,
      });
    }

    const ref = db.collection("chat_sessions").doc();
    await ref.set({
      booking_id,
      student_id: student_id || null,
      counselor_id: counselor_id || null,
      chat_type: "scheduled",
      status: "active",
      started_at: new Date().toISOString(),
    });

    return res.status(201).json({ message: "Chat session started", chat_id: ref.id });
  } catch (err) {
    console.error("startChatSession error:", err);
    return res.status(500).json({ message: "Failed to start chat session" });
  }
};

exports.endChatSession = async (req, res) => {
  try {
    const { chat_id } = req.params;
    const ref = db.collection("chat_sessions").doc(chat_id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Chat session not found" });
    }

    await ref.update({
      status: "closed",
      ended_at: new Date().toISOString(),
      ended_reason: "manual",
    });

    return res.json({ message: "Chat session ended" });
  } catch (err) {
    console.error("endChatSession error:", err);
    return res.status(500).json({ message: "Failed to end chat session" });
  }
};

exports.getSessions = async (req, res) => {
  try {
    const userId = req.user?.auth_id || req.query.user_id;

    if (!userId) {
      return res.status(400).json({ message: "User ID missing" });
    }

    const [studentSnap, counselorSnap] = await Promise.all([
      db.collection("chat_sessions").where("student_id", "==", userId).get(),
      db.collection("chat_sessions").where("counselor_id", "==", userId).get(),
    ]);

    const seen = new Set();
    const sessions = [];

    for (const doc of [...studentSnap.docs, ...counselorSnap.docs]) {
      if (seen.has(doc.id)) continue;
      seen.add(doc.id);

      const data = doc.data();
      if (data.status !== "active") continue;

      const msgsSnap = await db
        .collection("chat_messages")
        .where("chat_id", "==", doc.id)
        .orderBy("sent_at", "desc")
        .limit(1)
        .get();

      let last_message = "No messages yet";
      let last_time = data.started_at || null;

      if (!msgsSnap.empty) {
        const msg = msgsSnap.docs[0].data();
        last_message = decrypt(msg.encrypted_message);
        last_time = msg.sent_at || data.started_at || null;
      }

      sessions.push({
        chat_id: doc.id,
        booking_id: data.booking_id || null,
        other_name: userId === data.student_id ? "Counselor" : "Student",
        last_message,
        status: data.status,
        last_time,
        student_id: data.student_id || null,
        counselor_id: data.counselor_id || null,
      });
    }

    sessions.sort((a, b) => new Date(b.last_time || 0) - new Date(a.last_time || 0));

    return res.json(sessions);
  } catch (err) {
    console.error("getSessions error:", err);
    return res.status(500).json({ message: "Failed to fetch sessions" });
  }
};