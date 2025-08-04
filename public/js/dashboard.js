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
    setTimeout(() => { toastEl.style.opacity = "0"; }, 2200);
  }

  function normalizeImagem(im) {
    if (!im) return "";
    if (/^(https?:|\/)/?/.test(im)) {
      if (im.startsWith('/img/')) return im;
      return im.startsWith('/') ? im : '/' + im;
    }
    return '/img/' + im.replace(/^\/?img\//, '');
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

  // ─── Modal Setup ────────────────────────────────────────────────────────────────
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
    const url = isEditingRule ? `/api/admin/rules/${encodeURIComponent(editingRuleId)}` : '/api/admin/rules';
    await fetch(url, { method: isEditingRule ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    modalRule.classList.add('hidden');
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
    const url = isEditingHook ? `/api/admin/webhooks/${encodeURIComponent(editingHookId)}` : '/api/admin/webhooks';
    await fetch(url, { method: isEditingHook ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    modalHook.classList.add('hidden');
    carregarWebhooks();
  });

  function openHookModal(hook = null) {
    if (hook) {
      isEditingHook = true;
      editingHookId = hook.id;
      formHook['hook-id'].value = hook.id;
      formHook['hook-id'].disabled = true;
      formHook['hook-url'].value = hook.url;
      formHook['hook-headers'].value = JSON.stringify(hook.headers || {}, null, 2);
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
      document.querySelectorAll('.tab-btn').forEach(b => { b.classList.replace('bg-blue-500','bg-gray-300'); b.classList.remove('text-white'); });
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
        fetch('/api/products'), fetch('/api/groups'), fetch('/api/downloads'), fetch('/api/analytics')
      ]);
      const produtos = await pRes.json();
      const grupos = await gRes.json();
      const downloads = await dRes.json();
      const analytics = await aRes.json();
      document.getElementById('total-produtos').textContent = produtos.length || 0;
      document.getElementById('total-downloads').textContent = (downloads.files || []).length;
      document.getElementById('total-grupos').textContent = grupos.length || 0;
      document.getElementById('acessos-hoje').textContent = analytics.hoje || 0;
      gerarGrafico(analytics.dias || []);
    } catch (e) {
      console.error(e);
      showToast('Falha ao carregar dashboard', false);
    }
  }

  // ─── Produtos ─────────────────────────────────────────────────────────────────
  async function carregarProdutos() {
    try {
      const res = await fetch('/api/products');
      const produtos = await res.json();
      const cont = document.getElementById('produtos-lista');
      if (!cont) return;
      cont.innerHTML = '';

      produtos.forEach(p => {
        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded shadow mb-3 flex items-start gap-4';
        card.innerHTML = `
          <div class="flex-shrink-0 text-center">
            <div class="w-24 h-24 bg-gray-100 flex items-center justify-center mb-2">
              ${p.imagem
                ? `<img src="${normalizeImagem(p.imagem)}" alt="${p.nome}" class="object-contain w-full h-full">`
                : 'Sem imagem'}
            </div>
            <input type="file" data-type="produto" data-id="${p.id}" accept="image/*" class="mb-1" />
            <input type="text" data-field="imagem" data-id="${p.id}" value="${p.imagem || ''}" placeholder="Caminho/imagem" class="inline-input border px-2 py-1 rounded w-full" />
          </div>
          <div class="flex-1">
            <h3 class="font-bold text-lg mb-1">${p.nome}</h3>
            <p class="text-sm text-gray-500 mb-1">${p.descricao || ''}</p>
            <p class="text-green-600 font-semibold mb-2">R$ ${p.preco || '0,00'}</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input type="text" data-field="link" data-id="${p.id}" value="${p.link || ''}" placeholder="Link de download" class="inline-input border px-2 py-1 rounded w-full" />
            </div>
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

      // Upload image
      cont.querySelectorAll('input[type=file][data-type="produto"]').forEach(input => {
        input.addEventListener('change', async e => {
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
              await fetch(`/api/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imagem: info.filename }) });
              showToast('Imagem atualizada');
              carregarProdutos(); carregarDashboard();
            } else showToast(info.error || 'Erro upload', false);
          } catch {
            showToast('Erro rede', false);
          }
        });
      });

      // Inline save
      cont.querySelectorAll('.btn-save-produto').forEach(btn => btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const imagem = document.querySelector(`input[data-field="imagem"][data-id="${id}"]`).value.trim();
        const link = document.querySelector(`input[data-field="link"][data-id="${id}"]`).value.trim();
        const payload = {};
        if (imagem) payload.imagem = imagem;
        if (link) payload.link = link;
        if (!Object.keys(payload).length) { showToast('Nada para salvar', false); return; }
        try {
          const res = await fetch(`/api/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (res.ok) { showToast('Produto salvo'); carregarProdutos(); carregarDashboard(); }
          else showToast('Erro ao salvar', false);
        } catch {
          showToast('Erro rede', false);
        }
      }));

      // Edit / Delete
      cont.querySelectorAll('.btn-edit-produto').forEach(btn => btn.addEventListener('click', () => abrirModalEdicaoProduto(produtos.find(p => p.id === btn.dataset.id))));
      cont.querySelectorAll('.btn-delete-produto').forEach(btn => btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (!confirm('Excluir produto?')) return;
        await fetch(`/api/products/${id}`, { method: 'DELETE' });
        showToast('Produto excluído'); carregarProdutos(); carregarDashboard();
      }));
    } catch {
      showToast('Falha ao carregar produtos', false);
    }
  }

  function abrirModalEdicaoProduto(p) {
    const mid = 'modal-produto'; document.getElementById(mid)?.remove();
    const modal = document.createElement('div'); modal.id = mid; modal.className = 'fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50';
    modal.innerHTML = `<div class="bg-white rounded shadow max-w-lg w-full p-6 relative">
      <h2 class="text-xl font-bold mb-4">Editar Produto</h2>
      ${['nome','preco','imagem','descricao','grupo','link','desconto'].map(field => {
        const value = field === 'desconto' ? (p.desconto || 0) : (p[field] || '');
        return `<div class="mb-3">
          <label class="block font-semibold capitalize">${field}</label>
          ${field === 'descricao'
            ? `<textarea id="edit-${field}" class="w-full border px-2 py-1 rounded">${value}</textarea>`
            : `<input id="edit-${field}" type="${field==='desconto'?'number':'text'}" value="${value}" class="w-full border px-2 py-1 rounded" />`}
        </div>`;
      }).join('')}
      <div class="flex justify-end gap-3">
        <button id="close-prod" class="px-4 py-2 border rounded">Cancelar</button>
        <button id="save-prod" class="px-4 py-2 bg-blue-600 text-white rounded">Salvar</button>
      </div>
      <button id="x-prod" class="absolute top-2 right-2 text-gray-500">&times;</button>
    </div>`;
    document.body.appendChild(modal);
    ['close-prod','x-prod'].forEach(id => modal.querySelector(`#${id}`).addEventListener('click', () => modal.remove()));
    modal.querySelector('#save-prod').addEventListener('click', async () => {
      const updated = {
        nome: document.getElementById('edit-nome').value,
        preco: document.getElementById('edit-preco').value,
        imagem: document.getElementById('edit-imagem').value,
        descricao: document.getElementById('edit-descricao').value,
        grupo: document.getElementById('edit-grupo').value,
        link: document.getElementById('edit-link').value,
        desconto: Number(document.getElementById('edit-desconto').value || 0)
      };
      const res = await fetch(`/api/products/${p.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
      if (res.ok) { showToast('Produto salvo'); carregarProdutos(); carregarDashboard(); modal.remove(); }
      else showToast('Erro ao salvar', false);
    });
  }

  // ─── Downloads ────────────────────────────────────────────────────────────────
  async function carregarDownloads() {
    try {
      const res = await fetch('/api/downloads');
      const data = await res.json();
      const cont = document.getElementById('downloads-lista');
      if (!cont) return;
      cont.innerHTML = '';

      data.files.forEach(d => {
        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded shadow mb-3 flex items-start gap-4';
        card.innerHTML = `
          <div class="flex-shrink-0 text-center">
            <div class="w-24 h-24 bg-gray-100 flex items-center justify-center mb-2">
              ${d.imagem
                ? `<img src="${normalizeImagem(d.imagem)}" alt="${d.name}" class="object-contain w-full h-full">`
                : 'Sem imagem'}
            </div>
            <input type="file" data-type="download" data-id="${d.id}" accept="image/*" class="mb-1" />
            <input type="text" data-field="imagem" data-id="${d.id}" value="${d.imagem || ''}" placeholder="Caminho/imagem" class="inline-input border px-2 py-1 rounded w-full" />
          </div>
          <div class="flex-1">
            <h3 class="font-bold text-lg mb-1">${d.name}</h3>
            <p class="text-sm text-gray-500 mb-1">${d.description || ''}</p>
            <input type="text" data-field="url" data-id="${d.id}" value="${d.url || ''}" placeholder="URL" class="inline-input border px-2 py-1 rounded w-full mb-2" />
          </div>
          <div class="flex flex-col gap-2">
            <button data-id="${d.id}" class="btn-save-download bg-blue-500 text-white px-3 py-1 rounded text-sm">Salvar</button>
            <button data-id="${d.id}" class="btn-edit-download bg-yellow-400 text-white px-3 py-1 rounded text-sm">Editar</button>
            <button data-id="${d.id}" class="btn-delete-download bg-red-500 text-white px-3 py-1 rounded text-sm">Excluir</button>
          </div>
        `;
        cont.appendChild(card);
      });

      window.downloads = data.files;

      // Upload image
      cont.querySelectorAll('input[type=file][data-type="download"]').forEach(input => {
        input.addEventListener('change', async e => {
          const file = e.target.files[0];
          if (!file) return;
          const id = e.target.dataset.id;
          const form = new FormData(); form.append('image', file); form.append('type','download'); form.append('id', id);
          try {
            const up = await fetch('/api/upload-image', { method:'POST', body: form });
            const info = await up.json();
            if (info.success) {
              await fetch(`/api/downloads/${id}`, { method:'PUT', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ imagem: info.filename }) });
              showToast('Imagem atualizada'); carregarDownloads(); carregarDashboard();
            } else showToast(info.error || 'Erro upload', false);
          } catch {
            showToast('Erro rede', false);
          }
        });
      });

      // Inline save
      cont.querySelectorAll('.btn-save-download').forEach(btn => btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const urlVal = document.querySelector(`input[data-field="url"][data-id="${id}"]`).value.trim();
        const imgVal = document.querySelector(`input[data-field="imagem"][data-id="${id}"]`).value.trim();
        const payload = {}; if (urlVal) payload.url = urlVal; if (imgVal) payload.imagem = imgVal;
        if (!Object.keys(payload).length) { showToast('Nada para salvar', false); return; }
        try {
          const res = await fetch(`/api/downloads/${id}`, { method:'PUT', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
          if (res.ok) { showToast('Download salvo'); carregarDownloads(); carregarDashboard(); }
          else showToast('Erro ao salvar', false);
        } catch {
          showToast('Erro rede', false);
        }
      }));

      // Edit / Delete
      cont.querySelectorAll('.btn-edit-download').forEach(btn => btn.addEventListener('click', () => abrirModalEdicaoDownload(data.files.find(x=>x.id===btn.dataset.id))));
      cont.querySelectorAll('.btn-delete-download').forEach(btn => btn.addEventListener('click', async () => {
        const id = btn.dataset.id; if (!confirm('Excluir download?')) return;
        await fetch(`/api/downloads/${id}`, { method:'DELETE' }); showToast('Download excluído'); carregarDownloads(); carregarDashboard();
      }));
    } catch {
      showToast('Falha ao carregar downloads', false);
    }
  }

  function abrirModalEdicaoDownload(d) {
    const mid = 'modal-download'; document.getElementById(mid)?.remove();
    const modal = document.createElement('div'); modal.id=mid; modal.className='fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50';
    modal.innerHTML = `<div class="bg-white rounded shadow max-w-md w-full p-6 relative">
      <h2 class="text-xl font-bold mb-4">Editar Download</h2>
      ${['name','url','description','imagem'].map(f=>{
        const val = d[f]||'';
        return `<div class="mb-3">
          <label class="block font-semibold capitalize">${f}</label>
          ${f==='description'
            ? `<textarea id="edit-dl-${f}" class="w-full border px-2 py-1 rounded">${val}</textarea>`
            : `<input id="edit-dl-${f}" type="text" value="${val}" class="w-full border px-2 py-1 rounded" />`}
        </div>`;
      }).join('')}
      <div class="flex justify-end gap-3">
        <button id="close-dl" class="px-4 py-2 border rounded">Cancelar</button>
        <button id="save-dl" class="px-4 py-2 bg-blue-600 text-white rounded">Salvar</button>
      </div>
      <button id="x-dl" class="absolute top-2 right-2 text-gray-500">&times;</button>
    </div>`;
    document.body.appendChild(modal);
    ['close-dl','x-dl'].forEach(id=>modal.querySelector(`#${id}`).addEventListener('click',()=>modal.remove()));
    modal.querySelector('#save-dl').addEventListener('click',async ()=>{
      const updated = {
        name: document.getElementById('edit-dl-name').value,
        url: document.getElementById('edit-dl-url').value,
        description: document.getElementById('edit-dl-description').value,
        imagem: document.getElementById('edit-dl-imagem').value
      };
      const res = await fetch(`/api/downloads/${d.id}`, { method:'PUT', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(updated) });
      if(res.ok) { showToast('Download salvo'); carregarDownloads(); carregarDashboard(); modal.remove(); } else showToast('Erro ao salvar', false);
    });
  }

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
        card.className = 'bg-white p-4 rounded shadow mb-3 flex items-start gap-4';
        card.innerHTML = `
          <div class="flex-shrink-0 text-center">
            <div class="w-24 h-24 bg-gray-100 flex items-center justify-center mb-2">
              ${g.imagem
                ? `<img src="${normalizeImagem(g.imagem)}" alt="${g.nome}" class="object-contain w-full h-full">`
                : 'Sem imagem'}
            </div>
            <input type="file" data-type="grupo" data-id="${g.id}" accept="image/*" class="mb-1" />
            <input type="text" data-field="imagem" data-id="${g.id}" value="${g.imagem || ''}" placeholder="Caminho/imagem" class="inline-input border px-2 py-1 rounded w-full" />
          </div>
          <div class="flex-1">
            <h3 class="font-bold text-lg mb-1">${g.nome}</h3>
            <p class="text-sm text-gray-500 mb-1">${g.descricao || ''}</p>
          </div>
          <div class="flex flex-col gap-2">
            <button data-id="${g.id}" class="btn-save-grupo bg-blue-500 text-white px-3 py-1 rounded text-sm">Salvar</button>
            <button data-id="${g.id}" class="btn-edit-grupo bg-yellow-400 text-white px-3 py-1 rounded text-sm">Editar</button>
            <button data-id="${g.id}" class="btn-delete-grupo bg-red-500 text-white px-3 py-1 rounded text-sm">Excluir</button>
          </div>
        `;
        cont.appendChild(card);
      });

      window.grupos = grupos;

      // Upload imagem
      cont.querySelectorAll('input[type=file][data-type="grupo"]').forEach(input => {
        input.addEventListener('change', async e => {
          const file = e.target.files[0]; if(!file) return;
          const id = e.target.dataset.id;
          const form = new FormData(); form.append('image', file); form.append('type','grupo'); form.append('id', id);
          try {
            const up = await fetch('/api/upload-image',{method:'POST',body:form});
            const info = await up.json();
            if(info.success) {
              await fetch(`/api/groups/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({ imagem: info.filename })});
              showToast('Imagem atualizada'); carregarGrupos(); carregarDashboard();
            } else showToast(info.error||'Erro upload',false);
          } catch { showToast('Erro rede', false); }
        });
      });

      // Inline save
      cont.querySelectorAll('.btn-save-grupo').forEach(btn => btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const imgVal = document.querySelector(`input[data-field="imagem"][data-id="${id}"]`).value.trim();
        if(!imgVal) { showToast('Nada para salvar', false); return; }
        try {
          const res = await fetch(`/api/groups/${id}`, { method:'PUT', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ imagem: imgVal }) });
          if(res.ok) { showToast('Grupo salvo'); carregarGrupos(); carregarDashboard(); } else showToast('Erro ao salvar', false);
        } catch { showToast('Erro rede', false); }
      }));

      // Edit / Delete
      cont.querySelectorAll('.btn-edit-grupo').forEach(btn => btn.addEventListener('click', () => abrirModalEdicaoGrupo(grupos.find(x=>x.id===btn.dataset.id))));
      cont.querySelectorAll('.btn-delete-grupo').forEach(btn => btn.addEventListener('click', async () => {
        const id = btn.dataset.id; if(!confirm('Excluir grupo?')) return;
        await fetch(`/api/groups/${id}`,{method:'DELETE'}); showToast('Grupo excluído'); carregarGrupos(); carregarDashboard();
      }));
    } catch { showToast('Falha ao carregar grupos', false); }
  }

  // ─── Regras ─────────────────────────────────────────────────────────────────────
  async function carregarRegras() {
    const cont = document.getElementById('rules-lista');
    if (!cont) { loadRules(); return; }
    try {
      const res = await fetch('/api/admin/rules');
      const regras = await res.json(); cont.innerHTML = '';
      regras.forEach(r => {
        const div = document.createElement('div'); div.className = 'flex items-center justify-between p-2 border-b'; div.dataset.id = r.id;
        div.innerHTML = `
          <div><strong>${r.id}</strong> — ${r.type} <code>${r.pattern}</code> → \"${r.reply}\"</div>
          <div class=\"flex gap-2\">\n            <button class=\"btn-edit-regra px-2 py-1 border rounded text-sm\">Editar</button>\n            <button class=\"btn-delete-regra px-2 py-1 border rounded text-sm\">Excluir</button>\n          </div>\n        `;
        cont.appendChild(div);
      }); window.rules = regras;
      cont.querySelectorAll('.btn-edit-regra').forEach(btn => btn.addEventListener('click', () => { const r = regras.find(x=>x.id===btn.closest('[data-id]').dataset.id); if(r) openRuleModal(r); }));
      cont.querySelectorAll('.btn-delete-regra').forEach(btn => btn.addEventListener('click', async () => { const id=btn.closest('[data-id]').dataset.id; if(!confirm(`Excluir regra \"${id}\"?`))return; await fetch(`/api/admin/rules/${id}`,{method:'DELETE'}); showToast('Regra excluída'); carregarRegras(); }));
    } catch { showToast('Falha ao carregar regras', false); }
  }

  // ─── Webhooks ──────────────────────────────────────────────────────────────────
  async function carregarWebhooks() {
    const cont = document.getElementById('hooks-lista');
    if (!cont) { loadHooks(); return; }
    try {
      const res = await fetch('/api/admin/webhooks');
      const hooks = await res.json(); cont.innerHTML = '';
      hooks.forEach(h => {
        const div = document.createElement('div'); div.className='flex items-center justify-between p-2 border-b'; div.dataset.id = h.id;
        div.innerHTML = `
          <div><strong>${h.id}</strong> → ${h.url} <small>${JSON.stringify(h.headers)}</small></div>
          <div class=\"flex gap-2\">\n            <button class=\"btn-edit-hook px-2 py-1 border rounded text-sm\">Editar</button>\n            <button class=\"btn-delete-hook px-2 py-1 border rounded text-sm\">Excluir</button>\n          </div>\n        `;
        cont.appendChild(div);
      }); window.hooks = hooks;
      cont.querySelectorAll('.btn-edit-hook').forEach(btn => btn.addEventListener('click', () => { const h = hooks.find(x=>x.id===btn.closest('[data-id]').dataset.id); if(h) openHookModal(h); }));
      cont.querySelectorAll('.btn-delete-hook').forEach(btn => btn.addEventListener('click', async () => { const id=btn.closest('[data-id]').dataset.id; if(!confirm(`Excluir webhook \"${id}\"?`)) return; await fetch(`/api/admin/webhooks/${id}`,{method:'DELETE'}); showToast('Webhook excluído'); carregarWebhooks(); }));
    } catch { showToast('Falha ao carregar webhooks', false); }
  }

  // ─── Initialization ─────────────────────────────────────────────────────────────
  carregarDashboard();
  carregarProdutos();
  carregarDownloads();
  carregarGrupos();
  carregarRegras();
  carregarWebhooks();
});