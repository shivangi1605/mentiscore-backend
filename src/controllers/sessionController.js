const db = require("../config/db");
const { createMeetEvent } = require("../services/calendarService");
let io;

exports.setSocket = (socketIo) => {
  io = socketIo;
};

/**
 * STUDENT → Book a session
 */
exports.bookSession = async (req, res) => {
  const { student_id, counselor_id, slot_id, session_type } = req.body;

  if (!student_id || !counselor_id || !slot_id || !session_type) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const sql = `
      INSERT INTO session_bookings
      (student_id, counselor_id, slot_id, session_type)
      VALUES (?, ?, ?, ?)
    `;

    const [result] = await db.query(sql, [
      student_id,
      counselor_id,
      slot_id,
      session_type,
    ]);

    res.status(201).json({
      message: "Session booked successfully",
      booking_id: result.insertId,
    });

  } catch (err) {
    console.error("Book session error:", err);
    res.status(500).json({ message: "Failed to book session" });
  }
};

/**
 * COUNSELOR → View pending bookings
 */
exports.getPendingSessionsForCounselor = (req, res) => {
  const { counselor_id } = req.params;

  const sql = `
    SELECT *
    FROM session_bookings
    WHERE counselor_id = ?
      AND status = 'pending'
    ORDER BY booked_at DESC
  `;

  db.query(sql, [counselor_id], (err, results) => {
    if (err) {
      console.error("Fetch pending sessions error:", err);
      return res.status(500).json({ message: "Failed to fetch sessions" });
    }

    res.json(results);
  });
};

/**
 * COUNSELOR → Approve session
 */
exports.approveSession = async (req, res) => {
  console.log("🔥 APPROVE ROUTE HIT");

  const { booking_id } = req.params;

  try {
    const selectSql = `
      SELECT sb.booking_id, sb.student_id, sb.counselor_id,
             a.slot_date, a.start_time, a.end_time
      FROM session_bookings sb
      JOIN availability_slots a ON sb.slot_id = a.slot_id
      WHERE sb.booking_id = ? AND sb.status = 'pending'
    `;

    const [rows] = await db.query(selectSql, [booking_id]);

    if (rows.length === 0) {
      return res.status(400).json({
        message: "Invalid or already processed session",
      });
    }

    const session = rows[0];

    const dateOnly = new Date(session.slot_date)
      .toISOString()
      .split("T")[0];

    const startDateTime = new Date(`${dateOnly}T${session.start_time}`);
    const endDateTime = new Date(`${dateOnly}T${session.end_time}`);

    const meetEvent = await createMeetEvent({
      summary: "Counseling Session",
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      attendees: [
        { email: "student@gmail.com" },
        { email: "counselor@gmail.com" },
      ],
    });

    // Update booking
    await db.query(
      `UPDATE session_bookings
       SET status = 'approved',
           approved_at = NOW(),
           meet_link = ?,
           calendar_event_id = ?
       WHERE booking_id = ?`,
      [meetEvent.hangoutLink, meetEvent.id, booking_id]
    );

    // Mark slot booked
    await db.query(
      `UPDATE availability_slots
       SET is_booked = 1
       WHERE slot_id = (
         SELECT slot_id FROM session_bookings WHERE booking_id = ?
       )`,
      [booking_id]
    );

    // ✅ INSERT NOTIFICATION (INSIDE TRY, BEFORE res.json)
    await db.query(
      `INSERT INTO notifications (user_id, title, message)
       VALUES (?, ?, ?)`,
      [
        session.student_id,
        "Session Approved",
        `Your counseling session has been approved. Join here: ${meetEvent.hangoutLink}`
      ]
    );

    // ✅ SEND RESPONSE ONLY ONCE
    res.json({
      message: "Session approved & Google Meet created",
      meet_link: meetEvent.hangoutLink,
    });

  } catch (error) {
    console.error("❌ Approval error:", error);
    res.status(500).json({ message: "Session approval failed" });
  }
  io.to(`user_${session.student_id}`).emit("newNotification", {
  title: "Session Approved",
  message: `Join here: ${meetEvent.hangoutLink}`
});

};
exports.completeSession = (req, res) => {
  const { booking_id } = req.params;

  db.query(
    `UPDATE session_bookings 
     SET status='completed', completed_at=NOW() 
     WHERE booking_id=?`,
    [booking_id],
    () => res.json({ message: "Session completed" })
  );
};

exports.cancelSession = (req, res) => {
  const { booking_id } = req.params;

  db.query(
    `UPDATE session_bookings 
     SET status='cancelled', cancelled_at=NOW() 
     WHERE booking_id=?`,
    [booking_id],
    () => res.json({ message: "Session cancelled" })
  );
};

// Approved sessions
exports.getApprovedSessionsForCounselor = (req, res) => {
  const { counselor_id } = req.params;

  db.query(
    `SELECT * FROM session_bookings
     WHERE counselor_id = ? AND status = 'approved'
     ORDER BY approved_at DESC`,
    [counselor_id],
    (err, results) => {
      if (err) return res.status(500).json(err);
      res.json(results);
    }
  );
};

// Completed sessions
exports.getCompletedSessionsForCounselor = (req, res) => {
  const { counselor_id } = req.params;

  db.query(
    `SELECT * FROM session_bookings
     WHERE counselor_id = ? AND status = 'completed'
     ORDER BY completed_at DESC`,
    [counselor_id],
    (err, results) => {
      if (err) return res.status(500).json(err);
      res.json(results);
    }
  );
};

exports.getSessionsForStudent = (req, res) => {
  const { student_id } = req.params;

  const sql = `
    SELECT *
    FROM session_bookings
    WHERE student_id = ?
    ORDER BY booked_at DESC
  `;

  db.query(sql, [student_id], (err, results) => {
    if (err) {
      console.error("Student sessions fetch error:", err);
      return res.status(500).json({ message: "Failed to fetch sessions" });
    }
    res.json(results);
  });
};

exports.getStudentSessionsByStatus = (req, res) => {
  const { student_id, status } = req.params;

  const allowedStatus = ['pending', 'approved', 'completed', 'cancelled'];
  if (!allowedStatus.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const sql = `
    SELECT *
    FROM session_bookings
    WHERE student_id = ? AND status = ?
    ORDER BY booked_at DESC
  `;

  db.query(sql, [student_id, status], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
};

exports.cancelSessionByStudent = (req, res) => {
  const { booking_id } = req.params;

  const sql = `
    UPDATE session_bookings
    SET status = 'cancelled',
        cancelled_at = NOW()
    WHERE booking_id = ?
      AND status = 'pending'
  `;

  db.query(sql, [booking_id], (err, result) => {
    if (err) {
      console.error("Cancel session error:", err);
      return res.status(500).json({ message: "Cancel failed" });
    }

    if (result.affectedRows === 0) {
      return res.status(400).json({
        message: "Only pending sessions can be cancelled"
      });
    }

    res.json({ message: "Session cancelled successfully" });
  });
};

