const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const LeaveType = require('../models/LeaveType');
const mongoose = require('mongoose');

// Get all users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}, '-password -token');
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create a new user
exports.createUser = async (req, res) => {
    const { fullName, mobile, password, role, manager } = req.body;
    try {
      if (!fullName || !mobile || !password) {
        return res.status(400).json({ message: 'fullName, mobile, and password are required fields' });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const token = jwt.sign(
        { mobile: mobile },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );
  
      const newUser = new User({
        fullName,
        mobile,
        password: hashedPassword,
        role: role || 'employee',
        token: token,
        manager: manager || null
      });
  
      const savedUser = await newUser.save();
  
      //  After saving user, fetch leave types
      const leaveTypes = await LeaveType.find();
  
      //  Create leaveBalances for each leave type
      const leaveBalances = leaveTypes.map(type => ({
        leaveType: type._id,
        count: type.count || 0 
      }));
  
      //  Update user with leaveBalances
      savedUser.leaveBalances = leaveBalances;
      await savedUser.save(); 
  
      const { password: _, ...userResponse } = savedUser.toObject();
      res.status(201).json(userResponse);
  
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  };
  


// Update a user
exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { fullName, mobile, manager } = req.body;
  
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
  
      const updateFields = { fullName, mobile };
      if (manager !== undefined) {
        if (manager === '' || manager === null) {
          updateFields.manager = null;
        } else if (mongoose.Types.ObjectId.isValid(manager)) {
          updateFields.manager = manager;
        } else {
          return res.status(400).json({ message: 'Invalid manager ID' });
        }
      }
  
      let user = await User.findByIdAndUpdate(
        id,
        updateFields,
        { new: true, runValidators: true }
      ).select('-password -token');
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Check if leaveBalances field is missing
      if (user.leaveBalances === undefined) {
        const leaveTypes = await LeaveType.find();
        const leaveBalances = leaveTypes.map(type => ({
          leaveType: type._id,
          count: type.count || 0  
        }));
  
        user.leaveBalances = leaveBalances;
        await user.save(); 
      }
  
      res.status(200).json(user);
  
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(400).json({ message: error.message });
    }
  };

// Delete a user
exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const deletedUser = await User.findByIdAndDelete(id);
        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.searchUsers = async (req, res) => {
    try {
      const { search = '', page = 1, limit = 10 } = req.body;
  
      const query = {
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { mobile: { $regex: search, $options: 'i' } }
        ]
      };
  
      const total = await User.countDocuments(query);
      const users = await User.find(query)
        .select('-password -token')
        .sort({ fullName: 1 })
        .skip((page - 1) * limit)
        .limit(limit);
  
      res.status(200).json({
        users,
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

// Get all manager users
exports.getAllManagers = async (req, res) => {
    try {
        const managers = await User.find({ role: 'manager' }, '-password -token');
        res.status(200).json({
            managers,
            count: managers.length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getUserLeaveBalancesByUserId = async (req, res) => {
    const { userId, leaveType } = req.body;  
    
    try {
        // Find the user by userId
        const user = await User.findById(userId).populate('leaveBalances.leaveType');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (leaveType) {
            // If leaveType is provided, filter the leave balance for that specific leave type
            const specificLeaveBalance = user.leaveBalances.find(balance => balance.leaveType.name === leaveType);

            if (!specificLeaveBalance) {
                return res.status(404).json({ message: `No leave balance found for ${leaveType}` });
            }

            // Return the specific leave balance
            return res.status(200).json({
                leaveType: specificLeaveBalance.leaveType.name,
                availableLeave: specificLeaveBalance.count
            });
        }

        // If no leaveType is provided, return all leave balances
        const leaveBalances = user.leaveBalances.map(balance => ({
            name: balance.leaveType.name,
            count: balance.count
        }));

        res.status(200).json(leaveBalances);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching leave balances', error: error.message });
    }
};
