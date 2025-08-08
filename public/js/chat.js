/* chat.js
 * Chat flutuante com estado persistente e fallback de API (POST -> GET).
 */
document.addEventListener('DOMContentLoaded', () => {
  const els = {
    toggle:   document.getElementById('chat-toggle'),
    widget:   document.getElementById('chat-widget'),
    messages: document.getElementById('chat-messages'),
    input:    document.getElementById('chat-input'),
    send:     document.getElementById('chat-send'),
  };

  // Elementos obrigatórios
  if (!els.toggle || !els.widget || !els.messages || !els.input || !els.send) return;

  const STORE_OPEN = 'chatOpen';
  const STORE_MSGS = 'chatMessages';
  const MAX_MSGS   = 200;
  let sending = false;

  // ---- Estado aberto/fechado
  const isOpen = localStorage.getItem(STORE_OPEN) === 'true';
  setOpen(isOpen);

  function setOpen(open) {
    els.widget.style.display = open ? 'flex' : 'none';
    localStorage.setItem(STORE_OPEN, String(open));
  }

  els.toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(els.widget.style.display !== 'flex');
  });

  // Fecha ao clicar fora
  document.addEventListener('click', (e) => {
    if (els.widget.style.display === 'flex' &&
        !els.widget.contains(e.target) &&
        e.target !== els.toggle) {
      setOpen(false);
    }
  });

  // Não propagar clique dentro do widget
  els.widget.addEventListener('click', (e) => e.stopPropagation());

  // ---- Histórico
  loadMessages();

  function loadMessages() {
    const stored = localStorage.getItem(STORE_MSGS);
    if (!stored) return;
    try {
      const msgs = JSON.parse(stored);
      msgs.forEach(m => appendMessage(m.text, m.from, false));
      // sempre mantém no máximo MAX_MSGS
      if (Array.isArray(msgs) && msgs.length > MAX_MSGS) {
        localStorage.setItem(STORE_MSGS, JSON.stringify(msgs.slice(-MAX_MSGS)));
      }
    } catch (e) {
      console.error('Erro ao ler histórico do chat', e);
    }
  }

  function persist(text, from) {
    try {
      const msgs = JSON.parse(localStorage.getItem(STORE_MSGS) || '[]');
      msgs.push({ text, from });
      // corta para os últimos MAX_MSGS
      const trimmed = msgs.slice(-MAX_MSGS);
      localStorage.setItem(STORE_MSGS, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Erro ao salvar histórico do chat', e);
    }
  }

  // ---- UI
  function appendMessage(text, from = 'bot', save = true) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${from}`;
    bubble.textContent = text; // textContent por segurança (evita XSS)
    els.messages.appendChild(bubble);
    els.messages.scrollTop = els.messages.scrollHeight;
    if (save) persist(text, from);
  }

  // ---- Envio
  els.send.addEventListener('click', sendMessage);
  els.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  });

  async function sendMessage() {
    const message = (els.input.value || '').trim();
    if (!message || sending) return;

    appendMessage(message, 'user');
    els.input.value = '';

    sending = true;
    els.send.disabled = true;
    els.send.setAttribute('aria-busy', 'true');

    try {
      const { reply } = await callChatAPI(message);
      appendMessage(reply || 'Não entendi. Pode reformular?', 'bot');
    } catch (err) {
      console.error(err);
      appendMessage('Erro ao obter resposta do servidor.', 'bot');
    } finally {
      sending = false;
      els.send.disabled = false;
      els.send.removeAttribute('aria-busy');
    }
  }

  // ---- API client: tenta POST e cai para GET; tenta JSON e cai para texto
  async function callChatAPI(text) {
    // Preferência: POST /api/chat
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      if (!r.ok) throw await buildHttpError(r);
      const ct = r.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await r.json() : { reply: await r.text() };
      return normalizeReply(data);
    } catch (e) {
      // fallback: GET /api/chat?message=
      const r = await fetch('/api/chat?message=' + encodeURIComponent(text));
      if (!r.ok) throw await buildHttpError(r);
      const ct = r.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await r.json() : { reply: await r.text() };
      return normalizeReply(data);
    }
  }

  function normalizeReply(data) {
    if (data && typeof data === 'object' && 'reply' in data) return { reply: String(data.reply ?? '') };
    if (typeof data === 'string') return { reply: data };
    return { reply: '...' };
  }

  async function buildHttpError(res) {
    let body = '';
    try { body = await res.text(); } catch {}
    return new Error(`HTTP ${res.status} ${res.statusText}: ${body?.slice(0,200) || ''}`);
  }
});