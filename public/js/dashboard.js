
// dashboard.js

document.addEventListener("DOMContentLoaded", () => {
  // Quick creation button activation
  ['produto','download','grupo'].forEach(type => {
    const btn = document.getElementById(`new-${type}-btn`);
    if (btn) { 
      btn.disabled = false; 
      btn.classList.remove('opacity-50');
    }
  });

  // ─── Variables ───────────────────────────────────────────────────────────────
  let chartInstance = null;
  let isEditingRule = false, editingRuleId = null;
  let isEditingHook = false, editingHookId = null;

  // ─── Helper Functions ──────────────────────────────────────────────────────────
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
    setTimeout(() => toastEl.style.opacity = "0", 2200);
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

  function gerarGrafico(dados) {
    const canvas = document.getElementById("grafico-acessos");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: dados.map(d => d.dia),
        datasets: [{ label: "Acessos", data: dados.map(d => d.total), tension: 0.3, fill: true, borderColor: "#2563eb", backgroundColor: "rgba(37,99,235,0.2)" }]
      },
      options: { scales: { y: { beginAtZero: true } } }
    });
  }

// ─── Modal Setup ────────────────────────────────────────────────────────────────
  // Regra
  const modalRule = document.getElementById('modal-rule');
  const formRule  = document.getElementById('form-rule');
  document.getElementById('new-rule-btn')
    .addEventListener('click', () => openRuleModal());
  document.getElementById('cancel-rule')
    .addEventListener('click', () => modalRule.classList.add('hidden'));
  formRule.addEventListener('submit', async e => { /* ... */ });

  // Webhook
  const modalHook = document.getElementById('modal-hook');
  const formHook  = document.getElementById('form-hook');
  document.getElementById('new-hook-btn')
    .addEventListener('click', () => openHookModal());
  document.getElementById('cancel-hook')
    .addEventListener('click', () => modalHook.classList.add('hidden'));
  formHook.addEventListener('submit', async e => { /* ... */ });

  // Produto
  const modalProduto = document.getElementById('modal-produto');
  const formProduto  = document.getElementById('form-produto');
  document.getElementById('new-produto-btn')
    .addEventListener('click', () => modalProduto.classList.remove('hidden'));
  document.getElementById('cancel-produto')
    .addEventListener('click', () => modalProduto.classList.add('hidden'));
  formProduto.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = {
      nome: formProduto['produto-nome'].value.trim(),
      descricao: formProduto['produto-descricao'].value.trim(),
      preco: parseFloat(formProduto['produto-preco'].value)
    };
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Produto criado');
        modalProduto.classList.add('hidden');
        carregarProdutos(); carregarDashboard();
      } else showToast('Erro ao criar produto', false);
    } catch {
      showToast('Erro de rede', false);
    }
  });

  // Download
  const modalDownload = document.getElementById('modal-download');
  const formDownload  = document.getElementById('form-download');
  document.getElementById('new-download-btn')
    .addEventListener('click', () => modalDownload.classList.remove('hidden'));
  document.getElementById('cancel-download')
    .addEventListener('click', () => modalDownload.classList.add('hidden'));
  formDownload.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = {
      nome: formDownload['download-nome'].value.trim(),
      url: formDownload['download-url'].value.trim()
    };
    try {
      const res = await fetch('/api/downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('App criado');
        modalDownload.classList.add('hidden');
        carregarDownloads(); carregarDashboard();
      } else showToast('Erro ao criar app', false);
    } catch {
      showToast('Erro de rede', false);
    }
  });

  // Grupo
  const modalGrupo = document.getElementById('modal-grupo');
  const formGrupo  = document.getElementById('form-grupo');
  document.getElementById('new-grupo-btn')
    .addEventListener('click', () => modalGrupo.classList.remove('hidden'));
  document.getElementById('cancel-grupo')
    .addEventListener('click', () => modalGrupo.classList.add('hidden'));
  formGrupo.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = { nome: formGrupo['grupo-nome'].value.trim() };
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Grupo criado');
        modalGrupo.classList.add('hidden');
        carregarGrupos(); carregarDashboard();
      } else showToast('Erro ao criar grupo', false);
    } catch {
      showToast('Erro de rede', false);
    }
  });

  // ─── Tab Switching ──────────────────────────────────────────────────────────────
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.replace('bg-blue-500','bg-gray-300') && b.classList.remove('text-white'));
      btn.classList.replace('bg-gray-300','bg-blue-500'); btn.classList.add('text-white');
      document.querySelectorAll('.tab-section').forEach(sec => sec.classList.add('hidden'));
      const target = btn.dataset.tab;
      document.getElementById('tab-'+target).classList.remove('hidden');
      switch(target) {
        case 'dashboard': carregarDashboard(); break;
        case 'produtos': carregarProdutos(); break;
        case 'downloads': carregarDownloads(); break;
        case 'grupos': carregarGrupos(); break;
        case 'regras': carregarRegras(); break;
        case 'webhooks': carregarWebhooks(); break;
      }
    });
  });

  // ─── Dashboard ─────────────────────────────────────────────────────────────────
  async function carregarDashboard() {
    try {
      const [pRes,gRes,dRes,aRes] = await Promise.all([fetch('/api/products'),fetch('/api/groups'),fetch('/api/downloads'),fetch('/api/analytics')]);
      const produtos = await pRes.json(), grupos = await gRes.json(), downloads = await dRes.json(), analytics = await aRes.json();
      document.getElementById('total-produtos').textContent = produtos.length||0;
      document.getElementById('total-downloads').textContent = (downloads.files||[]).length;
      document.getElementById('total-grupos').textContent = grupos.length||0;
      document.getElementById('acessos-hoje').textContent = analytics.hoje||0;
      gerarGrafico(analytics.dias||[]);
    } catch (e) { console.error(e); showToast('Falha ao carregar dashboard',false); }
  }

  // ─── Produtos ─────────────────────────────────────────────────────────────────
  async function carregarProdutos() {
    try {
      const res = await fetch('/api/products');
      const produtos = await res.json();
      const cont = document.getElementById('produtos-lista');
      cont.innerHTML = '';
      produtos.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card bg-white p-4 rounded shadow mb-3';
        card.innerHTML = `
          <div class="flex items-start gap-4">
            <div class="w-24 h-24 bg-gray-100 flex items-center justify-center mb-2">
              ${p.imagem?`<img src="${normalizeImagem(p.imagem)}" alt="${p.nome}" class="object-contain w-full h-full">`:'Sem imagem'}
            </div>
            <div class="flex-1">
              <h3 class="font-bold text-lg mb-1">${p.nome}</h3>
              <p class="text-sm text-gray-500 mb-1">${p.descricao||''}</p>
              <p class="text-green-600 font-semibold mb-2">R$ ${p.preco||'0,00'}</p>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input type="file" data-type="produto" data-id="${p.id}" class="inline-file border px-2 py-1 rounded" />
                <input type="text" value="${p.imagem||''}" data-field="imagem" data-id="${p.id}" class="inline-input border px-2 py-1 rounded" placeholder="Imagem">
                <input type="text" value="${p.link||''}" data-field="link" data-id="${p.id}" class="inline-input border px-2 py-1 rounded" placeholder="Link">
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <button data-id="${p.id}" class="btn-save-produto px-3 py-1 bg-blue-500 text-white rounded text-sm">Salvar</button>
              <button data-id="${p.id}" class="btn-edit-produto px-3 py-1 bg-yellow-400 text-white rounded text-sm">Editar</button>
              <button data-id="${p.id}" class="btn-delete-produto px-3 py-1 bg-red-500 text-white rounded text-sm">Excluir</button>
            </div>
          </div>`;
        cont.appendChild(card);
      });
      window.produtos = produtos;

      // Upload actions
      cont.querySelectorAll('input[type=file][data-type=produto]').forEach(inp => {
        inp.addEventListener('change', async e => {
          const file = e.target.files[0];
          if (!file) return;
          const id = e.target.dataset.id;
          const form = new FormData();
          form.append('image', file);
          form.append('type', 'produto');
          form.append('id', id);
          try {
            const up = await fetch('/api/upload-image', { method: 'POST', body: form });
            const info = await up.json();
            if (info.success) {
              await fetch(`/api/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imagem: info.filename })
              });
              showToast('Imagem atualizada');
              carregarProdutos();
              carregarDashboard();
            } else showToast(info.error||'Erro upload', false);
          } catch {
            showToast('Erro de rede', false);
          }
        });
      });

      // Inline Save
      cont.querySelectorAll('.btn-save-produto').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const img = document.querySelector(`input[data-field=imagem][data-id="${id}"]`).value.trim();
          const link = document.querySelector(`input[data-field=link][data-id="${id}"]`).value.trim();
          const upd = {};
          if (img) upd.imagem = img;
          if (link) upd.link = link;
          if (!Object.keys(upd).length) { showToast('Nada para salvar', false); return; }
          try {
            const res = await fetch(`/api/products/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(upd)
            });
            if (res.ok) {
              showToast('Produto salvo');
              carregarProdutos();
              carregarDashboard();
            } else showToast('Erro salvar', false);
          } catch {
            showToast('Erro rede', false);
          }
        });
      });

    } catch {
      showToast('Falha produtos', false);
    }
  }

  // ─── Downloads ────────────────────────────────────────────────────────────────
  async function carregarDownloads() {
    try {
      const res = await fetch('/api/downloads');
      const data = await res.json();
      const cont = document.getElementById('downloads-lista');
      cont.innerHTML = '';
      const files = data.files||[];

      files.forEach(d => {
        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded shadow mb-3';
        card.innerHTML = `
          <div class="flex items-start gap-4">
            <div class="w-24 h-24 bg-gray-100 flex items-center justify-center mb-2">
              ${d.imagem?`<img src="${normalizeImagem(d.imagem)}" alt="${d.name}" class="object-contain w-full h-full">`:'Sem imagem'}
            </div>
            <div class="flex-1">
              <h3 class="font-bold text-lg mb-1">${d.name}</h3>
              <p class="text-sm text-gray-500 mb-1">${d.description||''}</p>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input type="file" data-type="download" data-id="${d.id}" class="inline-file border px-2 py-1 rounded" />
                <input type="text" data-field="url" data-id="${d.id}" class="inline-input border px-2 py-1 rounded" placeholder="URL" value="${d.url||''}">
                <input type="text" data-field="imagem" data-id="${d.id}" class="inline-input border px-2 py-1 rounded" placeholder="Imagem" value="${d.imagem||''}">
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <button data-id="${d.id}" class="btn-save-download px-3 py-1 bg-blue-500 text-white rounded text-sm">Salvar</button>
              <button data-id="${d.id}" class="btn-edit-download px-3 py-1 bg-yellow-400 text-white rounded text-sm">Editar</button>
              <button data-id="${d.id}" class="btn-delete-download px-3 py-1 bg-red-500 text-white rounded text-sm">Excluir</button>
            </div>
          </div>`;
        cont.appendChild(card);
      });

      window.downloads = files;

      // Upload
      cont.querySelectorAll('input[type=file][data-type=download]').forEach(inp => {
        inp.addEventListener('change', async e => {
          const file = e.target.files[0];
          if (!file) return;
          const id = e.target.dataset.id;
          const form = new FormData();
          form.append('image', file);
          form.append('type', 'download');
          form.append('id', id);
          try {
            const up = await fetch('/api/upload-image', { method: 'POST', body: form });
            const info = await up.json();
            if (info.success) {
              await fetch(`/api/downloads/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imagem: info.filename })
              });
              showToast('Imagem atualizada');
              carregarDownloads();
              carregarDashboard();
            } else showToast(info.error||'Erro upload', false);
          } catch {
            showToast('Erro rede', false);
          }
        });
      });

      // Inline Save
      cont.querySelectorAll('.btn-save-download').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const url = document.querySelector(`input[data-field=url][data-id="${id}"]`).value.trim();
          const img = document.querySelector(`input[data-field=imagem][data-id="${id}"]`).value.trim();
          const upd = {};
          if (url) upd.url = url;
          if (img) upd.imagem = img;
          try {
            const res = await fetch(`/api/downloads/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(upd)
            });
            if (res.ok) {
              showToast('Download salvo');
              carregarDownloads();
              carregarDashboard();
            } else showToast('Erro salvar', false);
          } catch {
            showToast('Erro rede', false);
          }
        });
      });

    } catch {
      showToast('Falha downloads', false);
    }
  }

  // ─── Grupos ───────────────────────────────────────────────────────────────────
  async function carregarGrupos() {
    try {
      const res = await fetch('/api/groups');
      const grupos = await res.json();
      const cont = document.getElementById('grupos-lista');
      cont.innerHTML = '';
      grupos.forEach(g => {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between p-2 border-b';
        div.dataset.id = g.id;
        div.innerHTML = `
          <div class="flex items-center gap-3">
            <div class="w-24 h-24 bg-gray-100 flex items-center justify-center">
              ${g.imagem?`<img src="${normalizeImagem(g.imagem)}" alt="${g.nome}" class="object-contain w-full h-full">`:'Sem imagem'}
            </div>
            <div>
              <h3 class="font-bold">${g.nome}</h3>
              <p class="text-sm text-gray-500">${g.descricao||''}</p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input type="file" data-type="grupo" data-id="${g.id}" class="inline-file border px-2 py-1 rounded" />
                <input type="text" value="${g.imagem||''}" data-field="imagem" data-id="${g.id}" class="inline-input border px-2 py-1 rounded" placeholder="Imagem">
              </div>
            </div>
          </div>
          <div class="flex gap-2">
            <button class="btn-save-grupo px-2 py-1 border rounded text-sm">Salvar</button>
            <button class="btn-edit-grupo px-2 py-1 border rounded text-sm">Editar</button>
            <button class="btn-delete-grupo px-2 py-1 border rounded text-sm">Excluir</button>
          </div>`;
        cont.appendChild(div);
      });
      window.grupos = grupos;

      // Upload imagem
      cont.querySelectorAll('input[type=file][data-type=grupo]').forEach(inp => {
        inp.addEventListener('change', async e => {
          const file = e.target.files[0];
          if (!file) return;
          const id = e.target.dataset.id;
          const form = new FormData();
          form.append('image', file);
          form.append('type', 'grupo');
          form.append('id', id);
          try {
            const up = await fetch('/api/upload-image', { method: 'POST', body: form });
            const info = await up.json();
            if (info.success) {
              await fetch(`/api/groups/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imagem: info.filename })
              });
              showToast('Imagem atualizado');
              carregarGrupos();
              carregarDashboard();
            } else showToast('Erro upload', false);
          } catch {
            showToast('Erro rede', false);
          }
        });
      });

      // Inline Save
      cont.querySelectorAll('.btn-save-grupo').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.closest('[data-id]').dataset.id;
          const g = grupos.find(x => x.id === id);
          const img = g.imagem;
          try {
            const res = await fetch(`/api/groups/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imagem: img })
            });
            if (res.ok) {
              showToast('Grupo salvo');
              carregarGrupos();
              carregarDashboard();
            } else showToast('Erro salvar', false);
          } catch {
            showToast('Erro rede', false);
          }
        });
      });

    } catch {
      showToast('Falha grupos', false);
    }
  }

  // ─── Regras ─────────────────────────────────────────────────────────────────────
  async function carregarRegras() {
    try {
      const res = await fetch('/api/admin/rules');
      const regras = await res.json();
      const cont = document.getElementById('rules-lista');
      cont.innerHTML = '';
      regras.forEach(r => {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between p-2 border-b';
        div.dataset.id = r.id;
        div.innerHTML = `
          <div><strong>${r.id}</strong> — ${r.type} <code>${r.pattern}</code> → "${r.reply}"</div>
          <div class="flex gap-2">
            <button class="btn-edit-regra px-2 py-1 border rounded text-sm">Editar</button>
            <button class="btn-delete-regra px-2 py-1 border rounded text-sm">Excluir</button>
          </div>`;
        cont.appendChild(div);
      });
      window.rules = regras;
      cont.querySelectorAll('.btn-edit-regra').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.closest('[data-id]').dataset.id;
          const r = regras.find(x => x.id === id);
          if (r) openRuleModal(r);
        });
      });
      cont.querySelectorAll('.btn-delete-regra').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.closest('[data-id]').dataset.id;
          if (!confirm(`Excluir regra "${id}"?`)) return;
          await fetch(`/api/admin/rules/${id}`, { method: 'DELETE' });
          carregarRegras();
          showToast('Regra excluída');
        });
      });
    } catch {
      showToast('Falha regras', false);
    }
  }

  // ─── Webhooks ──────────────────────────────────────────────────────────────────
  async function carregarWebhooks() {
    try {
      const res = await fetch('/api/admin/webhooks');
      const hooks = await res.json();
      const cont = document.getElementById('hooks-lista');
      cont.innerHTML = '';
      hooks.forEach(h => {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between p-2 border-b';
        div.dataset.id = h.id;
        div.innerHTML = `
          <div><strong>${h.id}</strong> → ${h.url} <small>${JSON.stringify(h.headers)}</small></div>
          <div class="flex gap-2">
            <button class="btn-edit-hook px-2 py-1 border rounded text-sm">Editar</button>
            <button class="btn-delete-hook px-2 py-1 border rounded text-sm">Excluir</button>
          </div>`;
        cont.appendChild(div);
      });
      window.hooks = hooks;
      cont.querySelectorAll('.btn-edit-hook').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.closest('[data-id]').dataset.id;
          const h = hooks.find(x => x.id === id);
          if (h) openHookModal(h);
        });
      });
      cont.querySelectorAll('.btn-delete-hook').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.closest('[data-id]').dataset.id;
          if (!confirm(`Excluir webhook "${id}"?`)) return;
          await fetch(`/api/admin/webhooks/${id}`, { method: 'DELETE' });
          carregarWebhooks();
          showToast('Webhook excluído');
        });
      });
    } catch {
      showToast('Falha webhooks', false);
    }
  }

  // Initialization
  carregarDashboard();
  carregarProdutos();
  carregarDownloads();
  carregarGrupos();
  carregarRegras();
  carregarWebhooks();
});