const os = require("os");
const { execSync } = require("child_process");

let prevCpu = os.cpus();
const platform = os.platform(); // 'win32' | 'linux' | 'android' (termux reports 'android' via uname, but os.platform() gives 'linux')

function safeExec(cmd) {
  try {
    // stdio: ignore stderr so failed commands never print to the console
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString();
  } catch {
    return null;
  }
}

function getCpuUsage() {
  const curCpu = os.cpus();
  let idleDiff = 0, totalDiff = 0;

  curCpu.forEach((core, i) => {
    const prev = prevCpu[i].times;
    const cur = core.times;
    const idle = cur.idle - prev.idle;
    const total = Object.keys(cur).reduce((sum, k) => sum + (cur[k] - prev[k]), 0);
    idleDiff += idle;
    totalDiff += total;
  });

  prevCpu = curCpu;
  const usagePercent = totalDiff === 0 ? 0 : 100 - (idleDiff / totalDiff) * 100;
  return { usagePercent, cores: curCpu.length };
}

function getMemory() {
  const total = os.totalmem();
  const free = os.freemem();
  return { total, free, used: total - free };
}

function getDisk() {
  if (platform === "win32") {
    // wmic returns "FreeSpace  Size" header then a value line
    const out = safeExec(
      `wmic logicaldisk where "DeviceID='${process.cwd().slice(0, 2)}'" get FreeSpace,Size /format:value`
    );
    if (!out) return { total: 0, used: 0 };
    const free = parseInt((out.match(/FreeSpace=(\d+)/) || [])[1] || "0", 10);
    const total = parseInt((out.match(/Size=(\d+)/) || [])[1] || "0", 10);
    return { total, used: total - free };
  }

  // linux / termux
  const out = safeExec("df -k / | tail -1");
  if (!out) return { total: 0, used: 0 };
  const parts = out.trim().split(/\s+/);
  const totalKB = parseInt(parts[1], 10) || 0;
  const usedKB = parseInt(parts[2], 10) || 0;
  return { total: totalKB * 1024, used: usedKB * 1024 };
}

function getBattery() {
  if (platform === "win32") {
    const out = safeExec("wmic path Win32_Battery get EstimatedChargeRemaining /format:value");
    if (!out) return null;
    const match = out.match(/EstimatedChargeRemaining=(\d+)/);
    return match ? parseInt(match[1], 10) : null; // null on desktops with no battery
  }

  // Termux (requires: pkg install termux-api)
  const out = safeExec("termux-battery-status");
  if (!out) return null;
  try {
    return JSON.parse(out).percentage;
  } catch {
    return null;
  }
}

function getDeviceInfo() {
  const nets = os.networkInterfaces();
  let localIp = null;
  for (const iface of Object.values(nets)) {
    for (const addr of iface || []) {
      if (addr.family === "IPv4" && !addr.internal) {
        localIp = addr.address;
        break;
      }
    }
    if (localIp) break;
  }
  return {
    model: os.hostname(),
    platform,
    battery: getBattery(),
    localIp,
  };
}

function getAllStats() {
  return {
    cpu: getCpuUsage(),
    memory: getMemory(),
    disk: getDisk(),
    device: getDeviceInfo(),
    uptime: os.uptime(),
  };
}

module.exports = { getCpuUsage, getMemory, getDisk, getBattery, getDeviceInfo, getAllStats };