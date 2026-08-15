const { spawn } = require('child_process');
const logger = require('../utils/logger');

const runningProcesses = new Map();

function startProcess(serverId, command, args = [], cwd = process.cwd()) {
  if (runningProcesses.has(serverId)) {
    throw new Error('Server process already running');
  }

  const proc = spawn(command, args, { cwd, shell: true });
  const entry = { proc, output: [], startedAt: Date.now() };
  runningProcesses.set(serverId, entry);

  proc.stdout.on('data', (data) => {
    entry.output.push(data.toString());
    if (entry.output.length > 500) entry.output.shift();
  });

  proc.stderr.on('data', (data) => {
    entry.output.push(`[stderr] ${data.toString()}`);
  });

  proc.on('exit', (code) => {
    logger.info(`Server ${serverId} process exited with code ${code}`);
    runningProcesses.delete(serverId);
  });

  logger.info(`Started server ${serverId} (pid ${proc.pid})`);
  return proc.pid;
}

function stopProcess(serverId) {
  const entry = runningProcesses.get(serverId);
  if (!entry) throw new Error('Server is not running');
  entry.proc.kill('SIGTERM');
  runningProcesses.delete(serverId);
  logger.info(`Stopped server ${serverId}`);
}

function sendCommand(serverId, command) {
  const entry = runningProcesses.get(serverId);
  if (!entry) throw new Error('Server is not running');
  entry.proc.stdin.write(command + '\n');
}

function getOutput(serverId) {
  const entry = runningProcesses.get(serverId);
  return entry ? entry.output : [];
}

function isRunning(serverId) {
  return runningProcesses.has(serverId);
}

module.exports = { startProcess, stopProcess, sendCommand, getOutput, isRunning };