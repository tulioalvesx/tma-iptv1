document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const groupId = urlParams.get("id");
  if (!groupId) return;

  try {
    const [groupsRes, productsRes] = await Promise.all([
      fetch("/api/groups"),
      fetch("/api/products")
    ]);
    const groups = await groupsRes.json();
    const produtos = await productsRes.json();

    const group = Array.isArray(groups) ? groups.find(g => g.id === groupId) : null;
    if (!group) return;

    const lang = localStorage.getItem("lang") || "pt";
    const titleEl = document.getElementById("group-title");
    const groupName = (lang === "en" && group.name_en) ? group.name_en : (group.name || group.nome || "");
    if (titleEl) titleEl.textContent = groupName;

    const filtered = Array.isArray(produtos) ? produtos.filter(p => p.grupo === groupId) : [];
    renderProducts(filtered);
  } catch (err) {
    console.error("Erro ao carregar grupo/produtos:", err);
  }
});

function normalizeImageSrc(src) {
  if (!src) return "images/placeholder.jpg";
  if (src.startsWith("/")) return src;
  return `/img/${src.replace(/^\/?img\/?/i, "")}`;
}

function renderProducts(products) {
  const container = document.getElementById("products");
  if (!container) return;
  container.innerHTML = "";

  const lang = localStorage.getItem("lang") || "pt";

  products.forEach(product => {
    const card = document.createElement("div");
    card.className = "product-card";

    // Image
    const img = document.createElement("img");
    img.src = product.imagem ? normalizeImageSrc(product.imagem) : "images/placeholder.jpg";
    img.alt = product.nome || product.name || "";
    card.appendChild(img);

    // restante da renderização (título, descrição, etc.)
    // você pode manter seu código original aqui
  });
}
