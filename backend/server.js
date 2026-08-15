const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/config');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { cleanupExpiredTrash } = require('./services/fileManager');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/servers', require('./routes/servers'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/console', require('./routes/console'));
app.use('/api/actions', require('./routes/actions'));
app.use('/api/files', require('./routes/files'));

const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.use(errorHandler);

cleanupExpiredTrash();
setInterval(cleanupExpiredTrash, 60 * 60 * 1000);

app.listen(config.port, () => {
  logger.info(`HomeServer-Panel running on http://localhost:${config.port}`);
});