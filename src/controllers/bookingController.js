const db = require('../config/db');

/* CREATE booking */
exports.createBooking = (req, res) => {
  const {
    student_id,
    counselor_id,
    slot_id,
    session_type
  } = req.body;

  if (!student_id || !counselor_id || !slot_id) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const sql = `
    INSERT INTO session_bookings
    (student_id, counselor_id, slot_id, session_type, status)
    VALUES (?, ?, ?, ?, 'booked')
  `;

  db.query(
    sql,
    [student_id, counselor_id, slot_id, session_type],
    (err, result) => {
      if (err) return res.status(500).json(err);

      // mark slot as booked
      db.query(
        `UPDATE availability_slots SET is_booked = 1 WHERE slot_id = ?`,
        [slot_id],
        (err) => {
          if (err) {
            console.error('Error marking slot as booked:', err);
          }
        }
      );

      res.status(201).json({
        message: 'Session booked successfully',
        booking_id: result.insertId
      });
    }
  );
};

/* GET bookings by student */
exports.getStudentBookings = (req, res) => {
  const { student_id } = req.params;

  const sql = `
    SELECT sb.*, a.slot_date, a.start_time, a.end_time
    FROM session_bookings sb
    JOIN availability_slots a ON sb.slot_id = a.slot_id
    WHERE sb.student_id = ?
  `;

  db.query(sql, [student_id], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
};

/* CANCEL booking */
exports.cancelBooking = (req, res) => {
  const { booking_id } = req.params;

  const sql = `
    UPDATE session_bookings
    SET status = 'cancelled'
    WHERE booking_id = ?
  `;

  db.query(sql, [booking_id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Booking cancelled' });
  });
};
