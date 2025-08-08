// api/groups.js
const { getSupabaseServer } = require('./_supabase');
const { enableCORS, readJson } = require('./_utils');

module.exports = async (req, res) => {
  enableCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabaseServer();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('groups').select('*').order('nome', { ascending: true });
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const item = await readJson(req);
      if (!item.id) return res.status(400).json({ error: 'id is required' });
      const { data, error } = await supabase.from('groups').upsert(item, { onConflict: 'id' }).select('*').single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = await readJson(req);
      if (!id) return res.status(400).json({ error: 'id required' });
      const { error } = await supabase.from('groups').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('groups error', e);
    res.status(500).json({ error: String(e.message || e) });
  }
};
