/*
 * group.js
 * Handles rendering of a single product group and its products.
 */
document.addEventListener('DOMContentLoaded', () => {
  loadGroup();
});

function loadGroup() {
  const urlParams = new URLSearchParams(window.location.search);
  const groupId = urlParams.get('id');
  if (!groupId) return;

  fetch('/api/products')
    .then(res => res.json())
    .then(data => {
      const group = data.groups.find(g => g.id === groupId);
      if (group) {
        const lang = localStorage.getItem('lang') || 'pt';
        const titleEl = document.getElementById('group-title');
        const groupName = (lang === 'en' && group.name_en) ? group.name_en : group.name;
        titleEl.textContent = groupName;
        renderProducts(group.products);
      }
    })
    .catch(err => console.error(err));
}

function renderProducts(products) {
  const container = document.getElementById('products');
  container.innerHTML = '';
  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    // Image
    const img = document.createElement('img');
    img.src = product.image || 'images/placeholder.jpg';
    img.alt = product.name;
    card.appendChild(img);
    // Details
    const details = document.createElement('div');
    details.className = 'product-details';
    // Title
    const title = document.createElement('h3');
    const lang = localStorage.getItem('lang') || 'pt';
    const prodName = (lang === 'en' && product.name_en) ? product.name_en : product.name;
    title.textContent = prodName;
    details.appendChild(title);
    // Access days and description
    const desc = document.createElement('p');
    const description = (lang === 'en' && product.description_en) ? product.description_en : product.description;
    desc.textContent = description;
    details.appendChild(desc);
    // Price line
    const priceLine = document.createElement('p');
    const priceSpan = document.createElement('span');
    priceSpan.className = 'price';
    priceSpan.textContent = `R$ ${product.price.toFixed(2)}`;
    priceLine.appendChild(priceSpan);
    if (product.discountPercentage && product.originalPrice) {
      const orig = document.createElement('span');
      orig.className = 'original-price';
      orig.textContent = `R$ ${product.originalPrice.toFixed(2)}`;
      priceLine.appendChild(orig);
    }
    details.appendChild(priceLine);
    // Quantity control if product available
    let quantity = 1;
    if (product.stock > 0) {
      const qtyControl = document.createElement('div');
      qtyControl.className = 'quantity-control';
      const minusBtn = document.createElement('button');
      minusBtn.textContent = '-';
      minusBtn.addEventListener('click', () => {
        if (quantity > 1) {
          quantity--;
          qtyInput.value = quantity;
        }
      });
      const qtyInput = document.createElement('input');
      qtyInput.type = 'number';
      qtyInput.value = quantity;
      qtyInput.min = 1;
      qtyInput.addEventListener('change', () => {
        const val = parseInt(qtyInput.value, 10);
        if (!isNaN(val) && val > 0) quantity = val;
      });
      const plusBtn = document.createElement('button');
      plusBtn.textContent = '+';
      plusBtn.addEventListener('click', () => {
        quantity++;
        qtyInput.value = quantity;
      });
      qtyControl.appendChild(minusBtn);
      qtyControl.appendChild(qtyInput);
      qtyControl.appendChild(plusBtn);
      details.appendChild(qtyControl);
    } else {
      const outOfStock = document.createElement('p');
      outOfStock.style.color = 'red';
      outOfStock.style.fontWeight = '600';
      outOfStock.setAttribute('data-i18n', 'out-of-stock');
      outOfStock.textContent = (localStorage.getItem('lang') || 'pt') === 'en' ? 'Out of stock' : 'Produto esgotado';
      details.appendChild(outOfStock);
    }
    // Actions
    const actions = document.createElement('div');
    actions.className = 'product-actions';
    const buyBtn = document.createElement('button');
    buyBtn.className = 'button';
    buyBtn.setAttribute('data-i18n', 'button-buy');
    buyBtn.textContent = (lang === 'en') ? 'Buy' : 'Comprar';
    buyBtn.disabled = product.stock <= 0;
    buyBtn.addEventListener('click', () => {
      const nameForAlert = (localStorage.getItem('lang') || 'pt') === 'en' ? prodName : product.name;
      if ((localStorage.getItem('lang') || 'pt') === 'en') {
        alert(`You selected ${quantity} unit(s) of ${nameForAlert}.`);
      } else {
        alert(`Você selecionou ${quantity} unidade(s) de ${nameForAlert}.`);
      }
    });
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'button';
    downloadBtn.setAttribute('data-i18n', 'button-download');
    downloadBtn.textContent = (lang === 'en') ? 'Download' : 'Download';
    downloadBtn.addEventListener('click', () => {
      // In a real implementation, this could trigger file download or navigate to downloads.
      if ((localStorage.getItem('lang') || 'pt') === 'en') {
        alert('Download function to be defined.');
      } else {
        alert('Função de download a ser definida.');
      }
    });
    actions.appendChild(buyBtn);
    actions.appendChild(downloadBtn);
    details.appendChild(actions);

    card.appendChild(details);
    container.appendChild(card);
  });
}