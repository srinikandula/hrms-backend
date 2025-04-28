const Event = require('../models/Event');
const { ObjectId } = require('mongoose').Types;
const User = require('../models/User');
const LeaveType = require('../models/LeaveType');


exports.createEvent = async (req, res) => {
    const { LeaveType, start, end, description, managerId } = req.body;
    try {
      const startDate = new Date(start);
      const endDate = new Date(end);
      const leaveDays = Math.ceil((endDate - startDate) / (1000 * 3600 * 24)) + 1;

      // Find the user and populate their leave balances
      const user = await User.findById(req.user._id).populate('leaveBalances.leaveType');

      const leaveBalance = user.leaveBalances.find(balance => balance.leaveType.name === LeaveType);

      // Check if the leave type exists and if the user has enough balance
      if (!leaveBalance) {
        return res.status(400).json({ message: `No leave balance found for ${LeaveType}` });
      }

      if (leaveBalance.count < leaveDays) {
        return res.status(400).json({ message: `Insufficient leave balance for ${LeaveType}. Available: ${leaveBalance.count}, Requested: ${leaveDays}` });
      }

      const newEvent = new Event({
        LeaveType,
        start,
        end,
        description,
        userId: req.user._id,
        managerId: managerId ? new ObjectId(managerId) : null,
        status: 'pending'
      });
  
      const saved = await newEvent.save();
      res.status(201).json({
        message: 'Event created successfully',
        event: saved
      });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
};

exports.getEvents = async (req, res) => {
  try {
    const events = await Event.find({ userId: req.user._id });  
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateEvent = async (req, res) => {
    const { id } = req.params;
    const { LeaveType, start, end, description, managerId, status } = req.body;
  
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }
  
    try {
      const existingEvent = await Event.findById(id);
  
      if (!existingEvent) {
        return res.status(404).json({ message: 'Event not found' });
      }
  
      // Check if the event is already approved or rejected
      if (existingEvent.status === 'approved' || existingEvent.status === 'rejected') {
        return res.status(400).json({ message: 'Cannot update an approved or rejected event' });
      }
  
      if (status && !['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status. Must be "pending", "approved", or "rejected".' });
      }

      // Calculate the new number of leave days
      const startDate = start ? new Date(start) : existingEvent.start;
      const endDate = end ? new Date(end) : existingEvent.end;
      const newLeaveDays = Math.ceil((endDate - startDate) / (1000 * 3600 * 24)) + 1;

      // Find the user and populate their leave balances
      const user = await User.findById(existingEvent.userId).populate('leaveBalances.leaveType');

      const leaveType = LeaveType || existingEvent.LeaveType;
      const leaveBalance = user.leaveBalances.find(balance => balance.leaveType.name === leaveType);

      if (!leaveBalance) {
        return res.status(400).json({ message: `No leave balance found for ${leaveType}` });
      }

      if (leaveBalance.count < newLeaveDays) {
        return res.status(400).json({ message: `Insufficient leave balance for ${leaveType}. Available: ${leaveBalance.count}, Requested: ${newLeaveDays}` });
      }

      const updateData = {
        LeaveType: leaveType,
        start: startDate,
        end: endDate,
        description,
        managerId: managerId ? new ObjectId(managerId) : existingEvent.managerId,
        status: status || 'pending' 
      };
  
      const updatedEvent = await Event.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );
  
      res.json({
        message: 'Event updated successfully',
        event: updatedEvent
      });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
};

exports.deleteEvent = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedEvent = await Event.findOneAndDelete({ _id: id, userId: req.user._id }); 
    if (!deletedEvent) {
      return res.status(404).json({ message: 'Event not found or you do not have permission to delete it' });
    }
    res.json({
      message: 'Event deleted successfully',
      event: deletedEvent
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getManagerMappedEmployeeLeaves = async (req, res) => {
    try {
      // Check if the logged-in user is a manager
      if (req.user.role !== 'manager') {
        return res.status(403).json({ message: 'Access denied. Only managers can access this.' });
      }
    
      // Run the query to find events for the manager
      const employeeLeaves = await Event.find({ managerId: req.user._id })
        .populate('userId', 'fullName mobile');
      
      res.json(employeeLeaves);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
};


exports.approveRejectLeave = async (req, res) => {
    try {
      const { leaveId, action } = req.body;
  
      const leave = await Event.findById(leaveId);
      if (!leave) {
        return res.status(404).json({ message: 'Leave request not found' });
      }
  
      if (action === 'approve') {
        leave.status = 'approved';
        await leave.save();
  
        const startDate = new Date(leave.start);
        const endDate = new Date(leave.end);
        const leaveDays = Math.ceil((endDate - startDate) / (1000 * 3600 * 24)) + 1;
  
        const leaveType = await LeaveType.findOne({ name: leave.LeaveType });
        if (!leaveType) {
          return res.status(404).json({ message: 'Leave type not found' });
        }
  
        const updatedUser = await User.findOneAndUpdate(
          { 
            _id: leave.userId, 
            'leaveBalances.leaveType': leaveType._id 
          },
          { $inc: { 'leaveBalances.$.count': -leaveDays } },
          { new: true }
        );
  
        if (!updatedUser) {
          const user = await User.findById(leave.userId);
          const leaveBalanceIndex = user.leaveBalances.findIndex(
            balance => balance.leaveType.toString() === leaveType._id.toString()
          );
          if (leaveBalanceIndex !== -1) {
            user.leaveBalances[leaveBalanceIndex].count -= leaveDays;
            await user.save();
          }
        }
  
        res.json({ message: 'Leave request approved successfully', leave });
      } else if (action === 'reject') {
        leave.status = 'rejected';
        await leave.save();
        res.json({ message: 'Leave request rejected successfully', leave });
      } else {
        res.status(400).json({ message: 'Invalid action' });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  