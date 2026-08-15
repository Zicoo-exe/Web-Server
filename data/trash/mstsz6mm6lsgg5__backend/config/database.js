const fs = require('fs');
const path = require('path');
const config = require('./config');

function ensureFile(filePath, defaultData) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    return;
  }

  // File exists but may be empty or corrupted (e.g. 0 bytes) - repair it
  const raw = fs.readFileSync(filePath, 'utf-8').trim();
  if (raw === '') {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    return;
  }

  try {
    JSON.parse(raw);
  } catch (err) {
    // Corrupt JSON - back it up and reset to default so the app can boot
    fs.writeFileSync(filePath + '.corrupt-backup', raw);
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
  }
}

const files = {
  servers: path.join(config.dataDir, 'servers.json'),
  users: path.join(config.dataDir, 'users.json'),
  settings: path.join(config.dataDir, 'settings.json'),
  trash: path.join(config.dataDir, 'trash.json')
};

ensureFile(files.servers, []);
ensureFile(files.users, []);
ensureFile(files.settings, { theme: 'dark', refreshInterval: 5000 });
ensureFile(files.trash, []);

function read(name) {
  const raw = fs.readFileSync(files[name], 'utf-8').trim();
  if (raw === '') return name === 'settings' ? {} : [];
  return JSON.parse(raw);
}

function write(name, data) {
  fs.writeFileSync(files[name], JSON.stringify(data, null, 2));
}

module.exports = { read, write, files };