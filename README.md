
# TMA IPTV PREMIUM - Site Oficial

Este é o repositório do site institucional e comercial da TMA IPTV PREMIUM. O projeto é estático (HTML, CSS, JS puro) e pode ser facilmente hospedado na [Vercel](https://vercel.com), GitHub Pages ou qualquer serviço de CDN.

---

## 📁 Estrutura

```
.
├── index.html                 # Página inicial com destaques e WhatsApp
├── produtos.html             # Listagem dos produtos com preços e botões
├── painel/
│   ├── login.html            # Tela de login administrativo
│   └── dashboard.html        # Painel com formulário e listagem dos produtos
├── pages/
│   ├── contato.html          # Página de contato (em branco)
│   └── termos.html           # Termos de uso (em branco)
├── sucesso/index.html        # Página de sucesso após pagamento
├── data/produtos.json        # Lista de produtos exibida no site
├── js/
│   ├── main.js
│   ├── produto.js            # Renderiza os produtos dinamicamente
│   ├── painel.js             # Lógica do painel administrativo
│   └── chatbot.js            # Integração com servidor externo de chatbot
├── assets/img/               # Imagens dos produtos e ícones
└── css/style.css             # Estilos principais
```

---

## 🚀 Como Publicar na Vercel

1. Crie uma conta no [https://vercel.com](https://vercel.com)
2. Crie um novo projeto e importe este repositório (ou envie o ZIP manualmente)
3. Configure como:
   - Framework: `Other`
   - Output Directory: `/`
4. Clique em Deploy e o site estará online!

---

## 🔐 Acesso ao Painel

- Caminho: `/painel/login.html`
- Senha padrão: `admin123`
- Este painel não salva diretamente no servidor (estático). Para persistência real, recomenda-se integração com banco de dados ou API (Firebase, Supabase, etc.)

---

## 🤖 Integração com Chatbot

- O botão flutuante do chatbot está integrado ao endpoint:
```
POST https://imperioxcc.top/chatbot/check/?k=47e8091700
Body: { "msg": "mensagem do usuário" }
```

---

## 📞 WhatsApp

- Ícone flutuante fixo
- Integração direta para o número: `+55 35 99899-3464`

---

## 📌 To-Do (Futuro)

- [ ] Persistência em tempo real (Firebase ou Supabase)
- [ ] Proteção de rota por sessão
- [ ] Gerenciador de imagens via upload
- [ ] Pagamento com InfinitePay integrado
- [ ] API REST completa com CRUD de produtos
