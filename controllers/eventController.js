const Event = require('../models/Event');
const { ObjectId } = require('mongoose').Types;
const User = require('../models/User');
const LeaveType = require('../models/LeaveType');
const sendEmail = require('../config/mailer');


exports.createEvent = async (req, res) => {
  const { LeaveType, start, end, description } = req.body;
  try {
    const user = await User.findById(req.user._id).populate('leaveBalances.leaveType manager');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check leave type, user's balance
    const leaveBalance = user.leaveBalances.find(balance => balance.leaveType.name === LeaveType);
    if (!leaveBalance) return res.status(400).json({ message: `No leave balance found for ${LeaveType}` });

    const newEvent = new Event({
      LeaveType,
      start,
      end,
      description,
      userId: req.user._id,
      status: 'pending'
    });

    const saved = await newEvent.save();

    // Email Notification
    const manager = user.manager || user;
    const subject = `New Leave Request from ${user.fullName}`;
    const html = `
      <p><strong>Employee:</strong> ${user.fullName}</p>
      <p><strong>Leave Type:</strong> ${LeaveType}</p>
      <p><strong>From:</strong> ${start}</p>
      <p><strong>To:</strong> ${end}</p>
      <p><strong>Description:</strong> ${description}</p>
      <p>Status: <strong>PENDING</strong></p>
    `;

    if (manager?.email) await sendEmail(manager.email, subject, html);
    if (user?.email) await sendEmail(user.email, `Leave Request Submitted`, html);

    res.status(201).json({ message: 'Leave request created and emails sent', event: saved });

  } catch (err) {
    console.error('Create Event Error:', err);
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
  const { LeaveType, start, end, description, status } = req.body;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid event ID' });
  }

  try {
    const existingEvent = await Event.findById(id);
    if (!existingEvent) return res.status(404).json({ message: 'Event not found' });

    if (existingEvent.status === 'approved' || existingEvent.status === 'rejected') {
      return res.status(400).json({ message: 'Cannot update an approved or rejected event' });
    }

    if (status && !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be "pending", "approved", or "rejected"' });
    }

    // Update fields
    if (LeaveType) existingEvent.LeaveType = LeaveType;
    if (start) existingEvent.start = new Date(start);
    if (end) existingEvent.end = new Date(end);
    if (description) existingEvent.description = description;
    if (status) existingEvent.status = status;

    const updatedEvent = await existingEvent.save();

    // Email Notification
    const user = await User.findById(existingEvent.userId);
    const html = `
      <p>Your leave request has been <strong>updated</strong>.</p>
      <p><strong>Leave Type:</strong> ${existingEvent.LeaveType}</p>
      <p><strong>From:</strong> ${existingEvent.start}</p>
      <p><strong>To:</strong> ${existingEvent.end}</p>
      <p><strong>Description:</strong> ${existingEvent.description}</p>
      <p><strong>Status:</strong> ${existingEvent.status}</p>
    `;

    if (user?.email) await sendEmail(user.email, 'Leave Request Updated', html);

    res.json({ message: 'Event updated.', event: updatedEvent });

  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


exports.deleteEvent = async (req, res) => {
  const { id } = req.params;
  try {
    const event = await Event.findOneAndDelete({ _id: id, userId: req.user._id });
    if (!event) return res.status(404).json({ message: 'Event not found or unauthorized' });

    const user = await User.findById(req.user._id);

    const html = `
      <p>Your leave request for <strong>${event.LeaveType}</strong> from <strong>${event.start}</strong> to <strong>${event.end}</strong> has been <strong>deleted</strong>.</p>
    `;

    if (user?.email) {
      await sendEmail(user.email, 'Leave Request Deleted', html);
    }

    res.json({ message: 'Event deleted and email sent', event });

  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getManagerMappedEmployeeLeaves = async (req, res) => {
    try {
      const employees = await User.find({ manager: req.user._id }).select('_id');
  
      const employeeIds = employees.map(emp => emp._id);
  
      if (employeeIds.length === 0) {
        return res.status(404).json({ message: 'No employees mapped to you.' });
      }

      const employeeLeaves = await Event.find({ userId: { $in: employeeIds } })
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
      if (!leave) return res.status(404).json({ message: 'Leave not found' });
  
      const user = await User.findById(leave.userId).populate('leaveBalances.leaveType');
      if (!user) return res.status(404).json({ message: 'User not found' });
  
      const startDate = new Date(leave.start);
      const endDate = new Date(leave.end);
      const leaveDays = Math.ceil((endDate - startDate) / (1000 * 3600 * 24)) + 1;
  
      const leaveType = await LeaveType.findOne({ name: leave.LeaveType });
      if (!leaveType) return res.status(400).json({ message: 'Leave type not found' });
  
      const balance = user.leaveBalances.find(lb =>
        lb.leaveType && lb.leaveType._id.toString() === leaveType._id.toString()
      );
  
      if (!balance) return res.status(400).json({ message: 'Leave balance not found for this type' });
  
      if (action === 'approve') {
        // Check balance at this point
        if (balance.count < leaveDays) {
          return res.status(400).json({ message: 'Insufficient leave balance for approval.' });
        }
  
        // Deduct balance
        balance.count -= leaveDays;
        await user.save();
  
        leave.status = 'approved';
        await leave.save();
  
        const html = `
          <p>Your leave request has been <strong>approved</strong>.</p>
          <p><strong>Type:</strong> ${leave.LeaveType}</p>
          <p><strong>From:</strong> ${leave.start}</p>
          <p><strong>To:</strong> ${leave.end}</p>
          <p><strong>Days:</strong> ${leaveDays}</p>
        `;
        await sendEmail(user.email, 'Leave Request Approved', html);
  
        res.json({ message: 'Leave approved, balance deducted, and email sent', leave });
  
      } else if (action === 'reject') {
        await Event.findByIdAndDelete(leaveId);
  
        // No balance to restore
  
        const html = `
          <p>Your leave request for <strong>${leave.LeaveType}</strong> from <strong>${leave.start}</strong> to <strong>${leave.end}</strong> has been <strong>rejected</strong>.</p>
        `;
        await sendEmail(user.email, 'Leave Request Rejected', html);
  
        res.json({ message: 'Leave rejected and email sent', leave });
  
      } else {
        res.status(400).json({ message: 'Invalid action' });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
