const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "Tul10@lv3s";

const DATA_DIR = path.join(__dirname, "data");
const PUBLIC_DIR = path.join(__dirname, "public");

// Middlewares
app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));

// Utilitários
const loadJson = (file) =>
  JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf-8"));

const saveJson = (file, data) =>
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));

// 🧠 Contador de acessos diários
const accessFile = path.join(DATA_DIR, "access.json");
if (!fs.existsSync(accessFile)) saveJson("access.json", {});

function logAccess() {
  const accesses = loadJson("access.json");
  const today = new Date().toISOString().slice(0, 10);
  accesses[today] = (accesses[today] || 0) + 1;
  saveJson("access.json", accesses);
}
app.use((req, res, next) => {
  if (!req.path.startsWith("/api/admin")) logAccess();
  next();
});

// Rotas públicas
app.get("/api/groups", (req, res) => {
  res.json(loadJson("groups.json"));
});

app.get("/api/products", (req, res) => {
  res.json(loadJson("products.json"));
});

app.get("/api/downloads", (req, res) => {
  res.json(loadJson("downloads.json"));
});

app.get("/api/analytics", (req, res) => {
  const data = loadJson("access.json");
  const sorted = Object.entries(data).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7).reverse();
  res.json({
    hoje: data[new Date().toISOString().slice(0, 10)] || 0,
    dias: sorted.map(([dia, total]) => ({ dia, total }))
  });
});

// Autenticação simples
app.post("/api/admin/login", (req, res) => {
  const { user, pass } = req.body;
  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    return res.json({ success: true });
  }
  res.status(401).json({ success: false, message: "Credenciais inválidas." });
});

// Rotas de edição futuras (a implementar)
app.post("/api/products", (req, res) => {
  res.status(501).json({ message: "Em desenvolvimento." });
});

app.post("/api/groups", (req, res) => {
  res.status(501).json({ message: "Em desenvolvimento." });
});

app.post("/api/downloads", (req, res) => {
  res.status(501).json({ message: "Em desenvolvimento." });
});

// Fallback para SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, req.path));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});