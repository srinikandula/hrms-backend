const LeaveType = require('../models/LeaveType');
const User = require('../models/User');

exports.getLeaveTypes = async (req, res) => {
  try {
    const leaveTypes = await LeaveType.find();
    res.status(200).json(leaveTypes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching leave types', error: error.message });
  }
};

exports.createLeaveType = async (req, res) => {
  try {
    const { name, count } = req.body;
    const newLeaveType = new LeaveType({ name, count });
    await newLeaveType.save();

    // Update all users with the new leave type
    await User.updateMany({}, { $push: { leaveBalances: { leaveType: newLeaveType._id, count } } });

    res.status(201).json(newLeaveType);
  } catch (error) {
    res.status(400).json({ message: 'Error creating leave type', error: error.message });
  }
};