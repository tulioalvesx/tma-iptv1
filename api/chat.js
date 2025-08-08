// api/chat.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// janela de horário opcional (active_hours: { start:"08:00", end:"18:00" })
function inActiveHours(rule) {
  try {
    const ah = rule.active_hours;
    if (!ah || !ah.start || !ah.end) return true;
    const now = new Date();
    const [sh, sm] = String(ah.start).split(':').map(Number);
    const [eh, em] = String(ah.end).split(':').map(Number);
    const minutes = now.getHours() * 60 + now.getMinutes();
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    return startMin <= endMin
      ? (minutes >= startMin && minutes <= endMin)
      : (minutes >= startMin || minutes <= endMin); // vira a meia-noite
  } catch {
    return true;
  }
}

function matches(rule, message) {
  if (rule.enabled === false) return false;
  if (!inActiveHours(rule))   return false;

  const msg = (message || '').toString();
  const type = (rule.type || '').toLowerCase();

  if (type === 'message') return true;
  if (type === 'keyword') return msg.toLowerCase().includes(String(rule.pattern || '').toLowerCase());
  if (type === 'regex') {
    try { return new RegExp(rule.pattern, 'i').test(msg); } catch { return false; }
  }
  return false;
}

// parse seguro do body (pode vir string)
function getBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body || {};
}

module.exports = async (req, res) => {
  // CORS/preflight opcional (mesmo domínio já funciona, mas não atrapalha)
  if (req.method === 'OPTIONS') {
    res.status(204).end(); return;
  }

  try {
    const body = getBody(req);
    const messageRaw =
      req.method === 'POST'
        ? (body.message || '')
        : (req.query && req.query.message) || '';

    // higiene básica
    let message = String(messageRaw || '').trim();
    if (message.length > 2000) message = message.slice(0, 2000);

    if (!message) {
      return res.status(400).json({ error: 'Missing message' });
    }

    // pega regras ativas; ordene como preferir (created_at, id, prioridade, etc.)
    const { data: rules, error } = await supabase
      .from('rules')
      .select('*')
      .eq('enabled', true)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // acha a primeira que bate
    let matched = null;
    for (const r of rules || []) {
      if (matches(r, message)) { matched = r; break; }
    }

    let reply = matched?.reply || 'Não entendi agora 🤔. Se preferir, fale com um atendente.';

    // webhook externo opcional
    if (matched?.external_webhook) {
      try {
        const wh = await fetch(matched.external_webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, rule: matched })
        });
        if (wh.ok) {
          const ct = wh.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const js = await wh.json();
            if (js && typeof js.reply === 'string') reply = js.reply;
          } else {
            const tx = await wh.text();
            if (tx) reply = tx;
          }
        }
      } catch {
        // silencioso (não quebra a conversa se o webhook cair)
      }
    }

    // garante string
    reply = String(reply ?? '');

    return res.status(200).json({ reply, ruleId: matched?.id || null });
  } catch (e) {
    console.error('chat error', e);
    return res.status(500).json({ error: String(e.message || e) });
  }
};
