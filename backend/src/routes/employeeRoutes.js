const express = require('express');
const router = express.Router();
const db = require('../database/jsonDb');

// List employees with optional filters
router.get('/', (req, res) => {
  const { search, department, status } = req.query;
  let list = db.getAll('employees');

  if (department && department !== 'All') {
    list = list.filter(e => e.department.toLowerCase() === department.toLowerCase());
  }

  if (status && status !== 'All') {
    list = list.filter(e => e.status.toLowerCase() === status.toLowerCase());
  }

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.role.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q)
    );
  }

  res.json({
    success: true,
    count: list.length,
    data: list
  });
});

// Get single employee
router.get('/:id', (req, res) => {
  const employee = db.getById('employees', req.params.id);
  if (!employee) {
    return res.status(404).json({ success: false, error: 'Employee not found' });
  }
  res.json({ success: true, data: employee });
});

// Add new employee
router.post('/', (req, res) => {
  const { name, email, role, department, phone, status, avatar, emergencyContact } = req.body;

  if (!name || !email || !role || !department) {
    return res.status(400).json({
      success: false,
      error: 'Name, email, role, and department are required fields'
    });
  }

  const existing = db.find('employees', e => e.email.toLowerCase() === email.toLowerCase());
  if (existing.length > 0) {
    return res.status(409).json({
      success: false,
      error: 'An employee with this email address already exists'
    });
  }

  const newEmp = db.insert('employees', {
    name,
    email,
    role,
    department,
    phone: phone || '+1 (555) 000-0000',
    status: status || 'In-Office',
    avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=fff`,
    joinDate: new Date().toISOString().split('T')[0],
    deskId: null,
    emergencyContact: emergencyContact || 'N/A'
  });

  res.status(201).json({
    success: true,
    message: 'Employee successfully onboarded',
    data: newEmp
  });
});

// Update employee
router.put('/:id', (req, res) => {
  const updated = db.update('employees', req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Employee not found' });
  }
  res.json({
    success: true,
    message: 'Employee updated successfully',
    data: updated
  });
});

// Delete employee
router.delete('/:id', (req, res) => {
  const deleted = db.delete('employees', req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Employee not found' });
  }
  res.json({
    success: true,
    message: 'Employee removed successfully'
  });
});

module.exports = router;
