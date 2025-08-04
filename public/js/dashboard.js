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
  // Rules
  const modalRule = document.getElementById('modal-rule');
  const formRule  = document.getElementById('form-rule');
  document.getElementById('new-rule-btn').addEventListener('click', () => openRuleModal());
  document.getElementById('cancel-rule').addEventListener('click', () => modalRule.classList.add('hidden'));
  formRule.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = {
      id: formRule['rule-id'].value.trim(),
      type: formRule['rule-type'].value,
      pattern: formRule['rule-pattern'].value.trim(),
      reply: formRule['rule-reply'].value.trim()
    };
    const url = isEditingRule
      ? `/api/admin/rules/${encodeURIComponent(editingRuleId)}`
      : '/api/admin/rules';
    await fetch(url, { method: isEditingRule ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    modalRule.classList.add('hidden');
    // Reload list
    carregarRegras();
  });

  function openRuleModal(rule = null) {
    if (rule) {
      isEditingRule = true;
      editingRuleId = rule.id;
      formRule['rule-id'].value = rule.id;
      formRule['rule-id'].disabled = true;
      formRule['rule-type'].value = rule.type;
      formRule['rule-pattern'].value = rule.pattern;
      formRule['rule-reply'].value = rule.reply;
    } else {
      isEditingRule = false; editingRuleId = null;
      formRule.reset(); formRule['rule-id'].disabled = false;
    }
    modalRule.classList.remove('hidden');
  }

  // Hooks
  const modalHook = document.getElementById('modal-hook');
  const formHook  = document.getElementById('form-hook');
  document.getElementById('new-hook-btn').addEventListener('click', () => openHookModal());
  document.getElementById('cancel-hook').addEventListener('click', () => modalHook.classList.add('hidden'));
  formHook.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = {
      id: formHook['hook-id'].value.trim(),
      url: formHook['hook-url'].value.trim(),
      headers: JSON.parse(formHook['hook-headers'].value)
    };
    const url = isEditingHook
      ? `/api/admin/webhooks/${encodeURIComponent(editingHookId)}`
      : '/api/admin/webhooks';
    await fetch(url, { method: isEditingHook ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    modalHook.classList.add('hidden');
    // Reload list
    carregarWebhooks();
  });

  function openHookModal(hook = null) {
    if (hook) {
      isEditingHook = true;
      editingHookId = hook.id;
      formHook['hook-id'].value = hook.id;
      formHook['hook-id'].disabled = true;
      formHook['hook-url'].value = hook.url;
      formHook['hook-headers'].value = JSON.stringify(hook.headers||{}, null, 2);
    } else {
      isEditingHook = false; editingHookId = null;
      formHook.reset(); formHook['hook-id'].disabled = false;
      formHook['hook-headers'].value = '{}';
    }
    modalHook.classList.remove('hidden');
  }

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
      const [pRes,gRes,dRes,aRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/groups'),
        fetch('/api/downloads'),
        fetch('/api/analytics')
      ]);
      const produtos = await pRes.json();
      const grupos   = await gRes.json();
      const downloads = await dRes.json();
      const analytics = await aRes.json();
      document.getElementById('total-produtos').textContent = produtos.length||0;
      document.getElementById('total-downloads').textContent = (downloads.files||[]).length;
      document.getElementById('total-grupos').textContent = grupos.length||0;
      document.getElementById('acessos-hoje').textContent = analytics.hoje||0;
      gerarGrafico(analytics.dias||[]);
    } catch (e) {
      console.error(e);
      showToast('Falha ao carregar dashboard',false);
    }
  }

  // ─── Produtos ─────────────────────────────────────────────────────────────────
  // ... Produtos unchanged ...

  // ─── Downloads ────────────────────────────────────────────────────────────────
  // ... Downloads unchanged ...

  // ─── Grupos ───────────────────────────────────────────────────────────────────
  async function carregarGrupos() {
    try {
      const res = await fetch('/api/groups');
      const grupos = await res.json();
      const cont = document.getElementById('grupos-lista');
      if (!cont) return;
      cont.innerHTML = '';

      grupos.forEach(g => {
        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded shadow mb-3 flex items-center gap-4';
        card.innerHTML = `
          <div class="flex-shrink-0">
            <div class="w-24 h-24 bg-gray-100 flex items-center justify-center mb-1">
              ${g.imagem ? `<img src="${normalizeImagem(g.imagem)}" alt="${g.nome}" class="object-contain w-full h-full">` : 'Sem imagem'}
            </div>
            <input type="file" data-type="grupo" data-id="${g.id}" class="upload-image-input mb-1" accept="image/*" />
            <input type="text" value="${g.imagem||''}" data-field="imagem" data-id="${g.id}" class="inline-input border px-2 py-1 rounded w-full" placeholder="Imagem caminho" />
          </div>
          <div class="flex-1">
            <h3 class="font-bold text-lg">${g.nome}</h3>
            <p class="text-sm text-gray-500">${g.descricao||''}</p>
          </div>
          <div class="flex flex-col gap-2">
            <button data-id="${g.id}" class="btn-save-grupo px-3 py-1 bg-blue-500 text-white rounded text-sm">Salvar</button>
            <button data-id="${g.id}" class="btn-edit-grupo px-3 py-1 bg-yellow-400 text-white rounded text-sm">Editar</button>
            <button data-id="${g.id}" class="btn-delete-grupo px-3 py-1 bg-red-500 text-white rounded text-sm">Excluir</button>
          </div>
        `;
        cont.appendChild(card);
      });

      window.grupos = grupos;

      // Upload imagem inline
      cont.querySelectorAll('input[type=file][data-type=grupo]').forEach(inp => {
        inp.addEventListener('change', async e => {
          const file = e.target.files[0];
          if (!file) return;
          const id = e.target.dataset.id;
          const form = new FormData(); form.append('image', file); form.append('type','grupo'); form.append('id', id);
          try {
            const up = await fetch('/api/upload-image',{ method:'POST', body: form });
            const info = await up.json();
            if (info.success) {
              await fetch(`/api/groups/${id}`,{ method:'PUT', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ imagem: info.filename }) });
              showToast('Imagem atualizada'); carregarGrupos(); carregarDashboard();
            } else showToast(info.error||'Erro upload',false);
          } catch {
            showToast('Erro rede',false);
          }
        });
      });

      // Inline Save
      cont.querySelectorAll('.btn-save-grupo').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const imgVal = document.querySelector(`input[data-field=imagem][data-id=${id}]`).value.trim();
          if (!imgVal) { showToast('Nada para salvar',false); return; }
          try {
            const res = await fetch(`/api/groups/${id}`,{
              method: 'PUT', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ imagem: imgVal })
            });
            if (res.ok) { showToast('Grupo salvo'); carregarGrupos(); carregarDashboard(); }
            else showToast('Erro salvar',false);
          } catch {
            showToast('Erro rede',false);
          }
        });
      });

      // Edit
      cont.querySelectorAll('.btn-edit-grupo').forEach(btn => btn.addEventListener('click', () => abrirModalEdicaoGrupo(grupos.find(x=>x.id===btn.dataset.id))));
      // Delete
      cont.querySelectorAll('.btn-delete-grupo').forEach(btn => btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (!confirm('Excluir grupo?')) return;
        await fetch(`/api/groups/${id}`,{ method:'DELETE' });
        showToast('Grupo excluído'); carregarGrupos(); carregarDashboard();
      }));
    } catch {
      showToast('Falha grupos',false);
    }
  }

  // ─── Regras ─────────────────────────────────────────────────────────────────────
  async function carregarRegras() {
    const cont = document.getElementById('rules-lista');
    if (!cont) { loadRules(); return; }
    try {
      const res = await fetch('/api/admin/rules');
      const regras = await res.json();
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
          </div>
        `;
        cont.appendChild(div);
      });
      window.rules = regras;
      // Edit
      cont.querySelectorAll('.btn-edit-regra').forEach(btn => btn.addEventListener('click', () => {
        const id = btn.closest('[data-id]').dataset.id;
        const rule = regras.find(x => x.id === id);
        if (rule) openRuleModal(rule);
      }));
      // Delete
      cont.querySelectorAll('.btn-delete-regra').forEach(btn => btn.addEventListener('click', async () => {
        const id = btn.closest('[data-id]').dataset.id;
        if (!confirm(`Excluir regra "${id}"?`)) return;
        await fetch(`/api/admin/rules/${id}`,{ method: 'DELETE' });
        showToast('Regra excluída'); carregarRegras();
      }));
    } catch {
      showToast('Falha regras',false);
    }
  }

  // ─── Webhooks ──────────────────────────────────────────────────────────────────
  async function carregarWebhooks() {
    const cont = document.getElementById('hooks-lista');
    if (!cont) { loadHooks(); return; }
    try {
      const res = await fetch('/api/admin/webhooks');
      const hooks = await res.json();
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
          </div>
        `;
        cont.appendChild(div);
      });
      window.hooks = hooks;
      // Edit
      cont.querySelectorAll('.btn-edit-hook').forEach(btn => btn.addEventListener('click', () => {
        const id = btn.closest('[data-id]').dataset.id;
        const hook = hooks.find(x => x.id === id);
        if (hook) openHookModal(hook);
      }));
      // Delete
      cont.querySelectorAll('.btn-delete-hook').forEach(btn => btn.addEventListener('click', async () => {
        const id = btn.closest('[data-id]').dataset.id;
        if (!confirm(`Excluir webhook "${id}"?`)) return;
        await fetch(`/api/admin/webhooks/${id}`,{ method: 'DELETE' });
        showToast('Webhook excluído'); carregarWebhooks();
      }));
    } catch {
      showToast('Falha webhooks',false);
    }
  }

  // ─── Initialization ─────────────────────────────────────────────────────────────
  carregarDashboard();
  carregarProdutos();
  carregarDownloads();
  carregarGrupos();
  carregarRegras();
  carregarWebhooks();
});
