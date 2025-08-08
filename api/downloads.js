// api/downloads.js
const { getSupabaseServer } = require('./_supabase');
const { enableCORS, readJson, uuidv4 } = require('./_utils');

module.exports = async (req, res) => {
  enableCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabaseServer();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('downloads').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const body = await readJson(req);
      const item = { id: body.id || uuidv4(), ...body };
      const { data, error } = await supabase.from('downloads').upsert(item, { onConflict: 'id' }).select('*').single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = await readJson(req);
      if (!id) return res.status(400).json({ error: 'id required' });
      const { error } = await supabase.from('downloads').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('downloads error', e);
    res.status(500).json({ error: String(e.message || e) });
  }
};
