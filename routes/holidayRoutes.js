const express = require('express');
const router = express.Router();
const holidayController = require('../controllers/holidayController');
const passport = require('passport');

const ensureAuthenticated = passport.authenticate('jwt', { session: false });

router.get('/all', ensureAuthenticated, holidayController.getHolidays);
router.post('/', ensureAuthenticated, holidayController.createHoliday);
router.put('/:id', holidayController.updateHoliday);
router.delete('/:id', holidayController.deleteHoliday);

module.exports = router;