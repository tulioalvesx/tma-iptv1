// server.js (versão ajustada)
const fs = require('fs');
const path = require('path');              // (removi o require duplicado)
const express = require('express');
const multer = require('multer');

const app = express();

const analyticsService = require('./services/analyticsService');
const chatController   = require('./controllers/chatController');

// ── Middlewares base
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Analytics: precisa vir ANTES das rotas para contar tudo (inclusive /api/chat)
app.use(async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    await analyticsService.increment(today);
  } catch (err) {
    console.error('Analytics error:', err);
  }
  next();
});

// ── Rotas principais
const productsRouter  = require('./routes/products');
const groupsRouter    = require('./routes/groups');
const downloadsRouter = require('./routes/downloads');
const analyticsRouter = require('./routes/analytics');

// (se você já criou routes/rules.js, mantenha estas duas linhas)
const rulesRouter     = require('./routes/rules');
app.use('/api/rules', rulesRouter);
// Alias de compatibilidade para o painel antigo:
app.use('/api/admin/rules', rulesRouter);

// Webhooks não existem mais -> evita quebrar a aba antiga retornando vazio
app.get('/api/admin/webhooks', (_, res) => res.json([]));

app.use('/api/products',  productsRouter);
app.use('/api/groups',    groupsRouter);
app.use('/api/downloads', downloadsRouter);
app.use('/api/analytics', analyticsRouter);

// Chat API (agora depois do analytics para contar acesso)
app.get('/api/chat', chatController.chat);

// ── Upload de imagens (compatível com o dashboard)
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const ext  = path.extname(file.originalname || '');
    const name = `${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({ storage });

app.post('/api/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'no file' });
  res.json({ success: true, filename: `uploads/${req.file.filename}` });
});

app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Favicon opcional (evita 404 no console)
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ── Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
