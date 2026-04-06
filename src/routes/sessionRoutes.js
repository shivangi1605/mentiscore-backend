const express = require("express");
const router = express.Router();

const sessionController = require("../controllers/sessionController.js");

/* Student books a session */
router.post("/book", sessionController.bookSession);

/* Counselor views pending sessions */
router.get(
  "/counselor/:counselor_id/pending",
  sessionController.getPendingSessionsForCounselor
);

/* Counselor approves a session */
router.put(
  "/approve/:booking_id",
  sessionController.approveSession
);

router.get(
  "/counselor/:counselor_id/approved",
  sessionController.getApprovedSessionsForCounselor
);

router.get(
  "/counselor/:counselor_id/completed",
  sessionController.getCompletedSessionsForCounselor
);

router.get(
  "/student/:student_id",
  sessionController.getSessionsForStudent
);

router.get(
  "/student/:student_id/:status",
  sessionController.getStudentSessionsByStatus
);

router.put(
  "/cancel/:booking_id",
  sessionController.cancelSessionByStudent
);


router.put("/complete/:booking_id", sessionController.completeSession);

router.get("/counselor/:counselor_id/:status", sessionController.getCounselorSessionsByStatus);

router.get("/all", sessionController.getAllSessions);

module.exports = router;
