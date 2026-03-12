const db = require('../config/db');

/* CREATE availability slot */
exports.createAvailabilitySlot = (req, res) => {
  const {
    counselor_id,
    slot_date,
    start_time,
    end_time,
    day_of_week
  } = req.body;

  if (!counselor_id || !slot_date || !start_time || !end_time) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const sql = `
    INSERT INTO availability_slots
    (counselor_id, slot_date, start_time, end_time, day_of_week)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [counselor_id, slot_date, start_time, end_time, day_of_week],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.status(201).json({
        message: 'Availability slot created',
        slot_id: result.insertId
      });
    }
  );
};

/* GET slots by counselor */
exports.getSlotsByCounselor = (req, res) => {
  const { counselor_id } = req.params;

  const sql = `
    SELECT * FROM availability_slots
    WHERE counselor_id = ? AND is_active = 1
    ORDER BY slot_date, start_time
  `;

  db.query(sql, [counselor_id], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
};

/* UPDATE slot (book / unbook) */
exports.updateSlotStatus = (req, res) => {
  const { slot_id } = req.params;
  const { is_booked } = req.body;

  const sql = `
    UPDATE availability_slots
    SET is_booked = ?
    WHERE slot_id = ?
  `;

  db.query(sql, [is_booked, slot_id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Slot updated' });
  });
};

/* DELETE slot (soft delete) */
exports.deleteSlot = (req, res) => {
  const { slot_id } = req.params;

  const sql = `
    UPDATE availability_slots
    SET is_active = 0
    WHERE slot_id = ?
  `;

  db.query(sql, [slot_id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Slot removed' });
  });
};
