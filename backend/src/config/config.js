const path = require('path');
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'nexus-office-dev-secret',
  officeName: process.env.OFFICE_NAME || 'Nexus Office Headquarters',
  dbPath: path.resolve(__dirname, '../../data/database.json'),
};
