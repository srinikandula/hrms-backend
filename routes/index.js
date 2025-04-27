const express = require('express');
const router = express.Router();    
const eventRoutes = require('./eventRoutes');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');


router.use('/events', eventRoutes);

router.use('/auth', authRoutes);

router.use('/user', userRoutes);


module.exports = router;


