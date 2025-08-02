/* chat.js
 * Implements a simple floating chatbot widget. Works across pages that include the chat markup.
 */
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('chat-toggle');
  const widget = document.getElementById('chat-widget');
  const messagesEl = document.getElementById('chat-messages');
  const inputEl = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');

  if (!toggle || !widget) return;

  toggle.addEventListener('click', () => {
    widget.style.display = widget.style.display === 'flex' ? 'none' : 'flex';
  });

  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  });

  function appendMessage(text, from) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${from}`;
    bubble.textContent = text;
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function sendMessage() {
    const message = inputEl.value.trim();
    if (!message) return;
    appendMessage(message, 'user');
    inputEl.value = '';
    // Call API
    fetch(`/api/chat?message=${encodeURIComponent(message)}`)
      .then(res => res.json())
      .then(data => {
        appendMessage(data.reply, 'bot');
      })
      .catch(err => {
        console.error(err);
        appendMessage('Erro ao obter resposta do servidor.', 'bot');
      });
  }
});