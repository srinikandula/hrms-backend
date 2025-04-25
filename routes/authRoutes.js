const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const passport = require('passport');

router.post('/register', authController.register);

router.post('/login', passport.authenticate('local', { session: true }), async (req, res) => {
    await authController.login(req, res);
});

module.exports = router;