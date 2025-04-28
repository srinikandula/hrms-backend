const Holiday = require('../models/Holiday');

// GET all holidays
exports.getHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.find();
    res.status(200).json(holidays);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching holidays', error });
  }
};

// CREATE a new holiday
exports.createHoliday = async (req, res) => {
  try {
    const { name, date, description } = req.body;
    const newHoliday = new Holiday({ name, date, description });
    await newHoliday.save();
    res.status(201).json(newHoliday);
  } catch (error) {
    res.status(400).json({ message: 'Error creating holiday', error });
  }
};

exports.updateHoliday = async (req, res) => {
    try {
      const holidayId = req.params.id; 
      const { name, date, description } = req.body;
  
      // Find and update the holiday
      const updatedHoliday = await Holiday.findByIdAndUpdate(
        holidayId,
        { name, date, description },
        { new: true } 
      );
  
      if (!updatedHoliday) {
        return res.status(404).json({ message: 'Holiday not found' });
      }
  
      res.status(200).json(updatedHoliday);
    } catch (error) {
      res.status(400).json({ message: 'Error updating holiday', error });
    }
  };
  
  // DELETE a holiday by ID
  exports.deleteHoliday = async (req, res) => {
    try {
      const holidayId = req.params.id; 
  
      const deletedHoliday = await Holiday.findByIdAndDelete(holidayId);
  
      if (!deletedHoliday) {
        return res.status(404).json({ message: 'Holiday not found' });
      }
  
      res.status(200).json({ message: 'Holiday deleted successfully', deletedHoliday });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting holiday', error });
    }
  };
