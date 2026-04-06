// const db = require("../config/db"); /
const { createMeetEvent } = require("../services/calendarService");
let io;

const ALLOWED_STATUSES = ['pending', 'approved', 'completed', 'cancelled'];

const resolveId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const fetchCounselorSessionsByStatus = (counselorId, status, res) => {
  const sql = `
    SELECT
      sb.*,
      a.slot_date,
      a.start_time,
      a.end_time,
      CONCAT(sd.first_name, ' ', sd.last_name) AS studentName,
      CONCAT(c.first_name, ' ', c.last_name) AS counselorName
    FROM session_bookings sb
    JOIN availability_slots a ON sb.slot_id = a.slot_id
    JOIN student_details sd ON sb.student_id = sd.student_id
    JOIN counselors c ON sb.counselor_id = c.counselor_id
    WHERE sb.counselor_id = ? AND sb.status = ?
    ORDER BY sb.booked_at DESC
  `;

  db.query(sql, [counselorId, status], (err, results) => {
    if (err) {
      console.error("Counselor session fetch error:", err);
      return res.status(500).json({ message: "Failed to fetch sessions" });
    }
    res.json(results);
  });
};

exports.setSocket = (socketIo) => {
  io = socketIo;
};

/**
 * STUDENT → Book a session
 */
exports.bookSession = async (req, res) => {
  const { student_id, counselor_id, slot_id, session_type } = req.body;

  const studentId = resolveId(student_id);
  const counselorId = resolveId(counselor_id);
  const slotId = resolveId(slot_id);
  const normalizedSessionType = typeof session_type === 'string' ? session_type.trim() : '';

  if (!studentId || !counselorId || !slotId || !normalizedSessionType) {
    return res.status(400).json({ message: "student_id, counselor_id, slot_id and session_type are required" });
  }

  try {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [studentRows] = await conn.query(
        `SELECT student_id FROM student_details WHERE student_id = ?`,
        [studentId]
      );

      if (!studentRows.length) {
        await conn.rollback();
        return res.status(404).json({ message: "Student profile not found" });
      }

      const [slotRows] = await conn.query(
        `
          SELECT slot_id, counselor_id, is_active, is_booked
          FROM availability_slots
          WHERE slot_id = ?
          FOR UPDATE
        `,
        [slotId]
      );

      const slot = slotRows?.[0];

      if (!slot || slot.is_active !== 1 || slot.is_booked !== 0 || Number(slot.counselor_id) !== counselorId) {
        await conn.rollback();
        return res.status(409).json({ message: "Slot is no longer available" });
      }

      const resolvedCounselorId = Number(slot.counselor_id);

      const [result] = await conn.query(
        `
          INSERT INTO session_bookings
          (student_id, counselor_id, slot_id, session_type, status)
          VALUES (?, ?, ?, ?, 'pending')
        `,
        [studentId, resolvedCounselorId, slotId, normalizedSessionType]
      );

      await conn.query(
        `
          UPDATE availability_slots
          SET is_booked = 1
          WHERE slot_id = ?
        `,
        [slotId]
      );

      await conn.commit();

      return res.status(201).json({
        message: "Session booked successfully",
        booking_id: result.insertId,
      });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

  } catch (err) {
    console.error("Book session error:", err);
    res.status(500).json({ message: "Failed to book session" });
  }
};

/**
 * COUNSELOR → View pending bookings
 */
exports.getPendingSessionsForCounselor = (req, res) => {
  const counselorId = resolveId(req.params.counselor_id);
  if (!counselorId) {
    return res.status(400).json({ message: "Invalid counselor_id" });
  }
  fetchCounselorSessionsByStatus(counselorId, 'pending', res);
};

/**
 * COUNSELOR → Approve session
 */
exports.approveSession = async (req, res) => {
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

    let meet_link = null;
    let calendar_event_id = null;
    try {
      const meetEvent = await createMeetEvent({
        summary: "Counseling Session",
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        attendees: [
          { email: "student@gmail.com" },
          { email: "counselor@gmail.com" },
        ],
      });

      meet_link = meetEvent?.hangoutLink ?? null;
      calendar_event_id = meetEvent?.id ?? null;
    } catch (meetErr) {
      console.error("Google Meet creation failed (continuing approval):", meetErr);
    }

    await db.query(
      `UPDATE session_bookings
       SET status = 'approved',
           approved_at = NOW(),
           meet_link = ?,
           calendar_event_id = ?
       WHERE booking_id = ?`,
      [meet_link, calendar_event_id, booking_id]
    );

    await db.query(
      `UPDATE availability_slots
       SET is_booked = 1
       WHERE slot_id = (
         SELECT slot_id FROM session_bookings WHERE booking_id = ?
       )`,
      [booking_id]
    );

    try {
      await db.query(
        `INSERT INTO notifications (user_id, title, message)
         VALUES (?, ?, ?)`,
        [
          session.student_id,
          "Session Approved",
          meet_link
            ? `Your counseling session has been approved. Join here: ${meet_link}`
            : "Your counseling session has been approved.",
        ]
      );

      if (io) {
        io.to(`user_${session.student_id}`).emit("newNotification", {
          title: "Session Approved",
          message: meet_link ? `Join here: ${meet_link}` : "Your counseling session has been approved.",
        });
      }
    } catch (notificationErr) {
      console.error("Notification insert failed:", notificationErr);
    }

    res.json({
      message: meet_link ? "Session approved & Google Meet created" : "Session approved",
      meet_link,
    });

  } catch (error) {
    console.error("Approval error:", error);
    res.status(500).json({ message: "Session approval failed" });
  }

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

exports.getApprovedSessionsForCounselor = (req, res) => {
  const counselorId = resolveId(req.params.counselor_id);
  if (!counselorId) {
    return res.status(400).json({ message: "Invalid counselor_id" });
  }
  fetchCounselorSessionsByStatus(counselorId, 'approved', res);
};

exports.getCompletedSessionsForCounselor = (req, res) => {
  const counselorId = resolveId(req.params.counselor_id);
  if (!counselorId) {
    return res.status(400).json({ message: "Invalid counselor_id" });
  }
  fetchCounselorSessionsByStatus(counselorId, 'completed', res);
};

exports.getCounselorSessionsByStatus = (req, res) => {
  const counselorId = resolveId(req.params.counselor_id);
  if (!counselorId) {
    return res.status(400).json({ message: "Invalid counselor_id" });
  }

  const requestedStatus = (req.params.status || '').toLowerCase();
  if (!ALLOWED_STATUSES.includes(requestedStatus)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  fetchCounselorSessionsByStatus(counselorId, requestedStatus, res);
};

exports.getSessionsForStudent = (req, res) => {
  const studentId = resolveId(req.params.student_id);
  if (!studentId) {
    return res.status(400).json({ message: "Invalid student_id" });
  }

  const sql = `
    SELECT
      sb.*,
      a.slot_date,
      a.start_time,
      a.end_time,
      CONCAT(sd.first_name, ' ', sd.last_name) AS studentName,
      CONCAT(c.first_name, ' ', c.last_name) AS counselorName
    FROM session_bookings sb
    JOIN availability_slots a ON sb.slot_id = a.slot_id
    JOIN student_details sd ON sb.student_id = sd.student_id
    JOIN counselors c ON sb.counselor_id = c.counselor_id
    WHERE sb.student_id = ?
    ORDER BY sb.booked_at DESC
  `;

  db.query(sql, [studentId], (err, results) => {
    if (err) {
      console.error("Student sessions fetch error:", err);
      return res.status(500).json({ message: "Failed to fetch sessions" });
    }
    res.json(results);
  });
};

exports.getStudentSessionsByStatus = (req, res) => {
  const studentId = resolveId(req.params.student_id);
  if (!studentId) {
    return res.status(400).json({ message: "Invalid student_id" });
  }

  const statusValue = (req.params.status || '').toLowerCase();
  if (!ALLOWED_STATUSES.includes(statusValue)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const sql = `
    SELECT
      sb.*,
      a.slot_date,
      a.start_time,
      a.end_time,
      CONCAT(sd.first_name, ' ', sd.last_name) AS studentName,
      CONCAT(c.first_name, ' ', c.last_name) AS counselorName
    FROM session_bookings sb
    JOIN availability_slots a ON sb.slot_id = a.slot_id
    JOIN student_details sd ON sb.student_id = sd.student_id
    JOIN counselors c ON sb.counselor_id = c.counselor_id
    WHERE sb.student_id = ? AND sb.status = ?
    ORDER BY sb.booked_at DESC
  `;

  db.query(sql, [studentId, statusValue], (err, results) => {
    if (err) {
      console.error("Student sessions status fetch error:", err);
      return res.status(500).json({ message: "Failed to fetch sessions" });
    }
    res.json(results);
  });
};

exports.cancelSessionByStudent = async (req, res) => {
  const { booking_id } = req.params;
  try {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.query(
        `
          SELECT slot_id
          FROM session_bookings
          WHERE booking_id = ?
            AND status = 'pending'
          FOR UPDATE
        `,
        [booking_id]
      );

      const booking = rows?.[0];
      if (!booking) {
        await conn.rollback();
        return res.status(400).json({ message: "Only pending sessions can be cancelled" });
      }

      await conn.query(
        `
          UPDATE session_bookings
          SET status = 'cancelled',
              cancelled_at = NOW()
          WHERE booking_id = ?
        `,
        [booking_id]
      );

      await conn.query(
        `
          UPDATE availability_slots
          SET is_booked = 0
          WHERE slot_id = ?
        `,
        [booking.slot_id]
      );

      await conn.commit();
      return res.json({ message: "Session cancelled successfully" });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("Cancel session error:", err);
    return res.status(500).json({ message: "Cancel failed" });
  }
};

exports.getAllSessions = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
        SELECT
          sb.*,
          a.slot_date,
          a.start_time,
          a.end_time,
          CONCAT(sd.first_name, ' ', sd.last_name) AS studentName,
          CONCAT(c.first_name, ' ', c.last_name) AS counselorName
        FROM session_bookings sb
        JOIN availability_slots a ON sb.slot_id = a.slot_id
        JOIN student_details sd ON sb.student_id = sd.student_id
        JOIN counselors c ON sb.counselor_id = c.counselor_id
        ORDER BY sb.booked_at DESC
      `
    );
    res.json(rows);
  } catch (err) {
    console.error("getAllSessions error:", err);
    res.status(500).json({ message: "Failed to fetch sessions" });
  }
};
