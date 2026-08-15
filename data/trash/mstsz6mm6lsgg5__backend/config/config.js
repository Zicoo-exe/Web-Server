require('dotenv').config();

module.exports = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_me',
  jwtExpiresIn: '12h',
  env: process.env.NODE_ENV || 'development',
  dataDir: require('path').join(__dirname, '..', '..', 'data'),
  logDir: require('path').join(__dirname, '..', '..', 'logs')
};