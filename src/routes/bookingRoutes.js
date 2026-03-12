const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");

/* Student creates booking */
router.post("/", bookingController.createBooking);

/* Student views own bookings */
router.get("/student/:student_id", bookingController.getStudentBookings);

/* Student cancels booking */
router.put("/cancel/:booking_id", bookingController.cancelBooking);

module.exports = router;
