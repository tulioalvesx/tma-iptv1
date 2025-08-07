const fs = require('fs');
const path = require('path');
const multer = require('multer');
const express = require('express');
const path = require('path');
const app = express();
const analyticsService = require('./services/analyticsService');
const chatController = require('./controllers/chatController');

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.get('/api/chat', chatController.chat);

// Analytics middleware: count each request
app.use(async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    await analyticsService.increment(today);
  } catch (err) {
    console.error('Analytics error:', err);
  }
  next();
});

// Routers
const productsRouter  = require('./routes/products');
const groupsRouter    = require('./routes/groups');
const downloadsRouter = require('./routes/downloads');
const analyticsRouter = require('./routes/analytics');

app.use('/api/products', productsRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/downloads', downloadsRouter);
app.use('/api/analytics', analyticsRouter);

// storage em public/uploads
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename:    (_, file, cb) => {
    const ext  = path.extname(file.originalname || '');
    const name = `${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`;
    cb(null, name);
  }
});
const upload = multer({ storage });

// compatível com seu dashboard atual
app.post('/api/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success:false, error:'no file' });
  // retorne caminho relativo servível
  res.json({ success:true, filename: `uploads/${req.file.filename}` });
});

// servir as imagens
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));


// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
