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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
