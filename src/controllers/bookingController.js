const { db } = require("../config/firebase");
const chatSessionsCollection = db.collection("chat_sessions");
const bookingsCollection = db.collection("bookings");
const slotsCollection = db.collection("slots");
const notificationsCollection = db.collection("notifications");
const logsCollection = db.collection("activity_logs");

exports.createBooking = async (req, res) => {
  try {
    const { student_id, counselor_id, slot_id, session_type } = req.body || {};

    if (!student_id || !counselor_id || !slot_id || !session_type) {
      return res.status(400).json({ message: "Missing required booking fields" });
    }

    const slotRef = slotsCollection.doc(slot_id);
    const slotDoc = await slotRef.get();

    if (!slotDoc.exists) {
      return res.status(404).json({ message: "Slot not found" });
    }

    const slot = slotDoc.data();

    if (slot.is_booked) {
      return res.status(400).json({ message: "Slot already booked" });
    }

    const bookingRef = await bookingsCollection.add({
      student_id,
      counselor_id,
      slot_id,
      session_type,
      status: "pending",
      booked_at: new Date().toISOString(),
      approved_at: null,
      completed_at: null,
      cancelled_at: null,
      meet_link: null,
      scheduled_start: slot.start_time ?? null,
      scheduled_end: slot.end_time || null,
    });

    await slotRef.update({
      booking_id: bookingRef.id,
      is_booked: true,
      updated_at: new Date().toISOString(),
    });

    await notificationsCollection.add({
      user_id: counselor_id,
      type: "booking",
      title: "New booking request",
      message: "A student has requested a session.",
      reference_id: bookingRef.id,
      is_read: false,
      created_at: new Date().toISOString(),
    });

    await logsCollection.add({
      action: "create_booking",
      module: "booking",
      reference_id: bookingRef.id,
      performed_by: student_id,
      created_at: new Date().toISOString(),
    });

    return res.status(201).json({
      message: "Booking created successfully",
      booking_id: bookingRef.id,
    });
  } catch (err) {
    console.error("createBooking error:", err);
    return res.status(500).json({ message: "Failed to create booking" });
  }
};

exports.getStudentBookings = async (req, res) => {
  try {
    const { student_id } = req.params;
    const { status } = req.query;

    let query = bookingsCollection.where("student_id", "==", student_id);
    
    if (status) {
      query = query.where("status", "==", status);
    }

    const snapshot = await query.get();
    const rows = snapshot.docs.map((doc) => ({
      booking_id: doc.id,
      ...doc.data(),
    }));

    return res.json(rows);
  } catch (err) {
    console.error("getStudentBookings error:", err);
    return res.status(500).json({ message: "Failed to fetch student bookings" });
  }
};

exports.getCounselorBookings = async (req, res) => {
  try {
    const { counselor_id } = req.params;
    const snapshot = await bookingsCollection.where("counselor_id", "==", counselor_id).get();

    const rows = snapshot.docs.map((doc) => ({
      booking_id: doc.id,
      ...doc.data(),
    }));

    return res.json(rows);
  } catch (err) {
    console.error("getCounselorBookings error:", err);
    return res.status(500).json({ message: "Failed to fetch counselor bookings" });
  }
};

exports.approveBooking = async (req, res) => {
  try {
    const { booking_id } = req.params;

    const bookingRef = bookingsCollection.doc(booking_id);
    const bookingDoc = await bookingRef.get();

    if (!bookingDoc.exists) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const booking = bookingDoc.data();

    await bookingRef.update({
      status: "approved",
      approved_at: new Date().toISOString(),
      meet_link:
        booking.session_type === "chat"
          ? null
          : `https://meet.google.com/mock-${booking_id.slice(0, 8)}`,
    });

    // create chat session automatically if one does not already exist
    const existingChatSnap = await chatSessionsCollection
      .where("booking_id", "==", booking_id)
      .get();

    let chat_id = null;

    if (existingChatSnap.empty) {
      const chatRef = chatSessionsCollection.doc();
      await chatRef.set({
        booking_id,
        student_id: booking.student_id,
        counselor_id: booking.counselor_id,
        chat_type: "scheduled",
        status: "active",
        started_at: new Date().toISOString(),
      });
      chat_id = chatRef.id;
    } else {
      chat_id = existingChatSnap.docs[0].id;

      const existingData = existingChatSnap.docs[0].data();
      if (existingData.status !== "active") {
        await chatSessionsCollection.doc(chat_id).update({
          status: "active",
          restarted_at: new Date().toISOString(),
        });
      }
    }

    await notificationsCollection.add({
      user_id: booking.student_id,
      type: "booking",
      title: "Session approved",
      message: "Your counseling session has been approved.",
      reference_id: booking_id,
      is_read: false,
      created_at: new Date().toISOString(),
    });

    await logsCollection.add({
      action: "approve_booking",
      module: "booking",
      reference_id: booking_id,
      performed_by: req.user?.auth_id || "system",
      created_at: new Date().toISOString(),
    });

    return res.json({
      message: "Booking approved successfully",
      chat_id,
    });
  } catch (err) {
    console.error("approveBooking error:", err);
    return res.status(500).json({ message: "Failed to approve booking" });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const { booking_id } = req.params;

    const bookingRef = bookingsCollection.doc(booking_id);
    const bookingDoc = await bookingRef.get();

    if (!bookingDoc.exists) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const booking = bookingDoc.data();

    await bookingRef.update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    });

    if (booking.slot_id) {
      await slotsCollection.doc(booking.slot_id).update({
        is_booked: false,
        booking_id: null,
        updated_at: new Date().toISOString(),
      });
    }

    return res.json({ message: "Booking cancelled successfully" });
  } catch (err) {
    console.error("cancelBooking error:", err);
    return res.status(500).json({ message: "Failed to cancel booking" });
  }
};

exports.completeBooking = async (req, res) => {
  try {
    const { booking_id } = req.params;

    await bookingsCollection.doc(booking_id).update({
      status: "completed",
      completed_at: new Date().toISOString(),
    });

    return res.json({ message: "Booking marked as completed" });
  } catch (err) {
    console.error("completeBooking error:", err);
    return res.status(500).json({ message: "Failed to complete booking" });
  }
};

exports.rescheduleBooking = async (req, res) => {
  return res.status(501).json({ message: "Reschedule not implemented yet" });
};

exports.getCounselorBookings = async (req, res) => {
  try {
    const { counselor_id } = req.params;
    const { status } = req.query;

    let query = bookingsCollection.where("counselor_id", "==", counselor_id);
    
    if (status) {
      query = query.where("status", "==", status);
    }

    const snapshot = await query.get();
    const rows = snapshot.docs.map((doc) => ({
      booking_id: doc.id,
      ...doc.data(),
    }));

    return res.json(rows);
  } catch (err) {
    console.error("getCounselorBookings error:", err);
    return res.status(500).json({ message: "Failed to fetch counselor bookings" });
  }
};

exports.getAllBookings = async (req, res) => {
  try {
    const snapshot = await bookingsCollection.orderBy("booked_at", "desc").get();
    const rows = snapshot.docs.map((doc) => ({
      booking_id: doc.id,
      ...doc.data(),
    }));
    return res.json(rows);
  } catch (err) {
    console.error("getAllBookings error:", err);
    return res.status(500).json({ message: "Failed to fetch bookings" });
  }
};

exports.getChatByBooking = async (req, res) => {
  return res.status(501).json({ message: "Chat fetch not implemented yet" });
};