const db = require('../config/db');

/* CREATE counselor profile */
exports.createCounselorProfile = (req, res) => {
  const {
    auth_id,
    college_id,
    first_name,
    last_name,
    qualification,
    specialization,
    experience_years,
    phone,
    gender,
    bio
  } = req.body;

  if (!auth_id || !college_id || !first_name || !last_name) {
    return res.status(400).json({ message: 'Required fields missing' });
  }

  const sql = `
    INSERT INTO counselors
    (auth_id, college_id, first_name, last_name, qualification,
     specialization, experience_years, phone, gender, bio)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      auth_id,
      college_id,
      first_name,
      last_name,
      qualification,
      specialization,
      experience_years,
      phone,
      gender,
      bio
    ],
    (err, result) => {
      if (err) return res.status(400).json(err);
      res.status(201).json({ message: 'Counselor profile created' });
    }
  );
};

/* GET counselor profile */
exports.getCounselorProfile = (req, res) => {
  const { auth_id } = req.params;

  const sql = `
    SELECT * FROM counselors
    WHERE auth_id = ? AND is_deleted = 0
  `;

  db.query(sql, [auth_id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (rows.length === 0)
      return res.status(404).json({ message: 'Counselor not found' });

    res.json(rows[0]);
  });
};

/* UPDATE counselor profile */
exports.updateCounselorProfile = (req, res) => {
  const { auth_id } = req.params;
  const {
    qualification,
    specialization,
    experience_years,
    phone,
    bio
  } = req.body;

  const sql = `
    UPDATE counselors
    SET qualification = ?,
        specialization = ?,
        experience_years = ?,
        phone = ?,
        bio = ?
    WHERE auth_id = ? AND is_deleted = 0
  `;

  db.query(
    sql,
    [
      qualification,
      specialization,
      experience_years,
      phone,
      bio,
      auth_id
    ],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: 'Counselor profile updated' });
    }
  );
};

exports.getAllCounselors = (req, res) => {
  const sql = `SELECT * FROM counselors`;

  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Failed to fetch counselors" });
    }
    res.json(results);
  });
};
