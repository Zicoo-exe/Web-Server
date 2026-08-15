const API_BASE = '/api';

function getToken() { return localStorage.getItem('hsp_token'); }
function setToken(token) { localStorage.setItem('hsp_token', token); }
function clearToken() { localStorage.removeItem('hsp_token'); }

async function apiRequest(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
      window.location.href = '/pages/login.html';
    }
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

async function apiUpload(path, file) {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

const api = {
  login: (username, password) =>
    apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getStats: () => apiRequest('/stats'),
  getServers: () => apiRequest('/servers'),
  getServer: (id) => apiRequest(`/servers/${id}`),
  createServer: (payload) => apiRequest('/servers', { method: 'POST', body: JSON.stringify(payload) }),
  deleteServer: (id) => apiRequest(`/servers/${id}`, { method: 'DELETE' }),
  startServer: (id) => apiRequest(`/servers/${id}/start`, { method: 'POST' }),
  stopServer: (id) => apiRequest(`/servers/${id}/stop`, { method: 'POST' }),
  getConsole: (id) => apiRequest(`/console/${id}`),
  sendCommand: (id, command) => apiRequest(`/console/${id}/command`, { method: 'POST', body: JSON.stringify({ command }) }),

  listFiles: (serverId, relPath) => apiRequest(`/files/${serverId}?path=${encodeURIComponent(relPath || '.')}`),
  uploadZip: (serverId, relPath, file) => apiUpload(`/files/${serverId}/upload?path=${encodeURIComponent(relPath || '.')}`, file),
  mkdir: (serverId, relPath, name) => apiRequest(`/files/${serverId}/mkdir`, { method: 'POST', body: JSON.stringify({ path: relPath, name }) }),
  deleteFile: (serverId, relPath) => apiRequest(`/files/${serverId}?path=${encodeURIComponent(relPath)}`, { method: 'DELETE' }),
  getTrash: (serverId) => apiRequest(`/files/${serverId}/trash/list`),
  restoreTrash: (trashId) => apiRequest(`/files/trash/${trashId}/restore`, { method: 'POST' }),
  permanentDeleteTrash: (trashId) => apiRequest(`/files/trash/${trashId}`, { method: 'DELETE' })
};