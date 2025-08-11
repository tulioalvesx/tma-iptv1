// api/chat.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// ---------- helpers ----------
function stripAccents(s) {
  try { return (s || '').normalize('NFD').replace(/\p{Diacritic}+/gu, ''); }
  catch { return s || ''; }
}

function norm(s, { caseSensitive, accentSensitive }) {
  let x = s ?? '';
  if (!accentSensitive) x = stripAccents(x);
  if (!caseSensitive)   x = x.toLowerCase();
  return x;
}

function inActiveHours(rule) {
  try {
    const ah = rule.active_hours;
    if (!ah || !ah.start || !ah.end) return true;
    const now = new Date();
    const [sh, sm] = String(ah.start).split(':').map(Number);
    const [eh, em] = String(ah.end).split(':').map(Number);
    const minutes  = now.getHours() * 60 + now.getMinutes();
    const startMin = sh * 60 + sm;
    const endMin   = eh * 60 + em;
    return startMin <= endMin
      ? (minutes >= startMin && minutes <= endMin)
      : (minutes >= startMin || minutes <= endMin);
  } catch { return true; }
}

function getBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body || {};
}

// --- mapeia 'compare' (pt-br) e outros nomes para o modo interno
function mapCompareToMode(v) {
  const s = String(v || '').trim().toLowerCase();
  if (!s) return '';
  if (['conter','contains'].includes(s))            return 'contains';
  if (['combinação exata','combinacao exata','mensagem exata','exato','exact'].includes(s)) return 'exact';
  if (['começa com','comeca com','startswith'].includes(s))  return 'startswith';
  if (['termina com','endswith'].includes(s))      return 'endswith';
  if (['não contém','nao contém','nao contem','notcontains'].includes(s)) return 'notcontains';
  if (['palavra','word'].includes(s))              return 'word';
  if (['regex','regexp','expressão regular','expressao regular'].includes(s)) return 'regex';
  if (['bem-vindo','boas-vindas','welcome','mensagem de boas-vindas','mensagem de boas vindas'].includes(s)) return 'welcome';
  if (['todos','fallback','all'].includes(s))      return 'all';
  return '';
}

function getMode(rule) {
  // aceita: rule.mode, rule.compare (pt-br) e rule.type (legado)
  const m1 = String(rule.mode || '').toLowerCase();
  const m2 = mapCompareToMode(rule.compare);
  const t  = String(rule.type || '').toLowerCase(); // legado
  if (m1) return m1;
  if (m2) return m2;
  if (t === 'regex')   return 'regex';
  if (t === 'keyword') return 'contains';
  // type=message: se não tiver pattern => all (fallback), senão exact
  const pat = getPattern(rule);
  return pat ? 'exact' : 'all';
}

function getFlags(rule) {
  // aceita flags dentro de 'flags' ou na raiz
  const f = (rule.flags && typeof rule.flags === 'object') ? rule.flags : {};
  const cs = (f.caseSensitive !== undefined) ? f.caseSensitive : rule.caseSensitive;
  const as = (f.accentSensitive !== undefined) ? f.accentSensitive : rule.accentSensitive;
  return {
    caseSensitive:  !!cs,
    accentSensitive: !!as
  };
}

// pega o pattern com aliases (compat)
function getPattern(rule) {
  return String(
    rule.pattern ??
    rule.keyword ??     // alias comum
    rule.padrao  ??     // pt-br
    ''
  ).trim();
}

// pega o texto de resposta com aliases (compat)
function getReply(rule) {
  return String(
    rule.reply ??
    rule.response ??    // algumas bases usam 'response'
    ''
  );
}

// casamento por modo
function matchesByMode(mode, msgRaw, patRaw, flags) {
  const msg = norm(String(msgRaw || ''), flags);
  const pat = norm(String(patRaw || ''), flags);

  switch (mode) {
    case 'contains':     return !!pat && msg.includes(pat);
    case 'exact':        return msg === pat;
    case 'startswith':   return !!pat && msg.startsWith(pat);
    case 'endswith':     return !!pat && msg.endsWith(pat);
    case 'word': {
      if (!pat) return false;
      const re = new RegExp(`\\b${escapeRegex(pat)}\\b`, flags.caseSensitive ? '' : 'i');
      return re.test(String(msgRaw || '')); // usa raw p/ limites de palavra corretos
    }
    case 'notcontains':  return !!pat && !msg.includes(pat);
    case 'all':          return true;     // catch-all (fallback)
    case 'welcome':      return false;    // tratado fora (init)
    case 'regex':
      try { return new RegExp(patRaw, flags.caseSensitive ? '' : 'i').test(String(msgRaw || '')); }
      catch { return false; }
    default:             return false;
  }
}

function escapeRegex(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// ---------- handler ----------
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const body = getBody(req);
    const messageRaw =
      req.method === 'POST' ? (body.message || '') : (req.query?.message || '');
    const init = req.method === 'POST' ? !!body.init : (req.query?.init === '1');

    let message = String(messageRaw || '').trim();
    if (message.length > 2000) message = message.slice(0, 2000);
    if (!message && !init) {
      return res.status(400).json({ error: 'Missing message' });
    }

    // -------- busca regras --------
    // se a coluna 'enabled' não existir/for null, considera ativa
    let q = supabase.from('rules').select('*');
    // se você usa 'enabled', filtramos ativas OU null
    q = q.or('enabled.is.true,enabled.is.null');

    // se você não criou created_at, comente a linha abaixo
    try { q.order('created_at', { ascending: true }); } catch {}

    const { data: rules, error } = await q;
    if (error) throw error;

    // separa por modo e aplica prioridade
    const list = (rules || []).filter(inActiveHours);
    const byMode = (mode) => list.filter(r => getMode(r) === mode);

    let matched = null;

    // welcome: só se init==true (ex.: chamado ao abrir o chat)
    if (init) matched = (byMode('welcome').find(r => true)) || null;

    // ordem de prioridade de match:
    const order = ['regex','exact','word','startswith','endswith','contains','notcontains','all'];
    if (!matched) {
      outer: for (const m of order) {
        for (const r of byMode(m)) {
          if (matchesByMode(m, message, getPattern(r), getFlags(r))) { matched = r; break outer; }
        }
      }
    }

    let reply = getReply(matched) || 'Não entendi agora 🤔. Se preferir, fale com um atendente.';

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
            const js = await wh.json(); if (js?.reply) reply = String(js.reply);
          } else {
            const tx = await wh.text(); if (tx) reply = tx;
          }
        }
      } catch {}
    }

    return res.status(200).json({ reply: String(reply ?? ''), ruleId: matched?.id || null });
  } catch (e) {
    console.error('chat error', e);
    return res.status(500).json({ error: String(e.message || e) });
  }
};
