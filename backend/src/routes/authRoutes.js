const express = require('express');
const router = express.Router();
const db = require('../database/jsonDb');

// Get current demo persona / active user
router.get('/me', (req, res) => {
  const employees = db.getAll('employees');
  const user = req.user || employees[0];
  
  res.json({
    success: true,
    data: {
      user,
      availablePersonas: employees.map(e => ({
        id: e.id,
        name: e.name,
        role: e.role,
        department: e.department,
        avatar: e.avatar
      }))
    }
  });
});

// Switch or login persona
router.post('/login', (req, res) => {
  const { employeeId, email } = req.body;
  const employees = db.getAll('employees');

  let user = null;
  if (employeeId) {
    user = employees.find(e => e.id === employeeId);
  } else if (email) {
    user = employees.find(e => e.email.toLowerCase() === email.toLowerCase());
  }

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'Employee not found. Please select from available directory.'
    });
  }

  res.json({
    success: true,
    message: `Logged in successfully as ${user.name}`,
    data: { user }
  });
});

module.exports = router;
