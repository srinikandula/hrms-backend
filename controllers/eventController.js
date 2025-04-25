const Event = require('../models/Event');
const { ObjectId } = require('mongoose').Types;

exports.createEvent = async (req, res) => {
  const { LeaveType, start, end, description } = req.body;
  try {
    const newEvent = new Event({
        LeaveType,
      start,
      end,
      description,
      userId: req.user._id  
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
    const { LeaveType, start, end, description } = req.body;
  
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }
  
    try {
      const updatedEvent = await Event.findOneAndUpdate(
        { _id: id, userId: req.user._id },  
        { LeaveType, start, end, description },
        { new: true }
      );
      if (!updatedEvent) {
        return res.status(404).json({ message: 'Event not found or you do not have permission to update it' });
      }
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