const Event = require('../models/Event');
const { ObjectId } = require('mongoose').Types;

exports.createEvent = async (req, res) => {
    const { LeaveType, start, end, description, roleType, managerId } = req.body;
    try {
      // Validate roleType
      if (!['employee', 'manager'].includes(roleType)) {
        return res.status(400).json({ message: 'Invalid roleType. Must be either "employee" or "manager".' });
      }
  
      // If roleType is employee, managerId is required
      if (roleType === 'employee' && !managerId) {
        return res.status(400).json({ message: 'Manager ID is required for employee role type.' });
      }
  
      const newEvent = new Event({
        LeaveType,
        start,
        end,
        description,
        userId: req.user._id,
        roleType,
        managerId: roleType === 'employee' ? new ObjectId(managerId) : null,
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
    const { LeaveType, start, end, description, roleType, managerId, status } = req.body;
  
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }
  
    try {
      // Fetch the existing event without checking the userId
      const existingEvent = await Event.findById(id);
  
      if (!existingEvent) {
        return res.status(404).json({ message: 'Event not found' });
      }
  
      // Check if the event is already approved or rejected
      if (existingEvent.status === 'approved' || existingEvent.status === 'rejected') {
        return res.status(400).json({ message: 'Cannot update an approved or rejected event' });
      }
  
      // Validate roleType
      if (roleType && !['employee', 'manager'].includes(roleType)) {
        return res.status(400).json({ message: 'Invalid roleType. Must be either "employee" or "manager".' });
      }
  
      // If roleType is employee, managerId is required
      if (roleType === 'employee' && !managerId) {
        return res.status(400).json({ message: 'Manager ID is required for employee role type.' });
      }
  
      // Validate status
      if (status && !['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status. Must be "pending", "approved", or "rejected".' });
      }
  
      const updateData = {
        LeaveType,
        start,
        end,
        description,
        roleType,
        managerId: roleType === 'employee' ? new ObjectId(managerId) : null,
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
    console.log('approveRejectLeave function called');
    try {
        // Check if the logged-in user is a manager
        if (req.user.role !== 'manager') {
            return res.status(403).json({ message: 'Access denied. Only managers can approve or reject leaves.' });
        }

        const { leaveId, action } = req.body;

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ message: 'Invalid action. Must be either "approve" or "reject".' });
        }

        // Find the leave request
        const leave = await Event.findOne({ _id: leaveId, managerId: req.user._id });

        if (!leave) {
            return res.status(404).json({ message: 'Leave request not found or you do not have permission to modify it.' });
        }

        if (action === 'approve') {
            // Update the leave status to approved
            leave.status = 'approved';
            await leave.save();

            res.json({ message: 'Leave request approved successfully', leave });
        } else if (action === 'reject') {
            // Delete the leave request
            await Event.deleteOne({ _id: leaveId });

            res.json({ message: 'Leave request rejected and deleted successfully' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
