/**
 * Admin Dashboard – script principal
 * Mantém todas as funções existentes (dashboard, produtos, downloads, grupos,
 * regras, webhooks, import JSON, upload de imagem e salvamento inline),
 * com estrutura organizada e comentários. 
 */
document.addEventListener('DOMContentLoaded', () => {
  // ===========================================================================
  // 0) CONFIG / ESTADO
  // ===========================================================================
  const STATE = {
    loaded: {
      dashboard: false,
      produtos: false,
      downloads: false,
      grupos: false,
      gruposSelect: false,
      regras: false,
      webhooks: false,
    },
    chart: null,
    // “edição” atual de modais
    editing: {
      ruleId: null,
      hookId: null,
      produtoId: null,
      downloadId: null,
      grupoId: null,
    },
  };

  // ===========================================================================
  // 1) HELPERS VISUAIS
  // ===========================================================================
  function showToast(msg, ok = true) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className =
        'fixed bottom-4 right-4 text-white px-4 py-2 rounded shadow transition-opacity';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.background = ok ? '#16a34a' : '#dc2626';
    el.style.opacity = '1';
    setTimeout(() => (el.style.opacity = '0'), 2200);
  }

  function normalizeImagem(im) {
    if (!im) return '';
    if (im.startsWith('http') || im.startsWith('/')) {
      if (im.startsWith('/img/')) return im;
      return im;
    }
    return `/img/${im.replace(/^\/?img\/?/i, '')}`;
  }

  // ===========================================================================
  // 2) AUTH + FETCH
  // ===========================================================================
  function authHeader() {
    const KEY = 'ADMIN_BASIC';
    let token = localStorage.getItem(KEY);
    if (!token) {
      const u = prompt('Usuário admin:');
      const p = prompt('Senha admin:');
      token = btoa(`${u}:${p}`);
      localStorage.setItem(KEY, token);
    }
    return { Authorization: `Basic ${token}` };
  }

  /**
   * adminFetch – fetch com Basic auth + retry em 401 (sem recursão).
   * Mantém a semântica de uso atual do projeto.
   */
  async function adminFetch(url, opts = {}) {
    const headers = { ...(opts.headers || {}), ...authHeader() };
    const final = { ...opts, headers };

    // Se for JSON e body não string, stringifica
    const ct = String(headers['Content-Type'] || headers['content-type'] || '').toLowerCase();
    if (final.body && typeof final.body !== 'string' && ct.includes('application/json')) {
      try { final.body = JSON.stringify(final.body); } catch {}
    }

    try {
      const res = await fetch(url, final);

      if (res.status === 401) {
        try { localStorage.removeItem('ADMIN_BASIC'); } catch {}
        const res2 = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), ...authHeader() } });
        return res2;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('[adminFetch] ERRO', res.status, res.statusText, url, '\nResposta:\n', text);
        try { showToast?.(`Falha ${res.status} em ${url}`, false); } catch {}
      }
      return res;
    } catch (err) {
      console.error('[adminFetch] EXCEPTION', url, err);
      try { showToast?.('Erro de rede', false); } catch {}
      throw err;
    }
  }

  // fetch simples (sem auth) – usado no dashboard/analytics genéricos
  function apiFetch(path, opts = {}) {
    const headers = { ...(opts.headers || {}) };
    const hasBody = !!opts.body;
    const isForm = hasBody && (typeof FormData !== 'undefined') && (opts.body instanceof FormData);
    if (hasBody && !isForm) headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    return fetch(path, { ...opts, headers }).then(async (r) => {
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
      return data;
    });
  }

  // ===========================================================================
  // 3) GRÁFICO
  // ===========================================================================
  const timeRanges = {
    dia:    { days: 30,  unit: 'day',   label: 'Últimos 30 dias' },
    semana: { days: 7,   unit: 'day',   label: 'Últimos 7 dias' },
    mes:    { months: 12, unit: 'month', label: 'Últimos 12 meses' },
    ano:    { years: 1,  unit: 'year',  label: 'YTD' }
  };
  let currentRange = 'dia';

  function gerarGrafico(dados) {
    const canvas = document.getElementById('grafico-acessos');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (STATE.chart) STATE.chart.destroy();
    STATE.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dados.map(d => d.dia),
        datasets: [{
          label: 'Acessos',
          data: dados.map(d => d.total),
          tension: 0.3,
          fill: true,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37,99,235,0.2)',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { display: true, title: { display: true, text: 'Período' } },
          y: { beginAtZero: true, display: true, title: { display: true, text: 'Acessos' } }
        },
        plugins: { legend: { display: false } },
        elements: { point: { hoverRadius: 6 } }
      }
    });
  }

  function updateChartFor(rangeKey, rawData) {
    const cfg = timeRanges[rangeKey];
    const now = new Date();

    // Data inicial (YTD => jan 1 do ano atual)
    let start;
    if (rangeKey === 'ano') start = new Date(now.getFullYear(), 0, 1);
    else {
      start = new Date(now);
      if (cfg.days) start.setDate(start.getDate() - cfg.days + 1);
      if (cfg.months) start.setMonth(start.getMonth() - cfg.months + 1);
    }

    const labels = [];
    const values = [];
    const cursor = new Date(start);

    while (cursor <= now) {
      let label, total = 0;

      if (rangeKey === 'ano') {
        label = cursor.toLocaleDateString('pt-BR', { month: 'short' });
        const m = cursor.getMonth();
        total = rawData
          .filter(d => new Date(d.dia).getMonth() === m)
          .reduce((sum, d) => sum + (d.total || 0), 0);
        cursor.setMonth(cursor.getMonth() + 1);
      } else if (rangeKey === 'mes') {
        label = cursor.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        total = rawData
          .filter(d => {
            const dt = new Date(d.dia);
            return dt.getFullYear() === cursor.getFullYear() && dt.getMonth() === cursor.getMonth();
          })
          .reduce((sum, d) => sum + (d.total || 0), 0);
        cursor.setMonth(cursor.getMonth() + 1);
      } else {
        label = cursor.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        const key = cursor.toISOString().slice(0, 10);
        total = rawData.find(d => d.dia === key)?.total || 0;
        cursor.setDate(cursor.getDate() + 1);
      }

      labels.push(label);
      values.push(total);
    }

    const arr = labels.map((lbl, i) => ({ dia: lbl, total: values[i] }));
    gerarGrafico(arr);
  }

  // ===========================================================================
  // 4) DASHBOARD
  // ===========================================================================
  async function carregarDashboard() {
    try {
      const [produtos, grupos, downloads, analytics] = await Promise.all([
        apiFetch('/api/products'),
        apiFetch('/api/groups'),
        apiFetch('/api/downloads'),
        apiFetch('/api/analytics'),
      ]);

      document.getElementById('total-produtos').textContent  = Array.isArray(produtos) ? produtos.length : 0;
      document.getElementById('total-downloads').textContent = Array.isArray(downloads) ? downloads.length : 0;
      document.getElementById('total-grupos').textContent    = Array.isArray(grupos) ? grupos.length : 0;

      const arr = (Array.isArray(analytics) ? analytics : [])
        .map(r => ({ dia: r.day || r.dia, total: r.total || 0 }));
      const today = new Date().toISOString().slice(0,10);
      const hoje  = arr.find(x => (x.dia||'').slice(0,10) === today)?.total || 0;
      const v = document.getElementById('acessos-hoje');
      if (v) v.textContent = hoje;

      updateChartFor(currentRange, arr);
    } catch (e) {
      console.error(e);
      showToast('Falha ao carregar dashboard', false);
    }
  }

  // filtros do gráfico
  document.querySelectorAll('.btn-filter').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.btn-filter').forEach(b => {
        b.classList.replace('bg-blue-500','bg-gray-300');
        b.classList.replace('text-white','text-gray-700');
      });
      btn.classList.replace('bg-gray-300','bg-blue-500');
      btn.classList.replace('text-gray-700','text-white');

      const rangeKey = btn.id.replace('filter-',''); // dia|semana|mes|ano
      currentRange = rangeKey;
      try {
        const dias = await apiFetch('/api/analytics');
        updateChartFor(rangeKey, (dias||[]).map(r => ({ dia: r.day||r.dia, total: r.total||0 })));
      } catch {
        showToast('Não foi possível atualizar o gráfico', false);
      }
    });
  });

  // ===========================================================================
  // 5) REGRAS
  // ===========================================================================
  const modalRule = document.getElementById('modal-rule');
  const formRule  = document.getElementById('form-rule');

  function deriveModeFromRule(rule = {}) {
    const type = String(rule.type || '').toLowerCase();
    const mode = String(rule.mode || '').toLowerCase();
    if (mode) return mode;
    if (type === 'regex')   return 'regex';
    if (type === 'keyword') return 'contains';
    return rule.pattern ? 'exact' : 'all';
  }

  function setRuleFormFromRule(rule = {}) {
    const mode = deriveModeFromRule(rule);
    const radio = formRule.querySelector(`input[name="rule-mode"][value="${mode}"]`);
    const defaultRadio = formRule.querySelector('input[name="rule-mode"][value="contains"]');
    if (radio) radio.checked = true;
    else if (defaultRadio) defaultRadio.checked = true;

    const flags = (rule.flags && typeof rule.flags === 'object') ? rule.flags : {};
    const chkCase   = formRule.querySelector('#rule-flag-case');
    const chkAccent = formRule.querySelector('#rule-flag-accent');
    if (chkCase)   chkCase.checked   = !!flags.caseSensitive;
    if (chkAccent) chkAccent.checked = !!flags.accentSensitive;
  }

  function getRuleFormPayload(frm) {
    const pattern = frm['rule-pattern'].value.trim();
    const reply   = frm['rule-reply'].value.trim();
    const enabled = frm['rule-enabled'] ? frm['rule-enabled'].checked : true;

    const mode = (frm.querySelector('input[name="rule-mode"]:checked')?.value) || 'contains';
    const flags = {
      caseSensitive:   frm.querySelector('#rule-flag-case')?.checked || false,
      accentSensitive: frm.querySelector('#rule-flag-accent')?.checked || false,
    };

    let type = 'message';
    if (mode === 'regex') type = 'regex';
    else if (mode === 'contains') type = 'keyword';

    return {
      id:   frm['rule-id']?.value || undefined,
      name: frm['rule-nome']?.value?.trim() || '',
      type,    // legado
      mode,    // novo
      pattern,
      reply,
      enabled,
      flags,
    };
  }

  function openRuleModal(rule = null) {
    formRule.reset();
    STATE.editing.ruleId = rule ? rule.id : crypto.randomUUID();
    formRule['rule-id'].value = STATE.editing.ruleId;
    formRule['rule-id'].disabled = true;
    formRule['rule-nome'].value = rule?.name || '';
    formRule['rule-type'].value = rule?.type || 'message';
    formRule['rule-pattern'].value = rule?.pattern || '';
    formRule['rule-reply'].value = rule?.reply || '';
    setRuleFormFromRule(rule || {});
    modalRule.classList.remove('hidden');
  }

  async function carregarRegras() {
    try {
      const res = await adminFetch('/api/admin/rules');
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
          await adminFetch('/api/admin/rules', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
          });
          carregarRegras();
          showToast('Regra excluída');
        });
      });
    } catch (e) {
      console.error(e);
      showToast('Falha ao carregar regras', false);
    }
  }

  document.getElementById('new-rule-btn')?.addEventListener('click', () => openRuleModal());
  document.getElementById('cancel-rule')?.addEventListener('click', () => modalRule.classList.add('hidden'));
  formRule?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = getRuleFormPayload(formRule);
    try {
      const res = await adminFetch('/api/admin/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload, // adminFetch stringifica se necessário.
      });
      if (!res.ok) throw new Error(await res.text().catch(()=>''));    
      modalRule.classList.add('hidden');
      showToast('Regra salva');
      carregarRegras();
    } catch (err) {
      console.error(err);
      showToast('Falha ao salvar regra', false);
    }
  });

  // ===========================================================================
  // 6) WEBHOOKS
  // ===========================================================================
  const modalHook = document.getElementById('modal-hook');
  const formHook  = document.getElementById('form-hook');

  function openHookModal(hook = null) {
    formHook.reset();
    STATE.editing.hookId = hook ? hook.id : crypto.randomUUID();
    formHook['hook-id'].value = STATE.editing.hookId;
    formHook['hook-id'].disabled = true;
    formHook['hook-nome'].value = hook?.name || '';
    formHook['hook-url'].value  = hook?.url  || '';
    formHook['hook-headers'].value = JSON.stringify(hook?.headers || {}, null, 2);
    modalHook.classList.remove('hidden');
  }

  async function carregarWebhooks() {
    try {
      const res = await adminFetch('/api/admin/webhooks');
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
          await adminFetch('/api/admin/webhooks', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: { id },
          });
          carregarWebhooks();
          showToast('Webhook excluído');
        });
      });
    } catch {
      showToast('Falha ao carregar webhooks', false);
    }
  }

  document.getElementById('new-hook-btn')?.addEventListener('click', () => openHookModal());
  document.getElementById('cancel-hook')?.addEventListener('click', () => modalHook.classList.add('hidden'));
  formHook?.addEventListener('submit', async (e) => {
    e.preventDefault();
    // parse headers com segurança
    let headersObj = {};
    try {
      headersObj = JSON.parse(formHook['hook-headers'].value || '{}');
    } catch {
      showToast('Headers inválidos (JSON)', false);
      return;
    }
    const payload = {
      id:   formHook['hook-id'].value.trim() || undefined,
      name: formHook['hook-nome'].value.trim(),
      url:  formHook['hook-url'].value.trim(),
      headers: headersObj,
    };
    try {
      const res = await adminFetch('/api/admin/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      if (!res.ok) throw new Error(await res.text().catch(()=>'')); 
      modalHook.classList.add('hidden');
      showToast('Webhook salvo');
      carregarWebhooks();
    } catch (err) {
      console.error(err);
      showToast('Falha ao salvar webhook', false);
    }
  });

  // ===========================================================================
  // 7) PRODUTOS
  // ===========================================================================
  const modalProduto = document.getElementById('modal-produto');
  const formProduto  = document.getElementById('form-produto');

  function openProdutoModal(prod = null) {
    formProduto.reset();
    STATE.editing.produtoId = prod ? prod.id : crypto.randomUUID();
    formProduto['produto-id'].value = STATE.editing.produtoId;

    // popula select de grupos
    const sel = formProduto['produto-group'];
    sel.querySelectorAll('option[value]:not([value=""])').forEach(o => o.remove());
    (window.grupos || []).forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = g.nome || g.name;
      sel.appendChild(opt);
    });
    sel.value = prod?.grupo || '';

    formProduto['produto-nome'].value      = prod?.nome || '';
    formProduto['produto-descricao'].value = prod?.descricao || '';
    formProduto['produto-preco'].value     = prod?.preco || '';

    modalProduto.classList.remove('hidden');
  }

  async function carregarProdutos() {
    try {
      const res = await adminFetch('/api/products');
      const produtos = await res.json();
      const cont = document.getElementById('produtos-lista');
      cont.innerHTML = '';
      window.produtos = produtos;

      produtos.forEach(p => {
        const grp = window.grupos?.find(g => String(g.id) === String(p.grupo));
        const groupName = grp ? (grp.nome || grp.name) : 'Sem grupo';
        const card = document.createElement('div');
        card.className = 'product-card bg-white p-4 rounded shadow mb-3';
        card.innerHTML = `
          <div class="flex items-start gap-4">
            <div class="w-24 h-24 bg-gray-100 flex items-center justify-center mb-2 overflow-hidden">
              ${p.imagem ? `<img src="${normalizeImagem(p.imagem)}" alt="${p.nome}" class="object-contain max-w-full max-h-full">` : 'Sem imagem'}
            </div>
            <div class="flex-1">
              <h3 class="font-bold text-lg mb-1">
                ${p.nome}
                <span class="text-sm text-gray-500">(${groupName})</span>
              </h3>
              <p class="text-sm text-gray-500 mb-1 clamp-2">${p.descricao||''}</p>
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

      // Editar
      cont.querySelectorAll('.btn-edit-produto').forEach(btn => {
        btn.addEventListener('click', () => {
          const prod = window.produtos.find(x => String(x.id) === btn.dataset.id);
          if (prod) openProdutoModal(prod);
        });
      });

      // Excluir
      cont.querySelectorAll('.btn-delete-produto').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Excluir produto?')) return;
          await adminFetch('/api/products', {
            method: 'DELETE',
            headers: { 'Content-Type':'application/json' },
            body: { id: btn.dataset.id },
          });
          showToast('Produto excluído');
          carregarProdutos();
          carregarDashboard();
        });
      });

      // Upload imagem (inline)
      cont.querySelectorAll('input[type=file][data-type=produto]').forEach(inp => {
        inp.addEventListener('change', async e => {
          const file = e.target.files?.[0];
          if (!file) return;
          const id = e.target.dataset.id;

          const form = new FormData();
          form.append('file', file);
          form.append('type', 'produto');
          form.append('id', id);

          try {
            const up = await fetch('/api/upload-image', { method: 'POST', body: form });
            const info = await up.json();
            if (info && info.url) {
              await adminFetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: { id, imagem: info.url },
              });
              showToast('Imagem atualizada');
              carregarProdutos();
              carregarDashboard();
            } else {
              showToast(info?.error || 'Erro upload', false);
            }
          } catch {
            showToast('Erro de rede', false);
          }
        });
      });

      // Salvar inline
      cont.querySelectorAll('.btn-save-produto').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const img = document.querySelector(`input[data-field=imagem][data-id="${id}"]`).value.trim();
          const link = document.querySelector(`input[data-field=link][data-id="${id}"]`).value.trim();
          const upd = { id };
          if (img)  upd.imagem = img;
          if (link) upd.link   = link;

          try {
            const res = await adminFetch('/api/products', {
              method: 'POST',
              headers: { 'Content-Type':'application/json' },
              body: upd,
            });
            if (!res.ok) throw new Error();
            showToast('Produto salvo');
            carregarProdutos();
            carregarDashboard();
          } catch {
            showToast('Erro ao salvar produto', false);
          }
        });
      });
    } catch {
      showToast('Falha ao carregar produtos', false);
    }
  }

  document.getElementById('new-produto-btn')?.addEventListener('click', () => openProdutoModal());
  document.getElementById('cancel-produto')?.addEventListener('click', () => modalProduto.classList.add('hidden'));
  formProduto?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      id:        formProduto['produto-id'].value.trim(),
      nome:      formProduto['produto-nome'].value.trim(),
      descricao: formProduto['produto-descricao'].value.trim(),
      grupo:     formProduto['produto-group'].value || null,
      preco:     (parseFloat(formProduto['produto-preco'].value) || null),
    };
    try {
      const res = await adminFetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      if (!res.ok) throw new Error();
      showToast('Produto salvo');
      modalProduto.classList.add('hidden');
      carregarProdutos();
      carregarDashboard();
    } catch {
      showToast('Erro ao salvar produto', false);
    }
  });

  // ===========================================================================
  // 8) DOWNLOADS
  // ===========================================================================
  const modalDownload = document.getElementById('modal-download');
  const formDownload  = document.getElementById('form-download');

  function openDownloadModal(dl = null) {
    formDownload.reset();
    STATE.editing.downloadId = dl ? dl.id : crypto.randomUUID();
    formDownload['download-id'].value = STATE.editing.downloadId;
    formDownload['download-nome'].value = dl?.name || '';
    formDownload['download-url'].value  = dl?.url  || '';
    formDownload['download-descricao'].value = dl?.description || '';
    modalDownload.classList.remove('hidden');
  }

  async function carregarDownloads() {
    try {
      const res = await adminFetch('/api/downloads');
      const files = await res.json();
      window.downloads = Array.isArray(files) ? files : [];

      const cont = document.getElementById('downloads-lista');
      cont.innerHTML = '';

      window.downloads.forEach(d => {
        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded shadow mb-3';
        card.innerHTML = `
          <div class="flex items-start gap-4">
            <div class="w-24 h-24 bg-gray-100 flex items-center justify-center mb-2">
              ${d.imagem?`<img src="${normalizeImagem(d.imagem)}" alt="${d.name}" class="object-contain w-full h-full">`:'Sem imagem'}
            </div>
            <div class="flex-1">
              <h3 class="font-bold text-lg mb-1">${d.name}</h3>
              <p class="text-sm text-gray-500 mb-1 clamp-2">${d.description||''}</p>
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

      // Editar
      cont.querySelectorAll('.btn-edit-download').forEach(btn => {
        btn.addEventListener('click', () => {
          const dl = window.downloads.find(x => String(x.id) === btn.dataset.id);
          if (dl) openDownloadModal(dl);
        });
      });

      // Excluir
      cont.querySelectorAll('.btn-delete-download').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Excluir aplicativo?')) return;
          try {
            const resDel = await adminFetch('/api/downloads', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: { id: btn.dataset.id },
            });
            if (!resDel.ok) throw new Error();
            showToast('Aplicativo excluído');
            carregarDownloads();
            carregarDashboard();
          } catch {
            showToast('Falha ao excluir aplicativo', false);
          }
        });
      });

      // Upload imagem
      cont.querySelectorAll('input[type=file][data-type=download]').forEach(inp => {
        inp.addEventListener('change', async e => {
          const file = e.target.files?.[0];
          if (!file) return;
          const id = e.target.dataset.id;

          const form = new FormData();
          form.append('file', file);
          form.append('type', 'download');
          form.append('id', id);

          try {
            const up = await fetch('/api/upload-image', { method: 'POST', body: form });
            const info = await up.json();
            if (!info.url) throw new Error(info.error || 'Erro upload');
            const resImg = await adminFetch('/api/downloads', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: { id, imagem: info.url },
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

      // Salvar inline
      cont.querySelectorAll('.btn-save-download').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id  = btn.dataset.id;
          const url = document.querySelector(`input[data-field=url][data-id="${id}"]`).value.trim();
          const img = document.querySelector(`input[data-field=imagem][data-id="${id}"]`).value.trim();
          const body = { id };
          if (url) body.url = url;
          if (img) body.imagem = img;
          try {
            const resUpd = await adminFetch('/api/downloads', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body,
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

  document.getElementById('new-download-btn')?.addEventListener('click', () => openDownloadModal());
  document.getElementById('cancel-download')?.addEventListener('click', () => modalDownload.classList.add('hidden'));
  formDownload?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      id:   formDownload['download-id'].value.trim(),
      name: formDownload['download-nome'].value.trim(),
      url:  formDownload['download-url'].value.trim(),
      description: formDownload['download-descricao'].value.trim(),
    };
    try {
      const res = await adminFetch('/api/downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      if (!res.ok) throw new Error();
      showToast('Aplicativo salvo');
      modalDownload.classList.add('hidden');
      carregarDownloads();
      carregarDashboard();
    } catch {
      showToast('Erro ao salvar aplicativo', false);
    }
  });

  // ===========================================================================
  // 9) GRUPOS
  // ===========================================================================
  const modalGrupo = document.getElementById('modal-grupo');
  const formGrupo  = document.getElementById('form-grupo');

  function openGrupoModal(gr = null) {
    formGrupo.reset();
    STATE.editing.grupoId = gr ? gr.id : crypto.randomUUID();
    formGrupo['grupo-id'].value = STATE.editing.grupoId;
    formGrupo['grupo-nome'].value = gr?.nome || '';
    formGrupo['grupo-descricao'].value = gr?.descricao || '';
    modalGrupo.classList.remove('hidden');
  }

  async function carregarGrupos() {
    try {
      const res = await adminFetch('/api/groups');
      const grupos = await res.json();
      window.grupos = grupos;

      const cont = document.getElementById('grupos-lista');
      cont.innerHTML = '';

      grupos.forEach(g => {
        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded shadow mb-3';
        card.innerHTML = `
          <div class="flex items-start gap-4">
            <div class="w-24 h-24 bg-gray-100 flex items-center justify-center mb-2">
              ${g.imagem ? `<img src="${normalizeImagem(g.imagem)}" alt="${g.nome}" class="object-contain w-full h-full rounded">` : 'Sem imagem'}
            </div>
            <div class="flex-1">
              <h3 class="font-bold text-lg mb-1">${g.nome}</h3>
              <p class="text-sm text-gray-500 mb-2 clamp-2">${g.descricao||''}</p>
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

      // Editar
      cont.querySelectorAll('.btn-edit-grupo').forEach(btn => {
        btn.addEventListener('click', () => {
          const gr = window.grupos.find(x => String(x.id) === btn.dataset.id);
          if (gr) openGrupoModal(gr);
        });
      });

      // Excluir
      cont.querySelectorAll('.btn-delete-grupo').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Excluir grupo?')) return;
          await adminFetch('/api/groups', {
            method: 'DELETE',
            headers: { 'Content-Type':'application/json' },
            body: { id: btn.dataset.id },
          });
          showToast('Grupo excluído');
          carregarGrupos();
          carregarDashboard();
        });
      });

      // Upload imagem
      cont.querySelectorAll('input[type=file][data-type=grupo]').forEach(inp => {
        inp.addEventListener('change', async e => {
          const file = e.target.files?.[0];
          if (!file) return;
          const id = e.target.dataset.id;
          const form = new FormData();
          form.append('file', file);
          form.append('type', 'grupo');
          form.append('id', id);
          try {
            const up = await fetch('/api/upload-image', { method: 'POST', body: form });
            const info = await up.json();
            if (info && info.url) {
              await adminFetch('/api/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: { id, imagem: info.url },
              });
              showToast('Imagem atualizada');
              carregarGrupos();
              carregarDashboard();
            } else {
              showToast('Erro upload', false);
            }
          } catch {
            showToast('Erro rede', false);
          }
        });
      });

      // Salvar inline
      cont.querySelectorAll('.btn-save-grupo').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const img = document.querySelector(`input[data-field="imagem"][data-id="${id}"]`).value.trim();
          const body = { id };
          if (img) body.imagem = img;
          try {
            const res = await adminFetch('/api/groups', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body,
            });
            if (!res.ok) throw new Error();
            showToast('Grupo salvo');
            carregarGrupos();
            carregarDashboard();
          } catch {
            showToast('Erro ao salvar grupo', false);
          }
        });
      });
    } catch {
      showToast('Falha ao carregar grupos', false);
    }
  }

  document.getElementById('new-grupo-btn')?.addEventListener('click', () => openGrupoModal());
  document.getElementById('cancel-grupo')?.addEventListener('click', () => modalGrupo.classList.add('hidden'));
  formGrupo?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      id:        formGrupo['grupo-id'].value.trim(),
      nome:      formGrupo['grupo-nome'].value.trim(),
      descricao: formGrupo['grupo-descricao'].value.trim(),
    };
    try {
      const res = await adminFetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      if (!res.ok) throw new Error();
      showToast('Grupo salvo');
      modalGrupo.classList.add('hidden');
      carregarGrupos();
      carregarDashboard();
    } catch {
      showToast('Erro ao salvar grupo', false);
    }
  });

  // ===========================================================================
  // 10) IMPORT JSON (ADMIN)
  // ===========================================================================
  (function setupImportModal() {
    const btnOpen  = document.getElementById('btn-import-json');
    const modal    = document.getElementById('modal-import');
    const btnRun   = document.getElementById('btn-run-import');
    const btnClose = document.getElementById('btn-cancel-import');
    const ta       = document.getElementById('import-json');
    const fileIn   = document.getElementById('import-file');
    const kindSel  = document.getElementById('import-kind'); // auto|groups|products|downloads|rules|webhooks

    if (!btnOpen || !modal) return;

    btnOpen.addEventListener('click', () => {
      ta.value = '';
      fileIn.value = '';
      kindSel.value = 'auto';
      modal.classList.remove('hidden');
    });
    btnClose.addEventListener('click', () => modal.classList.add('hidden'));

    fileIn.addEventListener('change', async () => {
      const f = fileIn.files?.[0];
      if (!f) return;
      const text = await f.text().catch(() => null);
      if (text != null) ta.value = text;
    });

    function asArray(x){ return Array.isArray(x) ? x : (x ? [x] : []); }
    function toNum(n){ const v = Number(String(n).replace(',', '.')); return Number.isFinite(v) ? v : null; }
    function cleanStr(s){ return (s ?? '').toString().trim(); }

    function normalizeInput(raw, kind) {
      const obj = (Array.isArray(raw) ? { auto: raw } : (raw || {}));
      const out = { groups: [], products: [], downloads: [], rules: [], webhooks: [] };
      const map = {
        files: 'downloads', downloads: 'downloads',
        groups: 'groups',
        produtos: 'products', products: 'products',
        regras: 'rules', rules: 'rules',
        webhooks: 'webhooks', auto: 'auto'
      };
      const buckets = {};
      for (const k of Object.keys(obj)) {
        const kk = map[k] || null;
        if (!kk) continue;
        buckets[kk] = asArray(obj[k]);
      }
      if (Array.isArray(obj.auto) && kind === 'auto') {
        const sample = obj.auto[0] || {};
        if ('url' in sample && ('name' in sample || 'nome' in sample)) buckets.downloads = obj.auto;
        else if (('pattern' in sample) || ('reply' in sample)) buckets.rules = obj.auto;
        else if ('headers' in sample && 'url' in sample && ('name' in sample || 'nome' in sample)) buckets.webhooks = obj.auto;
        else if (('preco' in sample) || ('price' in sample) || ('grupo' in sample) || ('group' in sample) || ('groupId' in sample)) buckets.products = obj.auto;
        else buckets.groups = obj.auto;
      }
      if (Array.isArray(raw) && kind !== 'auto') buckets[kind] = raw;

      (buckets.groups || []).forEach(g => out.groups.push({
        id: cleanStr(g.id),
        nome: cleanStr(g.nome ?? g.name),
        descricao: g.descricao ?? g.description ?? null,
        imagem: cleanStr(g.imagem ?? g.image ?? ''),
      }));

      (buckets.products || []).forEach(p => out.products.push({
        id: cleanStr(p.id),
        nome: cleanStr(p.nome ?? p.name),
        descricao: p.descricao ?? p.description ?? null,
        preco: toNum(p.preco ?? p.price),
        imagem: cleanStr(p.imagem ?? p.image ?? ''),
        grupo: cleanStr(p.grupo ?? p.group ?? p.groupId ?? ''),
        desconto: toNum(p.desconto ?? p.discount) ?? 0,
        link: cleanStr(p.link ?? p.url ?? ''),
      }));

      const downloadsSrc = [...(buckets.downloads || []), ...(Array.isArray(obj.files) ? obj.files : [])];
      downloadsSrc.forEach(d => out.downloads.push({
        id: cleanStr(d.id) || undefined,
        name: cleanStr(d.name ?? d.nome),
        url: cleanStr(d.url),
        description: d.description ?? d.descricao ?? null,
        imagem: cleanStr(d.imagem ?? d.image ?? ''),
      }));

      (buckets.rules || []).forEach(r => {
        const type = cleanStr(r.type).toLowerCase();
        out.rules.push({
          id: cleanStr(r.id) || undefined,
          name: cleanStr(r.name ?? r.nome ?? r.pattern ?? ''),
          type: ['message','keyword','regex'].includes(type) ? type : 'message',
          pattern: cleanStr(r.pattern ?? r.trigger ?? ''),
          reply: cleanStr(r.reply ?? r.resposta ?? ''),
          active_hours: r.active_hours ?? null,
          external_webhook: cleanStr(r.external_webhook ?? r.webhook ?? ''),
          integration_action: cleanStr(r.integration_action ?? ''),
        });
      });

      (buckets.webhooks || []).forEach(h => {
        let headers = h.headers;
        if (typeof headers === 'string') { try { headers = JSON.parse(headers); } catch { headers = {}; } }
        if (headers == null || typeof headers !== 'object') headers = {};
        out.webhooks.push({
          id: cleanStr(h.id) || undefined,
          name: cleanStr(h.name ?? h.nome),
          url: cleanStr(h.url),
          headers,
        });
      });

      out.groups    = out.groups.filter(g => g.id && g.nome);
      out.products  = out.products.filter(p => p.id && p.nome);
      out.downloads = out.downloads.filter(d => d.name && d.url);
      out.rules     = out.rules.filter(r => r.name && (r.pattern || r.type === 'message') && r.reply);
      out.webhooks  = out.webhooks.filter(w => w.name && w.url);

      if (kind !== 'auto') {
        const only = { groups: [], products: [], downloads: [], rules: [], webhooks: [] };
        only[kind] = out[kind];
        return only;
      }
      return out;
    }

    btnRun.addEventListener('click', async () => {
      let raw;
      const kind = kindSel.value;
      try { raw = JSON.parse(ta.value || '{}'); }
      catch { showToast('JSON inválido', false); return; }

      const payload = normalizeInput(raw, kind);

      try {
        const res = await adminFetch('/api/admin/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Falha no import');

        showToast(
          `Importado: ${data.imported?.groups||0} grupos, `
          + `${data.imported?.products||0} produtos, `
          + `${data.imported?.downloads||0} downloads, `
          + `${data.imported?.rules||0} regras, `
          + `${data.imported?.webhooks||0} webhooks`
        );

        modal.classList.add('hidden');
        if (!STATE.loaded.grupos)     await carregarGrupos();
        if (!STATE.loaded.produtos)   await carregarProdutos();
        if (!STATE.loaded.downloads)  await carregarDownloads();
        if (!STATE.loaded.regras)     await carregarRegras();
        if (!STATE.loaded.webhooks)   await carregarWebhooks();
        await carregarDashboard();
      } catch (e) {
        console.error(e);
        showToast('Falha ao importar', false);
      }
    });
  })();

  // ===========================================================================
  // 11) TROCA DE ABAS (LAZY LOAD)
  // ===========================================================================
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.replace('bg-blue-500','bg-gray-300');
        b.classList.remove('text-white');
      });
      btn.classList.replace('bg-gray-300','bg-blue-500');
      btn.classList.add('text-white');

      document.querySelectorAll('.tab-section').forEach(sec => sec.classList.add('hidden'));
      const target = btn.dataset.tab;
      document.getElementById('tab-' + target).classList.remove('hidden');

      switch (target) {
        case 'dashboard':
          if (!STATE.loaded.dashboard) {
            await carregarDashboard();
            STATE.loaded.dashboard = true;
          }
          break;
        case 'produtos':
          if (!STATE.loaded.gruposSelect) {
            await carregarGrupos(); // preenche select do modal
            STATE.loaded.gruposSelect = true;
          }
          if (!STATE.loaded.produtos) {
            await carregarProdutos();
            STATE.loaded.produtos = true;
          }
          break;
        case 'downloads':
          if (!STATE.loaded.downloads) {
            await carregarDownloads();
            STATE.loaded.downloads = true;
          }
          break;
        case 'grupos':
          if (!STATE.loaded.grupos) {
            await carregarGrupos();
            STATE.loaded.grupos = true;
          }
          break;
        case 'regras':
          if (!STATE.loaded.regras) {
            await carregarRegras();
            STATE.loaded.regras = true;
          }
          break;
        case 'webhooks':
          if (!STATE.loaded.webhooks) {
            await carregarWebhooks();
            STATE.loaded.webhooks = true;
          }
          break;
      }
    });
  });

  // ===========================================================================
  // 12) INÍCIO (carrega Dashboard de cara)
  // ===========================================================================
  carregarDashboard().finally(() => (STATE.loaded.dashboard = true));
});