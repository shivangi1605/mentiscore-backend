const express = require('express');
const router = express.Router();
const availabilityController = require('../controllers/availabilityController');

router.post(
  '/availability',
  availabilityController.createAvailabilitySlot
);

router.get(
  '/availability/:counselor_id',
  availabilityController.getSlotsByCounselor
);

router.put(
  '/availability/:slot_id',
  availabilityController.updateSlotStatus
);

router.delete(
  '/availability/:slot_id',
  availabilityController.deleteSlot
);


console.log("Loaded: sessionRoutes");

module.exports = router;
