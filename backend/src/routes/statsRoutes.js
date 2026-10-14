const express = require('express');
const router = express.Router();
const db = require('../database/jsonDb');

// Comprehensive dashboard analytics
router.get('/dashboard', (req, res) => {
  const employees = db.getAll('employees');
  const desks = db.getAll('desks');
  const rooms = db.getAll('meetingRooms');
  const leaves = db.getAll('leaveRequests');
  const visitors = db.getAll('visitors');
  const announcements = db.getAll('announcements');

  const inOfficeCount = employees.filter(e => e.status === 'In-Office').length;
  const remoteCount = employees.filter(e => e.status === 'Remote').length;
  const onLeaveCount = employees.filter(e => e.status === 'On Leave').length;

  const totalDesks = desks.length;
  const occupiedDesks = desks.filter(d => d.status === 'Occupied' || d.status === 'Reserved').length;
  const availableDesks = desks.filter(d => d.status === 'Available').length;
  const deskOccupancyRate = totalDesks > 0 ? Math.round((occupiedDesks / totalDesks) * 100) : 0;

  const totalRooms = rooms.length;
  const bookedRooms = rooms.filter(r => r.status === 'Booked').length;
  const pendingLeaves = leaves.filter(l => l.status === 'Pending').length;
  const checkedInVisitors = visitors.filter(v => v.status === 'Checked-In').length;

  // Department distribution
  const deptMap = {};
  employees.forEach(e => {
    deptMap[e.department] = (deptMap[e.department] || 0) + 1;
  });

  res.json({
    success: true,
    data: {
      metrics: {
        totalEmployees: employees.length,
        inOfficeToday: inOfficeCount,
        remoteToday: remoteCount,
        onLeaveToday: onLeaveCount,
        totalDesks,
        occupiedDesks,
        availableDesks,
        deskOccupancyRate,
        totalRooms,
        bookedRooms,
        pendingLeaves,
        activeVisitors: checkedInVisitors
      },
      departments: deptMap,
      announcements: announcements.slice(0, 3),
      recentActivity: [
        { id: 1, text: "Abhishek Hengade clocked in at Desk D-101", time: "10 mins ago", type: "desk" },
        { id: 2, text: "Visitor pass VIS-9482 issued to Karan Patel (GCP)", time: "25 mins ago", type: "visitor" },
        { id: 3, text: "Apex Boardroom booked for Executive Board Sync", time: "1 hour ago", type: "room" },
        { id: 4, text: "Leave request submitted by Aarav Sharma", time: "2 hours ago", type: "leave" }
      ]
    }
  });
});

// Reset database to initial seed state
router.post('/reset', (req, res) => {
  db.reset();
  res.json({
    success: true,
    message: 'Database has been successfully reset to initial demo seed data.'
  });
});

module.exports = router;
