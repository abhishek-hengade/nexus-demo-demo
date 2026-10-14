const express = require('express');
const router = express.Router();
const db = require('../database/jsonDb');

// List desks (with floor filter)
router.get('/', (req, res) => {
  const { floor, status, section } = req.query;
  let desks = db.getAll('desks');

  if (floor) {
    desks = desks.filter(d => String(d.floor) === String(floor));
  }
  if (status && status !== 'All') {
    desks = desks.filter(d => d.status.toLowerCase() === status.toLowerCase());
  }
  if (section && section !== 'All') {
    desks = desks.filter(d => d.section.toLowerCase() === section.toLowerCase());
  }

  res.json({
    success: true,
    count: desks.length,
    data: desks
  });
});

// Book a desk
router.post('/:id/book', (req, res) => {
  const deskId = req.params.id;
  const desk = db.getById('desks', deskId);

  if (!desk) {
    return res.status(404).json({ success: false, error: 'Desk not found' });
  }

  if (desk.status === 'Occupied' || desk.status === 'Reserved') {
    return res.status(400).json({
      success: false,
      error: `Desk ${deskId} is currently ${desk.status.toLowerCase()} by ${desk.bookedBy || 'another user'}.`
    });
  }

  if (desk.status === 'Under Maintenance') {
    return res.status(400).json({
      success: false,
      error: `Desk ${deskId} is under maintenance and cannot be booked.`
    });
  }

  const bookedBy = req.body.bookedBy || (req.user ? req.user.name : 'Abhishek Hengade');
  const bookedEmail = req.body.bookedEmail || (req.user ? req.user.email : 'abhishek@nexusoffice.io');

  // If user previously booked another desk, optionally free that desk
  const allDesks = db.getAll('desks');
  const prevDesk = allDesks.find(d => d.bookedEmail === bookedEmail && d.id !== deskId);
  if (prevDesk) {
    db.update('desks', prevDesk.id, {
      status: 'Available',
      bookedBy: null,
      bookedEmail: null
    });
  }

  const updated = db.update('desks', deskId, {
    status: 'Occupied',
    bookedBy,
    bookedEmail,
    bookedAt: new Date().toISOString()
  });

  // Also update employee record's deskId if matching employee exists
  const emp = db.find('employees', e => e.email === bookedEmail)[0];
  if (emp) {
    db.update('employees', emp.id, { deskId, status: 'In-Office' });
  }

  res.json({
    success: true,
    message: `Desk ${deskId} booked successfully for ${bookedBy}`,
    data: updated
  });
});

// Release a desk
router.post('/:id/release', (req, res) => {
  const deskId = req.params.id;
  const desk = db.getById('desks', deskId);

  if (!desk) {
    return res.status(404).json({ success: false, error: 'Desk not found' });
  }

  const formerUserEmail = desk.bookedEmail;

  const updated = db.update('desks', deskId, {
    status: 'Available',
    bookedBy: null,
    bookedEmail: null,
    bookedAt: null
  });

  if (formerUserEmail) {
    const emp = db.find('employees', e => e.email === formerUserEmail)[0];
    if (emp && emp.deskId === deskId) {
      db.update('employees', emp.id, { deskId: null });
    }
  }

  res.json({
    success: true,
    message: `Desk ${deskId} has been released and is now Available`,
    data: updated
  });
});

// Admin update desk (e.g. status toggle)
router.put('/:id', (req, res) => {
  const updated = db.update('desks', req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Desk not found' });
  }
  res.json({
    success: true,
    message: 'Desk details updated',
    data: updated
  });
});

module.exports = router;
