const { db } = require("../config/firebase");

exports.getSlotsByCounselor = async (req, res) => {
  try {
    const counselorId = req.params.counselor_id;

    if (!counselorId) {
      return res.status(400).json({ message: "Invalid counselor_id" });
    }

    const snapshot = await db.collection("slots")
      .where("counselor_id", "==", counselorId)
      .where("isActive", "==", true)
      .where("isBooked", "==", false)
      .get();

    const slots = snapshot.docs.map(doc => ({ slot_id: doc.id, ...doc.data() }));
    return res.json(slots);
  } catch (err) {
    console.error("getSlotsByCounselor error:", err);
    return res.status(500).json({ message: "Failed to load slots" });
  }
};

exports.createAvailabilitySlot = async (req, res) => {
  try {
    const { counselor_id, slot_date, start_time, end_time, day_of_week } = req.body;

    if (!counselor_id || !slot_date || !start_time || !end_time) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const ref = db.collection("slots").doc();
    await ref.set({
      counselor_id,
      slotDate: slot_date,
      startTime: start_time,
      endTime: end_time,
      dayOfWeek: day_of_week ?? null,
      isBooked: false,
      isActive: true,
      createdAt: new Date().toISOString()
    });

    return res.status(201).json({ message: "Availability slot created", slot_id: ref.id });
  } catch (err) {
    console.error("createAvailabilitySlot error:", err);
    return res.status(500).json({ message: "Failed to create slot" });
  }
};

exports.updateSlotStatus = async (req, res) => {
  try {
    const { slot_id } = req.params;
    const { is_booked } = req.body;

    if (is_booked === undefined) {
      return res.status(400).json({ message: "is_booked is required" });
    }

    const ref = db.collection("slots").doc(slot_id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Slot not found" });
    }

    await ref.update({ is_booked: Boolean(is_booked) });
    return res.json({ message: "Slot updated" });
  } catch (err) {
    console.error("updateSlotStatus error:", err);
    return res.status(500).json({ message: "Failed to update slot" });
  }
};

exports.deleteSlot = async (req, res) => {
  try {
    const { slot_id } = req.params;

    const ref = db.collection("slots").doc(slot_id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Slot not found" });
    }

    await ref.update({ is_active: false });
    return res.json({ message: "Slot removed" });
  } catch (err) {
    console.error("deleteSlot error:", err);
    return res.status(500).json({ message: "Failed to delete slot" });
  }
};