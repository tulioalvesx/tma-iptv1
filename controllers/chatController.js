// controllers/chatController.js
const ruleService    = require('../services/ruleService');
const productService = require('../services/productService');

// Polyfill de fetch para Node < 18 (em Node 18+ pode ignorar)
const fetch = global.fetch || ((...args) =>
  import('node-fetch').then(({ default: f }) => f(...args))
);

exports.chat = async (req, res) => {
  try {
    const text  = String(req.query.message || '').trim();
    const now   = new Date();
    const rules = await ruleService.fetchAll(); // lê /data/rules.json

    for (const rule of rules) {
      // 1) Descobrir se a regra casa com a mensagem
      let matched = false;
      if (rule.type === 'keyword') {
        matched = new RegExp(rule.pattern, 'i').test(text);
      } else if (rule.type === 'message') {
        matched = text.toLowerCase() === String(rule.pattern || '').toLowerCase();
      } else if (rule.type === 'regex') {
        matched = new RegExp(rule.pattern).test(text);
      }
      if (!matched) continue;

      // 2) Respeitar horário ativo se existir (objeto {start,end} 0..23)
      if (rule.activeHours && rule.activeHours.start != null && rule.activeHours.end != null) {
        const h = now.getHours();
        if (h < rule.activeHours.start || h >= rule.activeHours.end) continue;
      }

      // 3) Resposta base (local)
      const payload = { reply: rule.reply || '' };

      // 4) Integração de produtos (gera "options" para o chat)
      if (rule.integrationAction === 'products') {
        payload.options = await productService.fetchAll();
        payload.integrationAction = 'products';
      }

      // 5) Webhook externo somente se a regra pedir (externalWebhook: true)
      if (rule.externalWebhook && rule.webhookUrl) {
        const url = new URL(rule.webhookUrl);
        if (rule.webhookKey) url.searchParams.set('k', rule.webhookKey);
        url.searchParams.set('message', text);

        const resp = await fetch(url.toString(), { method: rule.webhookMethod || 'GET' });
        let ext;
        try { ext = await resp.json(); } 
        catch { ext = { ok: resp.ok, status: resp.status }; }

        payload.externalWebhook = true;
        payload.externalData    = ext;
      }

      // 6) Envia a resposta desta regra (para na primeira que casar)
      return res.json(payload);
    }

    // 7) Fallback: nenhuma regra casou
    return res.json({ reply: 'Desculpe, não entendi.' });
  } catch (err) {
    console.error('chat error:', err);
    return res.status(500).json({ reply: 'Erro no chat.' });
  }
};