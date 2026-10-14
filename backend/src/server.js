const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const config = require('./config/config');

// Routes
const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const deskRoutes = require('./routes/deskRoutes');
const roomRoutes = require('./routes/roomRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const visitorRoutes = require('./routes/visitorRoutes');
const assetRoutes = require('./routes/assetRoutes');
const statsRoutes = require('./routes/statsRoutes');

// Middlewares
const { mockAuth } = require('./middleware/auth');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Base Middlewares
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets
app.use(express.static(path.join(__dirname, '../public')));

// Mock Auth injector
app.use(mockAuth);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    office: config.officeName,
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/desks', deskRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/stats', statsRoutes);

// Catch-all route to serve SPA frontend for client-side routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 404 and Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server if not imported by test runner
if (require.main === module) {
  const server = app.listen(config.port, () => {
    console.log(`=======================================================`);
    console.log(`  🚀 Nexus Office Management Platform is running!`);
    console.log(`  🌐 Local Access:    http://localhost:${config.port}`);
    console.log(`  🩺 Health Check:    http://localhost:${config.port}/health`);
    console.log(`  🏢 Office:          ${config.officeName}`);
    console.log(`  ⚡ Environment:     ${config.nodeEnv}`);
    console.log(`=======================================================`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      console.log('Server process terminated');
    });
  });
}

module.exports = app;
