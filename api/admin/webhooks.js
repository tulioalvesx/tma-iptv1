// api/admin/webhooks.js
const { getSupabaseServer } = require('../_supabase');
const { enableCORS, readJson, uuidv4 } = require('../_utils');
const { requireBasicAuth } = require('../_auth');

module.exports = async (req, res) => {
  enableCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireBasicAuth(req, res)) return;

  const supabase = getSupabaseServer();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('webhooks').select('*').order('name', { ascending: true });
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const body = await readJson(req);
      const item = { id: body.id || null, ...body };
      const { data, error } = await supabase.from('webhooks').upsert(item, { onConflict: 'id' }).select('*').single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = await readJson(req);
      if (!id) return res.status(400).json({ error: 'id required' });
      const { error } = await supabase.from('webhooks').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('webhooks admin error', e);
    res.status(500).json({ error: String(e.message || e) });
  }
};
