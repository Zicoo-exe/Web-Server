const { Client } = require('ssh2');

function runRemoteCommand(cmd) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let output = '';

    conn.on('ready', () => {
      conn.exec(cmd, (err, stream) => {
        if (err) { conn.end(); return reject(err); }
        stream.on('data', (data) => { output += data.toString(); });
        stream.on('close', () => { conn.end(); resolve(output.trim()); });
      });
    });

    conn.on('error', reject);

    conn.connect({
      host: process.env.PHONE_HOST,
      port: parseInt(process.env.PHONE_PORT || '8022'),
      username: process.env.PHONE_USER,
      password: process.env.PHONE_PASSWORD,
      readyTimeout: 5000
    });
  });
}

function formatBytesKb(kb) {
  const mb = kb / 1024;
  if (mb > 1024) return (mb / 1024).toFixed(2) + ' GB';
  return mb.toFixed(0) + ' MB';
}

async function getPhoneStats() {
  try {
    const [memRaw, statRaw1, dfRaw] = await Promise.all([
      runRemoteCommand('cat /proc/meminfo'),
      runRemoteCommand('cat /proc/stat | head -1'),
      runRemoteCommand('df -h $HOME | tail -1')
    ]);

    // Memory
    const lines = Object.fromEntries(
      memRaw.split('\n').filter(Boolean).map(l => {
        const [k, v] = l.split(':');
        return [k.trim(), parseInt(v.trim())];
      })
    );
    const totalKb = lines['MemTotal'];
    const availKb = lines['MemAvailable'];
    const usedKb = totalKb - availKb;

    // CPU (single snapshot estimate - good enough for a dashboard card)
    const statRaw2 = await new Promise(r => setTimeout(async () => r(await runRemoteCommand('cat /proc/stat | head -1')), 300));
    const parse = (line) => line.trim().split(/\s+/).slice(1).map(Number);
    const p1 = parse(statRaw1), p2 = parse(statRaw2);
    const idle1 = p1[3], idle2 = p2[3];
    const total1 = p1.reduce((a, b) => a + b, 0), total2 = p2.reduce((a, b) => a + b, 0);
    const cpuPercent = Math.round(100 * (1 - (idle2 - idle1) / (total2 - total1)));

    // Storage
    const dfParts = dfRaw.trim().split(/\s+/);

    return {
      online: true,
      cpu: { usagePercent: cpuPercent },
      memory: {
        total: formatBytesKb(totalKb),
        used: formatBytesKb(usedKb),
        usagePercent: Math.round((usedKb / totalKb) * 100)
      },
      storage: {
        total: dfParts[1],
        used: dfParts[2],
        usagePercent: parseInt(dfParts[4]) || 0
      }
    };
  } catch (err) {
    return { online: false, error: err.message };
  }
}

module.exports = { getPhoneStats };