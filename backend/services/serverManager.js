const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const logger = require("../utils/logger");

const SERVERS_FILE = path.join(__dirname, "../../data/servers.json");

// In-memory process registry: id -> { proc, startedAt, restarts, logs: [] }
const running = new Map();

function loadServerConfigs() {
  if (!fs.existsSync(SERVERS_FILE)) return {};
  const raw = fs.readFileSync(SERVERS_FILE, "utf-8");
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

function getConfig(id) {
  const configs = loadServerConfigs();
  // Support both { "default": {...} } and [ { id: "default", ... } ] shapes
  if (Array.isArray(configs)) {
    return configs.find((s) => s.id === id) || null;
  }
  return configs[id] || null;
}

function getStatus(id) {
  const config = getConfig(id);
  if (!config) return null;

  const entry = running.get(id);
  if (!entry) {
    return {
      id,
      name: config.name || id,
      host: config.host || "localhost",
      status: "Offline",
      pid: null,
      uptime: null,
      nodeVersion: process.version,
      restarts: config.restarts || 0,
    };
  }

  const uptimeSec = Math.floor((Date.now() - entry.startedAt) / 1000);
  return {
    id,
    name: config.name || id,
    host: config.host || "localhost",
    status: "Online",
    pid: entry.proc.pid,
    uptime: formatUptime(uptimeSec),
    nodeVersion: process.version,
    restarts: entry.restarts,
  };
}

function formatUptime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}h ${m}m ${s}s`;
}

function start(id) {
  return new Promise((resolve, reject) => {
    if (running.has(id)) return reject(new Error("Bot is already running"));

    const config = getConfig(id);
    if (!config) return reject(new Error(`No config found for bot id "${id}"`));
    if (!config.entry) return reject(new Error(`Config for "${id}" is missing an "entry" file`));

    const cwd = config.cwd || process.cwd();
    const entryPath = path.resolve(cwd, config.entry);

    if (!fs.existsSync(entryPath)) {
      return reject(new Error(`Entry file not found: ${entryPath}`));
    }

    const proc = spawn(process.execPath, [entryPath], {
      cwd,
      env: { ...process.env, ...(config.env || {}) },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const prevEntry = running.get(id);
    const restarts = prevEntry ? prevEntry.restarts + 1 : 0;

    const logBuffer = [];
    proc.stdout.on("data", (d) => {
      const line = d.toString();
      logBuffer.push(line);
      logger.info(`[${id}] ${line.trim()}`);
    });
    proc.stderr.on("data", (d) => {
      const line = d.toString();
      logBuffer.push(line);
      logger.error(`[${id}] ${line.trim()}`);
    });

    proc.on("exit", (code) => {
      logger.info(`[${id}] process exited with code ${code}`);
      running.delete(id);
    });

    proc.on("error", (err) => {
      logger.error(`[${id}] failed to start: ${err.message}`);
      running.delete(id);
    });

    running.set(id, { proc, startedAt: Date.now(), restarts, logs: logBuffer });
    resolve({ pid: proc.pid });
  });
}

function stop(id) {
  return new Promise((resolve, reject) => {
    const entry = running.get(id);
    if (!entry) return reject(new Error("Bot is not running"));

    entry.proc.once("exit", () => resolve());
    entry.proc.kill("SIGTERM");

    // Force-kill if it doesn't exit in 5s
    setTimeout(() => {
      if (running.has(id)) entry.proc.kill("SIGKILL");
    }, 5000);
  });
}

async function restart(id) {
  if (running.has(id)) {
    await stop(id);
  }
  return start(id);
}

module.exports = { getStatus, start, stop, restart, getConfig };