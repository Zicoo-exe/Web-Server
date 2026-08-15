const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');
const formatBytes = require('../utils/formatBytes');

function run(cmd) {
  return new Promise((resolve) => {
    exec(cmd, (err, stdout) => resolve(err ? '' : stdout.trim()));
  });
}

async function getMemInfo() {
  try {
    const data = fs.readFileSync('/proc/meminfo', 'utf-8');
    const lines = Object.fromEntries(
      data.split('\n').filter(Boolean).map(line => {
        const [key, val] = line.split(':');
        return [key.trim(), parseInt(val.trim())]; // in kB
      })
    );
    const total = lines['MemTotal'] * 1024;
    const available = lines['MemAvailable'] * 1024;
    const used = total - available;
    return {
      total: formatBytes(total),
      used: formatBytes(used),
      free: formatBytes(available),
      usagePercent: Math.round((used / total) * 100)
    };
  } catch (err) {
    return { total: 'N/A', used: 'N/A', free: 'N/A', usagePercent: 0 };
  }
}

async function getCpuUsage() {
  // Two snapshots of /proc/stat, ~200ms apart, to compute load %
  function readStat() {
    const line = fs.readFileSync('/proc/stat', 'utf-8').split('\n')[0];
    const parts = line.trim().split(/\s+/).slice(1).map(Number);
    const idle = parts[3] + (parts[4] || 0);
    const total = parts.reduce((a, b) => a + b, 0);
    return { idle, total };
  }
  try {
    const first = readStat();
    await new Promise(r => setTimeout(r, 200));
    const second = readStat();
    const idleDelta = second.idle - first.idle;
    const totalDelta = second.total - first.total;
    const usagePercent = Math.round(100 * (1 - idleDelta / totalDelta));
    return { usagePercent, cores: os.cpus().length, model: os.cpus()[0]?.model || 'Unknown' };
  } catch (err) {
    return { usagePercent: 0, cores: os.cpus().length, model: 'Unknown' };
  }
}

async function getStorage() {
  // df output on Termux: Filesystem Size Used Avail Use% Mounted
  const output = await run('df -h /data/data/com.termux/files/home 2>/dev/null || df -h $HOME');
  const lines = output.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const parts = lines[1].trim().split(/\s+/);
  return [{
    mount: parts[5] || '/',
    total: parts[1],
    used: parts[2],
    usagePercent: parseInt(parts[4]) || 0
  }];
}

async function getSystemStats() {
  const [memory, cpu, disks] = await Promise.all([getMemInfo(), getCpuUsage(), getStorage()]);

  return {
    cpu: {
      manufacturer: 'Android',
      brand: cpu.model,
      cores: cpu.cores,
      speed: null,
      usagePercent: cpu.usagePercent,
      temperature: null
    },
    memory,
    disks,
    network: [],
    os: {
      platform: 'android',
      distro: 'Termux',
      hostname: os.hostname(),
      uptime: Math.round(os.uptime() / 3600) + 'h'
    },
    timestamp: Date.now()
  };
}

module.exports = { getSystemStats };