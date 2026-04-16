// src/controllers/studentController.js
const { db } = require('../config/firebase');

const usersCollection = db.collection('users');
const activityLogsCollection = db.collection('activity_logs');

exports.createStudentProfile = async (req, res) => {
  try {
    const {
      auth_id,
      college_id,
      firstName,
      lastName,
      enrollment_no,
      department,
      current_year,
      phone,
      gender,
      dob,
    } = req.body || {};

    // Get auth_id from token first, fall back to body
    const tokenAuthId = req.user?.auth_id || null;
    const effectiveAuthId = tokenAuthId || auth_id;

    if (!effectiveAuthId) {
      return res.status(400).json({ message: 'auth_id is required' });
    }

    if (!firstName || !lastName) {
      return res.status(400).json({ message: 'First name and last name are required' });
    }

    if (!college_id) {
      return res.status(400).json({ message: 'College selection is required' });
    }

    // Update user document with profile data
    await usersCollection.doc(String(effectiveAuthId)).set(
      {
        role: 'student',
        student_id: String(effectiveAuthId),
        college_id: String(college_id),
        firstName: String(firstName),
        lastName: String(lastName),
        enrollment_no: enrollment_no ? String(enrollment_no) : '',
        department: department ? String(department) : '',
        current_year: current_year ? String(current_year) : '',
        phone: phone ? String(phone) : '',
        gender: gender || null,
        dob: dob || null,
        profileStatus: 'pending',
        status: 'active',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Log activity
    await activityLogsCollection.add({
      action: 'create_student_profile',
      module: 'student',
      reference_id: String(effectiveAuthId),
      performed_by: String(effectiveAuthId),
      college_id: String(college_id),
      createdAt: new Date().toISOString(),
    });

    // Fetch updated user to return
    const updatedDoc = await usersCollection.doc(String(effectiveAuthId)).get();
    const updatedUser = updatedDoc.data();

    return res.status(201).json({
      message: 'Profile submitted. Waiting for college admin approval.',
      user: {
        auth_id: String(effectiveAuthId),
        ...updatedUser,
      },
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
      auth_id: String(authId),
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

    const updates = { ...req.body, updatedAt: new Date().toISOString() };
    
    // Remove immutable fields
    delete updates.auth_id;
    delete updates.role;
    delete updates.college_id;
    delete updates.student_id;

    await usersCollection.doc(String(authId)).set(updates, { merge: true });

    return res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('updateStudentProfile error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};