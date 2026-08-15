const fs = require('fs');
const path = require('path');
const config = require('../config/config');

if (!fs.existsSync(config.logDir)) fs.mkdirSync(config.logDir, { recursive: true });

const serverLog = path.join(config.logDir, 'server.log');

function timestamp() {
  return new Date().toISOString();
}

function write(level, message) {
  const line = `[${timestamp()}] [${level}] ${message}\n`;
  fs.appendFile(serverLog, line, () => {});
  if (config.env !== 'test') console.log(line.trim());
}

module.exports = {
  info: (msg) => write('INFO', msg),
  warn: (msg) => write('WARN', msg),
  error: (msg) => write('ERROR', msg)
};