const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = require('../config/database');
const config = require('../config/config');

// One-time bootstrap: create default admin if no users exist
(function bootstrapAdmin() {
  const users = db.read('users');
  if (users.length === 0) {
    const passwordHash = bcrypt.hashSync('admin', 10);
    users.push({ id: '1', username: 'admin', passwordHash });
    db.write('users', users);
    console.log('Created default user -> username: admin, password: admin (CHANGE THIS)');
  }
})();

router.post('/login', (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) { const e = new Error('username and password required'); e.status = 400; throw e; }

    const users = db.read('users');
    const user = users.find(u => u.username === username);
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      const e = new Error('Invalid credentials'); e.status = 401; throw e;
    }

    const token = jwt.sign({ id: user.id, username: user.username }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn
    });

    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err) { next(err); }
});

router.post('/change-password', require('../middleware/auth'), (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const users = db.read('users');
    const user = users.find(u => u.id === req.user.id);
    if (!user || !bcrypt.compareSync(currentPassword, user.passwordHash)) {
      const e = new Error('Current password incorrect'); e.status = 401; throw e;
    }
    user.passwordHash = bcrypt.hashSync(newPassword, 10);
    db.write('users', users);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;