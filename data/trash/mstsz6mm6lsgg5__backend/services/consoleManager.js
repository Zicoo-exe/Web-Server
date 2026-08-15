const processManager = require('./processManager');

function getConsoleOutput(serverId) {
  return processManager.getOutput(serverId);
}

function sendConsoleCommand(serverId, command) {
  processManager.sendCommand(serverId, command);
}

module.exports = { getConsoleOutput, sendConsoleCommand };