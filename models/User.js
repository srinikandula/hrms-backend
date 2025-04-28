const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    mobile: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    token: { type: String }, 
    role: { type: String, enum: ['employee', 'manager'], default: 'employee' },
    leaveBalances: [{
        leaveType: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'LeaveType'
        },
        count: {
          type: Number,
          default: 0
        }
      }]
    }, { timestamps: true });
    
  
  module.exports = mongoose.model('User', userSchema);