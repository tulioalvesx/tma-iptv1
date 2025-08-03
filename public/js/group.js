// group.js
function normalizeImageSrc(src) {
  if (!src) return "images/placeholder.jpg";
  if (src.startsWith("/")) return src;
  return `/img/${src.replace(/^\/?img\/?/i, "")}`;
}

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
    const groupName = (lang === "en" && group.name_en) ? group.name_en : (group.nome || group.name || "");
    if (titleEl) titleEl.textContent = groupName;

    const filtered = Array.isArray(produtos) ? produtos.filter(p => p.grupo === groupId) : [];
    renderProducts(filtered);
  } catch (err) {
    console.error("Erro ao carregar grupo/produtos:", err);
  }
});

function renderProducts(products) {
  const container = document.getElementById("products");
  if (!container) return;
  container.innerHTML = "";
  const lang = localStorage.getItem("lang") || "pt";

  products.forEach(product => {
    const card = document.createElement("div");
    card.className = "product-card flex gap-4 mb-4 p-4 bg-white rounded shadow";

    const imgWrapper = document.createElement("div");
    imgWrapper.className = "w-32 h-32 flex-shrink-0";
    const img = document.createElement("img");
    img.src = product.imagem ? normalizeImageSrc(product.imagem) : "images/placeholder.jpg";
    img.alt = product.nome || product.name || "";
    img.className = "object-contain w-full h-full";
    imgWrapper.appendChild(img);
    card.appendChild(imgWrapper);

    const details = document.createElement("div");
    details.className = "flex-1";

    const title = document.createElement("h3");
    const prodName = (lang === "en" && product.name_en)
      ? product.name_en
      : (product.nome || product.name || "");
    title.textContent = prodName;
    title.className = "text-xl font-bold";
    details.appendChild(title);

    const desc = document.createElement("p");
    const description = (lang === "en" && product.description_en)
      ? product.description_en
      : (product.descricao || product.description || "");
    desc.textContent = description;
    desc.className = "text-sm text-gray-600";
    details.appendChild(desc);

    const priceLine = document.createElement("div");
    priceLine.className = "mt-2 flex items-center gap-2";
    const precoNum = parseFloat(product.preco || 0) || 0;
    const priceSpan = document.createElement("span");
    priceSpan.className = "text-green-600 font-semibold";
    priceSpan.textContent = `R$ ${precoNum.toFixed(2)}`;
    priceLine.appendChild(priceSpan);
    if (product.desconto && product.desconto > 0) {
      const original = document.createElement("span");
      original.className = "line-through text-sm text-gray-500";
      original.textContent = `R$ ${precoNum.toFixed(2)}`;
      priceLine.appendChild(original);
    }
    details.appendChild(priceLine);

    const actions = document.createElement("div");
    actions.className = "mt-3 flex gap-2";
    const buyBtn = document.createElement("button");
    buyBtn.className = "px-3 py-1 bg-blue-600 text-white rounded";
    buyBtn.textContent = (lang === "en") ? "Buy" : "Comprar";
    const downloadBtn = document.createElement("button");
    downloadBtn.className = "px-3 py-1 border rounded";
    downloadBtn.textContent = (lang === "en") ? "Download" : "Download";
    actions.appendChild(buyBtn);
    actions.appendChild(downloadBtn);
    details.appendChild(actions);

    card.appendChild(details);
    container.appendChild(card);
  });
}
