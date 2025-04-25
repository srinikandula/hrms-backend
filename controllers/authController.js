const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Register Controller
exports.register = async (req, res) => {
  const { fullName, mobile, password } = req.body;

  try {
    // Check if mobile already exists
    const existingUser = await User.findOne({ mobile });
    if (existingUser) {
      return res.status(400).json({ message: 'Mobile number already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      fullName,
      mobile,
      password: hashedPassword,
    });

    // Save user to database
    await newUser.save();

    res.status(200).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login Controller
exports.login = async (req, res) => {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
        return res.status(400).json({ message: 'Mobile number and password are required' });
    }

    try {
        const user = await User.findOne({ mobile });
        if (!user) {
            return res.status(400).json({ message: 'Mobile number not found' });
        }

        // Compare entered password with hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid password' });
        }

        const token = jwt.sign(
            { _id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // Save token 
        user.token = token;
        await user.save();

        res.status(200).json({
           status: 200,
           mobile: user.mobile,
           id: user._id,
           fullName: user.fullName,
           token: token,
            message: 'LOGGED_IN_SUCCESSFULLY'
        });
    } catch (error) {
        console.error('LOGIN_ERROR:', error);
        res.status(500).json({ message: 'Server error' });
    }
};