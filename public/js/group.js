// group.js

// toast helper (compartilhado)
function showToast(msg, success = true) {
  let toastEl = document.getElementById("toast");
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.id = "toast";
    toastEl.className = "fixed bottom-4 right-4 text-white px-4 py-2 rounded shadow transition-opacity z-50";
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.style.backgroundColor = success ? "#16a34a" : "#dc2626";
  toastEl.style.opacity = "1";
  setTimeout(() => {
    toastEl.style.opacity = "0";
  }, 2200);
}

// mesma normalização usada no dashboard.js
function normalizeImagem(im) {
  if (!im) return "";
  if (im.startsWith("http") || im.startsWith("/")) {
    if (im.startsWith("/img/")) return im;
    if (im.startsWith("/")) return im;
    return "/" + im.replace(/^\/?img\/?/i, "");
  }
  return `/img/${im.replace(/^\/?img\/?/i, "")}`;
}

// Carrega grupos no painel administrativo com upload e edição inline
async function carregarGruposAdmin() {
  try {
    const res = await fetch("/api/groups");
    const grupos = await res.json();
    const container = document.getElementById("grupos-lista");
    if (!container) return;
    container.innerHTML = "";
    if (!Array.isArray(grupos)) return;

    grupos.forEach(g => {
      const div = document.createElement("div");
      div.className = "group-card bg-white p-4 rounded shadow flex flex-col gap-3 mb-3";
      div.innerHTML = `
        <div class="flex justify-between items-start">
          <div class="flex-1 flex gap-4">
            <div class="flex-shrink-0">
              <div class="w-24 h-24 bg-gray-100 flex items-center justify-center mb-1">
                ${g.imagem ? `<img src="${normalizeImagem(g.imagem)}" alt="${g.nome}" class="object-contain w-full h-full">` : "Sem imagem"}
              </div>
              <div class="text-xs mb-1">Upload imagem</div>
              <input type="file" data-type="grupo" data-id="${g.id}" class="upload-image-input mb-2" accept="image/*" />
              <div class="text-xs mb-1">Imagem (nome ou caminho)</div>
              <input type="text" value="${g.imagem || ""}" data-field="imagem" data-id="${g.id}" class="inline-input border px-2 py-1 rounded w-full mb-1" />
            </div>
            <div class="flex-1">
              <div class="grid grid-cols-1 gap-2">
                <div>
                  <label class="block font-semibold text-xs">Nome</label>
                  <input type="text" value="${g.nome}" data-field="nome" data-id="${g.id}" class="border px-2 py-1 rounded w-full" />
                </div>
                <div>
                  <label class="block font-semibold text-xs">Descrição</label>
                  <textarea data-field="descricao" data-id="${g.id}" class="border px-2 py-1 rounded w-full">${g.descricao || ""}</textarea>
                </div>
              </div>
            </div>
          </div>
          <div class="flex flex-col gap-2 ml-4">
            <button data-id="${g.id}" class="btn-save-inline-grupo bg-blue-500 text-white px-3 py-1 rounded text-sm">Salvar rápido</button>
            <button data-id="${g.id}" class="btn-edit-grupo bg-yellow-400 text-white px-3 py-1 rounded text-sm">Editar completo</button>
            <button data-id="${g.id}" class="btn-delete-grupo bg-red-500 text-white px-3 py-1 rounded text-sm">Excluir</button>
          </div>
        </div>
      `;
      container.appendChild(div);
    });

    // upload de imagem grupo
    container.querySelectorAll("input[data-type='grupo']").forEach(input => {
      input.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const id = e.target.dataset.id;
        const form = new FormData();
        form.append("image", file);
        form.append("type", "grupo");
        form.append("id", id);
        try {
          const up = await fetch("/api/upload-image", {
            method: "POST",
            body: form
          });
          const info = await up.json();
          if (info.success) {
            // antes de atualizar, opcional: remover imagem antiga via API se for implementado
            await fetch(`/api/groups/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imagem: info.filename })
            });
            showToast("Imagem do grupo atualizada");
            await carregarGruposAdmin();
            if (typeof carregarDashboard === "function") await carregarDashboard();
          } else {
            showToast("Erro upload grupo", false);
          }
        } catch (err) {
          console.error(err);
          showToast("Erro de rede", false);
        }
      });
    });

    // salvar rápido (nome, descrição, imagem manual)
    container.querySelectorAll(".btn-save-inline-grupo").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        const nomeInput = document.querySelector(`input[data-field="nome"][data-id="${id}"]`);
        const descInput = document.querySelector(`textarea[data-field="descricao"][data-id="${id}"]`);
        const imgInput = document.querySelector(`input[data-field="imagem"][data-id="${id}"]`);
        const updated = {};
        if (nomeInput) updated.nome = nomeInput.value.trim();
        if (descInput) updated.descricao = descInput.value.trim();
        if (imgInput) updated.imagem = imgInput.value.trim();
        try {
          const res = await fetch(`/api/groups/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updated)
          });
          if (res.ok) {
            showToast("Grupo salvo");
            await carregarGruposAdmin();
            if (typeof carregarDashboard === "function") await carregarDashboard();
          } else {
            showToast("Erro ao salvar grupo", false);
          }
        } catch (err) {
          console.error(err);
          showToast("Erro rede grupo", false);
        }
      });
    });

    // editar completo grupo (modal)
    container.querySelectorAll(".btn-edit-grupo").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        const groups = await fetch("/api/groups").then(r => r.json());
        const group = Array.isArray(groups) ? groups.find(g => g.id === id) : null;
        if (!group) return showToast("Grupo não encontrado", false);
        abrirModalEdicaoGrupo(group);
      });
    });

    // excluir
    container.querySelectorAll(".btn-delete-grupo").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        if (!confirm("Excluir grupo?")) return;
        await fetch(`/api/groups/${id}`, { method: "DELETE" });
        showToast("Grupo excluído");
        await carregarGruposAdmin();
        if (typeof carregarDashboard === "function") await carregarDashboard();
      });
    });
  } catch (err) {
    console.error("Erro carregar grupos admin:", err);
    showToast("Falha ao carregar grupos", false);
  }
}

function abrirModalEdicaoGrupo(g) {
  const modalId = "modal-grupo";
  let existing = document.getElementById(modalId);
  if (existing) existing.remove();
  const modal = document.createElement("div");
  modal.id = modalId;
  modal.className = "fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50";
  modal.innerHTML = `
    <div class="bg-white rounded shadow max-w-md w-full p-6 relative">
      <h2 class="text-xl font-bold mb-4">Editar Grupo</h2>
      <div class="space-y-3">
        <div>
          <label class="block font-semibold">Nome</label>
          <input type="text" id="edit-grupo-nome" value="${g.nome}" class="w-full border px-2 py-1 rounded" />
        </div>
        <div>
          <label class="block font-semibold">Descrição</label>
          <textarea id="edit-grupo-desc" class="w-full border px-2 py-1 rounded">${g.descricao || ""}</textarea>
        </div>
        <div>
          <label class="block font-semibold">Imagem (nome ou caminho)</label>
          <input type="text" id="edit-grupo-imagem" value="${g.imagem || ""}" class="w-full border px-2 py-1 rounded" />
        </div>
      </div>
      <div class="mt-6 flex justify-end gap-3">
        <button id="close-grupo-modal" class="px-4 py-2 border rounded">Cancelar</button>
        <button id="save-grupo-modal" class="px-4 py-2 bg-blue-600 text-white rounded">Salvar</button>
      </div>
      <button id="x-close-grupo" class="absolute top-2 right-2 text-gray-500">&times;</button>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector("#close-grupo-modal").addEventListener("click", () => modal.remove());
  modal.querySelector("#x-close-grupo").addEventListener("click", () => modal.remove());
  modal.querySelector("#save-grupo-modal").addEventListener("click", async () => {
    const updated = {
      nome: document.getElementById("edit-grupo-nome").value,
      descricao: document.getElementById("edit-grupo-desc").value,
      imagem: document.getElementById("edit-grupo-imagem").value.trim()
    };
    const res = await fetch(`/api/groups/${g.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated)
    });
    if (res.ok) {
      showToast("Grupo salvo");
      await carregarGruposAdmin();
      if (typeof carregarDashboard === "function") await carregarDashboard();
      modal.remove();
    } else {
      showToast("Erro ao salvar grupo", false);
    }
  });
}

// criação rápida de grupo (caso botão exista)
document.getElementById("add-grupo")?.addEventListener("click", async () => {
  const novo = {
    id: "grp-" + Date.now(),
    nome: "Novo Grupo",
    descricao: ""
  };
  const res = await fetch("/api/groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(novo)
  });
  if (res.ok) {
    showToast("Grupo criado");
    await carregarGruposAdmin();
    if (typeof carregarDashboard === "function") await carregarDashboard();
  }
});
