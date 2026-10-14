const express = require('express');
const router = express.Router();
const db = require('../database/jsonDb');

// List meeting rooms
router.get('/', (req, res) => {
  const { floor, capacity } = req.query;
  let rooms = db.getAll('meetingRooms');

  if (floor) {
    rooms = rooms.filter(r => String(r.floor) === String(floor));
  }
  if (capacity) {
    rooms = rooms.filter(r => r.capacity >= parseInt(capacity, 10));
  }

  res.json({
    success: true,
    count: rooms.length,
    data: rooms
  });
});

// Book a meeting room
router.post('/:id/book', (req, res) => {
  const roomId = req.params.id;
  const { title, startTime, endTime, bookedBy } = req.body;
  const room = db.getById('meetingRooms', roomId);

  if (!room) {
    return res.status(404).json({ success: false, error: 'Meeting room not found' });
  }

  if (room.status === 'Booked') {
    return res.status(400).json({
      success: false,
      error: `Room "${room.name}" is already booked for "${room.currentBooking?.title}". Please select another room or wait until free.`
    });
  }

  const reservation = {
    title: title || 'Team Sync & Strategy',
    bookedBy: bookedBy || (req.user ? req.user.name : 'Abhishek Hengade'),
    startTime: startTime || '16:00',
    endTime: endTime || '17:00',
    bookedAt: new Date().toISOString()
  };

  const updated = db.update('meetingRooms', roomId, {
    status: 'Booked',
    currentBooking: reservation
  });

  res.json({
    success: true,
    message: `Room "${room.name}" reserved successfully from ${reservation.startTime} to ${reservation.endTime}`,
    data: updated
  });
});

// Cancel / Free meeting room
router.post('/:id/cancel', (req, res) => {
  const roomId = req.params.id;
  const room = db.getById('meetingRooms', roomId);

  if (!room) {
    return res.status(404).json({ success: false, error: 'Meeting room not found' });
  }

  const updated = db.update('meetingRooms', roomId, {
    status: 'Available',
    currentBooking: null
  });

  res.json({
    success: true,
    message: `Reservation for "${room.name}" canceled. Room is now Available.`,
    data: updated
  });
});

module.exports = router;
