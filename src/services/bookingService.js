const { db } = require("../config/firebase");

const createBooking = async ({ student_id, counselor_id, slot_id, session_type, io }) => {
  try {
    const slotRef = db.collection("slots").doc(slot_id);
    const slotDoc = await slotRef.get();

    if (!slotDoc.exists) throw new Error("Slot not found");
    if (slotDoc.data().isBooked) throw new Error("Slot already booked");

    const bookingRef = db.collection("bookings").doc();
    const bookingId = bookingRef.id;

    await bookingRef.set({
      bookingId,
      student_id,
      counselor_id,
      slot_id,
      session_type,
      status: "pending",
      meet_link: null,
      booked_at: new Date().toISOString(),
      approved_at: null,
      completed_at: null
    });

    await slotRef.update({
      isBooked: true,
      booking_id: bookingId
    });

    await db.collection("chat_sessions").doc().set({
      booking_id: bookingId,
      chat_type: "scheduled",
      status: "active",
      student_id,
      counselor_id,
      started_at: new Date().toISOString()
    });

    if (io) {
      io.to(`counselor_${counselor_id}`).emit("new_booking", {
        bookingId,
        student_id,
        slot_id
      });
    }

    return {
      success: true,
      bookingId
    };
  } catch (err) {
    throw err;
  }
};

module.exports = { createBooking };