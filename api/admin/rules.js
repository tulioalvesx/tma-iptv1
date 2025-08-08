// api/admin/rules.js
const { getSupabaseServer } = require('../_supabase');
const { enableCORS, readJson } = require('../_utils');
const { requireBasicAuth } = require('../_auth');

const VALID_MODES = new Set([
  'contains',     // conter
  'exact',        // combinação exata
  'startswith',   // começa com
  'endswith',     // termina com
  'word',         // palavra inteira
  'regex',        // expressão regular
  'notcontains',  // não contém
  'all',          // todos (fallback)
  'welcome'       // mensagem de boas-vindas (usada quando init:true)
]);

const LEGACY_TYPES = new Set(['message', 'keyword', 'regex']);

function asBool(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v === 'true' || v === '1';
  return !!v;
}

function normalizeFlags(flags) {
  const f = (flags && typeof flags === 'object') ? flags : {};
  return {
    caseSensitive:  asBool(f.caseSensitive),
    accentSensitive: asBool(f.accentSensitive),
  };
}

function deriveModeFromLegacyType(type, pattern) {
  const t = String(type || '').toLowerCase();
  if (t === 'regex')   return 'regex';
  if (t === 'keyword') return 'contains';
  if (t === 'message') {
    const hasPattern = !!String(pattern || '').trim();
    return hasPattern ? 'exact' : 'all';
  }
  // default
  return 'contains';
}

function deriveLegacyTypeFromMode(mode) {
  const m = String(mode || '').toLowerCase();
  if (m === 'regex')    return 'regex';
  if (m === 'contains') return 'keyword';
  // para compatibilidade com UI antiga, qualquer outro vira 'message'
  return 'message';
}

function normalizeRule(input) {
  if (!input || typeof input !== 'object') throw new Error('invalid rule payload');

  const id = (input.id ?? '').toString().trim();
  if (!id) throw new Error('id required');

  const pattern = (input.pattern ?? '').toString();
  const reply   = (input.reply ?? '').toString();

  // aceita 'mode' novo ou mapeia a partir de 'type' antigo
  let mode = (input.mode ?? '').toString().toLowerCase().trim();
  if (!mode) mode = deriveModeFromLegacyType(input.type, pattern);
  if (!VALID_MODES.has(mode)) mode = 'contains';

  // mantém 'type' para compat com código antigo
  let type = (input.type ?? '').toString().toLowerCase().trim();
  if (!LEGACY_TYPES.has(type)) type = deriveLegacyTypeFromMode(mode);

  // flags opcionais
  const flags = normalizeFlags(input.flags);

  return {
    id,
    name: (input.name ?? input.nome ?? '').toString(),
    type,
    mode,
    pattern,
    reply,
    enabled: input.enabled === undefined ? true : asBool(input.enabled),
    active_hours: input.active_hours ?? null,
    external_webhook: (input.external_webhook ?? input.webhook ?? '').toString(),
    integration_action: (input.integration_action ?? '').toString(),
    flags,
    // se você tiver 'created_at' no schema, o Supabase ignora esse campo no upsert
  };
}

async function upsertRules(supabase, payload) {
  const rows = Array.isArray(payload) ? payload : [payload];
  const normalized = rows.map(normalizeRule);

  // upsert em lote
  const { data, error } = await supabase
    .from('rules')
    .upsert(normalized, { onConflict: 'id' })
    .select('*');

  if (error) throw error;
  return Array.isArray(payload) ? data : (data && data[0]);
}

module.exports = async (req, res) => {
  enableCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireBasicAuth(req, res)) return;

  const supabase = getSupabaseServer();

  try {
    if (req.method === 'GET') {
      // se sua tabela tiver 'created_at', vale trocar para .order('created_at', { ascending: true })
      const { data, error } = await supabase.from('rules').select('*').order('id', { ascending: true });
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const body = await readJson(req);
      try {
        const result = await upsertRules(supabase, body);
        return res.status(200).json(result);
      } catch (e) {
        return res.status(400).json({ error: String(e.message || e) });
      }
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
