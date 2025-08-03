document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab-btn");
  const sections = document.querySelectorAll(".tab-section");
  const toastEl = createToastElement();

  // Helpers
  function showToast(msg, success = true) {
    toastEl.textContent = msg;
    toastEl.style.backgroundColor = success ? "#16a34a" : "#dc2626";
    toastEl.classList.remove("opacity-0");
    setTimeout(() => toastEl.classList.add("opacity-0"), 3000);
  }

  function createToastElement() {
    let t = document.getElementById("toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "toast";
      t.className = "fixed bottom-4 right-4 text-white px-4 py-2 rounded shadow transition-opacity";
      t.style.backgroundColor = "#16a34a";
      t.style.opacity = "1";
      document.body.appendChild(t);
    }
    t.classList.add("opacity-0");
    return t;
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

  // Load dashboard data
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

      document.getElementById("total-produtos").textContent = produtos.length;
      document.getElementById("total-downloads").textContent = (downloads.files || []).length;
      document.getElementById("total-grupos").textContent = grupos.length;
      document.getElementById("acessos-hoje").textContent = analytics.hoje || 0;

      gerarGrafico(analytics.dias || []);
    } catch (e) {
      console.error("Erro dashboard:", e);
      showToast("Falha ao carregar dashboard", false);
    }
  }

  function gerarGrafico(dados) {
    const ctx = document.getElementById("grafico-acessos").getContext("2d");
    new Chart(ctx, {
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
    const res = await fetch("/api/products");
    const produtos = await res.json();
    const container = document.getElementById("produtos-lista");
    container.innerHTML = "";
    produtos.forEach(p => {
      const card = document.createElement("div");
      card.className = "bg-white p-4 rounded shadow flex justify-between items-start space-x-4";
      card.innerHTML = `
        <div class="flex-1">
          <div class="flex items-center gap-3">
            <div class="w-16 h-16 bg-gray-100 flex items-center justify-center text-sm">${p.imagem ? `<img src="${p.imagem}" alt="${p.nome}" class="w-full h-full object-contain">` : "Sem imagem"}</div>
            <div>
              <div class="font-bold text-lg">${p.nome}</div>
              <div class="text-sm text-gray-500">${p.descricao || ""}</div>
              <div class="mt-1 text-green-600 font-semibold">R$ ${p.preco || "0,00"}</div>
            </div>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <button data-id="${p.id}" class="btn-edit bg-yellow-400 text-white px-3 py-1 rounded">Editar</button>
          <button data-id="${p.id}" class="btn-delete bg-red-500 text-white px-3 py-1 rounded">Excluir</button>
        </div>
      `;
      container.appendChild(card);
    });

    // eventos
    container.querySelectorAll(".btn-edit").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        const produtos = await fetch("/api/products").then(r => r.json());
        const prod = produtos.find(p => p.id === id);
        if (!prod) return showToast("Produto não encontrado", false);
        abrirModalEdicaoProduto(prod);
      });
    });
    container.querySelectorAll(".btn-delete").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        if (!confirm("Deseja excluir esse produto?")) return;
        await fetch(`/api/products/${id}`, { method: "DELETE" });
        showToast("Produto excluído");
        carregarProdutos();
        carregarDashboard();
      });
    });
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
            <label class="block font-semibold">Imagem URL</label>
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
        carregarProdutos();
        carregarDashboard();
        modal.remove();
      } else {
        showToast("Erro ao salvar", false);
      }
    });
  }

  // Downloads
  async function carregarDownloads() {
    const res = await fetch("/api/downloads");
    const { files = [] } = await res.json();
    const container = document.getElementById("downloads-lista");
    container.innerHTML = "";
    files.forEach(d => {
      const card = document.createElement("div");
      card.className = "bg-white p-4 rounded shadow flex justify-between items-center";
      card.innerHTML = `
        <div class="flex-1">
          <div class="font-bold">${d.name}</div>
          <div class="text-sm text-gray-500">${d.description || ""}</div>
          <div class="text-xs text-blue-600"><a href="${d.url}">Link</a></div>
        </div>
        <div class="flex flex-col gap-2">
          <button data-id="${d.id}" class="btn-edit-download bg-yellow-400 text-white px-3 py-1 rounded">Editar</button>
          <button data-id="${d.id}" class="btn-delete-download bg-red-500 text-white px-3 py-1 rounded">Excluir</button>
        </div>
      `;
      container.appendChild(card);
    });

    container.querySelectorAll(".btn-delete-download").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        if (!confirm("Excluir download?")) return;
        await fetch(`/api/downloads/${id}`, { method: "DELETE" });
        showToast("Download excluído");
        carregarDownloads();
        carregarDashboard();
      });
    });
    container.querySelectorAll(".btn-edit-download").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        const { files = [] } = await fetch("/api/downloads").then(r => r.json());
        const d = files.find(f => f.id === id);
        if (!d) return showToast("Download não encontrado", false);
        abrirModalEdicaoDownload(d);
      });
    });
  }

  function abrirModalEdicaoDownload(d) {
    const modalId = "modal-download";
    let existing = document.getElementById(modalId);
    if (existing) existing.remove();
    const modal = document.createElement("div");
    modal.id = modalId;
    modal.className = "fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50";
    modal.innerHTML = `
      <div class="bg-white rounded shadow max-w-lg w-full p-6 relative">
        <h2 class="text-xl font-bold mb-4">Editar Download</h2>
        <div class="space-y-3">
          <div>
            <label class="block font-semibold">Nome</label>
            <input type="text" id="edit-download-name" value="${d.name}" class="w-full border px-2 py-1 rounded" />
          </div>
          <div>
            <label class="block font-semibold">URL</label>
            <input type="text" id="edit-download-url" value="${d.url}" class="w-full border px-2 py-1 rounded" />
          </div>
          <div>
            <label class="block font-semibold">Descrição</label>
            <textarea id="edit-download-desc" class="w-full border px-2 py-1 rounded">${d.description || ""}</textarea>
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button id="close-download-modal" class="px-4 py-2 border rounded">Cancelar</button>
          <button id="save-download-modal" class="px-4 py-2 bg-blue-600 text-white rounded">Salvar</button>
        </div>
        <button id="x-close-download" class="absolute top-2 right-2 text-gray-500">&times;</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector("#close-download-modal").addEventListener("click", () => modal.remove());
    modal.querySelector("#x-close-download").addEventListener("click", () => modal.remove());
    modal.querySelector("#save-download-modal").addEventListener("click", async () => {
      const updated = {
        name: document.getElementById("edit-download-name").value,
        url: document.getElementById("edit-download-url").value,
        description: document.getElementById("edit-download-desc").value
      };
      const res = await fetch(`/api/downloads/${d.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        showToast("Download salvo");
        carregarDownloads();
        carregarDashboard();
        modal.remove();
      } else {
        showToast("Erro ao salvar", false);
      }
    });
  }

  // Grupos
  async function carregarGrupos() {
    const res = await fetch("/api/groups");
    const grupos = await res.json();
    const container = document.getElementById("grupos-lista");
    container.innerHTML = "";
    grupos.forEach(g => {
      const div = document.createElement("div");
      div.className = "bg-white p-4 rounded shadow flex justify-between items-center";
      div.innerHTML = `
        <div>
          <div class="font-bold text-lg">${g.nome}</div>
          <div class="text-sm text-gray-500">${g.descricao || ""}</div>
        </div>
        <div class="flex gap-2">
          <button data-id="${g.id}" class="btn-edit-grupo bg-yellow-400 text-white px-3 py-1 rounded">Editar</button>
          <button data-id="${g.id}" class="btn-delete-grupo bg-red-500 text-white px-3 py-1 rounded">Excluir</button>
        </div>
      `;
      container.appendChild(div);
    });

    container.querySelectorAll(".btn-delete-grupo").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        if (!confirm("Excluir grupo?")) return;
        await fetch(`/api/groups/${id}`, { method: "DELETE" });
        showToast("Grupo excluído");
        carregarGrupos();
        carregarDashboard();
      });
    });
    container.querySelectorAll(".btn-edit-grupo").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        const grupos = await fetch("/api/groups").then(r => r.json());
        const g = grupos.find(gr => gr.id === id);
        if (!g) return showToast("Grupo não encontrado", false);
        abrirModalEdicaoGrupo(g);
      });
    });
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
        carregarGrupos();
        carregarDashboard();
        modal.remove();
      } else {
        showToast("Erro ao salvar", false);
      }
    });
  }

  // criação rápida
  document.getElementById("add-produto").addEventListener("click", async () => {
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
      carregarProdutos();
      carregarDashboard();
    } else {
      showToast("Falha ao criar produto", false);
    }
  });

  document.getElementById("add-download").addEventListener("click", async () => {
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
      carregarDownloads();
      carregarDashboard();
    } else {
      showToast("Falha ao criar download", false);
    }
  });

  document.getElementById("add-grupo").addEventListener("click", async () => {
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
      carregarGrupos();
      carregarDashboard();
    } else {
      showToast("Falha ao criar grupo", false);
    }
  });

  // inicial
  carregarDashboard();
  carregarProdutos();
  carregarDownloads();
  carregarGrupos();
});