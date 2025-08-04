// dashboard.js
document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab-btn");
  const sections = document.querySelectorAll(".tab-section");
  let chartInstance = null;

  function showToast(msg, success = true) {
    let toastEl = document.getElementById("toast");
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.id = "toast";
      toastEl.className = "fixed bottom-4 right-4 text-white px-4 py-2 rounded shadow transition-opacity";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.style.backgroundColor = success ? "#16a34a" : "#dc2626";
    toastEl.style.opacity = "1";
    setTimeout(() => {
      toastEl.style.opacity = "0";
    }, 2200);
  }

  function normalizeImagem(im) {
    if (!im) return "";
    if (im.startsWith("http") || im.startsWith("/")) {
      if (im.startsWith("/img/")) return im;
      if (im.startsWith("/")) return im;
      return "/" + im.replace(/^\/?img\/?/i, "");
    }
    return `/img/${im.replace(/^\/?img\/?/i, "")}`;
  }

  // Tab switching
  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      tabs.forEach(b => {
        b.classList.remove("bg-blue-500", "text-white");
        b.classList.add("bg-gray-300");
      });
      btn.classList.add("bg-blue-500", "text-white");
      const target = btn.dataset.tab;
      sections.forEach(sec => sec.classList.add("hidden"));
      const sel = document.getElementById("tab-" + target);
      if (sel) sel.classList.remove("hidden");
    });
  });

  // Dashboard
  async function carregarDashboard() {
    try {
      const [prodRes, groupsRes, downloadsRes, analyticsRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/groups"),
        fetch("/api/downloads"),
        fetch("/api/analytics")
      ]);
      const produtos = await prodRes.json();
      const grupos = await groupsRes.json();
      const downloads = await downloadsRes.json();
      const analytics = await analyticsRes.json();

      document.getElementById("total-produtos").textContent = Array.isArray(produtos) ? produtos.length : 0;
      document.getElementById("total-downloads").textContent = (downloads.files || []).length;
      document.getElementById("total-grupos").textContent = Array.isArray(grupos) ? grupos.length : 0;
      document.getElementById("acessos-hoje").textContent = analytics.hoje || 0;

      gerarGrafico(analytics.dias || []);
    } catch (e) {
      console.error("Erro dashboard:", e);
      showToast("Falha ao carregar dashboard", false);
    }
  }

  function gerarGrafico(dados) {
    const canvas = document.getElementById("grafico-acessos");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    chartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: dados.map(d => d.dia),
        datasets: [{
          label: "Acessos",
          data: dados.map(d => d.total),
          borderColor: "#2563eb",
          backgroundColor: "rgba(37,99,235,0.2)",
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  // Produtos
  async function carregarProdutos() {
    try {
      const res = await fetch("/api/products");
      const produtos = await res.json();
      const container = document.getElementById("produtos-lista");
      if (!container) return;
      container.innerHTML = "";
      if (!Array.isArray(produtos)) return;

      produtos.forEach(p => {
        const card = document.createElement("div");
        card.className = "product-card bg-white p-4 rounded shadow flex flex-col gap-3 mb-3";
        card.innerHTML = `
          <div class="flex justify-between items-start">
            <div class="flex-1 flex gap-4">
              <div class="flex-shrink-0">
                <div class="w-24 h-24 bg-gray-100 flex items-center justify-center mb-1">
                  ${p.imagem ? `<img src="${normalizeImagem(p.imagem)}" alt="${p.nome}" class="object-contain w-full h-full">` : "Sem imagem"}
                </div>
                <div class="text-xs mb-1">Upload imagem</div>
                <input type="file" data-type="produto" data-id="${p.id}" class="upload-image-input mb-2" accept="image/*" />
              </div>
              <div class="flex-1">
                <div class="font-bold text-lg">${p.nome}</div>
                <div class="text-sm text-gray-500">${p.descricao || ""}</div>
                <div class="mt-1 text-green-600 font-semibold">R$ ${p.preco || "0,00"}</div>
                <div class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label class="block font-semibold text-xs">Imagem (nome ou caminho)</label>
                    <input type="text" value="${p.imagem || ""}" data-field="imagem" data-id="${p.id}" class="inline-input border px-2 py-1 rounded w-full" />
                  </div>
                  <div>
                    <label class="block font-semibold text-xs">Link de download</label>
                    <input type="text" value="${p.link || ""}" data-field="link" data-id="${p.id}" class="inline-input border px-2 py-1 rounded w-full" />
                  </div>
                </div>
              </div>
            </div>
            <div class="flex flex-col gap-2 ml-4">
              <button data-id="${p.id}" class="btn-save-inline bg-blue-500 text-white px-3 py-1 rounded text-sm">Salvar rápido</button>
              <button data-id="${p.id}" class="btn-edit bg-yellow-400 text-white px-3 py-1 rounded text-sm">Editar completo</button>
              <button data-id="${p.id}" class="btn-delete bg-red-500 text-white px-3 py-1 rounded text-sm">Excluir</button>
            </div>
          </div>
        `;
        container.appendChild(card);
      });

      // handlers
      container.querySelectorAll("input[data-type='produto']").forEach(input => {
        input.addEventListener("change", async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const id = e.target.dataset.id;
          const form = new FormData();
          form.append("image", file);
          form.append("type", "produto");
          form.append("id", id);
          try {
            const up = await fetch("/api/upload-image", {
              method: "POST",
              body: form
            });
            const info = await up.json();
            if (info.success) {
              await fetch(`/api/products/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imagem: info.filename })
              });
              showToast("Imagem atualizada");
              await carregarProdutos();
              await carregarDashboard();
            } else {
              showToast(info.error || "Erro upload", false);
            }
          } catch (err) {
            console.error(err);
            showToast("Erro de rede", false);
          }
        });
      });

      container.querySelectorAll(".btn-save-inline").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          const id = e.currentTarget.dataset.id;
          const imagemInput = document.querySelector(`input[data-field="imagem"][data-id="${id}"]`);
          const linkInput = document.querySelector(`input[data-field="link"][data-id="${id}"]`);
          const updated = {};
          if (imagemInput) updated.imagem = imagemInput.value.trim();
          if (linkInput) updated.link = linkInput.value.trim();
          try {
            const res = await fetch(`/api/products/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updated)
            });
            if (res.ok) {
              showToast("Produto salvo");
              await carregarProdutos();
              await carregarDashboard();
            } else {
              showToast("Erro ao salvar produto", false);
            }
          } catch (err) {
            console.error(err);
            showToast("Erro de rede", false);
          }
        });
      });

      container.querySelectorAll(".btn-edit").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          const id = e.currentTarget.dataset.id;
          const produtos = await fetch("/api/products").then(r => r.json());
          const prod = Array.isArray(produtos) ? produtos.find(p => p.id === id) : null;
          if (!prod) return showToast("Produto não encontrado", false);
          abrirModalEdicaoProduto(prod);
        });
      });

      container.querySelectorAll(".btn-delete").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          const id = e.currentTarget.dataset.id;
          if (!confirm("Excluir produto?")) return;
          await fetch(`/api/products/${id}`, { method: "DELETE" });
          showToast("Produto excluído");
          await carregarProdutos();
          await carregarDashboard();
        });
      });
    } catch (err) {
      console.error("Erro carregar produtos:", err);
      showToast("Falha produtos", false);
    }
  }

  function abrirModalEdicaoProduto(p) {
    const modalId = "modal-produto";
    let existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = modalId;
    modal.className = "fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50";
    modal.innerHTML = `
      <div class="bg-white rounded shadow max-w-lg w-full p-6 relative">
        <h2 class="text-xl font-bold mb-4">Editar Produto</h2>
        <div class="space-y-3">
          <div>
            <label class="block font-semibold">Nome</label>
            <input type="text" id="edit-nome" value="${p.nome}" class="w-full border px-2 py-1 rounded" />
          </div>
          <div>
            <label class="block font-semibold">Preço</label>
            <input type="text" id="edit-preco" value="${p.preco}" class="w-full border px-2 py-1 rounded" />
          </div>
          <div>
            <label class="block font-semibold">Imagem</label>
            <input type="text" id="edit-imagem" value="${p.imagem || ""}" class="w-full border px-2 py-1 rounded" />
          </div>
          <div>
            <label class="block font-semibold">Descrição</label>
            <textarea id="edit-descricao" class="w-full border px-2 py-1 rounded">${p.descricao || ""}</textarea>
          </div>
          <div>
            <label class="block font-semibold">Grupo</label>
            <input type="text" id="edit-grupo" value="${p.grupo || ""}" class="w-full border px-2 py-1 rounded" />
          </div>
          <div>
            <label class="block font-semibold">Link</label>
            <input type="text" id="edit-link" value="${p.link || ""}" class="w-full border px-2 py-1 rounded" />
          </div>
          <div>
            <label class="block font-semibold">Desconto (%)</label>
            <input type="number" id="edit-desconto" value="${p.desconto || 0}" class="w-full border px-2 py-1 rounded" />
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button id="close-modal" class="px-4 py-2 border rounded">Cancelar</button>
          <button id="save-modal" class="px-4 py-2 bg-blue-600 text-white rounded">Salvar</button>
        </div>
        <button id="x-close" class="absolute top-2 right-2 text-gray-500">&times;</button>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector("#close-modal").addEventListener("click", () => modal.remove());
    modal.querySelector("#x-close").addEventListener("click", () => modal.remove());
    modal.querySelector("#save-modal").addEventListener("click", async () => {
      const updated = {
        nome: document.getElementById("edit-nome").value,
        preco: document.getElementById("edit-preco").value,
        imagem: document.getElementById("edit-imagem").value,
        descricao: document.getElementById("edit-descricao").value,
        grupo: document.getElementById("edit-grupo").value,
        link: document.getElementById("edit-link").value,
        desconto: Number(document.getElementById("edit-desconto").value || 0)
      };
      const res = await fetch(`/api/products/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        showToast("Produto salvo");
        await carregarProdutos();
        await carregarDashboard();
        modal.remove();
      } else {
        showToast("Erro ao salvar", false);
      }
    });
  }

  // Downloads
  async function carregarDownloads() {
    try {
      const res = await fetch("/api/downloads");
      const data = await res.json();
      const files = Array.isArray(data.files) ? data.files : [];
      const container = document.getElementById("downloads-lista");
      if (!container) return;
      container.innerHTML = "";

      files.forEach(d => {
        const card = document.createElement("div");
        card.className = "bg-white p-4 rounded shadow flex flex-col gap-3 mb-3";
        card.innerHTML = `
          <div class="flex justify-between items-start">
            <div class="flex-1 flex gap-4">
              <div class="flex-shrink-0">
                <div class="w-24 h-24 bg-gray-100 flex items-center justify-center mb-1">
                  ${d.imagem ? `<img src="${normalizeImagem(d.imagem)}" alt="${d.name}" class="object-contain w-full h-full">` : "Sem imagem"}
                </div>
                <div class="text-xs mb-1">Upload imagem</div>
                <input type="file" data-type="download" data-id="${d.id}" class="upload-image-input mb-2" accept="image/*" />
                <div class="text-xs mb-1">Imagem (nome ou caminho)</div>
                <input type="text" value="${d.imagem || ""}" data-field="imagem" data-id="${d.id}" class="border px-2 py-1 rounded w-full mb-1" />
              </div>
              <div class="flex-1">
                <div class="font-bold text-lg">${d.name}</div>
                <div class="text-sm text-gray-500">${d.description || ""}</div>
                <div class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label class="block font-semibold text-xs">URL</label>
                    <input type="text" value="${d.url || "#"}" data-field="url" data-id="${d.id}" class="inline-input border px-2 py-1 rounded w-full" />
                  </div>
                  <div>
                    <label class="block font-semibold text-xs">Nome</label>
                    <input type="text" value="${d.name}" data-field="name" data-id="${d.id}" class="inline-input border px-2 py-1 rounded w-full" />
                  </div>
                </div>
              </div>
            </div>
            <div class="flex flex-col gap-2 ml-4">
              <button data-id="${d.id}" class="btn-save-inline-download bg-blue-500 text-white px-3 py-1 rounded text-sm">Salvar rápido</button>
              <button data-id="${d.id}" class="btn-edit-download bg-yellow-400 text-white px-3 py-1 rounded text-sm">Editar completo</button>
              <button data-id="${d.id}" class="btn-delete-download bg-red-500 text-white px-3 py-1 rounded text-sm">Excluir</button>
            </div>
          </div>
        `;
        container.appendChild(card);
      });

      // upload
      container.querySelectorAll("input[data-type='download']").forEach(input => {
        input.addEventListener("change", async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const id = e.target.dataset.id;
          const form = new FormData();
          form.append("image", file);
          form.append("type", "download");
          form.append("id", id);
          try {
            const up = await fetch("/api/upload-image", {
              method: "POST",
              body: form
            });
            const info = await up.json();
            if (info.success) {
              await fetch(`/api/downloads/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imagem: info.filename })
              });
              showToast("Imagem de download atualizada");
              await carregarDownloads();
              await carregarDashboard();
            } else {
              showToast("Erro upload", false);
            }
          } catch (err) {
            console.error(err);
            showToast("Erro rede", false);
          }
        });
      });

      // salvar inline
      container.querySelectorAll(".btn-save-inline-download").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          const id = e.currentTarget.dataset.id;
          const nameInput = document.querySelector(`input[data-field="name"][data-id="${id}"]`);
          const urlInput = document.querySelector(`input[data-field="url"][data-id="${id}"]`);
          const imgInput = document.querySelector(`input[data-field="imagem"][data-id="${id}"]`);
          const updated = {};
          if (nameInput) updated.name = nameInput.value.trim();
          if (urlInput) updated.url = urlInput.value.trim();
          if (imgInput) updated.imagem = imgInput.value.trim();
          try {
            const res = await fetch(`/api/downloads/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updated)
            });
            if (res.ok) {
              showToast("Download atualizado");
              await carregarDownloads();
              await carregarDashboard();
            } else {
              showToast("Erro salvar download", false);
            }
          } catch (err) {
            console.error(err);
            showToast("Erro rede download", false);
          }
        });
      });

      // editar completo (modal)
      container.querySelectorAll(".btn-edit-download").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          const id = e.currentTarget.dataset.id;
          const downloads = await fetch("/api/downloads").then(r => r.json());
          const item = Array.isArray(downloads.files) ? downloads.files.find(f => f.id === id) : null;
          if (!item) return showToast("Download não encontrado", false);

          const modalId = "modal-download";
          let existing = document.getElementById(modalId);
          if (existing) existing.remove();
          const modal = document.createElement("div");
          modal.id = modalId;
          modal.className = "fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50";
          modal.innerHTML = `
            <div class="bg-white rounded shadow max-w-md w-full p-6 relative">
              <h2 class="text-xl font-bold mb-4">Editar Download</h2>
              <div class="space-y-3">
                <div>
                  <label class="block font-semibold">Nome</label>
                  <input type="text" id="edit-dl-name" value="${item.name}" class="w-full border px-2 py-1 rounded" />
                </div>
                <div>
                  <label class="block font-semibold">URL</label>
                  <input type="text" id="edit-dl-url" value="${item.url}" class="w-full border px-2 py-1 rounded" />
                </div>
                <div>
                  <label class="block font-semibold">Descrição</label>
                  <textarea id="edit-dl-desc" class="w-full border px-2 py-1 rounded">${item.description || ""}</textarea>
                </div>
                <div>
                  <label class="block font-semibold">Imagem</label>
                  <input type="text" id="edit-dl-img" value="${item.imagem || ""}" class="w-full border px-2 py-1 rounded" />
                </div>
              </div>
              <div class="mt-6 flex justify-end gap-3">
                <button id="close-dl-modal" class="px-4 py-2 border rounded">Cancelar</button>
                <button id="save-dl-modal" class="px-4 py-2 bg-blue-600 text-white rounded">Salvar</button>
              </div>
              <button id="x-close-dl" class="absolute top-2 right-2 text-gray-500">&times;</button>
            </div>
          `;
          document.body.appendChild(modal);
          modal.querySelector("#close-dl-modal").addEventListener("click", () => modal.remove());
          modal.querySelector("#x-close-dl").addEventListener("click", () => modal.remove());
          modal.querySelector("#save-dl-modal").addEventListener("click", async () => {
            const updated = {
              name: document.getElementById("edit-dl-name").value,
              url: document.getElementById("edit-dl-url").value,
              description: document.getElementById("edit-dl-desc").value,
              imagem: document.getElementById("edit-dl-img").value
            };
            const res = await fetch(`/api/downloads/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updated)
            });
            if (res.ok) {
              showToast("Download salvo");
              await carregarDownloads();
              await carregarDashboard();
              modal.remove();
            } else {
              showToast("Erro ao salvar download", false);
            }
          });
        });
      });

      container.querySelectorAll(".btn-delete-download").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          const id = e.currentTarget.dataset.id;
          if (!confirm("Excluir download?")) return;
          await fetch(`/api/downloads/${id}`, { method: "DELETE" });
          showToast("Download excluído");
          await carregarDownloads();
          await carregarDashboard();
        });
      });
    } catch (err) {
      console.error("Erro carregar downloads:", err);
      showToast("Falha downloads", false);
    }
  }

  // Grupos
  async function carregarGrupos() {
    try {
      const res = await fetch("/api/groups");
      const grupos = await res.json();
      const container = document.getElementById("grupos-lista");
      if (!container) return;
      container.innerHTML = "";
      if (!Array.isArray(grupos)) return;

      grupos.forEach(g => {
        const div = document.createElement("div");
        div.className = "bg-white p-4 rounded shadow flex justify-between items-center mb-3";
        div.innerHTML = `
          <div class="flex-1 flex gap-3 items-center">
            <div class="flex-shrink-0">
              <div class="w-24 h-24 bg-gray-100 flex items-center justify-center mb-1">
                ${g.imagem ? `<img src="${normalizeImagem(g.imagem)}" alt="${g.nome}" class="object-contain w-full h-full">` : "Sem imagem"}
              </div>
              <div class="text-xs mb-1">Upload imagem</div>
              <input type="file" data-type="grupo" data-id="${g.id}" class="upload-image-input mb-2" accept="image/*" />
            </div>
            <div>
              <div class="font-bold text-lg">${g.nome}</div>
              <div class="text-sm text-gray-500">${g.descricao || ""}</div>
            </div>
          </div>
          <div class="flex flex-col gap-2 ml-4">
            <button data-id="${g.id}" class="btn-save-inline-grupo bg-blue-500 text-white px-3 py-1 rounded text-sm">Salvar rápido</button>
            <button data-id="${g.id}" class="btn-edit-grupo bg-yellow-400 text-white px-3 py-1 rounded text-sm">Editar completo</button>
            <button data-id="${g.id}" class="btn-delete-grupo bg-red-500 text-white px-3 py-1 rounded text-sm">Excluir</button>
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
              await fetch(`/api/groups/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imagem: info.filename })
              });
              showToast("Imagem do grupo atualizada");
              await carregarGrupos();
              await carregarDashboard();
            } else {
              showToast("Erro upload grupo", false);
            }
          } catch (err) {
            console.error(err);
            showToast("Erro de rede", false);
          }
        });
      });

      // editar completo grupo
      container.querySelectorAll(".btn-edit-grupo").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          const id = e.currentTarget.dataset.id;
          const groups = await fetch("/api/groups").then(r => r.json());
          const group = Array.isArray(groups) ? groups.find(g => g.id === id) : null;
          if (!group) return showToast("Grupo não encontrado", false);
          abrirModalEdicaoGrupo(group);
        });
      });

      container.querySelectorAll(".btn-delete-grupo").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          const id = e.currentTarget.dataset.id;
          if (!confirm("Excluir grupo?")) return;
          await fetch(`/api/groups/${id}`, { method: "DELETE" });
          showToast("Grupo excluído");
          await carregarGrupos();
          await carregarDashboard();
        });
      });
    } catch (err) {
      console.error("Erro carregar grupos:", err);
      showToast("Falha grupos", false);
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
        descricao: document.getElementById("edit-grupo-desc").value
      };
      const res = await fetch(`/api/groups/${g.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        showToast("Grupo salvo");
        await carregarGrupos();
        await carregarDashboard();
        modal.remove();
      } else {
        showToast("Erro ao salvar grupo", false);
      }
    });
  }

  // criação rápida
  document.getElementById("add-produto")?.addEventListener("click", async () => {
    const novo = {
      id: "prod-" + Date.now(),
      nome: "Novo Produto",
      descricao: "",
      preco: "0,00",
      imagem: "",
      grupo: "",
      desconto: 0,
      link: ""
    };
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(novo)
    });
    if (res.ok) {
      showToast("Produto criado");
      await carregarProdutos();
      await carregarDashboard();
    }
  });

  document.getElementById("add-download")?.addEventListener("click", async () => {
    const novo = {
      id: "dl-" + Date.now(),
      name: "Novo Download",
      url: "#",
      description: ""
    };
    const res = await fetch("/api/downloads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(novo)
    });
    if (res.ok) {
      showToast("Download criado");
      await carregarDownloads();
      await carregarDashboard();
    }
  });

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
      await carregarGrupos();
      await carregarDashboard();
    }
  });

  // inicializa tudo
  carregarDashboard();
  carregarProdutos();
  carregarDownloads();
  carregarGrupos();
});
