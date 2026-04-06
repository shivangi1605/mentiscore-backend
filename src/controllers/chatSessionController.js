const { db } = require("../config/firebase");

exports.startChatSession = async (req, res) => {
  try {
    const { booking_id, student_id, counselor_id } = req.body;

    if (!booking_id) {
      return res.status(400).json({ message: "booking_id is required" });
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

    [...studentSnap.docs, ...counselorSnap.docs].forEach(doc => {
      if (seen.has(doc.id)) return;
      seen.add(doc.id);
      const data = doc.data();
      sessions.push({
        chat_id: doc.id,
        other_name: userId === data.student_id ? "Counselor" : "Student",
        last_message: "No messages yet",
        status: data.status,
        last_time: data.started_at,
      });
    });

    return res.json(sessions);
  } catch (err) {
    console.error("getSessions error:", err);
    return res.status(500).json({ message: "Failed to fetch sessions" });
  }
};