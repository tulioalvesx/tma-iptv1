// api/admin/import.js
const { createClient } = require('@supabase/supabase-js');

function requireBasicAuth(req, res) {
  const userEnv = (process.env.ADMIN_USER || '').trim();
  const passEnv = (process.env.ADMIN_PASS || '');
  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="admin"');
    res.status(401).end('Authentication required.'); return false;
  }
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const i = decoded.indexOf(':');
  const u = (i >= 0 ? decoded.slice(0, i) : decoded).trim();
  const p = i >= 0 ? decoded.slice(i + 1) : '';
  if (u !== userEnv || p !== passEnv) { res.status(401).end('Invalid credentials.'); return false; }
  return true;
}

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }});
}

const toNum = (n) => { const v = Number(String(n ?? '').replace(',', '.')); return Number.isFinite(v) ? v : null; };
const clean = (s) => (s ?? '').toString().trim();

function normalize(body){
  const out = { groups: [], products: [], downloads: [], rules: [], webhooks: [] };
  const add = (k, arr) => { if (Array.isArray(arr)) out[k].push(...arr); };

  // aceita tanto {downloads:[…]} quanto {files:[…]} etc.
  const b = body || {};
  const alias = (k, ...keys) => keys.find(x => Array.isArray(b[x])) ? b[keys.find(x => Array.isArray(b[x]))] : [];
  const groups    = alias('groups','groups');
  const products  = alias('products','products','produtos');
  const downloads = [...alias('downloads','downloads'), ...alias('files','files')];
  const rules     = alias('rules','rules','regras');
  const webhooks  = alias('webhooks','webhooks');

  add('groups', groups.map(g => ({
    id: clean(g.id), nome: clean(g.nome ?? g.name),
    descricao: g.descricao ?? g.description ?? null,
    imagem: clean(g.imagem ?? g.image ?? '')
  })).filter(g => g.id && g.nome));

  add('products', products.map(p => ({
    id: clean(p.id), nome: clean(p.nome ?? p.name),
    descricao: p.descricao ?? p.description ?? null,
    preco: toNum(p.preco ?? p.price),
    imagem: clean(p.imagem ?? p.image ?? ''),
    grupo: clean(p.grupo ?? p.group ?? p.groupId ?? ''),
    desconto: toNum(p.desconto ?? p.discount) ?? 0,
    link: clean(p.link ?? p.url ?? '')
  })).filter(p => p.id && p.nome));

  add('downloads', downloads.map(d => ({
    id: clean(d.id) || undefined, name: clean(d.name ?? d.nome),
    url: clean(d.url),
    description: d.description ?? d.descricao ?? null,
    imagem: clean(d.imagem ?? d.image ?? '')
  })).filter(d => d.name && d.url));

  add('rules', rules.map(r => {
    const type = clean(r.type).toLowerCase();
    return {
      id: clean(r.id) || undefined,
      name: clean(r.name ?? r.nome ?? r.pattern ?? ''),
      type: ['message','keyword','regex'].includes(type) ? type : 'message',
      pattern: clean(r.pattern ?? r.trigger ?? ''),
      reply: clean(r.reply ?? r.resposta ?? ''),
      active_hours: r.active_hours ?? null,
      external_webhook: clean(r.external_webhook ?? r.webhook ?? ''),
      integration_action: clean(r.integration_action ?? '')
    };
  }).filter(r => r.name && (r.pattern || r.type === 'message') && r.reply));

  add('webhooks', webhooks.map(h => {
    let headers = h.headers;
    if (typeof headers === 'string') { try { headers = JSON.parse(headers); } catch { headers = {}; } }
    if (!headers || typeof headers !== 'object') headers = {};
    return {
      id: clean(h.id) || undefined,
      name: clean(h.name ?? h.nome),
      url: clean(h.url),
      headers
    };
  }).filter(w => w.name && w.url));

  return out;
}

module.exports = async (req, res) => {
  if (!requireBasicAuth(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  try {
    const payload = normalize(req.body || {});
    const supabase = sb();

    const result = { groups: 0, products: 0, downloads: 0, rules: 0, webhooks: 0 };

    if (payload.groups.length)   { const { error, count } = await supabase.from('groups').upsert(payload.groups,   { onConflict: 'id', count: 'exact' }); if (error) throw error; result.groups   = payload.groups.length; }
    if (payload.products.length) { const { error, count } = await supabase.from('products').upsert(payload.products, { onConflict: 'id', count: 'exact' }); if (error) throw error; result.products = payload.products.length; }
    if (payload.downloads.length){ const { error, count } = await supabase.from('downloads').upsert(payload.downloads,{ onConflict: 'id', count: 'exact' }); if (error) throw error; result.downloads= payload.downloads.length; }
    if (payload.rules.length)    { const { error, count } = await supabase.from('rules').upsert(payload.rules,       { onConflict: 'id', count: 'exact' }); if (error) throw error; result.rules    = payload.rules.length; }
    if (payload.webhooks.length) { const { error, count } = await supabase.from('webhooks').upsert(payload.webhooks, { onConflict: 'id', count: 'exact' }); if (error) throw error; result.webhooks = payload.webhooks.length; }

    res.json({ imported: result });
  } catch (e) {
    console.error('import error', e);
    res.status(500).json({ error: String(e.message || e) });
  }
};
