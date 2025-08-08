// api/analytics.js
const { getSupabaseServer } = require('./_supabase');
const { enableCORS, readJson } = require('./_utils');

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0,10);
}

module.exports = async (req, res) => {
  enableCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const supabase = getSupabaseServer();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('access')
        .select('day,total')
        .order('day', { ascending: false })
        .limit(30);
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      // increment today's counter
      const t = todayStr();
      const { data: existing, error: selErr } = await supabase.from('access').select('total').eq('day', t).single();
      if (selErr && selErr.code !== 'PGRST116') { // not found is ok
        throw selErr;
      }
      if (existing) {
        const { error: upErr } = await supabase.from('access').update({ total: (existing.total || 0) + 1 }).eq('day', t);
        if (upErr) throw upErr;
      } else {
        const { error: insErr } = await supabase.from('access').insert({ day: t, total: 1 });
        if (insErr) throw insErr;
      }
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('analytics error', e);
    res.status(500).json({ error: String(e.message || e) });
  }
};
