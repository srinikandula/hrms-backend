const cron = require('node-cron');
const Event = require('../models/Event');
const User = require('../models/User');
const LeaveType = require('../models/LeaveType');
const sendEmail = require('../config/mailer');

const autoApproveLeaves = async () => {
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days

    const pendingLeaves = await Event.find({
      status: 'pending',
      createdAt: { $lte: threeDaysAgo }
    });

    for (const leave of pendingLeaves) {
      const user = await User.findById(leave.userId).populate('leaveBalances.leaveType');
      if (!user) continue;

      const startDate = new Date(leave.start);
      const endDate = new Date(leave.end);
      const leaveDays = Math.ceil((endDate - startDate) / (1000 * 3600 * 24)) + 1;

      const leaveType = await LeaveType.findOne({ name: leave.LeaveType });
      if (!leaveType) {
        console.warn(`LeaveType not found for ${leave.LeaveType}, skipping auto-approval.`);
        continue;
      }

      const balance = user.leaveBalances.find(lb =>
        lb.leaveType && lb.leaveType._id.toString() === leaveType._id.toString()
      );

      if (!balance || balance.count < leaveDays) {
        console.warn(`Insufficient balance for user ${user.fullName} - skipping auto-approval.`);
        continue;
      }

      // Deduct and approve
      balance.count -= leaveDays;
      await user.save();

      leave.status = 'approved';
      await leave.save();

      const html = `
        <p>Your leave request has been <strong>auto-approved</strong> after 3 days.</p>
        <p><strong>Type:</strong> ${leave.LeaveType}</p>
        <p><strong>From:</strong> ${leave.start}</p>
        <p><strong>To:</strong> ${leave.end}</p>
        <p><strong>Days:</strong> ${leaveDays}</p>
      `;

      if (user?.email) {
        await sendEmail(user.email, 'Leave Auto-Approved', html);
      }
    }

    console.log(`Processed ${pendingLeaves.length} pending leave(s) for auto-approval.`);
  } catch (err) {
    console.error('Auto-approve error:', err);
  }
};

// Schedule: every day at 1:00 AM
cron.schedule('0 1 * * *', autoApproveLeaves);