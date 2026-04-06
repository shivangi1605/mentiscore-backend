const express = require('express');
const router = express.Router();
const availabilityController = require('../controllers/availabilityController');

// ✅ REMOVE extra /availability here
router.post('/', availabilityController.createAvailabilitySlot);

router.get('/:counselor_id', availabilityController.getSlotsByCounselor);

router.put('/:slot_id', availabilityController.updateSlotStatus);

router.delete('/:slot_id', availabilityController.deleteSlot);

module.exports = router;