/* chat.js
 * Implements a floating chatbot widget with persistent state and outside-click handling.
 */
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('chat-toggle');
  const widget = document.getElementById('chat-widget');
  const messagesEl = document.getElementById('chat-messages');
  const inputEl = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');

  if (!toggle || !widget) return;

  // Load open/closed state
  const isOpen = localStorage.getItem('chatOpen') === 'true';
  widget.style.display = isOpen ? 'flex' : 'none';

  // Load previous messages
  const stored = localStorage.getItem('chatMessages');
  if (stored) {
    try {
      const msgs = JSON.parse(stored);
      msgs.forEach(m => appendMessage(m.text, m.from, false));
    } catch (e) {
      console.error('Erro ao ler chatMessages do localStorage', e);
    }
  }

  // Toggle chat window
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = widget.style.display === 'flex';
    widget.style.display = open ? 'none' : 'flex';
    localStorage.setItem('chatOpen', !open);
  });

  // Click outside to close
  document.addEventListener('click', (e) => {
    if (widget.style.display === 'flex' &&
        !widget.contains(e.target) &&
        e.target !== toggle) {
      widget.style.display = 'none';
      localStorage.setItem('chatOpen', false);
    }
  });

  // Prevent clicks inside widget from closing
  widget.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Send message handlers
  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  });

  // Append message to chat and optionally save
  function appendMessage(text, from, save = true) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${from}`;
    bubble.textContent = text;
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    if (save) {
      const msgs = JSON.parse(localStorage.getItem('chatMessages') || '[]');
      msgs.push({ text, from });
      localStorage.setItem('chatMessages', JSON.stringify(msgs));
    }
  }

  // Send message to server and handle response
   function sendMessage() {
     const message = inputEl.value.trim();
     if (!message) return;
     appendMessage(message, 'user');
     inputEl.value = '';

     fetch(`/api/chat?message=${encodeURIComponent(message)}`)
       .then(res => res.json())
       .then(data => {
         // data.reply é a resposta padrão
         appendMessage(data.reply, 'bot');

         // data.options: lista de objetos (ex: produtos) para ações de integração
         if (Array.isArray(data.options)) {
           // verifica integrationAction para determinar o tipo de integração
           if (data.integrationAction === 'products') {
             // data.options deve conter produtos com { id, nome }
             data.options.forEach(prod => {
               const btn = document.createElement('button');
               btn.textContent = prod.nome;
               btn.className = 'chat-option';
               btn.addEventListener('click', () => {
                 // adiciona produto ao carrinho via comando interno
                 appendMessage(`/add ${prod.id} 1`, 'user');
                 sendMessage();
               });
               messagesEl.appendChild(btn);
             });
           } else {
             // integração genérica: exibe opção com texto genérico
             data.options.forEach(opt => {
               const btn = document.createElement('button');
               btn.textContent = opt.nome || opt.id || 'Opção';
               btn.className = 'chat-option';
               btn.addEventListener('click', () => {
                 appendMessage(opt.trigger || `/action ${opt.id}`, 'user');
                 sendMessage();
               });
               messagesEl.appendChild(btn);
             });
           }
         }
         ;
             messagesEl.appendChild(btn);
           });
         }

         // data.externalData: se o servidor enviar dados extra
         if (data.externalData) {
           appendMessage(JSON.stringify(data.externalData), 'bot');
         }

       .catch(err => {
         console.error(err);
         appendMessage('Desculpe, erro no chat.', 'bot');
       });
});

