let currentPath = "";

const el = (id) => document.getElementById(id);

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `${url} -> ${res.status}`);
  }
  return res.json();
}

function fmtSize(bytes) {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString();
}

async function loadFiles(path = "") {
  const list = el("file-list");
  list.innerHTML = `<tr><td colspan="4">Loading…</td></tr>`;

  try {
    const data = await fetchJSON(`/api/files?path=${encodeURIComponent(path)}`);
    currentPath = data.path;
    el("breadcrumb").textContent = "/" + currentPath;

    list.innerHTML = "";

    if (currentPath) {
      const upRow = document.createElement("tr");
      upRow.innerHTML = `<td colspan="4" class="file-up">⬅ ..</td>`;
      upRow.addEventListener("click", () => {
        const parts = currentPath.split("/").filter(Boolean);
        parts.pop();
        loadFiles(parts.join("/"));
      });
      list.appendChild(upRow);
    }

    if (data.items.length === 0) {
      list.innerHTML += `<tr><td colspan="4">This folder is empty.</td></tr>`;
      return;
    }

    data.items.forEach((item) => {
      const row = document.createElement("tr");
      const icon = item.isDirectory ? "📁" : "📄";
      row.innerHTML = `
        <td class="file-name">${icon} ${item.name}</td>
        <td>${fmtSize(item.size)}</td>
        <td>${fmtDate(item.modified)}</td>
        <td><button class="btn-delete" data-name="${item.name}">Delete</button></td>
      `;

      row.querySelector(".file-name").addEventListener("click", () => {
        if (item.isDirectory) {
          const next = currentPath ? `${currentPath}/${item.name}` : item.name;
          loadFiles(next);
        }
      });

      row.querySelector(".btn-delete").addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!confirm(`Delete "${item.name}"?`)) return;
        const target = currentPath ? `${currentPath}/${item.name}` : item.name;
        try {
          await fetchJSON("/api/files", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: target }),
          });
          loadFiles(currentPath);
        } catch (err) {
          alert(`Delete failed: ${err.message}`);
        }
      });

      list.appendChild(row);
    });
  } catch (err) {
    list.innerHTML = `<tr><td colspan="4">Failed to load: ${err.message}</td></tr>`;
  }
}

loadFiles();