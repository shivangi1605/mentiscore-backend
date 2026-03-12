const db = require('../config/db');

/* CREATE student profile */
exports.createStudentProfile = async (req, res) => {
  try {
    const {
      auth_id,
      college_id,
      first_name,
      middle_name,
      last_name,
      enrollment_no,
      department,
      current_year,
      phone
    } = req.body;

    if (!auth_id) {
      return res.status(400).json({ message: "auth_id is required" });
    }

    // 1️⃣ Insert into student_details
    await db.query(
      `INSERT INTO student_details
       (auth_id, college_id, first_name, middle_name, last_name,
        enrollment_no, department, current_year, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        auth_id,
        college_id,
        first_name,
        middle_name,
        last_name,
        enrollment_no,
        department,
        current_year,
        phone
      ]
    );

    // 2️⃣ Update profile_status → pending
    await db.query(
      `UPDATE users_auth
       SET profile_status = 'pending'
       WHERE auth_id = ?`,
      [auth_id]
    );

    return res.status(201).json({
      message: "Profile submitted. Waiting for approval."
    });

  } catch (error) {
    console.error("Profile Creation Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* GET student profile */
exports.getStudentProfile = async (req, res) => {
  try {
    const { auth_id } = req.params;

    const [rows] = await db.query(
      "SELECT * FROM student_details WHERE auth_id = ?",
      [auth_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    return res.json(rows[0]);

  } catch (error) {
    console.error("Profile fetch error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* UPDATE student profile */
exports.updateStudentProfile = (req, res) => {
  const { auth_id } = req.params;
  const { phone, department, current_year } = req.body;

  const sql = `
    UPDATE student_details
    SET phone = ?, department = ?, current_year = ?
    WHERE auth_id = ?
  `;

  db.query(sql, [phone, department, current_year, auth_id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Student profile updated' });
  });
};

exports.bookSession = (req, res) => {
  if (!req.body) {
    return res.status(400).json({
      message: "Request body missing"
    });
  }

  const { student_id, counselor_id, slot_id, session_type } = req.body;

  if (!student_id || !counselor_id || !slot_id || !session_type) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // rest of your code...
};
