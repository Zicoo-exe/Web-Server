requireAuth();

const params = new URLSearchParams(window.location.search);
const serverId = params.get('id');
let currentPath = '.';

if (!serverId) {
  document.getElementById('serverName').textContent = 'No server selected';
}

function wireFilesLink() {
  const link = document.getElementById('filesNavLink');
  if (link && serverId) link.href = `/pages/files.html?id=${serverId}`;
}

async function loadFiles() {
  if (!serverId) return;
  try {
    const server = await api.getServer(serverId);
    document.getElementById('serverName').textContent = `${server.name} - Files`;

    const files = await api.listFiles(serverId, currentPath);
    document.getElementById('filePath').textContent = '/' + (currentPath === '.' ? '' : currentPath);

    const body = document.getElementById('fileListBody');
    if (files.length === 0) {
      body.innerHTML = `<tr><td colspan="4" style="color:#5f5e5a">Empty folder.</td></tr>`;
      return;
    }

    body.innerHTML = files.map(f => `
      <tr>
        <td>
          <div class="name-cell">
            <span class="file-icon">${f.type === 'folder' ? '📁' : '📄'}</span>
            ${f.type === 'folder'
              ? `<a href="#" onclick="openFolder('${escapeAttr(f.name)}');return false;">${escapeHtml(f.name)}</a>`
              : escapeHtml(f.name)}
          </div>
        </td>
        <td>${f.size || '--'}</td>
        <td>${new Date(f.modified).toLocaleString()}</td>
        <td><button class="del-btn" onclick="deleteFile('${escapeAttr(f.name)}')">Delete</button></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load files', err);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
function escapeAttr(str) { return str.replace(/'/g, "\\'"); }

function openFolder(name) {
  currentPath = currentPath === '.' ? name : `${currentPath}/${name}`;
  loadFiles();
}

document.getElementById('filePath').addEventListener('click', () => {
  if (currentPath === '.') return;
  const parts = currentPath.split('/');
  parts.pop();
  currentPath = parts.length ? parts.join('/') : '.';
  loadFiles();
});

async function deleteFile(name) {
  if (!confirm(`Move "${name}" to Trash? It will auto-delete permanently after 3 days.`)) return;
  const relPath = currentPath === '.' ? name : `${currentPath}/${name}`;
  try {
    await api.deleteFile(serverId, relPath);
    loadFiles();
  } catch (err) {
    alert(err.message);
  }
}

document.getElementById('mkdirBtn').addEventListener('click', async () => {
  const name = prompt('Folder name:');
  if (!name) return;
  try {
    await api.mkdir(serverId, currentPath, name);
    loadFiles();
  } catch (err) {
    alert(err.message);
  }
});

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleUpload(fileInput.files[0]);
});

dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) handleUpload(file);
});

async function handleUpload(file) {
  if (!file.name.toLowerCase().endsWith('.zip')) {
    alert('Only .zip files can be uploaded.');
    return;
  }
  dropZone.textContent = `Uploading ${file.name}...`;
  try {
    await api.uploadZip(serverId, currentPath, file);
    loadFiles();
  } catch (err) {
    alert(err.message);
  } finally {
    dropZone.innerHTML = `<p>Drag &amp; drop a <strong>.zip</strong> file here to upload, or click to browse</p>`;
  }
}

document.getElementById('trashToggleBtn').addEventListener('click', () => {
  const panel = document.getElementById('trashPanel');
  const showing = panel.style.display !== 'none';
  panel.style.display = showing ? 'none' : 'block';
  if (!showing) loadTrash();
});

async function loadTrash() {
  try {
    const items = await api.getTrash(serverId);
    const body = document.getElementById('trashListBody');
    if (items.length === 0) {
      body.innerHTML = `<tr><td colspan="4" style="color:#5f5e5a">Trash is empty.</td></tr>`;
      return;
    }
    body.innerHTML = items.map(t => {
      const msLeft = t.expiresAt - Date.now();
      const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
      return `
        <tr>
          <td>${escapeHtml(t.name)}</td>
          <td>${new Date(t.deletedAt).toLocaleString()}</td>
          <td>${daysLeft} day(s)</td>
          <td>
            <button class="restore-btn" onclick="restoreFile('${t.id}')">Restore</button>
            <button class="perm-btn" onclick="permDeleteFile('${t.id}')">Delete Now</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load trash', err);
  }
}

async function restoreFile(trashId) {
  try {
    await api.restoreTrash(trashId);
    loadTrash();
    loadFiles();
  } catch (err) {
    alert(err.message);
  }
}

async function permDeleteFile(trashId) {
  if (!confirm('Permanently delete this file? This cannot be undone.')) return;
  try {
    await api.permanentDeleteTrash(trashId);
    loadTrash();
  } catch (err) {
    alert(err.message);
  }
}

loadFiles();
wireFilesLink();