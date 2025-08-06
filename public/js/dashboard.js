// dashboard.js

document.addEventListener("DOMContentLoaded", () => {
	// ─── Lazy-load flags ────────────────────────────────────────────────────────
	const loaded = {
     dashboard:	false,
     produtos:  false,
     downloads: false,
     grupos:    false,
     regras:    false,
     webhooks:  false
  };
  // Quick creation button activation
  ['produto','download','grupo','rule','hook'].forEach(type => {
    const btn = document.getElementById(`new-${type}-btn`);
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('opacity-50');
    }
  });

  // ─── Variables ───────────────────────────────────────────────────────────────
  let chartInstance = null;
  let isEditingRule = false,   editingRuleId = null;
  let isEditingHook = false,   editingHookId = null;
  let isEditingProduto = false, editingProdutoId = null;
  let isEditingDownload = false, editingDownloadId = null;
  let isEditingGrupo = false,   editingGrupoId = null;

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
    if (im.startsWith("http") || im.startsWith("/")) {
      if (im.startsWith("/img/")) return im;
      return im;
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
        datasets: [{
          label: "Acessos",
          data: dados.map(d => d.total),
          tension: 0.3,
          fill: true,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37,99,235,0.2)"
        }]
      },
      options: { scales: { y: { beginAtZero: true } } }
    });
  }

	// ─── Modal Open Functions ─────────────────────────────────────────────────────
	// ─── Regras ─────────────────────────────────────────────────────
  const modalRule = document.getElementById('modal-rule');
  const formRule  = document.getElementById('form-rule');
  function openRuleModal(rule = null) {
  formRule.reset();
   if (rule) {
     isEditingRule   = true;
     editingRuleId   = rule.id;
   } else {
     isEditingRule   = false;
     editingRuleId   = crypto.randomUUID();
   }
   formRule['rule-id'].value    = editingRuleId;
   formRule['rule-id'].disabled = true;
   if (rule) {
     formRule['rule-nome'].value = rule.name;
   } else {
     formRule['rule-nome'].value = '';
   }
   if (rule) {
     formRule['rule-type'].value    = rule.type;
     formRule['rule-pattern'].value = rule.pattern;
     formRule['rule-reply'].value   = rule.reply;
   }
   modalRule.classList.remove('hidden');
  }
  
  // ─── Webhook ─────────────────────────────────────────────────────
  const modalHook = document.getElementById('modal-hook');
  const formHook  = document.getElementById('form-hook');
  function openHookModal(hook = null) {
   formHook.reset();
   if (hook) {
     isEditingHook   = true;
     editingHookId   = hook.id;
   } else {
     isEditingHook   = false;
     editingHookId   = crypto.randomUUID();
   }
   formHook['hook-id'].value    = editingHookId;
   formHook['hook-id'].disabled = true;
   if (hook) {
     formHook['hook-nome'].value = hook.name;     // novo campo
   } else {
     formHook['hook-nome'].value = '';
   }
   if (hook) {
     formHook['hook-url'].value     = hook.url;
     formHook['hook-headers'].value = JSON.stringify(hook.headers || {}, null, 2);
   } else {
     formHook['hook-headers'].value = '{}';
   }
   modalHook.classList.remove('hidden');
 }
 
  // ─── Products ─────────────────────────────────────────────────────
function openProdutoModal(prod = null) {
   isEditingProduto = !!prod;
   formProduto.reset();
  if (prod) {
    editingProdutoId = prod.id;
  } else {
    editingProdutoId = crypto.randomUUID();
  }
  formProduto['produto-id'].value = editingProdutoId;
   const sel = formProduto['produto-group'];
   sel.querySelectorAll('option[value]:not([value=""])').forEach(o => o.remove());
   window.grupos.forEach(g => {
     const opt = document.createElement('option');
     opt.value = g.id;
     opt.textContent = g.name;
     sel.appendChild(opt);
   });
   sel.value = prod?.groupId || '';
  if (prod) {
    formProduto['produto-nome'].value      = prod.nome;
    formProduto['produto-descricao'].value = prod.descricao;
    formProduto['produto-preco'].value     = prod.preco;
  }
  modalProduto.classList.remove('hidden');
}

  // ─── Downloads ─────────────────────────────────────────────────────
function openDownloadModal(dl = null) {
  isEditingDownload = !!dl;
  formDownload.reset();
  if (dl) {
    editingDownloadId = dl.id;
  } else {
    editingDownloadId = crypto.randomUUID();
  }
  formDownload['download-id'].value = editingDownloadId;
  if (dl) {  
    formDownload['download-nome'].value = dl.name;
    formDownload['download-url'].value  = dl.url;
  }
  modalDownload.classList.remove('hidden');
}

  // ─── Groups ─────────────────────────────────────────────────────
function openGrupoModal(gr = null) {
  isEditingGrupo = !!gr;
  formGrupo.reset();
  if (gr) {
    editingGrupoId = gr.id;
  } else {
    editingGrupoId = crypto.randomUUID();
  }
  formGrupo['grupo-id'].value = editingGrupoId;
  if (gr) {
    formGrupo['grupo-nome'].value = gr.nome;
  }
  modalGrupo.classList.remove('hidden');
}

  // ─── Modal Setup ────────────────────────────────────────────────────────────────
  // Rule buttons
  document.getElementById('new-rule-btn')?.addEventListener('click', () => openRuleModal());
  document.getElementById('cancel-rule')?.addEventListener('click', () => modalRule.classList.add('hidden'));
  formRule.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = {
      id: formRule['rule-id'].value.trim(),
	  name:	formRule['rule-nome'].value.trim(),
      type: formRule['rule-type'].value,
      pattern: formRule['rule-pattern'].value.trim(),
      reply: formRule['rule-reply'].value.trim()
    };
    const url = isEditingRule
      ? `/api/admin/rules/${encodeURIComponent(editingRuleId)}`
      : '/api/admin/rules';
    try {
      const res = await fetch(url, {
        method: isEditingRule ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error();
      modalRule.classList.add('hidden');
      showToast(isEditingRule ? 'Regra atualizada' : 'Regra criada');
      carregarRegras();
    } catch {
      showToast('Falha ao salvar regra', false);
   }
  });

  // Webhooks
  document.getElementById('new-hook-btn')?.addEventListener('click', () => openHookModal());
  document.getElementById('cancel-hook')?.addEventListener('click', () => modalHook.classList.add('hidden'));
  formHook.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = {
      id: formHook['hook-id'].value.trim(),
	  name:	formHook['hook-nome'].value.trim(),
	  url: formHook['hook-url'].value.trim(),
	  headers: JSON.parse(formHook['hook-headers'].value)
    };
    const url = isEditingHook
      ? `/api/admin/webhooks/${encodeURIComponent(editingHookId)}`
      : '/api/admin/webhooks';
    try {
      const res = await fetch(url, {
        method: isEditingHook ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error();
      modalHook.classList.add('hidden');
      showToast(isEditingHook ? 'Webhook atualizado' : 'Webhook criado');
      carregarWebhooks();
    } catch {
      showToast('Falha ao salvar webhook', false);
    }
  });

  // Products
  const modalProduto = document.getElementById('modal-produto');
  const formProduto  = document.getElementById('form-produto');
  document.getElementById('new-produto-btn')?.addEventListener('click', () => openProdutoModal());
  document.getElementById('cancel-produto')?.addEventListener('click', () => modalProduto.classList.add('hidden'));
  formProduto.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = {
	  id: formProduto['produto-id'].value.trim(),
      nome: formProduto['produto-nome'].value.trim(),
      descricao: formProduto['produto-descricao'].value.trim(),
	  groupId:   formProduto['produto-group'].value || null,
      preco: parseFloat(formProduto['produto-preco'].value)
    };
	const url    = isEditingProduto
                ? `/api/products/${editingProdutoId}`
                : '/api/products';
	const method = isEditingProduto ? 'PUT' : 'POST';
	const res = await fetch(url, {
		method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      showToast(isEditingProduto ? 'Produto atualizado' : 'Produto criado');
      modalProduto.classList.add('hidden');
      carregarProdutos();
      carregarDashboard();
	} else { showToast(isEditingProduto ? 'Erro ao atualizar produto' : 'Erro ao criar produto', false);
	  return;
	}
  });

  // Downloads
  const modalDownload = document.getElementById('modal-download');
  const formDownload  = document.getElementById('form-download');
  document.getElementById('new-download-btn')?.addEventListener('click', () => openDownloadModal());
  document.getElementById('cancel-download')?.addEventListener('click', () => modalDownload.classList.add('hidden'));
  formDownload.addEventListener('submit', async e => {
    e.preventDefault();
   const payload = {
     id:   formDownload['download-id'].value.trim(),
     name: formDownload['download-nome'].value.trim(),
     url:  formDownload['download-url'].value.trim()
   };
	const url    = isEditingDownload
                ? `/api/downloads/${encodeURIComponent(editingDownloadId)}`
                : '/api/downloads';
	const method = isEditingDownload ? 'PUT' : 'POST';
	const res = await fetch(url, {
		method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      showToast(isEditingDownload ? 'Aplicativo atualizado' : 'Aplicativo criado');
      modalDownload.classList.add('hidden');
      carregarDownloads();
      carregarDashboard();
    } else { showToast(isEditingDownload ? 'Erro ao atualizar aplicativo' : 'Erro ao criar aplicativo', false);
	return;
	}
  });

  // Groups
  const modalGrupo = document.getElementById('modal-grupo');
  const formGrupo  = document.getElementById('form-grupo');
  document.getElementById('new-grupo-btn')?.addEventListener('click', () => openGrupoModal());
  document.getElementById('cancel-grupo')?.addEventListener('click', () => modalGrupo.classList.add('hidden'));
  formGrupo.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = { 
	id:   formGrupo['grupo-id'].value.trim(),
	nome: formGrupo['grupo-nome'].value.trim() };
	const url    = isEditingGrupo
                ? `/api/groups/${editingGrupoId}`
                : '/api/groups';
	const method = isEditingGrupo ? 'PUT' : 'POST';
	const res = await fetch(url, {
		method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      showToast(isEditingGrupo ? 'Grupo atualizado' : 'Grupo criado');
      modalGrupo.classList.add('hidden');
      carregarGrupos();
      carregarDashboard();
    } else { showToast(isEditingGrupo ? 'Erro ao atualizar grupo' : 'Erro ao criar grupo', false);
	  return;
	}
  });

  // ─── Tab Switching com lazy-load ─────────────────────────────────────────────
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.replace('bg-blue-500','bg-gray-300') && b.classList.remove('text-white'));
      btn.classList.replace('bg-gray-300','bg-blue-500'); btn.classList.add('text-white');
      document.querySelectorAll('.tab-section').forEach(sec => sec.classList.add('hidden'));
      const target = btn.dataset.tab;
      document.getElementById('tab-'+target).classList.remove('hidden');
      switch(target) {
		case 'dashboard':
			if (!loaded.dashboard) {
			 carregarDashboard();
			 loaded.dashboard = true;
			}
			break;
		case 'produtos':
			if (!loaded.produtos) {
             carregarProdutos();
             loaded.produtos = true;
			}
			break;
		case 'downloads':
			if (!loaded.downloads) {
             carregarDownloads();
             loaded.downloads = true;
			}
			break;
		case 'grupos':
			if (!loaded.grupos) {
			 carregarGrupos();
			 loaded.grupos = true;
			}
			break;
		case 'regras':
			if (!loaded.regras) {
			 carregarRegras();
			 loaded.regras = true;
         }
			break;
		case 'webhooks':
			if (!loaded.webhooks) {
			 carregarWebhooks();
			 loaded.webhooks = true;
			}
			break;
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

  // ─── Regras ─────────────────────────────────────────────────────────────────────
 async function carregarRegras() {
  try {
    const res = await fetch('/api/admin/rules');
    const regras = await res.json();
    const cont = document.getElementById('regras-lista');
    cont.innerHTML = '';

    regras.forEach(r => {
      const card = document.createElement('div');
      card.className = 'bg-white p-4 rounded shadow mb-3';
      card.innerHTML = `
        <div class="flex items-start gap-4">
          <div class="flex-1">
            <strong class="block text-lg mb-1">${r.name}</strong>
            <p class="text-sm text-gray-500 mb-2">${r.type} <code>${r.pattern}</code> → "${r.reply}"</p>
          </div>
          <div class="flex flex-col gap-2">
            <button data-id="${r.id}" class="btn-edit-regra px-3 py-1 bg-yellow-400 text-white rounded text-sm">Editar</button>
            <button data-id="${r.id}" class="btn-delete-regra px-3 py-1 bg-red-500 text-white rounded text-sm">Excluir</button>
          </div>
        </div>`;
      cont.appendChild(card);
    });

    window.rules = regras;
      cont.querySelectorAll('.btn-edit-regra').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          const r = regras.find(x => String(x.id) === id);
          if (r) openRuleModal(r);
        });
      });
      cont.querySelectorAll('.btn-delete-regra').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          if (!confirm(`Excluir regra "${id}"?`)) return;
          await fetch(`/api/admin/rules/${id}`, { method: 'DELETE' });
          carregarRegras();
          showToast('Regra excluída');
        });
      });
    } catch {
      showToast('Falha ao carregar regras', false);
    }
  }

// ─── Webhooks ──────────────────────────────────────────────────────────────────
async function carregarWebhooks() {
  try {
    const res = await fetch('/api/admin/webhooks');
    const hooks = await res.json();
    const cont = document.getElementById('webhooks-lista');
    cont.innerHTML = '';

    hooks.forEach(h => {
      const card = document.createElement('div');
      card.className = 'bg-white p-4 rounded shadow mb-3';
      card.innerHTML = `
        <div class="flex items-start gap-4">
          <div class="flex-1">
            <strong class="block text-lg mb-1">${h.name}</strong>
            <p class="text-sm text-gray-500 mb-2">${h.url}</p>
            <p class="text-xs text-gray-400"><code>${JSON.stringify(h.headers)}</code></p>
          </div>
          <div class="flex flex-col gap-2">
            <button data-id="${h.id}" class="btn-edit-hook px-3 py-1 bg-yellow-400 text-white rounded text-sm">Editar</button>
            <button data-id="${h.id}" class="btn-delete-hook px-3 py-1 bg-red-500 text-white rounded text-sm">Excluir</button>
          </div>
        </div>`;
      cont.appendChild(card);
    });

    window.hooks = hooks;
      cont.querySelectorAll('.btn-edit-hook').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          const h = hooks.find(x => String(x.id) === id);
          if (h) openHookModal(h);
        });
      });
      cont.querySelectorAll('.btn-delete-hook').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          if (!confirm(`Excluir webhook "${id}"?`)) return;
          await fetch(`/api/admin/webhooks/${id}`, { method: 'DELETE' });
          carregarWebhooks();
          showToast('Webhook excluído');
        });
      });
    } catch {
      showToast('Falha ao carregar webhooks', false);
    }
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
			<h3 class="font-bold text-lg mb-1">
				${p.nome}
				<span class="text-sm text-gray-500">
					(${p.group?.name || 'Sem grupo'})
				</span>
			</h3>
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
	  
 // ─── Editar Produto ─────────────────────────────────────────────────
   cont.querySelectorAll('.btn-edit-produto').forEach(btn => {
     btn.addEventListener('click', () => {
       const prod = window.produtos.find(x => String(x.id) === btn.dataset.id);
       if (prod) openProdutoModal(prod);
     });
   });
 
   // ─── Excluir Produto ────────────────────────────────────────────────
   cont.querySelectorAll('.btn-delete-produto').forEach(btn => {
     btn.addEventListener('click', async () => {
       if (!confirm('Excluir produto?')) return;
       await fetch(`/api/products/${btn.dataset.id}`, { method: 'DELETE' });
       showToast('Produto excluído');
       carregarProdutos();
       carregarDashboard();
     });
   });

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
      showToast('Falha ao carregar produtos', false);
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
	window.downloads = files;

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
//            <p class="text-sm text-gray-500 mb-1">${d.description||''}</p>
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
	
// -- Edit
	  cont.querySelectorAll('.btn-edit-download').forEach(btn => {
		btn.addEventListener('click', () => {
		const dl = window.downloads.find(x => String(x.id) === btn.dataset.id);
		if (dl) openDownloadModal(dl);
	  });
	});
	
// -- Delete
    cont.querySelectorAll('.btn-delete-download').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Excluir aplicativo?')) return;
        try {
          const resDel = await fetch(`/api/downloads/${btn.dataset.id}`, { method: 'DELETE' });
          if (!resDel.ok) throw new Error();
          showToast('Aplicativo excluído');
          carregarDownloads();
          carregarDashboard();
        } catch {
          showToast('Falha ao excluir aplicativo', false);
        }
      });
    });

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
          if (!info.success) throw new Error(info.error || 'Erro upload');
          const resImg = await fetch(`/api/downloads/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imagem: info.filename })
          });
          if (!resImg.ok) throw new Error();
          showToast('Imagem atualizada');
          carregarDownloads();
          carregarDashboard();
        } catch {
          showToast('Erro de rede ao atualizar imagem', false);
        }
      });
    });

      // Inline Save
    cont.querySelectorAll('.btn-save-download').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id  = btn.dataset.id;
        const url = document.querySelector(`input[data-field=url][data-id="${id}"]`).value.trim();
        const img = document.querySelector(`input[data-field=imagem][data-id="${id}"]`).value.trim();
        const upd = {};
        if (url) upd.url = url;
        if (img) upd.imagem = img;
        try {
          const resUpd = await fetch(`/api/downloads/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(upd)
          });
          if (!resUpd.ok) throw new Error();
          showToast('Aplicativo salvo');
          carregarDownloads();
          carregarDashboard();
        } catch {
          showToast('Erro ao salvar aplicativo', false);
        }
      });
    });

  } catch {
    showToast('Falha ao carregar aplicativos', false);
  }
}

// ─── Grupos ────────────────────────────────────────────────────────────────
async function carregarGrupos() {
  try {
    const res = await fetch('/api/groups');
    const grupos = await res.json();
    const cont = document.getElementById('grupos-lista');
    cont.innerHTML = '';
    window.grupos = grupos;
	
    grupos.forEach(g => {
      const card = document.createElement('div');
      card.className = 'bg-white p-4 rounded shadow mb-3';
      card.innerHTML = `
        <div class="flex items-start gap-4">
          <div class="w-24 h-24 bg-gray-100 flex items-center justify-center mb-2">
            ${g.imagem
              ? `<img src="${normalizeImagem(g.imagem)}" alt="${g.nome}" class="object-contain w-full h-full rounded">`
              : 'Sem imagem'}
          </div>
          <div class="flex-1">
            <h3 class="font-bold text-lg mb-1">${g.nome}</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
              <input type="file" data-type="grupo" data-id="${g.id}" class="inline-file border px-2 py-1 rounded" />
              <input type="text" data-field="imagem" data-id="${g.id}" class="inline-input border px-2 py-1 rounded" placeholder="Imagem" value="${g.imagem||''}">
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <button data-id="${g.id}" class="btn-save-grupo px-3 py-1 bg-blue-500 text-white rounded text-sm">Salvar</button>
            <button data-id="${g.id}" class="btn-edit-grupo px-3 py-1 bg-yellow-400 text-white rounded text-sm">Editar</button>
            <button data-id="${g.id}" class="btn-delete-grupo px-3 py-1 bg-red-500 text-white rounded text-sm">Excluir</button>
          </div>
        </div>`;
      cont.appendChild(card);
    });

// -- Edit
	  cont.querySelectorAll('.btn-edit-grupo').forEach(btn => {
	  btn.addEventListener('click', () => {
      const gr = window.grupos.find(x => String(x.id) === btn.dataset.id);
      if (gr) openGrupoModal(gr);
  });
});

// -- Delete
	  cont.querySelectorAll('.btn-delete-grupo').forEach(btn => {
	  btn.addEventListener('click', async () => {
      if (!confirm('Excluir grupo?')) return;
      await fetch(`/api/groups/${btn.dataset.id}`, { method: 'DELETE' });
      showToast('Grupo excluído');
      carregarGrupos();
      carregarDashboard();
  });
});

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
              showToast('Imagem atualizada');
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
          const id = btn.dataset.id;
          const img = document
			.querySelector(`input[data-field="imagem"][data-id="${id}"]`)
			.value.trim();
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
      showToast('Falha ao carregar grupos', false);
    }
}

 // Initialization: só Dashboard, demais serão “lazy-loaded”
  carregarDashboard();
  loaded.dashboard = true; // opcional se quiser flag pro dashboard
});