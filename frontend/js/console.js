requireAuth();

const params = new URLSearchParams(window.location.search);
const serverId = params.get('id');

if (!serverId) {
  document.getElementById('serverName').textContent = 'No server selected';
}

function wireFilesLink() {
  const link = document.getElementById('filesNavLink');
  if (link && serverId) link.href = `/pages/files.html?id=${serverId}`;
}

async function loadServerInfo() {
  if (!serverId) return;
  try {
    const server = await api.getServer(serverId);
    document.getElementById('serverName').textContent = server.name;

    const online = server.status === 'running';
    const pill = document.getElementById('serverStatus');
    pill.textContent = online ? 'Online' : 'Offline';
    pill.className = 'status-pill' + (online ? '' : ' offline');

    document.getElementById('startBtn').disabled = online;
    document.getElementById('restartBtn').disabled = !online;
    document.getElementById('stopBtn').disabled = !online;
  } catch (err) {
    console.error('Failed to load server info', err);
  }
}

async function loadConsoleOutput() {
  if (!serverId) return;
  try {
    const { output } = await api.getConsole(serverId);
    const box = document.getElementById('consoleOutput');
    const atBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 20;

    if (!output || output.length === 0) {
      box.innerHTML = `<div class="empty">No output yet. Start the server to see logs.</div>`;
      return;
    }

    box.innerHTML = output.map(line => {
      const isErr = line.startsWith('[stderr]');
      const isTag = /^\[[A-Za-z]+\]/.test(line);
      const cls = isErr ? 'line-err' : (isTag ? 'line-tag' : 'line-ok');
      return `<div class="${cls}">${escapeHtml(line)}</div>`;
    }).join('');

    if (atBottom) box.scrollTop = box.scrollHeight;
  } catch (err) {
    console.error('Failed to load console output', err);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.getElementById('startBtn').addEventListener('click', async () => {
  await api.startServer(serverId);
  loadServerInfo();
});

document.getElementById('stopBtn').addEventListener('click', async () => {
  await api.stopServer(serverId);
  loadServerInfo();
});

document.getElementById('restartBtn').addEventListener('click', async () => {
  await api.stopServer(serverId);
  setTimeout(async () => {
    await api.startServer(serverId);
    loadServerInfo();
  }, 1000);
});

document.getElementById('commandForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('commandInput');
  const command = input.value.trim();
  if (!command || !serverId) return;
  try {
    await api.sendCommand(serverId, command);
    input.value = '';
    loadConsoleOutput();
  } catch (err) {
    console.error('Failed to send command', err);
  }
});

document.querySelectorAll('.console-tabs .tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.console-tabs .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
  });
});

loadServerInfo();
wireFilesLink();
loadConsoleOutput();
setInterval(loadServerInfo, 5000);
setInterval(loadConsoleOutput, 2000);