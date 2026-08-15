requireAuth();

async function renderStats() {
  try {
    const stats = await api.getStats();
    document.getElementById('cpuUsage').textContent = `${stats.cpu.usagePercent}%`;
    document.getElementById('cpuBrand').textContent = stats.cpu.brand;
    document.getElementById('memUsage').textContent = `${stats.memory.usagePercent}% (${stats.memory.used} / ${stats.memory.total})`;
    document.getElementById('hostname').textContent = stats.os.hostname;
    document.getElementById('uptime').textContent = stats.os.uptime;

    const diskContainer = document.getElementById('diskList');
    diskContainer.innerHTML = stats.disks.map(d =>
      `<div class="disk-row"><span>${d.mount}</span><span>${d.used} / ${d.total} (${d.usagePercent}%)</span></div>`
    ).join('');
  } catch (err) {
    console.error('Failed to load stats', err);
  }
}

async function renderPhoneStats() {
  try {
    const phone = await apiRequest('/stats/phone');
    const card = document.getElementById('phoneCard');
    if (!phone.online) {
      card.innerHTML = `<h3>Mobile</h3><p style="color:#ff6b6b">Offline</p>`;
      return;
    }
    card.innerHTML = `
      <h3>Mobile</h3>
      <p>${phone.cpu.usagePercent}% CPU</p>
      <small>${phone.memory.used} / ${phone.memory.total} RAM</small><br>
      <small>${phone.storage.used} / ${phone.storage.total} storage</small>
    `;
  } catch (err) {
    console.error('Phone stats failed', err);
  }
}

async function renderServers() {
  try {
    const servers = await api.getServers();
    const list = document.getElementById('serverList');
    if (servers.length === 0) {
      list.innerHTML = `<p class="empty">No servers added yet.</p>`;
      return;
    }
    list.innerHTML = servers.map(s => `
      <div class="server-card">
        <div>
          <strong>${s.name}</strong>
          <span class="status status-${s.status}">${s.status}</span>
        </div>
        <div class="server-actions">
          ${s.status === 'running'
            ? `<button onclick="stopServer('${s.id}')">Stop</button>`
            : `<button onclick="startServer('${s.id}')">Start</button>`}
          <button onclick="window.location.href='/pages/console.html?id=${s.id}'">Console</button>
          <button onclick="deleteServer('${s.id}')">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to load servers', err);
  }
}

async function startServer(id) {
  await api.startServer(id);
  renderServers();
}

async function stopServer(id) {
  await api.stopServer(id);
  renderServers();
}

async function deleteServer(id) {
  if (!confirm('Delete this server?')) return;
  await api.deleteServer(id);
  renderServers();
}

document.getElementById('addServerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('serverName').value;
  const command = document.getElementById('serverCommand').value;
  const cwd = document.getElementById('serverCwd').value;
  await api.createServer({ name, command, cwd });
  e.target.reset();
  renderServers();
});

renderStats();
renderPhoneStats();
renderServers();
setInterval(renderStats, 5000);
setInterval(renderPhoneStats, 8000);
setInterval(renderServers, 8000);