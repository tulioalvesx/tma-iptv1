// api/admin/import.js
const { createClient } = require('@supabase/supabase-js');

// (opcional) reaproveite seu _auth.js se já tem
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
  if (!u || !p || u !== userEnv || p !== passEnv) {
    res.status(401).end('Invalid credentials.'); return false;
  }
  return true;
}

function getSb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return createClient(url, key, { auth: { persistSession: false }});
}

module.exports = async (req, res) => {
  if (!requireBasicAuth(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  try {
    const { groups = [], products = [], downloads = [] } = req.body || {};

    const sb = getSb();
    // normaliza campos possíveis (groupId -> grupo, etc.)
    const normGroups = groups.map(g => ({
      id: g.id, nome: g.nome ?? g.name ?? '', descricao: g.descricao ?? g.description ?? null, imagem: g.imagem ?? null
    })).filter(g => g.id && g.nome);

    const normProducts = products.map(p => ({
      id: p.id,
      nome: p.nome ?? p.name ?? '',
      descricao: p.descricao ?? p.description ?? null,
      preco: p.preco ?? p.price ?? null,
      imagem: p.imagem ?? null,
      grupo: p.grupo ?? p.group ?? p.groupId ?? null,
      desconto: p.desconto ?? p.discount ?? 0,
      link: p.link ?? p.url ?? null
    })).filter(p => p.id && p.nome);

    const normDownloads = downloads.map(d => ({
      id: d.id ?? undefined, // deixa o Supabase gerar se não tiver
      name: d.name ?? d.nome ?? '',
      url: d.url,
      description: d.description ?? d.descricao ?? null,
      imagem: d.imagem ?? null
    })).filter(d => d.name && d.url);

    // upsert em ordem: groups -> products -> downloads
    if (normGroups.length) {
      const { error } = await sb.from('groups').upsert(normGroups, { onConflict: 'id' });
      if (error) throw error;
    }
    if (normProducts.length) {
      const { error } = await sb.from('products').upsert(normProducts, { onConflict: 'id' });
      if (error) throw error;
    }
    if (normDownloads.length) {
      const { error } = await sb.from('downloads').upsert(normDownloads, { onConflict: 'id' });
      if (error) throw error;
    }

    res.json({
      imported: {
        groups: normGroups.length,
        products: normProducts.length,
        downloads: normDownloads.length
      }
    });
  } catch (e) {
    console.error('import error', e);
    res.status(500).json({ error: String(e.message || e) });
  }
};
