const express = require('express');
const router = express.Router();

const counselorController = require('../controllers/counselorController');

/* ==============================
   Counselor Profile Routes
================================ */

/* CREATE counselor profile */
router.post('/profile', counselorController.createCounselorProfile);

/* GET counselor profile */
router.get('/profile/:auth_id', counselorController.getCounselorProfile);

/* UPDATE counselor profile */
router.put('/profile/:auth_id', counselorController.updateCounselorProfile);

router.get('/', counselorController.getAllCounselors);


module.exports = router;
