const express = require('express');
const router = express.Router();
const db = require('../database/jsonDb');

// Get today's attendance logs
router.get('/today', (req, res) => {
  const logs = db.getAll('attendance');
  res.json({
    success: true,
    count: logs.length,
    data: logs
  });
});

// Clock In
router.post('/clock-in', (req, res) => {
  const { employeeId, employeeName, mode, location } = req.body;
  const targetId = employeeId || (req.user ? req.user.id : 'emp-101');
  const targetName = employeeName || (req.user ? req.user.name : 'Abhishek Hengade');

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toISOString().split('T')[0];

  // Check if already clocked in today without clocking out
  const existing = db.find('attendance', a => a.employeeId === targetId && a.date === dateStr && !a.clockOut);
  if (existing.length > 0) {
    return res.status(400).json({
      success: false,
      error: `You are already clocked in today at ${existing[0].clockIn}`
    });
  }

  const newLog = db.insert('attendance', {
    employeeId: targetId,
    employeeName: targetName,
    date: dateStr,
    clockIn: timeStr,
    clockOut: null,
    mode: mode || 'In-Office',
    location: location || 'Nexus HQ Main Tower',
    workingHours: 'Active'
  });

  // Update employee status
  db.update('employees', targetId, {
    status: mode === 'Remote' ? 'Remote' : 'In-Office'
  });

  res.status(201).json({
    success: true,
    message: `Clocked in successfully at ${timeStr}`,
    data: newLog
  });
});

// Clock Out
router.post('/clock-out', (req, res) => {
  const { employeeId } = req.body;
  const targetId = employeeId || (req.user ? req.user.id : 'emp-101');
  const dateStr = new Date().toISOString().split('T')[0];

  const activeLog = db.find('attendance', a => a.employeeId === targetId && a.date === dateStr && !a.clockOut)[0];

  if (!activeLog) {
    return res.status(400).json({
      success: false,
      error: 'No active clock-in session found for today. Please clock in first.'
    });
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const updated = db.update('attendance', activeLog.id, {
    clockOut: timeStr,
    workingHours: 'Completed (Full Shift)'
  });

  res.json({
    success: true,
    message: `Clocked out successfully at ${timeStr}. Great work today!`,
    data: updated
  });
});

// Get leave requests
router.get('/leaves', (req, res) => {
  const { status, department } = req.query;
  let leaves = db.getAll('leaveRequests');

  if (status && status !== 'All') {
    leaves = leaves.filter(l => l.status.toLowerCase() === status.toLowerCase());
  }
  if (department && department !== 'All') {
    leaves = leaves.filter(l => l.department.toLowerCase() === department.toLowerCase());
  }

  res.json({
    success: true,
    count: leaves.length,
    data: leaves
  });
});

// Submit leave request
router.post('/leaves', (req, res) => {
  const { employeeId, employeeName, department, leaveType, startDate, endDate, days, reason } = req.body;

  if (!leaveType || !startDate || !endDate) {
    return res.status(400).json({
      success: false,
      error: 'Leave type, start date, and end date are required'
    });
  }

  const newLeave = db.insert('leaveRequests', {
    employeeId: employeeId || (req.user ? req.user.id : 'emp-101'),
    employeeName: employeeName || (req.user ? req.user.name : 'Abhishek Hengade'),
    department: department || (req.user ? req.user.department : 'Engineering'),
    leaveType,
    startDate,
    endDate,
    days: days ? Number(days) : 1,
    reason: reason || 'Personal Leave',
    status: 'Pending',
    appliedOn: new Date().toISOString().split('T')[0],
    reviewer: null
  });

  res.status(201).json({
    success: true,
    message: 'Leave application submitted successfully for manager approval',
    data: newLeave
  });
});

// Approve or Reject leave request (HR/Manager action)
router.put('/leaves/:id/status', (req, res) => {
  const { status, reviewer } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Status must be either "Approved" or "Rejected"'
    });
  }

  const updated = db.update('leaveRequests', req.params.id, {
    status,
    reviewer: reviewer || (req.user ? req.user.name : 'Marcus Rivera')
  });

  if (!updated) {
    return res.status(404).json({ success: false, error: 'Leave request not found' });
  }

  // If approved, update employee status if within current date
  if (status === 'Approved') {
    db.update('employees', updated.employeeId, { status: 'On Leave' });
  }

  res.json({
    success: true,
    message: `Leave request has been ${status.toLowerCase()}`,
    data: updated
  });
});

module.exports = router;
