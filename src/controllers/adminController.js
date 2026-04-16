const { db, auth } = require('../config/firebase');

const usersCollection = db.collection('users');
const bookingsCollection = db.collection('bookings');
const logsCollection = db.collection('activity_logs');
const notificationsCollection = db.collection('notifications');

exports.getDashboard = async (req, res) => {
  try {
    const [usersSnap, bookingsSnap] = await Promise.all([
      usersCollection.get(),
      bookingsCollection.get(),
    ]);

    return res.json({
      totalUsers: usersSnap.size,
      totalBookings: bookingsSnap.size,
      role: req.user.role,
      message: 'Admin dashboard data loaded',
    });
  } catch (err) {
    console.error('getDashboard error:', err);
    return res.status(500).json({ message: 'Failed to load dashboard' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    let snapshot;

    if (req.user.role === 'college_admin' && req.user.college_id) {
      snapshot = await usersCollection.where('college_id', '==', req.user.college_id).get();
    } else {
      snapshot = await usersCollection.orderBy('createdAt', 'desc').get();
    }

    const users = snapshot.docs.map((doc) => ({
      auth_id: doc.id,
      ...doc.data(),
    }));

    return res.json(users);
  } catch (err) {
    console.error('getUsers error:', err);
    return res.status(500).json({ message: 'Failed to fetch users' });
  }
};

exports.approveUser = async (req, res) => {
  try {
    const { auth_id } = req.params;
    const userRef = usersCollection.doc(auth_id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = userDoc.data();

    if (
      req.user.role === 'college_admin' &&
      userData.college_id !== req.user.college_id
    ) {
      return res.status(403).json({ message: 'Forbidden: Cannot approve user from another college' });
    }

    await userRef.update({
      profileStatus: 'approved',
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await logsCollection.add({
      action: 'approve_user',
      module: 'admin',
      performed_by: req.user.auth_id,
      reference_id: auth_id,
      college_id: userData.college_id || '',
      createdAt: new Date().toISOString(),
    });

    return res.json({ message: 'User approved successfully' });
  } catch (err) {
    console.error('approveUser error:', err);
    return res.status(500).json({ message: 'Failed to approve user' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { auth_id } = req.params;

    const userDoc = await usersCollection.doc(auth_id).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    await usersCollection.doc(auth_id).delete();

    try {
      await auth.deleteUser(auth_id);
    } catch (firebaseErr) {
      console.warn('Firebase auth delete warning:', firebaseErr.message);
    }

    await logsCollection.add({
      action: 'delete_user',
      module: 'admin',
      performed_by: req.user.auth_id,
      reference_id: auth_id,
      createdAt: new Date().toISOString(),
    });

    return res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('deleteUser error:', err);
    return res.status(500).json({ message: 'Failed to delete user' });
  }
};

exports.addCounselor = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      college_id = '',
      qualification = '',
      specialization = '',
    } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const parts = name.trim().split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';

    const firebaseUser = await auth.createUser({ email, password });

    await usersCollection.doc(firebaseUser.uid).set({
      auth_id: firebaseUser.uid,
      email,
      role: 'counselor',
      provider: 'email',
      status: 'active',
      profileStatus: 'approved',
      college_id,
      firstName,
      lastName,
      qualification,
      specialization,
      counselor_id: firebaseUser.uid,
      student_id: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await logsCollection.add({
      action: 'add_counselor',
      module: 'admin',
      performed_by: req.user.auth_id,
      reference_id: firebaseUser.uid,
      createdAt: new Date().toISOString(),
    });

    return res.status(201).json({ message: 'Counselor added successfully', auth_id: firebaseUser.uid });
  } catch (err) {
    console.error('addCounselor error:', err);
    return res.status(500).json({ message: 'Failed to add counselor' });
  }
};

exports.deleteCounselor = async (req, res) => {
  try {
    const { user_id } = req.params;

    const userDoc = await usersCollection.doc(user_id).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'Counselor not found' });
    }

    const data = userDoc.data();
    if (data.role !== 'counselor') {
      return res.status(400).json({ message: 'Selected user is not a counselor' });
    }

    await usersCollection.doc(user_id).delete();

    try {
      await auth.deleteUser(user_id);
    } catch (firebaseErr) {
      console.warn('Firebase auth delete warning:', firebaseErr.message);
    }

    await logsCollection.add({
      action: 'delete_counselor',
      module: 'admin',
      performed_by: req.user.auth_id,
      reference_id: user_id,
      createdAt: new Date().toISOString(),
    });

    return res.json({ message: 'Counselor deleted successfully' });
  } catch (err) {
    console.error('deleteCounselor error:', err);
    return res.status(500).json({ message: 'Failed to delete counselor' });
  }
};

exports.getAllSessions = async (req, res) => {
  try {
    let snapshot;

    if (req.user.role === 'college_admin' && req.user.college_id) {
      const usersSnap = await usersCollection.where('college_id', '==', req.user.college_id).get();
      const allowedCounselorIds = new Set(
        usersSnap.docs
          .map((doc) => doc.data())
          .filter((u) => u.role === 'counselor')
          .map((u) => u.counselor_id || u.auth_id)
      );

      const bookingSnap = await bookingsCollection.orderBy('booked_at', 'desc').get();
      const filtered = bookingSnap.docs
        .map((doc) => ({ booking_id: doc.id, ...doc.data() }))
        .filter((b) => allowedCounselorIds.has(b.counselor_id));

      return res.json(filtered);
    }

    snapshot = await bookingsCollection.orderBy('booked_at', 'desc').get();
    const sessions = snapshot.docs.map((doc) => ({
      booking_id: doc.id,
      ...doc.data(),
    }));

    return res.json(sessions);
  } catch (err) {
    console.error('getAllSessions error:', err);
    return res.status(500).json({ message: 'Failed to fetch sessions' });
  }
};

exports.getActivityLogs = async (req, res) => {
  try {
    const snapshot = await logsCollection.orderBy('createdAt', 'desc').get();
    const logs = snapshot.docs.map((doc) => ({
      log_id: doc.id,
      ...doc.data(),
    }));
    return res.json(logs);
  } catch (err) {
    console.error('getActivityLogs error:', err);
    return res.status(500).json({ message: 'Failed to fetch activity logs' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const [usersSnap, bookingsSnap, logsSnap] = await Promise.all([
      usersCollection.get(),
      bookingsCollection.get(),
      logsCollection.get(),
    ]);

    const users = usersSnap.docs.map((doc) => doc.data());
    const bookings = bookingsSnap.docs.map((doc) => doc.data());

    return res.json({
      users: {
        total: usersSnap.size,
        students: users.filter((u) => u.role === 'student').length,
        counselors: users.filter((u) => u.role === 'counselor').length,
        admins: users.filter((u) => u.role === 'admin' || u.role === 'college_admin').length,
        pendingApprovals: users.filter((u) => u.profileStatus === 'pending').length,
      },
      sessions: {
        total: bookingsSnap.size,
        pending: bookings.filter((b) => b.status === 'pending').length,
        approved: bookings.filter((b) => b.status === 'approved').length,
        completed: bookings.filter((b) => b.status === 'completed').length,
        cancelled: bookings.filter((b) => b.status === 'cancelled').length,
      },
      logs: {
        total: logsSnap.size,
      },
    });
  } catch (err) {
    console.error('getStats error:', err);
    return res.status(500).json({ message: 'Failed to fetch stats' });
  }
};