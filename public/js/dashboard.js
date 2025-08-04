// dashboard.js

document.addEventListener("DOMContentLoaded", () => {
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
    if (im.startsWith("http") || im.startsWith("/")) return im;
    return "/img/" + im.replace(/^\/?img\//, "");
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
        datasets: [{ label: "Acessos", data: dados.map(d => d.total), fill: true, tension: 0.3, borderColor: "#2563eb", backgroundColor: "rgba(37,99,235,0.2)" }]
      },
      options: { scales: { y: { beginAtZero: true } } }
    });
  }

  // ─── Modal Setup (Rules & Hooks) ───────────────────────────────────────────────
  const modalRule = document.getElementById('modal-rule');
  const formRule  = document.getElementById('form-rule');
  document.getElementById('new-rule-btn').addEventListener('click', () => openRuleModal());
  document.getElementById('cancel-rule').addEventListener('click', () => modalRule.classList.add('hidden'));
  formRule.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = {
      id:      formRule['rule-id'].value.trim(),
      type:    formRule['rule-type'].value,
      pattern: formRule['rule-pattern'].value.trim(),
      reply:   formRule['rule-reply'].value.trim()
    };
    const url = isEditingRule
      ? `/api/admin/rules/${encodeURIComponent(editingRuleId)}`
      : '/api/admin/rules';
    await fetch(url, { method: isEditingRule ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    modalRule.classList.add('hidden');
    carregarRegras();
  });

  function openRuleModal(rule = null) {
    if (rule) {
      isEditingRule = true;
      editingRuleId = rule.id;
      formRule['rule-id'].value    = rule.id;
      formRule['rule-id'].disabled = true;
      formRule['rule-type'].value    = rule.type;
      formRule['rule-pattern'].value = rule.pattern;
      formRule['rule-reply'].value   = rule.reply;
    } else {
      isEditingRule = false;
      editingRuleId = null;
      formRule.reset();
      formRule['rule-id'].disabled = false;
    }
    modalRule.classList.remove('hidden');
  }

  const modalHook = document.getElementById('modal-hook');
  const formHook  = document.getElementById('form-hook');
  document.getElementById('new-hook-btn').addEventListener('click', () => openHookModal());
  document.getElementById('cancel-hook').addEventListener('click', () => modalHook.classList.add('hidden'));
  formHook.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = {
      id:      formHook['hook-id'].value.trim(),
      url:     formHook['hook-url'].value.trim(),
      headers: JSON.parse(formHook['hook-headers'].value)
    };
    const url = isEditingHook
      ? `/api/admin/webhooks/${encodeURIComponent(editingHookId)}`
      : '/api/admin/webhooks';
    await fetch(url, { method: isEditingHook ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    modalHook.classList.add('hidden');
    carregarWebhooks();
  });

  function openHookModal(hook = null) {
    if (hook) {
      isEditingHook = true;
      editingHookId = hook.id;
      formHook['hook-id'].value    = hook.id;
      formHook['hook-id'].disabled = true;
      formHook['hook-url'].value   = hook.url;
      formHook['hook-headers'].value = JSON.stringify(hook.headers||{}, null, 2);
    } else {
      isEditingHook = false;
      editingHookId = null;
      formHook.reset();
      formHook['hook-id'].disabled   = false;
      formHook['hook-headers'].value = '{}';
    }
    modalHook.classList.remove('hidden');
  }

  // ─── Tab Switching ──────────────────────────────────────────────────────────────
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => { b.classList.replace('bg-blue-500','bg-gray-300'); b.classList.remove('text-white'); });
      btn.classList.replace('bg-gray-300','bg-blue-500'); btn.classList.add('text-white');
      document.querySelectorAll('.tab-section').forEach(sec => sec.classList.add('hidden'));
      const target = btn.dataset.tab;
      document.getElementById('tab-'+target).classList.remove('hidden');
      switch(target) {
        case 'dashboard': carregarDashboard(); break;
        case 'produtos':  carregarProdutos();  break;
        case 'downloads': carregarDownloads(); break;
        case 'grupos':    carregarGrupos();    break;
        case 'regras':    carregarRegras();    break;
        case 'webhooks':  carregarWebhooks();  break;
      }
    });
  });

  // ─── Dashboard ─────────────────────────────────────────────────────────────────
  async function carregarDashboard() {
    try {
      const [pRes, gRes, dRes, aRes] = await Promise.all([
        fetch('/api/products'), fetch('/api/groups'), fetch('/api/downloads'), fetch('/api/analytics')
      ]);
      const produtos  = await pRes.json();
      const grupos    = await gRes.json();
      const downloads = await dRes.json();
      const analytics = await aRes.json();
      document.getElementById('total-produtos').textContent  = produtos.length||0;
      document.getElementById('total-downloads').textContent = (downloads.files||[]).length;
      document.getElementById('total-grupos').textContent    = grupos.length||0;
      document.getElementById('acessos-hoje').textContent    = analytics.hoje||0;
      gerarGrafico(analytics.dias||[]);
    } catch (e) {
      console.error(e);
      showToast('Falha ao carregar dashboard', false);
    }
  }

  // ─── Produtos ─────────────────────────────────────────────────────────────────
  async function carregarProdutos() {
    const cont = document.getElementById('produtos-lista');
    if (!cont) return;
    try {
      const produtos = await (await fetch('/api/products')).json();
      cont.innerHTML = '';
      produtos.forEach(p => {
        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded shadow mb-3 flex items-start gap-4';
        card.innerHTML = `
          <div class="text-center">
            <div class="w-24 h-24 bg-gray-100 flex items-center justify-center mb-2">${p.imagem?`<img src="${normalizeImagem(p.imagem)}" alt="${p.nome}" class="object-contain w-full h-full">`:'Sem imagem'}</div>
            <input type="file" data-type="produto" data-id="${p.id}" accept="image/*" class="mb-1" />
            <input type="text" data-field="imagem" data-id="${p.id}" value="${p.imagem||''}" placeholder="Caminho/imagem" class="inline-input border px-2 py-1 rounded w-full" />
          </div>
          <div class="flex-1">
            <h3 class="font-bold text-lg mb-1">${p.nome}</h3>
            <p class="text-sm text-gray-500 mb-1">${p.descricao||''}</p>
            <p class="text-green-600 font-semibold mb-2">R$ ${p.preco||'0,00'}</p>
            <input type="text" data-field="link" data-id="${p.id}" value="${p.link||''}" placeholder="Link de download" class="inline-input border px-2 py-1 rounded w-full" />
          </div>
          <div class="flex flex-col gap-2">
            <button data-id="${p.id}" class="btn-save-produto bg-blue-500 text-white px-3 py-1 rounded text-sm">Salvar</button>
            <button data-id="${p.id}" class="btn-edit-produto bg-yellow-400 text-white px-3 py-1 rounded text-sm">Editar</button>
            <button data-id="${p.id}" class="btn-delete-produto bg-red-500 text-white px-3 py-1 rounded text-sm">Excluir</button>
          </div>
        `;
        cont.appendChild(card);
      });
      window.produtos = produtos;

      // Upload and Inline Save
      cont.querySelectorAll('input[type=file][data-type="produto"]').forEach(input => {
        input.addEventListener('change', async e => {
          const file = e.target.files[0]; if (!file) return;
          const id = e.target.dataset.id;
          const form = new FormData(); form.append('image', file); form.append('type','produto'); form.append('id', id);
          try {
            const up = await fetch('/api/upload-image',{ method:'POST', body: form });
            const info = await up.json();
            if(info.success) {
              await fetch(`/api/products/${id}`,{ method:'PUT', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ imagem: info.filename }) });
              showToast('Imagem atualizada'); carregarProdutos(); carregarDashboard();
            } else showToast(info.error||'Erro upload',false);
          } catch { showToast('Erro rede',false); }
        });
      });
      cont.querySelectorAll('.btn-save-produto').forEach(btn => btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const payload = {};
        const img = document.querySelector(`input[data-field=imagem][data-id="${id}"]`).value.trim(); if(img) payload.imagem = img;
        const link = document.querySelector(`input[data-field=link][data-id="${id}"]`).value.trim(); if(link) payload.link = link;
        if(!Object.keys(payload).length) { showToast('Nada para salvar',false); return; }
        try {
          const res = await fetch(`/api/products/${id}`,{ method:'PUT', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
          if(res.ok) { showToast('Produto salvo'); carregarProdutos(); carregarDashboard(); } else showToast('Erro salvar',false);
        } catch { showToast('Erro rede',false); }
      }));

      // Edit / Delete
      cont.querySelectorAll('.btn-edit-produto').forEach(btn => btn.addEventListener('click', () => abrirModalEdicaoProduto(produtos.find(p => p.id === btn.dataset.id))));
      cont.querySelectorAll('.btn-delete-produto').forEach(btn => btn.addEventListener('click', async () => {
        if(!confirm('Excluir produto?')) return;
        await fetch(`/api/products/${btn.dataset.id}`,{ method:'DELETE' });
        showToast('Produto excluído'); carregarProdutos(); carregarDashboard();
      }));

      // Quick-create button
      document.getElementById('add-produto')?.addEventListener('click', async () => {
        const novo = { id: `prod-${Date.now()}`, nome: 'Novo Produto', descricao:'', preco:'0,00', imagem:'', link:'', grupo:'', desconto:0 };
        const res = await fetch('/api/products',{ method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(novo) });
        if(res.ok) { showToast('Produto criado'); carregarProdutos(); carregarDashboard(); }
      });

    } catch { showToast('Falha ao carregar produtos',false); }
  }

  function abrirModalEdicaoProduto(p) { /* unchanged */ }

  // ─── Downloads ────────────────────────────────────────────────────────────────
  async function carregarDownloads() { /* similar inline file+save + quick-create add-download */ }

  // ─── Grupos ───────────────────────────────────────────────────────────────────
  async function carregarGrupos() { /* similar inline file+save + quick-create add-grupo */ }

  // ─── Regras and Webhooks ───────────────────────────────────────────────────────
  async function carregarRegras() { /* unchanged */ }
  async function carregarWebhooks() { /* unchanged */ }

  // ─── Initialization ─────────────────────────────────────────────────────────────
  carregarDashboard(); carregarProdutos(); carregarDownloads(); carregarGrupos(); carregarRegras(); carregarWebhooks();
});