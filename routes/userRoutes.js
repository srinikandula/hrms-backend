const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const passport = require('passport');

const ensureAuthenticated = passport.authenticate('jwt', { session: false });

// Get all users
router.get('/all',  ensureAuthenticated, userController.getAllUsers);

// Create a new user
router.post('/', ensureAuthenticated, userController.createUser);

// Update a user
router.put('/:id', ensureAuthenticated, userController.updateUser);

// Delete a user
router.delete('/:id', ensureAuthenticated, userController.deleteUser);

router.post('/search', ensureAuthenticated, userController.searchUsers);

router.get('/managers', ensureAuthenticated, userController.getAllManagers);

router.post('/leave-balances', ensureAuthenticated, userController.getUserLeaveBalancesByUserId);


module.exports = router;