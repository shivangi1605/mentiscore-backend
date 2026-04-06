const { db } = require("../config/firebase");

exports.createCounselorProfile = async (req, res) => {
  try {
    const { auth_id, college_id, first_name, last_name, qualification, specialization, experience_years, phone, gender, bio } = req.body;

    if (!auth_id || !college_id || !first_name || !last_name) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    await db.collection("counselors").doc(auth_id).set({
      auth_id, college_id, first_name, last_name,
      qualification: qualification ?? null,
      specialization: specialization ?? null,
      experience_years: experience_years ?? null,
      phone: phone ?? null,
      gender: gender ?? null,
      bio: bio ?? null,
      is_deleted: false,
      createdAt: new Date().toISOString()
    });

    return res.status(201).json({ message: "Counselor profile created", counselor_id: auth_id });
  } catch (err) {
    console.error("createCounselorProfile error:", err);
    return res.status(500).json({ message: "Failed to create counselor profile" });
  }
};

exports.getCounselorProfile = async (req, res) => {
  try {
    const { auth_id } = req.params;
    const doc = await db.collection("counselors").doc(auth_id).get();

    if (!doc.exists || doc.data().is_deleted) {
      return res.status(404).json({ message: "Counselor not found" });
    }

    return res.json(doc.data());
  } catch (err) {
    console.error("getCounselorProfile error:", err);
    return res.status(500).json({ message: "Failed to fetch counselor profile" });
  }
};

exports.updateCounselorProfile = async (req, res) => {
  try {
    const { auth_id } = req.params;
    const { qualification, specialization, experience_years, phone, bio } = req.body;

    const ref = db.collection("counselors").doc(auth_id);
    const doc = await ref.get();

    if (!doc.exists || doc.data().is_deleted) {
      return res.status(404).json({ message: "Counselor not found" });
    }

    await ref.update({
      qualification: qualification ?? null,
      specialization: specialization ?? null,
      experience_years: experience_years ?? null,
      phone: phone ?? null,
      bio: bio ?? null
    });

    return res.json({ message: "Counselor profile updated" });
  } catch (err) {
    console.error("updateCounselorProfile error:", err);
    return res.status(500).json({ message: "Failed to update counselor profile" });
  }
};

exports.getAllCounselors = async (req, res) => {
  try {
    const snapshot = await db.collection("users")
      .where("role", "==", "counselor")
      .get();

    const counselors = snapshot.docs.map(doc => ({
      auth_id: doc.id,
      ...doc.data()
    }));
    return res.json(counselors);
  } catch (err) {
    console.error("getAllCounselors error:", err);
    return res.status(500).json({ message: "Failed to fetch counselors" });
  }
};