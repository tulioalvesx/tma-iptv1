const fs = require("fs");
const path = require("path");

const dataPath = path.join(__dirname, "..", "data", "products.json");
const outPath = path.join(__dirname, "..", "data", "products_flat.json");

if (!fs.existsSync(dataPath)) {
  console.error("Arquivo original products.json não existe em data/");
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
const flat = [];

(raw.groups || []).forEach(group => {
  (group.products || []).forEach(p => {
    flat.push({
      id: p.id,
      nome: p.name || p.nome || "",
      descricao: p.description || p.descricao || "",
      preco: p.price || p.preco || "",
      imagem: p.image || p.imagem || "",
      grupo: group.id,
      desconto: 0,
      link: p.link || "#"
    });
  });
});

fs.writeFileSync(outPath, JSON.stringify(flat, null, 2), "utf-8");
console.log("Gerado products_flat.json com", flat.length, "produtos.");
