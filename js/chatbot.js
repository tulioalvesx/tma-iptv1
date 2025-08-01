
// Chatbot flutuante que envia mensagens ao servidor remoto
const chatbotBtn = document.createElement('div');
chatbotBtn.innerHTML = '<img src="assets/img/chatbot.png" alt="Chatbot" class="w-12 h-12 shadow-lg rounded-full">';
chatbotBtn.style.position = 'fixed';
chatbotBtn.style.bottom = '90px';
chatbotBtn.style.right = '20px';
chatbotBtn.style.cursor = 'pointer';
chatbotBtn.style.zIndex = 1000;
document.body.appendChild(chatbotBtn);

chatbotBtn.addEventListener('click', () => {
  const userMessage = prompt("Digite sua dúvida:");
  if (userMessage) {
    fetch('https://imperioxcc.top/chatbot/check/?k=47e8091700', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msg: userMessage })
    })
    .then(res => res.json())
    .then(data => alert("Resposta do chatbot: " + data.response))
    .catch(err => alert("Erro ao conectar com o chatbot."));
  }
});
