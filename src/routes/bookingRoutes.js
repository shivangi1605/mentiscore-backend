const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Student routes
router.post('/book', verifyToken, requireRole(['student']), bookingController.createBooking);
router.get('/student/:student_id', verifyToken, requireRole(['student']), bookingController.getStudentBookings);

// Counselor routes
router.get('/counselor/:counselor_id', verifyToken, requireRole(['counselor']), bookingController.getCounselorBookings);
router.put('/approve/:booking_id', verifyToken, requireRole(['counselor']), bookingController.approveBooking);
router.put('/complete/:booking_id', verifyToken, requireRole(['counselor']), bookingController.completeBooking);

// Optional extras if frontend uses them
router.put('/cancel/:booking_id', verifyToken, requireRole(['student', 'counselor']), bookingController.cancelBooking);
router.put('/reschedule/:booking_id', verifyToken, requireRole(['student', 'counselor']), bookingController.rescheduleBooking);

module.exports = router;