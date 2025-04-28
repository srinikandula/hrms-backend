const mongoose = require('mongoose');

const leaveTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: [
      "Annual Leave",
      "Volunteering Leave",
      "Paternity Leave",
      "Sabbatical Leave",
      "Relocation Leave",
      "Family Care Leave",
      "Compassionate Leave",
      "Marriage Leave",
      "Work From Home"
    ]
  },
  count: {
    type: Number,
    required: true,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('LeaveType', leaveTypeSchema);