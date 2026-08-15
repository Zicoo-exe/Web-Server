function requireAuth() {
  if (!getToken()) {
    window.location.href = '/pages/login.html';
  }
}

function logout() {
  clearToken();
  window.location.href = '/pages/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
});