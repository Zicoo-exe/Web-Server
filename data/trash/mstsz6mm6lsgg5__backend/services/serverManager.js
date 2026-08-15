const db = require('../config/database');
const processManager = require('./processManager');
const { v4: uuidv4 } = { v4: () => Math.random().toString(36).slice(2) + Date.now().toString(36) };

function listServers() {
  const servers = db.read('servers');
  return servers.map(s => ({ ...s, status: processManager.isRunning(s.id) ? 'running' : 'stopped' }));
}

function getServer(id) {
  const servers = db.read('servers');
  const server = servers.find(s => s.id === id);
  if (!server) throw new Error('Server not found');
  return { ...server, status: processManager.isRunning(id) ? 'running' : 'stopped' };
}

function createServer({ name, command, args, cwd }) {
  const servers = db.read('servers');
  const server = { id: uuidv4(), name, command, args: args || [], cwd: cwd || '.', createdAt: Date.now() };
  servers.push(server);
  db.write('servers', servers);
  return server;
}

function deleteServer(id) {
  if (processManager.isRunning(id)) processManager.stopProcess(id);
  const servers = db.read('servers').filter(s => s.id !== id);
  db.write('servers', servers);
}

function startServer(id) {
  const server = getServer(id);
  return processManager.startProcess(id, server.command, server.args, server.cwd);
}

function stopServer(id) {
  processManager.stopProcess(id);
}

module.exports = { listServers, getServer, createServer, deleteServer, startServer, stopServer };