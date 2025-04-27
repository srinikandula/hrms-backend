const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    mobile: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    token: { type: String }, 
    role: { type: String, enum: ['employee', 'manager'], default: 'employee' }
  });
  
  module.exports = mongoose.model('User', userSchema);