const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "Tul10@lv3s";

const DATA_DIR = path.join(__dirname, "data");
const PUBLIC_DIR = path.join(__dirname, "public");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR));

// Helpers
const loadJson = (filename) => {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    console.error(`Erro ao parsear ${filename}:`, e);
    return null;
  }
};
const saveJson = (filename, data) => {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
};

// Garantir existence de access.json
const accessFile = path.join(DATA_DIR, "access.json");
if (!fs.existsSync(accessFile)) saveJson("access.json", {});

// Middleware para logar acesso (exceto chamadas administrativas diretas se quiser filtrar)
app.use((req, res, next) => {
  if (!req.path.startsWith("/api/admin")) {
    const access = loadJson("access.json") || {};
    const today = new Date().toISOString().slice(0, 10);
    access[today] = (access[today] || 0) + 1;
    saveJson("access.json", access);
  }
  next();
});

// --------- Autenticação ---------
app.post("/api/admin/login", (req, res) => {
  const { user, pass } = req.body;
  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    return res.json({ success: true });
  }
  res.status(401).json({ success: false, error: "Credenciais inválidas." });
});

// Rota compatível com login antigo/front (username/password)
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return res.json({ success: true });
  }
  res.status(401).json({ success: false, error: "Credenciais inválidas." });
});

// --------- Grupos ---------
app.get("/api/groups", (req, res) => {
  const groups = loadJson("groups.json") || [];
  res.json(groups);
});

app.post("/api/groups", (req, res) => {
  const { id, nome, descricao } = req.body;
  if (!id || !nome) return res.status(400).json({ success: false, error: "id e nome obrigatórios" });
  const groups = loadJson("groups.json") || [];
  if (groups.find(g => g.id === id)) return res.status(409).json({ success: false, error: "Grupo já existe" });
  groups.push({ id, nome, descricao: descricao || "" });
  saveJson("groups.json", groups);
  res.json({ success: true, group: { id, nome, descricao: descricao || "" } });
});

app.put("/api/groups/:id", (req, res) => {
  const gid = req.params.id;
  const { nome, descricao } = req.body;
  const groups = loadJson("groups.json") || [];
  const idx = groups.findIndex(g => g.id === gid);
  if (idx === -1) return res.status(404).json({ success: false, error: "Grupo não encontrado" });
  if (nome !== undefined) groups[idx].nome = nome;
  if (descricao !== undefined) groups[idx].descricao = descricao;
  saveJson("groups.json", groups);
  res.json({ success: true, group: groups[idx] });
});

app.delete("/api/groups/:id", (req, res) => {
  const gid = req.params.id;
  let groups = loadJson("groups.json") || [];
  const before = groups.length;
  groups = groups.filter(g => g.id !== gid);
  if (groups.length === before) return res.status(404).json({ success: false, error: "Grupo não encontrado" });
  saveJson("groups.json", groups);
  res.json({ success: true });
});

// --------- Produtos ---------
app.get("/api/products", (req, res) => {
  const products = loadJson("products.json") || [];
  res.json(products);
});

app.post("/api/products", (req, res) => {
  const { id, nome, descricao, preco, imagem, grupo, desconto, link } = req.body;
  if (!id || !nome) return res.status(400).json({ success: false, error: "id e nome obrigatórios" });
  const products = loadJson("products.json") || [];
  if (products.find(p => p.id === id)) return res.status(409).json({ success: false, error: "Produto já existe" });
  products.push({
    id,
    nome,
    descricao: descricao || "",
    preco: preco || "",
    imagem: imagem || "",
    grupo: grupo || "",
    desconto: desconto || 0,
    link: link || ""
  });
  saveJson("products.json", products);
  res.json({ success: true, product: products[products.length - 1] });
});

app.put("/api/products/:id", (req, res) => {
  const pid = req.params.id;
  const updates = req.body;
  const products = loadJson("products.json") || [];
  const idx = products.findIndex(p => p.id === pid);
  if (idx === -1) return res.status(404).json({ success: false, error: "Produto não encontrado" });
  products[idx] = { ...products[idx], ...updates };
  saveJson("products.json", products);
  res.json({ success: true, product: products[idx] });
});

app.delete("/api/products/:id", (req, res) => {
  const pid = req.params.id;
  let products = loadJson("products.json") || [];
  const before = products.length;
  products = products.filter(p => p.id !== pid);
  if (products.length === before) return res.status(404).json({ success: false, error: "Produto não encontrado" });
  saveJson("products.json", products);
  res.json({ success: true });
});

// --------- Downloads ---------
app.get("/api/downloads", (req, res) => {
  const downloads = loadJson("downloads.json") || { files: [] };
  res.json(downloads);
});

app.post("/api/downloads", (req, res) => {
  const { id, name, url, description } = req.body;
  if (!id || !name) return res.status(400).json({ success: false, error: "id e name obrigatórios" });
  const downloadsData = loadJson("downloads.json") || { files: [] };
  if (downloadsData.files.find(f => f.id === id)) return res.status(409).json({ success: false, error: "Download já existe" });
  downloadsData.files.push({ id, name, url: url || "#", description: description || "" });
  saveJson("downloads.json", downloadsData);
  res.json({ success: true, download: downloadsData.files.slice(-1)[0] });
});

app.put("/api/downloads/:id", (req, res) => {
  const did = req.params.id;
  const updates = req.body;
  const downloadsData = loadJson("downloads.json") || { files: [] };
  const idx = downloadsData.files.findIndex(f => f.id === did);
  if (idx === -1) return res.status(404).json({ success: false, error: "Download não encontrado" });
  downloadsData.files[idx] = { ...downloadsData.files[idx], ...updates };
  saveJson("downloads.json", downloadsData);
  res.json({ success: true, download: downloadsData.files[idx] });
});

app.delete("/api/downloads/:id", (req, res) => {
  const did = req.params.id;
  const downloadsData = loadJson("downloads.json") || { files: [] };
  const before = downloadsData.files.length;
  downloadsData.files = downloadsData.files.filter(f => f.id !== did);
  if (downloadsData.files.length === before) return res.status(404).json({ success: false, error: "Download não encontrado" });
  saveJson("downloads.json", downloadsData);
  res.json({ success: true });
});

// --------- Analytics ---------
app.get("/api/analytics", (req, res) => {
  const data = loadJson("access.json") || {};
  const hoje = data[new Date().toISOString().slice(0, 10)] || 0;
  const dias = Object.entries(data)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-7)
    .map(([dia, total]) => ({ dia, total }));
  res.json({ hoje, dias });
});

// --------- Fallback SPA / arquivos estáticos ---------
app.get("*", (req, res) => {
  const target = path.join(PUBLIC_DIR, req.path);
  if (fs.existsSync(target) && fs.statSync(target).isFile()) {
    return res.sendFile(target);
  }
  res.sendFile(path.join(PUBLIC_DIR, "admin/dashboard.html"));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});