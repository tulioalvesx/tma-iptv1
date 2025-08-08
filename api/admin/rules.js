// api/admin/rules.js
const { getSupabaseServer } = require('../_supabase');
const { enableCORS, readJson } = require('../_utils');
const { requireBasicAuth } = require('../_auth');

module.exports = async (req, res) => {
  enableCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireBasicAuth(req, res)) return;

  const supabase = getSupabaseServer();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('rules').select('*').order('id');
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const body = await readJson(req);
      if (!body.id) return res.status(400).json({ error: 'id required' });
      const { data, error } = await supabase.from('rules').upsert(body, { onConflict: 'id' }).select('*').single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = await readJson(req);
      if (!id) return res.status(400).json({ error: 'id required' });
      const { error } = await supabase.from('rules').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('rules admin error', e);
    res.status(500).json({ error: String(e.message || e) });
  }
};
