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
    const groupName = (lang === "en" && group.name_en) ? group.name_en : (group.nome || group.name);
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
  products.forEach(product => {
    const card = document.createElement("div");
    card.className = "product-card";
    // Image
    const img = document.createElement("img");
    img.src = product.imagem ? (product.imagem.startsWith("/") ? product.imagem : `/img/${product.imagem}`) : "images/placeholder.jpg";
    img.alt = product.nome || product.name;
    card.appendChild(img);
    // Details
    const details = document.createElement("div");
    details.className = "product-details";
    // Title
    const title = document.createElement("h3");
    const lang = localStorage.getItem("lang") || "pt";
    const prodName = (lang === "en" && product.name_en) ? product.name_en : (product.nome || product.name);
    title.textContent = prodName;
    details.appendChild(title);
    // Description
    const desc = document.createElement("p");
    const description = (lang === "en" && product.description_en) ? product.description_en : (product.descricao || product.description || "");
    desc.textContent = description;
    details.appendChild(desc);
    // Price
    const priceLine = document.createElement("p");
    const priceSpan = document.createElement("span");
    priceSpan.className = "price";
    priceSpan.textContent = `R$ ${parseFloat(product.preco || 0).toFixed(2)}`;
    priceLine.appendChild(priceSpan);
    if (product.desconto && product.desconto > 0 && product.preco) {
      const original = document.createElement("span");
      original.className = "original-price ml-2 line-through text-sm text-gray-500";
      const precoNum = parseFloat(product.preco) || 0;
      const descontoAplicado = precoNum * (1 - (product.desconto / 100));
      original.textContent = `R$ ${precoNum.toFixed(2)}`;
      priceLine.appendChild(original);
      const discounted = document.createElement("div");
      discounted.className = "text-green-600 font-semibold";
      discounted.textContent = `R$ ${descontoAplicado.toFixed(2)}`;
      details.appendChild(discounted);
    }
    details.appendChild(priceLine);
    // Stock or out-of-stock
    let quantity = 1;
    if (product.estoque === undefined || product.estoque > 0) {
      const qtyControl = document.createElement("div");
      qtyControl.className = "quantity-control";
      const minusBtn = document.createElement("button");
      minusBtn.textContent = "-";
      minusBtn.addEventListener("click", () => {
        if (quantity > 1) {
          quantity--;
          qtyInput.value = quantity;
        }
      });
      const qtyInput = document.createElement("input");
      qtyInput.type = "number";
      qtyInput.value = quantity;
      qtyInput.min = 1;
      qtyInput.addEventListener("change", () => {
        const val = parseInt(qtyInput.value, 10);
        if (!isNaN(val) && val > 0) quantity = val;
      });
      const plusBtn = document.createElement("button");
      plusBtn.textContent = "+";
      plusBtn.addEventListener("click", () => {
        quantity++;
        qtyInput.value = quantity;
      });
      qtyControl.appendChild(minusBtn);
      qtyControl.appendChild(qtyInput);
      qtyControl.appendChild(plusBtn);
      details.appendChild(qtyControl);
    } else {
      const outOfStock = document.createElement("p");
      outOfStock.style.color = "red";
      outOfStock.style.fontWeight = "600";
      outOfStock.textContent = (localStorage.getItem("lang") || "pt") === "en" ? "Out of stock" : "Produto esgotado";
      details.appendChild(outOfStock);
    }
    // Actions
    const actions = document.createElement("div");
    actions.className = "product-actions";
    const buyBtn = document.createElement("button");
    buyBtn.className = "button mr-2";
    buyBtn.textContent = (localStorage.getItem("lang") || "pt") === "en" ? "Buy" : "Comprar";
    buyBtn.disabled = product.estoque === 0;
    buyBtn.addEventListener("click", () => {
      const nameForAlert = product.nome || product.name;
      alert(`Você selecionou ${quantity} unidade(s) de ${nameForAlert}.`);
    });
    const downloadBtn = document.createElement("button");
    downloadBtn.className = "button";
    downloadBtn.textContent = (localStorage.getItem("lang") || "pt") === "en" ? "Download" : "Download";
    downloadBtn.addEventListener("click", () => {
      alert("Função de download a ser definida.");
    });
    actions.appendChild(buyBtn);
    actions.appendChild(downloadBtn);
    details.appendChild(actions);

    card.appendChild(details);
    container.appendChild(card);
  });
}