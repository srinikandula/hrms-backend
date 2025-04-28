const express = require('express');
const router = express.Router();    
const eventRoutes = require('./eventRoutes');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const holidayRoutes = require('./holidayRoutes');
const leaveTypeRoutes = require('./leaveTypeRoutes');


router.use('/events', eventRoutes);

router.use('/auth', authRoutes);

router.use('/user', userRoutes);

router.use('/holidays', holidayRoutes);

router.use('/leavetypes', leaveTypeRoutes);



module.exports = router;


