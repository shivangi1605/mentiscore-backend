// src/controllers/studentController.js
const { db } = require('../config/firebase');

const usersCollection = db.collection('users');
const activityLogsCollection = db.collection('activity_logs');

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
      phone,
      gender = null,
      dob = null,
    } = req.body || {};

    const tokenAuthId = req.user?.auth_id || null;
    const effectiveAuthId = tokenAuthId || auth_id;

    if (!effectiveAuthId) {
      return res.status(400).json({ message: 'auth_id is required' });
    }

    if (!first_name || !last_name) {
      return res.status(400).json({ message: 'First name and last name are required' });
    }

    await usersCollection.doc(String(effectiveAuthId)).set(
      {
        role: 'student',
        student_id: String(effectiveAuthId),
        college_id: college_id ? String(college_id) : '',
        first_name,
        middle_name: middle_name || '',
        last_name,
        enrollment_no: enrollment_no || '',
        department: department || '',
        current_year: current_year || '',
        phone: phone || '',
        gender,
        dob,
        profileStatus: 'pending',
        status: 'active',
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );

    await activityLogsCollection.add({
      action: 'create_student_profile',
      module: 'student',
      reference_id: String(effectiveAuthId),
      performed_by: String(effectiveAuthId),
      created_at: new Date().toISOString(),
    });

    return res.status(201).json({
      message: 'Profile submitted. Waiting for approval.',
    });
  } catch (error) {
    console.error('createStudentProfile error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getStudentProfile = async (req, res) => {
  try {
    const authId = req.user?.auth_id || req.params?.auth_id;

    if (!authId) {
      return res.status(400).json({ message: 'auth_id is required' });
    }

    const userDoc = await usersCollection.doc(String(authId)).get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    return res.json({
      auth_id: authId,
      ...userDoc.data(),
    });
  } catch (error) {
    console.error('getStudentProfile error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateStudentProfile = async (req, res) => {
  try {
    const authId = req.user?.auth_id || req.params?.auth_id;

    if (!authId) {
      return res.status(400).json({ message: 'auth_id is required' });
    }

    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.auth_id;
    delete updates.role;

    await usersCollection.doc(String(authId)).set(updates, { merge: true });

    return res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('updateStudentProfile error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};