// server.js (ajustado p/ /img e rotas de compatibilidade)
const fs = require('fs');
const path = require('path');
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

// Regras (nova rota) + alias para compatibilidade com o painel
const rulesRouter = require('./routes/rules');
app.use('/api/rules', rulesRouter);
app.use('/api/admin/rules', rulesRouter);

// Webhooks não existem mais -> evita quebrar a aba antiga retornando lista vazia
app.get('/api/admin/webhooks', (_, res) => res.json([]));

app.use('/api/products',  productsRouter);
app.use('/api/groups',    groupsRouter);
app.use('/api/downloads', downloadsRouter);
app.use('/api/analytics', analyticsRouter);

// Chat API
app.get('/api/chat', chatController.chat);

// ── Upload de imagens: agora salva em /public/img e responde "img/<arquivo>"
const imgDir = path.join(__dirname, 'public', 'img');
if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, imgDir),
  filename:    (_, file, cb) => {
    const ext  = path.extname(file.originalname || '');
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  }
});
const upload = multer({ storage });

app.post('/api/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'no file' });
  res.json({ success: true, filename: `img/${req.file.filename}` });
});

// servir as imagens (novo) e um alias p/ uploads antigos
app.use('/img', express.static(imgDir));
app.use('/uploads', express.static(imgDir)); // compatibilidade com registros antigos

// Favicon opcional (evita 404 no console)
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ── Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));