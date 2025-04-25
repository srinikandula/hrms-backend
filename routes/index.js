const express = require('express');
const router = express.Router();    
const eventRoutes = require('./eventRoutes');
const authRoutes = require('./authRoutes');


router.use('/events', eventRoutes);

router.use('/auth', authRoutes);


module.exports = router;


