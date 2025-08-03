const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Admin credentials via env or default
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'Tul10@lv3s';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// API pública (GETs)
app.get('/api/products', (req, res) => {
  fs.readFile(path.join(__dirname, 'data', 'products.json'), (err, data) => {
    if (err) return res.status(500).json({ error: 'Erro ao carregar produtos' });
    res.json(JSON.parse(data));
  });
});

app.get('/api/groups', (req, res) => {
  fs.readFile(path.join(__dirname, 'data', 'groups.json'), (err, data) => {
    if (err) return res.status(500).json({ error: 'Erro ao carregar grupos' });
    res.json(JSON.parse(data));
  });
});

app.get('/api/downloads', (req, res) => {
  fs.readFile(path.join(__dirname, 'data', 'downloads.json'), (err, data) => {
    if (err) return res.status(500).json({ error: 'Erro ao carregar downloads' });
    res.json(JSON.parse(data));
  });
});

// Corrigido: Login da API em /api/login (não /admin/login)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Credenciais inválidas' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
