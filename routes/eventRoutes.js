const express = require('express');
const router = express.Router();    
const eventController = require('../controllers/eventController');
const passport = require('passport');


const ensureAuthenticated = passport.authenticate('jwt', { session: false });

router.get('/all', ensureAuthenticated, eventController.getEvents);

router.post('/create', ensureAuthenticated, eventController.createEvent);

router.put('/update/:id', ensureAuthenticated, eventController.updateEvent);

router.delete('/delete/:id', ensureAuthenticated, eventController.deleteEvent);

module.exports = router;