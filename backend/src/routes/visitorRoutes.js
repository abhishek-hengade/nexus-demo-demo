const express = require('express');
const router = express.Router();
const db = require('../database/jsonDb');

// List visitors
router.get('/', (req, res) => {
  const { status, date } = req.query;
  let visitors = db.getAll('visitors');

  if (status && status !== 'All') {
    visitors = visitors.filter(v => v.status.toLowerCase() === status.toLowerCase());
  }
  if (date) {
    visitors = visitors.filter(v => v.date === date);
  }

  res.json({
    success: true,
    count: visitors.length,
    data: visitors
  });
});

// Check in or pre-register a visitor
router.post('/', (req, res) => {
  const { name, company, hostEmployee, purpose, ndaSigned, checkInNow } = req.body;

  if (!name || !hostEmployee) {
    return res.status(400).json({
      success: false,
      error: 'Visitor name and host employee are required'
    });
  }

  const badgeRand = Math.floor(1000 + Math.random() * 9000);
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toISOString().split('T')[0];

  const newVisitor = db.insert('visitors', {
    name,
    company: company || 'Independent Guest',
    hostEmployee,
    purpose: purpose || 'Official Business Visit',
    date: dateStr,
    checkInTime: checkInNow !== false ? timeStr : null,
    checkOutTime: null,
    badgeNumber: `VIS-${badgeRand}`,
    status: checkInNow !== false ? 'Checked-In' : 'Expected',
    ndaSigned: !!ndaSigned
  });

  res.status(201).json({
    success: true,
    message: `Visitor pass created: Badge #${newVisitor.badgeNumber}`,
    data: newVisitor
  });
});

// Check out visitor
router.put('/:id/checkout', (req, res) => {
  const visitor = db.getById('visitors', req.params.id);
  if (!visitor) {
    return res.status(404).json({ success: false, error: 'Visitor record not found' });
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const updated = db.update('visitors', req.params.id, {
    status: 'Checked-Out',
    checkOutTime: timeStr
  });

  res.json({
    success: true,
    message: `Visitor ${visitor.name} successfully checked out at ${timeStr}`,
    data: updated
  });
});

// Digital Badge data
router.get('/:id/badge', (req, res) => {
  const visitor = db.getById('visitors', req.params.id);
  if (!visitor) {
    return res.status(404).json({ success: false, error: 'Visitor not found' });
  }

  res.json({
    success: true,
    data: {
      ...visitor,
      qrPayload: `NEXUS-OFFICE-BADGE:${visitor.badgeNumber}:${visitor.id}:${visitor.date}`,
      expiresAt: `${visitor.date} 23:59 IST`
    }
  });
});

module.exports = router;
