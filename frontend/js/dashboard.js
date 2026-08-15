const POLL_MS = 2000;
const BOT_ID = new URLSearchParams(location.search).get("id") || "default";

const el = (id) => document.getElementById(id);
const fmtMiB = (bytes) => (bytes / 1024 / 1024).toFixed(1);
const fmtGB = (bytes) => (bytes / 1024 / 1024 / 1024).toFixed(2);

// simple sparkline history buffers
const history = { cpu: [], mem: [], disk: [] };
const HISTORY_LEN = 30;

function pushHistory(key, value) {
  history[key].push(value);
  if (history[key].length > HISTORY_LEN) history[key].shift();
}

function drawSparkline(canvasId, dataArr, max, color) {
  const canvas = el(canvasId);
  const ctx = canvas.getContext("2d");
  const w = canvas.clientWidth || 260;
  const h = canvas.height;
  canvas.width = w;
  ctx.clearRect(0, 0, w, h);
  if (dataArr.length < 2) return;

  ctx.beginPath();
  dataArr.forEach((val, i) => {
    const x = (i / (HISTORY_LEN - 1)) * w;
    const y = h - (Math.min(val, max) / max) * h;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = color + "22";
  ctx.fill();
}

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

async function refreshStats() {
  try {
    const stats = await fetchJSON("/api/stats");

    el("stat-cpu-value").textContent = `${stats.cpu.usagePercent.toFixed(1)}%`;
    el("bot-cpu-inline").textContent = `CPU ${stats.cpu.usagePercent.toFixed(1)}%`;
    pushHistory("cpu", stats.cpu.usagePercent);
    drawSparkline("chart-cpu", history.cpu, 100, "#4d8dff");

    el("stat-mem-value").textContent = `${fmtMiB(stats.memory.used)} / ${fmtMiB(stats.memory.total)} MiB`;
    el("bot-mem-inline").textContent = `MEM ${fmtMiB(stats.memory.used)} MiB`;
    pushHistory("mem", (stats.memory.used / stats.memory.total) * 100);
    drawSparkline("chart-mem", history.mem, 100, "#f2b93d");

    el("stat-disk-value").textContent = `${fmtGB(stats.disk.used)} / ${fmtGB(stats.disk.total)} GB`;
    pushHistory("disk", (stats.disk.used / stats.disk.total) * 100);
    drawSparkline("chart-disk", history.disk, 100, "#34c77b");

    el("dev-model").textContent = stats.device.model || "—";
    el("dev-battery").textContent = stats.device.battery ? `${stats.device.battery}%` : "—";
    el("dev-ip").textContent = stats.device.localIp || "—";
    el("dev-pubip").textContent = stats.device.publicIp || "—";

    el("last-update").textContent = new Date().toLocaleTimeString();
  } catch (err) {
    console.error("stats poll failed", err);
  }
}

async function refreshServer() {
  try {
    const server = await fetchJSON(`/api/servers/${BOT_ID}`);

    el("bot-name").textContent = server.name;
    el("bot-host").textContent = server.host || "—";

    const pill = el("bot-status");
    pill.textContent = server.status;
    pill.className = "status-pill " + server.status.toLowerCase();

    el("info-status").textContent = server.status;
    el("info-uptime").textContent = server.uptime || "—";
    el("info-pid").textContent = server.pid ?? "—";
    el("info-node").textContent = server.nodeVersion || "—";
    el("info-restarts").textContent = server.restarts ?? 0;

    const running = server.status === "Online";
    el("btn-start").disabled = running;
    el("btn-stop").disabled = !running;
    el("btn-restart").disabled = !running;
  } catch (err) {
    console.error("server poll failed", err);
  }
}

async function doAction(action) {
  const btn = el(`btn-${action}`);
  btn.disabled = true;
  try {
    await fetchJSON(`/api/servers/${BOT_ID}/${action}`, { method: "POST" });
  } catch (err) {
    alert(`Failed to ${action} bot: ${err.message}`);
  } finally {
    refreshServer();
  }
}

el("btn-start").addEventListener("click", () => doAction("start"));
el("btn-stop").addEventListener("click", () => doAction("stop"));
el("btn-restart").addEventListener("click", () => doAction("restart"));

refreshStats();
refreshServer();
setInterval(refreshStats, POLL_MS);
setInterval(refreshServer, POLL_MS);