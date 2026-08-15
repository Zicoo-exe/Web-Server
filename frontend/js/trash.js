const el = (id) => document.getElementById(id);

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `${url} -> ${res.status}`);
  }
  return res.json();
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString();
}

async function loadTrash() {
  const list = el("trash-list");
  list.innerHTML = `<tr><td colspan="5">Loading…</td></tr>`;

  try {
    const items = await fetchJSON("/api/files/trash");
    list.innerHTML = "";

    if (items.length === 0) {
      list.innerHTML = `<tr><td colspan="5">Trash is empty.</td></tr>`;
      return;
    }

    items.forEach((item) => {
      const icon = item.isDirectory ? "📁" : "📄";
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${icon} ${item.name}</td>
        <td>${item.originalPath}</td>
        <td>${fmtDate(item.deletedAt)}</td>
        <td>${item.daysLeft} day${item.daysLeft === 1 ? "" : "s"} left</td>
        <td>
          <button class="btn-restore" data-id="${item.id}">Restore</button>
          <button class="btn-delete" data-id="${item.id}">Delete Forever</button>
        </td>
      `;

      row.querySelector(".btn-restore").addEventListener("click", async () => {
        try {
          await fetchJSON(`/api/files/trash/${item.id}/restore`, { method: "POST" });
          loadTrash();
        } catch (err) {
          alert(`Restore failed: ${err.message}`);
        }
      });

      row.querySelector(".btn-delete").addEventListener("click", async () => {
        if (!confirm(`Permanently delete "${item.name}"? This can't be undone.`)) return;
        try {
          await fetchJSON(`/api/files/trash/${item.id}`, { method: "DELETE" });
          loadTrash();
        } catch (err) {
          alert(`Delete failed: ${err.message}`);
        }
      });

      list.appendChild(row);
    });
  } catch (err) {
    list.innerHTML = `<tr><td colspan="5">Failed to load: ${err.message}</td></tr>`;
  }
}

el("btn-empty-trash").addEventListener("click", async () => {
  if (!confirm("Permanently delete everything in trash? This can't be undone.")) return;
  try {
    await fetchJSON("/api/files/trash", { method: "DELETE" });
    loadTrash();
  } catch (err) {
    alert(`Failed to empty trash: ${err.message}`);
  }
});

loadTrash();