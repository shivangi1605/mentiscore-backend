const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const { verifyToken, allowRoles } = require('../middleware/authMiddleware');

/* CREATE */
router.post("/", bookingController.createBooking);

/* STUDENT BOOKINGS */
router.get("/student/:student_id", bookingController.getStudentBookings);

/* COUNSELOR BOOKINGS */
router.get("/counselor/:counselor_id", bookingController.getCounselorBookings);

/* APPROVE */
router.put("/approve/:booking_id", verifyToken, allowRoles('counselor'), bookingController.approveBooking);

/* CANCEL */
router.put("/cancel/:booking_id", bookingController.cancelBooking);

/* RESCHEDULE */
router.put("/reschedule/:booking_id", bookingController.rescheduleBooking);

/* GET CHAT */
router.get("/chat/:booking_id", bookingController.getChatByBooking);

/* COMPLETE */
router.put("/complete/:booking_id", bookingController.completeBooking);

/* ADMIN - GET ALL BOOKINGS */
router.get("/", bookingController.getAllBookings);

module.exports = router;