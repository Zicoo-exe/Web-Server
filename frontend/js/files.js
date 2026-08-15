let currentPath = "";
let currentItems = [];

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

function renderRows(items) {
  const list = el("file-list");
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

  if (items.length === 0) {
    list.innerHTML += `<tr><td colspan="4">This folder is empty.</td></tr>`;
    return;
  }

  items.forEach((item) => {
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
      if (!confirm(`Move "${item.name}" to trash? It'll be auto-deleted after 3 days.`)) return;
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
}

async function loadFiles(path = "") {
  const list = el("file-list");
  list.innerHTML = `<tr><td colspan="4">Loading…</td></tr>`;

  try {
    const data = await fetchJSON(`/api/files?path=${encodeURIComponent(path)}`);
    currentPath = data.path;
    currentItems = data.items;
    el("breadcrumb").textContent = "/" + currentPath;
    renderRows(currentItems);
  } catch (err) {
    list.innerHTML = `<tr><td colspan="4">Failed to load: ${err.message}</td></tr>`;
  }
}

el("search").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase();
  renderRows(currentItems.filter((i) => i.name.toLowerCase().includes(q)));
});

el("btn-new-dir").addEventListener("click", async () => {
  const name = prompt("New folder name:");
  if (!name) return;
  try {
    await fetchJSON("/api/files/directory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: currentPath, name }),
    });
    loadFiles(currentPath);
  } catch (err) {
    alert(`Failed to create folder: ${err.message}`);
  }
});

el("btn-new-file").addEventListener("click", async () => {
  const name = prompt("New file name (e.g. notes.txt):");
  if (!name) return;
  try {
    await fetchJSON("/api/files/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: currentPath, name }),
    });
    loadFiles(currentPath);
  } catch (err) {
    alert(`Failed to create file: ${err.message}`);
  }
});

async function handleUploadFile(file) {
  if (!file.name.toLowerCase().endsWith(".zip")) {
    alert("Only .zip files can be uploaded.");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("path", currentPath);

  try {
    await fetchJSON("/api/files/upload", { method: "POST", body: formData });
    loadFiles(currentPath);
  } catch (err) {
    alert(`Upload failed: ${err.message}`);
  }
}

el("upload-input").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) handleUploadFile(file);
  e.target.value = "";
});

const dropzone = el("dropzone");
let dragCounter = 0;

if (dropzone) {
  ["dragenter", "dragover", "dragleave", "drop"].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  dropzone.addEventListener("dragenter", () => {
    dragCounter++;
    dropzone.classList.add("drag-active");
  });

  dropzone.addEventListener("dragleave", () => {
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      dropzone.classList.remove("drag-active");
    }
  });

  dropzone.addEventListener("drop", (e) => {
    dragCounter = 0;
    dropzone.classList.remove("drag-active");

    const files = [...e.dataTransfer.files];
    if (files.length === 0) return;

    if (files.length > 1) {
      alert("Drop one .zip file at a time.");
      return;
    }

    handleUploadFile(files[0]);
  });
} else {
  console.error("files.js: #dropzone element not found — drag & drop disabled");
}

loadFiles();