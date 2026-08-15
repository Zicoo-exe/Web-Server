const si = require('systeminformation');
const formatBytes = require('../utils/formatBytes');

async function getSystemStats() {
  const [cpu, mem, disks, net, osInfo, currentLoad, temp] = await Promise.all([
    si.cpu(),
    si.mem(),
    si.fsSize(),
    si.networkStats(),
    si.osInfo(),
    si.currentLoad(),
    si.cpuTemperature()
  ]);

  return {
    cpu: {
      manufacturer: cpu.manufacturer,
      brand: cpu.brand,
      cores: cpu.cores,
      speed: cpu.speed,
      usagePercent: Math.round(currentLoad.currentLoad),
      temperature: temp.main || null
    },
    memory: {
      total: formatBytes(mem.total),
      used: formatBytes(mem.active),
      free: formatBytes(mem.available),
      usagePercent: Math.round((mem.active / mem.total) * 100)
    },
    disks: disks.map(d => ({
      mount: d.mount,
      total: formatBytes(d.size),
      used: formatBytes(d.used),
      usagePercent: Math.round(d.use)
    })),
    network: net.map(n => ({
      iface: n.iface,
      rx: formatBytes(n.rx_sec || 0) + '/s',
      tx: formatBytes(n.tx_sec || 0) + '/s'
    })),
    os: {
      platform: osInfo.platform,
      distro: osInfo.distro,
      hostname: osInfo.hostname,
      uptime: Math.round(require('os').uptime() / 3600) + 'h'
    },
    timestamp: Date.now()
  };
}

module.exports = { getSystemStats };