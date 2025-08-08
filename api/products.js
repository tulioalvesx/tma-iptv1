// api/products.js
const { getSupabaseServer } = require('./_supabase');
const { enableCORS, readJson, uuidv4 } = require('./_utils');

module.exports = async (req, res) => {
  enableCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabaseServer();

  try {
    if (req.method === 'GET') {
      const { q, group } = req.query;
      let query = supabase.from('products').select('*');
      if (q) query = query.ilike('nome', `%${q}%`);
      if (group) query = query.eq('grupo', group);
      query = query.order('nome', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const body = await readJson(req);
      let item = body || {};
      if (!item.id) item.id = uuidv4();
      item.updated_at = new Date().toISOString();

      const { data, error } = await supabase.from('products').upsert(item, { onConflict: 'id' }).select('*').single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const body = await readJson(req);
      if (!body.id) return res.status(400).json({ error: 'id required' });
      const { error } = await supabase.from('products').delete().eq('id', body.id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('products error', e);
    res.status(500).json({ error: String(e.message || e) });
  }
};
