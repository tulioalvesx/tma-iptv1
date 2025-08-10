// dashboard.js

document.addEventListener("DOMContentLoaded", () => {
	// ─── Injeta o styles.css global na página ────────────────────────────────
   ;(function(){
     const href = '/css/styles.css';  // ajuste para o caminho real
     if (!document.querySelector(`link[href="${href}"]`)) {
       const link = document.createElement('link');
       link.rel  = 'stylesheet';
       link.href = href;
       document.head.appendChild(link);
     }
   })();
 
	// ─── Lazy-load flags ────────────────────────────────────────────────────────
	const loaded = {
     dashboard:	false,
     produtos:  false,
     downloads: false,
     grupos:    false,
	 gruposSelect: false,
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
  const timeRanges = {
  dia:    { days: 30,  unit: 'day',   label: 'Últimos 30 dias'   },
  semana: { days: 7,   unit: 'day',   label: 'Últimos 7 dias'    },
  mes:    { months: 12,unit: 'month', label: 'Últimos 12 meses' },
  ano:    { years: 12, unit: 'year',  label: 'Últimos 12 anos'  }
};
// estado do filtro (padrão)
  let currentRange = 'dia';

// função global que sobe o gráfico numa janela de tempo
function updateChartFor(rangeKey, rawData) {
  const cfg = timeRanges[rangeKey];
  const now = new Date();
  // calcula data de início
  let start;
  if (rangeKey === 'ano') {
    // YTD: começa em janeiro do ano atual
    start = new Date(now.getFullYear(), 0, 1);
  } else {
    start = new Date(now);
    if (cfg.days)   start.setDate(start.getDate() - cfg.days + 1);
    if (cfg.months) start.setMonth(start.getMonth() - cfg.months + 1);
    if (cfg.years)  start.setFullYear(start.getFullYear() - cfg.years + 1);
  }

  const labels = [];
  const values = [];

  // Para “ano” (YTD por mês), crie um mapa mês → soma dos totais
  let monthlyTotals;
  if (rangeKey === 'ano') {
    monthlyTotals = rawData.reduce((map, d) => {
      const m = new Date(d.dia).getMonth();
      map[m] = (map[m] || 0) + d.total;
      return map;
    }, {});
  }
  const cursor = new Date(start);

  // enquanto o cursor não ultrapassar hoje, gera label e valor
  while (cursor <= now) {
    let label;
    if (rangeKey === 'ano') {
      // meses do ano atual
      label = cursor.toLocaleDateString('pt-BR', { month: 'short' });
    } else if (rangeKey === 'mes') {
      label = cursor.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    } else {
      // dia ou semana
      label = cursor.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
    labels.push(label);

   // preenche o valor certo (0 se não houver acesso)
    let total = 0;
    if (rangeKey === 'ano') {
      const m = cursor.getMonth();
      total = monthlyTotals[m] || 0;
    } else if (rangeKey === 'mes') {
      total = rawData
        .filter(d => {
          const dt = new Date(d.dia);
          return dt.getFullYear() === cursor.getFullYear() &&
                 dt.getMonth() === cursor.getMonth();
        })
        .reduce((sum, d) => sum + d.total, 0);
    } else {
      const key = cursor.toISOString().slice(0, 10);
      total = rawData.find(d => d.dia === key)?.total || 0;
    }
    values.push(total);

    // avança o cursor
     if (rangeKey === 'ano') {
    // avança um mês
      cursor.setMonth(cursor.getMonth() + 1);
    } else if (cfg.days) {
      cursor.setDate(cursor.getDate() + 1);
    } else if (cfg.months) {
      cursor.setMonth(cursor.getMonth() + 1);
    } else if (cfg.years) {
      cursor.setFullYear(cursor.getFullYear() + 1);
    }
  }

  // reconstrói o array que gerarGrafico espera e desenha
  const arr = labels.map((lbl, i) => ({ dia: lbl, total: values[i] }));
  gerarGrafico(arr);
}
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

  
  // === API helpers (Supabase + Vercel) ===
  function apiFetch(path, opts = {}) {
    const headers = { ...(opts.headers || {}) };
    const hasBody = !!opts.body;
    const isForm  = (hasBody && (typeof FormData !== 'undefined') && (opts.body instanceof FormData));
    if (hasBody && !isForm) headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    return fetch(path, { ...opts, headers }).then(async (r) => {
      const data = await r.json().catch(()=> ({}));
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
      return data;
    });
  }
  function authHeader() {
    const key = 'ADMIN_BASIC';
    let token = localStorage.getItem(key);
    if (!token) {
      const u = prompt('Usuário admin:');
      const p = prompt('Senha admin:');
      token = btoa(`${u}:${p}`);
      localStorage.setItem(key, token);
    }
    return { Authorization: `Basic ${token}` };
  }
  
async function adminFetch(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { ...(opts.headers || {}), ...authHeader() },
  });

  if (res.status === 401) {
    // credencial mudou? limpa e pede de novo
    localStorage.removeItem('ADMIN_BASIC');
    const res2 = await fetch(url, {
      ...opts,
      headers: { ...(opts.headers || {}), ...authHeader() },
    });
    return res2;
  }
  return res;
}

  async function uploadImagem(file, prefix='uploads') {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('prefix', prefix);
    const r = await fetch('/api/upload-image', { method: 'POST', body: fd });
    if (!r.ok) throw new Error('Falha no upload');
    return r.json(); // { url, path }
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
    // destroy chart instance if one already exists (robust for Chart.js v3/v4)
    try {
      const existing = (window.Chart && Chart.getChart) ? Chart.getChart(canvas) : (Chart && Chart.instances ? Object.values(Chart.instances)[0] : null);
      if (existing) existing.destroy();
    } catch {}
    if (chartInstance) try { chartInstance.destroy(); } catch {}
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
      options: {
      responsive: true,
      maintainAspectRatio: false,    // importante para preencher o container
      scales: {
        x: { display: true, title: { display: true, text: 'Período' } },
        y: { beginAtZero: true, display: true, title: { display: true, text: 'Acessos' } }
      },
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false }
      },
      elements: {
        point: { hoverRadius: 6 }
      }
    }
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
   setRuleFormFromRule(rule);
   modalRule.classList.remove('hidden');
  }

// === Import JSON (admin, seletivo) ===
(function setupImportModal(){
  const btnOpen  = document.getElementById('btn-import-json');
  const modal    = document.getElementById('modal-import');
  const btnRun   = document.getElementById('btn-run-import');
  const btnClose = document.getElementById('btn-cancel-import');
  const ta       = document.getElementById('import-json');
  const fileIn   = document.getElementById('import-file');
  const kindSel  = document.getElementById('import-kind');

  if (!btnOpen || !modal) return;

  btnOpen.addEventListener('click', () => {
    ta.value = ''; fileIn.value = ''; kindSel.value = 'auto';
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

  function normalizeInput(raw, kind){
    // aceita array direto OU objeto com uma das chaves conhecidas
    const obj = (Array.isArray(raw) ? { auto: raw } : (raw || {}));

    // coletores
    const out = { groups: [], products: [], downloads: [], rules: [], webhooks: [] };

    // mapas “apelidos” -> chave oficial
    const rootMap = {
      files: 'downloads',
      downloads: 'downloads',
      groups: 'groups',
      produtos: 'products',
      products: 'products',
      regras: 'rules',
      rules: 'rules',
      webhooks: 'webhooks',
      auto: 'auto'
    };

    // transforma root em arrays por tipo
    const buckets = {};
    for (const k of Object.keys(obj)) {
      const kk = rootMap[k] || null;
      if (!kk) continue;
      buckets[kk] = asArray(obj[k]);
    }
    // se veio um array “cru” e o usuário escolheu um tipo específico:
    if (Array.isArray(raw) && kind !== 'auto') {
      buckets[kind] = raw;
    }

    // se “auto”: tenta adivinhar pelo shape
    if (Array.isArray(obj.auto) && kind === 'auto') {
      const sample = obj.auto[0] || {};
      if ('url' in sample && ('name' in sample || 'nome' in sample)) buckets.downloads = obj.auto;
      else if (('pattern' in sample) || ('reply' in sample)) buckets.rules = obj.auto;
      else if ('headers' in sample && 'url' in sample && ('name' in sample || 'nome' in sample)) buckets.webhooks = obj.auto;
      else if (('preco' in sample) || ('price' in sample) || ('grupo' in sample) || ('group' in sample) || ('groupId' in sample)) buckets.products = obj.auto;
      else buckets.groups = obj.auto;
    }

    // normalizadores por tipo
    (buckets.groups || []).forEach(g => {
      out.groups.push({
        id: cleanStr(g.id),
        nome: cleanStr(g.nome ?? g.name),
        descricao: g.descricao ?? g.description ?? null,
        imagem: cleanStr(g.imagem ?? g.image ?? '')
      });
    });

    (buckets.products || []).forEach(p => {
      out.products.push({
        id: cleanStr(p.id),
        nome: cleanStr(p.nome ?? p.name),
        descricao: p.descricao ?? p.description ?? null,
        preco: toNum(p.preco ?? p.price),
        imagem: cleanStr(p.imagem ?? p.image ?? ''),
        grupo: cleanStr(p.grupo ?? p.group ?? p.groupId ?? ''),
        desconto: toNum(p.desconto ?? p.discount) ?? 0,
        link: cleanStr(p.link ?? p.url ?? '')
      });
    });

    const downloadsSrc = [
      ...(buckets.downloads || []),
      ...(Array.isArray(obj.files) ? obj.files : [])
    ];
    downloadsSrc.forEach(d => {
      out.downloads.push({
        id: cleanStr(d.id) || undefined, // deixa o banco gerar se vazio
        name: cleanStr(d.name ?? d.nome),
        url: cleanStr(d.url),
        description: d.description ?? d.descricao ?? null,
        imagem: cleanStr(d.imagem ?? d.image ?? '')
      });
    });

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
        integration_action: cleanStr(r.integration_action ?? '')
      });
    });

    (buckets.webhooks || []).forEach(h => {
      let headers = h.headers;
      if (typeof headers === 'string') {
        try { headers = JSON.parse(headers); } catch { headers = {}; }
      }
      if (headers == null || typeof headers !== 'object') headers = {};
      out.webhooks.push({
        id: cleanStr(h.id) || undefined,
        name: cleanStr(h.name ?? h.nome),
        url: cleanStr(h.url),
        headers
      });
    });

    // filtra inválidos (mínimos obrigatórios)
    out.groups = out.groups.filter(g => g.id && g.nome);
    out.products = out.products.filter(p => p.id && p.nome);
    out.downloads = out.downloads.filter(d => d.name && d.url);
    out.rules = out.rules.filter(r => r.name && (r.pattern || r.type === 'message') && r.reply);
    out.webhooks = out.webhooks.filter(w => w.name && w.url);

    // se o usuário escolheu tipo específico, envia só aquele bucket
    if (kind !== 'auto') {
      const empty = { groups: [], products: [], downloads: [], rules: [], webhooks: [] };
      empty[kind] = out[kind];
      return empty;
    }
    return out;
  }

  btnRun.addEventListener('click', async () => {
    let raw;
    const kind = kindSel.value; // auto|groups|products|downloads|rules|webhooks
    try { raw = JSON.parse(ta.value || '{}'); }
    catch { showToast('JSON inválido', false); return; }

    const payload = normalizeInput(raw, kind);

    try {
      const res = await (typeof adminFetch === 'function'
        ? adminFetch('/api/admin/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
        : fetch('/api/admin/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(typeof authHeader==='function' ? authHeader() : {}) },
            body: JSON.stringify(payload)
          })
      );

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
      // refresh
      if (typeof carregarGrupos === 'function')     carregarGrupos();
      if (typeof carregarProdutos === 'function')   carregarProdutos();
      if (typeof carregarDownloads === 'function')  carregarDownloads();
      if (typeof carregarDashboard === 'function')  carregarDashboard();
      if (typeof carregarRegras === 'function')     carregarRegras();
      if (typeof carregarWebhooks === 'function')   carregarWebhooks();
    } catch (e) {
      console.error(e);
      showToast('Falha ao importar', false);
    }
  });
})();

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
     opt.textContent = g.nome || g.name;
     sel.appendChild(opt);
   });
   sel.value = prod?.grupo || '';
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
	formDownload['download-descricao'].value = dl.description || '';
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
	formGrupo['grupo-descricao'].value = gr.descricao || '';
  }
  modalGrupo.classList.remove('hidden');
}

  // ─── Modal Setup ───────────────────────────────────────────────────
  // Rule buttons
  document.getElementById('new-rule-btn')?.addEventListener('click', () => openRuleModal());
  document.getElementById('cancel-rule')?.addEventListener('click', () => modalRule.classList.add('hidden'));
  // === Helpers de Regra (modo + flags) ===

// mapeia rule.type antigo -> mode novo quando rule.mode não vier
function deriveModeFromRule(rule = {}) {
  const type = String(rule.type || '').toLowerCase();
  const mode = String(rule.mode || '').toLowerCase();
  if (mode) return mode;
  if (type === 'regex')   return 'regex';
  if (type === 'keyword') return 'contains';
  // type=message: se tiver pattern vira "exact", senão "all"
  return rule.pattern ? 'exact' : 'all';
}

// Preenche os radios/checkboxes do modal com base na regra
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

// Monta o payload da regra a partir do form (compat c/ type antigo)
function getRuleFormPayload(form) {
  const pattern = form['rule-pattern'].value.trim();
  const reply   = form['rule-reply'].value.trim();
  const enabled = form['rule-enabled'] ? form['rule-enabled'].checked : true;

  const mode = (form.querySelector('input[name="rule-mode"]:checked')?.value) || 'contains';
  const flags = {
    caseSensitive:   form.querySelector('#rule-flag-case')?.checked || false,
    accentSensitive: form.querySelector('#rule-flag-accent')?.checked || false,
  };

  // compat: preenche 'type' antigo (API ainda aceita)
  let type = 'message';
  if (mode === 'regex')      type = 'regex';
  else if (mode === 'contains') type = 'keyword';

  return {
    id:      form['rule-id']?.value || undefined,
    name:    form['rule-nome']?.value?.trim() || '',
    type,         // legado
    mode,         // novo (será usado pelo backend)
    pattern,
    reply,
    enabled,
    flags,
    // se você tiver no formulário: active_hours, external_webhook, etc, adicione aqui
  };
}

formRule.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = getRuleFormPayload(formRule);
  try {
    const res = await adminFetch('/api/admin/rules', {
      method: 'POST', // upsert no backend (POST/PUT ambos funcionam)
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text().catch(()=>''));    
    modalRule.classList.add('hidden');
    showToast(isEditingRule ? 'Regra atualizada' : 'Regra criada');
    carregarRegras();
  } catch (err) {
    console.error(err);
    showToast('Falha ao salvar regra', false);
  }
});
  // Webhooks
  document.getElementById('new-hook-btn')?.addEventListener('click', () => openHookModal());
  document.getElementById('cancel-hook')?.addEventListener('click', () => modalHook.classList.add('hidden'));
formHook.addEventListener('submit', async (e) => {
  e.preventDefault();

  const idRaw = formHook['hook-id'].value.trim();
  const name  = formHook['hook-nome'].value.trim();
  const urlStr = formHook['hook-url'].value.trim();

  // headers em JSON (valida pra não quebrar o JS)
  let headersObj = {};
  try {
    headersObj = JSON.parse(formHook['hook-headers'].value || '{}');
  } catch {
    showToast('Headers inválidos (JSON)', false);
    return;
  }

  // monta payload — se id vier vazio, deixa o backend gerar
  const payload = { name, url: urlStr, headers: headersObj };
  if (idRaw) payload.id = idRaw;

  try {
    const res = await adminFetch('/api/admin/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());

    modalHook.classList.add('hidden');
    showToast(isEditingHook ? 'Webhook atualizado' : 'Webhook criado');
    carregarWebhooks();
  } catch (err) {
    console.error(err);
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
    id:        formProduto['produto-id'].value.trim(),
    nome:      formProduto['produto-nome'].value.trim(),
    descricao: formProduto['produto-descricao'].value.trim(),
    grupo:     formProduto['produto-group'].value || null,
    preco:     (parseFloat(formProduto['produto-preco'].value) || null),
  };
  const url = '/api/products';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      showToast(isEditingProduto ? 'Produto atualizado' : 'Produto criado');
      modalProduto.classList.add('hidden');
      carregarProdutos();
      carregarDashboard();
    } else {
      showToast(isEditingProduto ? 'Erro ao atualizar produto' : 'Erro ao criar produto', false);
    }
	} catch {
    showToast('Erro de rede ao salvar produto', false);
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
     url:  formDownload['download-url'].value.trim(),
	 description: formDownload['download-descricao'].value.trim()
   };
	const url    = '/api/downloads';
	const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
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
		id:        formGrupo['grupo-id'].value.trim(),
		nome:      formGrupo['grupo-nome'].value.trim(),
		descricao: formGrupo['grupo-descricao'].value.trim(),
  };
	const url = '/api/groups';
	try {
    const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
    });
    if (res.ok) {
		showToast(isEditingGrupo ? 'Grupo atualizado' : 'Grupo criado');
		modalGrupo.classList.add('hidden');
		carregarGrupos();
		carregarDashboard();
  } else {
		showToast(isEditingGrupo ? 'Erro ao atualizar grupo' : 'Erro ao criar grupo', false);
    }
  } catch {
		showToast('Erro de rede ao salvar grupo', false);
  }
});

  // ─── Tab Switching com lazy-load ─────────────────────────────────────────────
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
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
			if (!loaded.gruposSelect) {
             await carregarGrupos();
             loaded.gruposSelect = true;
          	}
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
    const [produtos, grupos, downloads, analytics] = await Promise.all([
      apiFetch('/api/products'),
      apiFetch('/api/groups'),
      apiFetch('/api/downloads'),
      apiFetch('/api/analytics')
    ]);

    document.getElementById('total-produtos').textContent  = Array.isArray(produtos) ? produtos.length : 0;
    document.getElementById('total-downloads').textContent = Array.isArray(downloads) ? downloads.length : 0;
    document.getElementById('total-grupos').textContent    = Array.isArray(grupos) ? grupos.length : 0;

    const arr = (Array.isArray(analytics) ? analytics : []).map(r => ({ dia: r.day || r.dia, total: r.total || 0 }));
    const today = new Date().toISOString().slice(0,10);
    const hoje  = arr.find(x => (x.dia||'').slice(0,10) === today)?.total || 0;
    const v = document.getElementById('acessos-hoje'); if (v) v.textContent = hoje;

    updateChartFor(currentRange, arr);
  } catch (e) {
    console.error(e);
    showToast('Falha ao carregar dashboard', false);
  }
}

async function importar(json) {
  const res = await adminFetch('/api/admin/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(json) // { groups: [...], products: [...], downloads: [...] }
  });
  const data = await res.json();
  showToast(`Importado: ${data.imported.groups} grupos, ${data.imported.products} produtos, ${data.imported.downloads} downloads`);
  carregarGrupos(); carregarProdutos(); // refresh
}

  // ─── Regras ─────────────────────────────────────────────────────────────────────
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
    const list = (window.regras || regras || []);
    const r = list.find(x => String(x.id) === String(id));
    if (r) openRuleModal(JSON.parse(JSON.stringify(r))); // passa uma cópia fresca
  });
});
      cont.querySelectorAll('.btn-delete-regra').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          if (!confirm(`Excluir regra "${id}"?`)) return;
          await adminFetch('/api/admin/rules', {
			method: 'DELETE',
			headers: { 'Content-Type':'application/json' },
			body: JSON.stringify({ id }),
  });
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
			headers: { 'Content-Type':'application/json' },
			body: JSON.stringify({ id }),
  });
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
		const grp = window.grupos?.find(g => String(g.id) === String(p.grupo));
		const groupName = grp ? (grp.nome || grp.name) : 'Sem grupo';
        const card = document.createElement('div');
        card.className = 'product-card bg-white p-4 rounded shadow mb-3';
        card.innerHTML = `
          <div class="flex items-start gap-4">
            <div class="w-24 h-24 bg-gray-100 flex items-center justify-center mb-2 overflow-hidden">
			  ${p.imagem?`<img src="${normalizeImagem(p.imagem)}" alt="${p.nome}" class="object-contain max-w-full max-h-full">`:'Sem imagem'}
            </div>
            <div class="flex-1">
			<h3 class="font-bold text-lg mb-1">
				${p.nome}
				<span class="text-sm text-gray-500">
					(${groupName})
				</span>
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
       await adminFetch('/api/products', { method: 'DELETE', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ id: btn.dataset.id }) });
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
    form.append('file', file);
    form.append('type', 'produto');
    form.append('id', id);

    try {
      const up = await fetch('/api/upload-image', { method: 'POST', body: form });
      const info = await up.json();
      if (info && info.url) {
        await adminFetch('/api/products', { method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, imagem: info.url }),
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

      // Inline Save
      cont.querySelectorAll('.btn-save-produto').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const img = document.querySelector(`input[data-field=imagem][data-id="${id}"]`).value.trim();
          const link = document.querySelector(`input[data-field=link][data-id="${id}"]`).value.trim();
          const cur = (window.produtos || []).find(x => String(x.id) === String(id)) || {};
          const upd = {};
          if (img  !== (cur.imagem || '')) upd.imagem = img;
          if (link !== (cur.link   || '')) upd.link   = link;
          if (!Object.keys(upd).length) { showToast('Nada para salvar', false); return; }
          upd.id = id;
          try {
            const res = await adminFetch('/api/products', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(upd) });
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
      const files = Array.isArray(data) ? data : [];
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
          const resDel = await adminFetch('/api/downloads', { method: 'DELETE', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ id: btn.dataset.id }) });
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
        form.append('file', file);
        form.append('type', 'download');
        form.append('id', id);
        try {
          const up = await fetch('/api/upload-image', { method: 'POST', body: form });
          const info = await up.json();
          if (!info.url) throw new Error(info.error || 'Erro upload');
		  const resImg = await adminFetch('/api/downloads', { method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, imagem: info.url })
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

        const cur = (window.downloads || []).find(x => String(x.id) === String(id)) || {};
        const upd = {};
        if (url !== (cur.url || ''))     upd.url = url;
        if (img !== (cur.imagem || ''))  upd.imagem = img;
        if (!Object.keys(upd).length) { showToast('Nada para salvar', false); return; }
        upd.id = id;

        try {
          const resUpd = await adminFetch('/api/downloads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(upd)
          });
          if (!resUpd.ok) throw new Error('fail');
          showToast('Aplicativo salvo');
          carregarDownloads();
          carregarDashboard();
        } catch {
          showToast('Erro ao salvar aplicativo', false);
        }
      });
    });  });

}

  // ─── Grupos ────────────────────────────────────────────────────────────────
  async function carregarGrupos() {
    try {
      const res = await fetch('/api/groups');
      const grupos = await res.json();
      const cont = document.getElementById('grupos-lista');
      cont.innerHTML = '';

      grupos.forEach(g => {
        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded shadow mb-3';
        card.innerHTML = `
          <div class="flex items-start gap-4">
            <div class="w-24 h-24 bg-gray-100 flex items-center justify-center mb-2 overflow-hidden">
              ${g.imagem?`<img src="${normalizeImagem(g.imagem)}" alt="${g.nome||g.name}" class="object-contain max-w-full max-h-full">`:'Sem imagem'}
            </div>
            <div class="flex-1">
              <h3 class="font-bold text-lg mb-1">${g.nome||g.name}</h3>
              <p class="text-sm text-gray-500 mb-1 clamp-2">${g.descricao||g.description||''}</p>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input type="file" data-type="grupo" data-id="${g.id}" class="inline-file border px-2 py-1 rounded" />
                <input type="text" value="${g.imagem||''}" data-field="imagem" data-id="${g.id}" class="inline-input border px-2 py-1 rounded" placeholder="Imagem">
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
      window.grupos = grupos;

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
          try {
            const resDel = await adminFetch('/api/groups', { method: 'DELETE', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ id: btn.dataset.id }) });
            if (!resDel.ok) throw new Error();
            showToast('Grupo excluído');
            carregarGrupos();
            carregarDashboard();
          } catch {
            showToast('Falha ao excluir grupo', false);
          }
        });
      });

      // Upload imagem
      cont.querySelectorAll('input[type=file][data-type=grupo]').forEach(inp => {
        inp.addEventListener('change', async e => {
          const file = e.target.files[0];
          if (!file) return;
          const id = e.target.dataset.id;
          const form = new FormData();
          form.append('file', file);
          form.append('type', 'grupo');
          form.append('id', id);
          try {
            const up = await fetch('/api/upload-image', { method: 'POST', body: form });
            const info = await up.json();
            if (!info.url) throw new Error(info.error || 'Erro upload');
            const resImg = await adminFetch('/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, imagem: info.url }) });
            if (!resImg.ok) throw new Error();
            showToast('Imagem atualizada');
            carregarGrupos();
            carregarDashboard();
          } catch {
            showToast('Erro de rede ao atualizar imagem', false);
          }
        });
      });

      // Salvar inline
      cont.querySelectorAll('.btn-save-grupo').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const img = document.querySelector(`input[data-field="imagem"][data-id="${id}"]`).value.trim();
          const cur = (window.grupos || []).find(x => String(x.id) === String(id)) || {};
          const body = {};
          if (img !== (cur.imagem || '')) body.imagem = img;
          if (!Object.keys(body).length) { showToast('Nada para salvar', false); return; }
          body.id = id;
          try {
            const res = await adminFetch('/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
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
  document.querySelectorAll('.btn-filter').forEach(btn => {
  btn.addEventListener('click', async () => {
    // visual ativo
    document.querySelectorAll('.btn-filter').forEach(b => {
      b.classList.replace('bg-blue-500','bg-gray-300');
      b.classList.replace('text-white','text-gray-700');
    });
    btn.classList.replace('bg-gray-300','bg-blue-500');
    btn.classList.replace('text-gray-700','text-white');
    const rangeKey = btn.id.replace('filter-',''); // dia | semana | mes | ano
    // recarrega todos os dados (ou use um cache de analytics.dias)
    const dias = await apiFetch('/api/analytics'); updateChartFor(rangeKey, (dias||[]).map(r => ({ dia: r.day||r.dia, total: r.total||0 })));
	});
  });
});