const express = require('express');
const router = express.Router();
const leaveTypeController = require('../controllers/leaveTypeController');
const passport = require('passport');

const ensureAuthenticated = passport.authenticate('jwt', { session: false });

router.get('/all', ensureAuthenticated, leaveTypeController.getLeaveTypes);
router.post('/', ensureAuthenticated, leaveTypeController.createLeaveType);

module.exports = router;