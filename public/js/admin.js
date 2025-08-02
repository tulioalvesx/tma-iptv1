/* admin.js
 * Handles administrative tasks: login and dashboard management.
 */
(function() {
  const path = window.location.pathname;
  if (path.endsWith('/admin/login.html')) {
    initLogin();
  } else if (path.endsWith('/admin/dashboard.html')) {
    initDashboard();
  }

  /**
   * Initialize login page behaviour.
   */
  function initLogin() {
    const form = document.getElementById('login-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      }).then(res => res.json())
        .then(data => {
          if (data.success) {
            localStorage.setItem('isAdmin', 'true');
            window.location.href = '/admin/dashboard.html';
          } else {
            const error = document.getElementById('login-error');
            error.style.display = 'block';
          }
        })
        .catch(err => console.error(err));
    });
  }

  /**
   * Initialize dashboard page behaviour.
   */
  function initDashboard() {
    // Redirect to login if not authenticated
    if (localStorage.getItem('isAdmin') !== 'true') {
      window.location.href = '/admin/login.html';
      return;
    }
    // Fetch current data
    Promise.all([
      fetch('/api/products').then(res => res.json()),
      fetch('/api/downloads').then(res => res.json())
    ]).then(([productsData, downloadsData]) => {
      buildProductsSection(productsData);
      buildDownloadsSection(downloadsData);
    });
    // Save handlers
    document.getElementById('save-products').addEventListener('click', saveProducts);
    document.getElementById('save-downloads').addEventListener('click', saveDownloads);
  }

  /**
   * Build product groups admin UI.
   * @param {any} data
   */
  function buildProductsSection(data) {
    const container = document.getElementById('groups-admin');
    container.innerHTML = '';
    data.groups.forEach((group, groupIndex) => {
      const groupDiv = document.createElement('div');
      groupDiv.style.border = '1px solid #dee2e6';
      groupDiv.style.padding = '10px';
      groupDiv.style.marginBottom = '20px';
      // Group header
      const groupHeader = document.createElement('h3');
      groupHeader.textContent = `Grupo ${groupIndex + 1}: ${group.name}`;
      groupDiv.appendChild(groupHeader);
      // Inputs for group name and id and image
      const nameInput = createInput('Nome do Grupo', group.name);
      const idInput = createInput('ID do Grupo', group.id);
      const imgInput = createInput('Imagem (caminho)', group.image);
      groupDiv.appendChild(nameInput.wrapper);
      groupDiv.appendChild(idInput.wrapper);
      groupDiv.appendChild(imgInput.wrapper);
      // Products table
      const prodTable = document.createElement('table');
      prodTable.className = 'admin-table';
      const thead = document.createElement('thead');
      thead.innerHTML = '<tr><th>Nome</th><th>ID</th><th>Dias de Acesso</th><th>Preço Original</th><th>Desconto (%)</th><th>Preço</th><th>Descrição</th><th>Estoque</th><th>Imagem</th><th>Ações</th></tr>';
      prodTable.appendChild(thead);
      const tbody = document.createElement('tbody');
      // Add product rows
      group.products.forEach((prod, prodIndex) => {
        const row = createProductRow(prod, groupIndex, prodIndex);
        tbody.appendChild(row);
      });
      // Add new product row button
      const addRow = document.createElement('tr');
      const addCell = document.createElement('td');
      addCell.colSpan = 10;
      const addBtn = document.createElement('button');
      addBtn.className = 'button';
      addBtn.textContent = 'Adicionar Produto';
      addBtn.addEventListener('click', () => {
        const newProd = {
          id: '',
          name: '',
          accessDays: 0,
          originalPrice: 0,
          discountPercentage: 0,
          price: 0,
          description: '',
          stock: 0,
          image: ''
        };
        const newRow = createProductRow(newProd, groupIndex, tbody.children.length);
        tbody.appendChild(newRow);
      });
      addCell.appendChild(addBtn);
      addRow.appendChild(addCell);
      tbody.appendChild(addRow);
      prodTable.appendChild(tbody);
      groupDiv.appendChild(prodTable);
      container.appendChild(groupDiv);
    });
    // Add new group section
    const newGroupDiv = document.createElement('div');
    newGroupDiv.style.border = '1px dashed #6c757d';
    newGroupDiv.style.padding = '10px';
    newGroupDiv.style.marginBottom = '20px';
    const newGroupHeader = document.createElement('h3');
    newGroupHeader.textContent = 'Adicionar Novo Grupo';
    newGroupDiv.appendChild(newGroupHeader);
    const newName = createInput('Nome do Grupo');
    const newId = createInput('ID do Grupo');
    const newImg = createInput('Imagem (caminho)');
    newGroupDiv.appendChild(newName.wrapper);
    newGroupDiv.appendChild(newId.wrapper);
    newGroupDiv.appendChild(newImg.wrapper);
    const productsPlaceholder = document.createElement('p');
    productsPlaceholder.textContent = 'Clique em "Adicionar Produto" para inserir produtos ao novo grupo.';
    newGroupDiv.appendChild(productsPlaceholder);
    const newTable = document.createElement('table');
    newTable.className = 'admin-table';
    const newThead = document.createElement('thead');
    newThead.innerHTML = '<tr><th>Nome</th><th>ID</th><th>Dias de Acesso</th><th>Preço Original</th><th>Desconto (%)</th><th>Preço</th><th>Descrição</th><th>Estoque</th><th>Imagem</th><th>Ações</th></tr>';
    const newTbody = document.createElement('tbody');
    const addProdRow = document.createElement('tr');
    const addProdCell = document.createElement('td');
    addProdCell.colSpan = 10;
    const addProdBtn = document.createElement('button');
    addProdBtn.className = 'button';
    addProdBtn.textContent = 'Adicionar Produto';
    addProdBtn.addEventListener('click', () => {
      const newProd = {
        id: '',
        name: '',
        accessDays: 0,
        originalPrice: 0,
        discountPercentage: 0,
        price: 0,
        description: '',
        stock: 0,
        image: ''
      };
      const newRow = createProductRow(newProd, data.groups.length, newTbody.children.length);
      newTbody.appendChild(newRow);
    });
    addProdCell.appendChild(addProdBtn);
    addProdRow.appendChild(addProdCell);
    newTbody.appendChild(addProdRow);
    newTable.appendChild(newThead);
    newTable.appendChild(newTbody);
    newGroupDiv.appendChild(newTable);
    container.appendChild(newGroupDiv);
    // Store reference for new group in element dataset for saving later
    newGroupDiv.dataset.isNew = 'true';
    newGroupDiv.dataset.nameInputId = newName.inputId;
    newGroupDiv.dataset.idInputId = newId.inputId;
    newGroupDiv.dataset.imgInputId = newImg.inputId;
  }

  /**
   * Build downloads admin table.
   */
  function buildDownloadsSection(data) {
    const table = document.getElementById('downloads-admin');
    table.innerHTML = '';
    // header
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Nome</th><th>URL</th><th>Descrição</th><th>Ações</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    data.files.forEach((item, idx) => {
      const row = createDownloadRow(item);
      tbody.appendChild(row);
    });
    // Add row button
    const addRow = document.createElement('tr');
    const addCell = document.createElement('td');
    addCell.colSpan = 4;
    const addBtn = document.createElement('button');
    addBtn.className = 'button';
    addBtn.textContent = 'Adicionar Download';
    addBtn.addEventListener('click', () => {
      const newRow = createDownloadRow({ id: '', name: '', url: '', description: '' });
      tbody.appendChild(newRow);
    });
    addCell.appendChild(addBtn);
    addRow.appendChild(addCell);
    tbody.appendChild(addRow);
    table.appendChild(tbody);
  }

  /**
   * Creates an input wrapper with label and input element.
   * Returns wrapper DOM node and input element id for later retrieval.
   */
  function createInput(labelText, value = '') {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-group';
    const label = document.createElement('label');
    label.textContent = labelText;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    const inputId = `input-${Math.random().toString(36).substr(2, 9)}`;
    input.id = inputId;
    wrapper.appendChild(label);
    wrapper.appendChild(input);
    return { wrapper, input, inputId };
  }

  /**
   * Creates a table row for a product with editable fields.
   */
  function createProductRow(prod, groupIndex, prodIndex) {
    const row = document.createElement('tr');
    // Name
    row.appendChild(createCellWithInput(prod.name));
    // ID
    row.appendChild(createCellWithInput(prod.id));
    // Access days
    row.appendChild(createCellWithInput(prod.accessDays, 'number'));
    // Original price
    row.appendChild(createCellWithInput(prod.originalPrice, 'number'));
    // Discount
    row.appendChild(createCellWithInput(prod.discountPercentage, 'number'));
    // Price
    row.appendChild(createCellWithInput(prod.price, 'number'));
    // Description (textarea)
    const descCell = document.createElement('td');
    const descInput = document.createElement('textarea');
    descInput.rows = 2;
    descInput.value = prod.description;
    descCell.appendChild(descInput);
    row.appendChild(descCell);
    // Stock
    row.appendChild(createCellWithInput(prod.stock, 'number'));
    // Image
    row.appendChild(createCellWithInput(prod.image));
    // Actions
    const actionCell = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.className = 'button';
    delBtn.style.backgroundColor = '#dc3545';
    delBtn.style.margin = '0';
    delBtn.textContent = 'Remover';
    delBtn.addEventListener('click', () => {
      row.remove();
    });
    actionCell.appendChild(delBtn);
    row.appendChild(actionCell);
    return row;
  }

  /**
   * Creates a table row for a download item with editable fields.
   */
  function createDownloadRow(item) {
    const row = document.createElement('tr');
    // Name
    row.appendChild(createCellWithInput(item.name));
    // URL
    row.appendChild(createCellWithInput(item.url));
    // Description
    row.appendChild(createCellWithInput(item.description));
    // Actions
    const actionCell = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.className = 'button';
    delBtn.style.backgroundColor = '#dc3545';
    delBtn.textContent = 'Remover';
    delBtn.addEventListener('click', () => {
      row.remove();
    });
    actionCell.appendChild(delBtn);
    row.appendChild(actionCell);
    return row;
  }

  /**
   * Creates a table cell containing an input element.
   */
  function createCellWithInput(value, type = 'text') {
    const cell = document.createElement('td');
    const input = document.createElement('input');
    input.type = type;
    input.value = value !== undefined ? value : '';
    if (type === 'number') input.step = 'any';
    cell.appendChild(input);
    return cell;
  }

  /**
   * Save products by reading values from the admin interface and posting to API.
   */
  function saveProducts() {
    const groupsContainer = document.getElementById('groups-admin');
    const groupDivs = groupsContainer.children;
    const groups = [];
    for (const div of groupDivs) {
      // Check if this is the new group placeholder
      if (div.dataset.isNew === 'true') {
        const name = div.querySelector(`#${div.dataset.nameInputId}`).value.trim();
        const id = div.querySelector(`#${div.dataset.idInputId}`).value.trim();
        const image = div.querySelector(`#${div.dataset.imgInputId}`).value.trim();
        if (name && id) {
          const groupObj = { id, name, image, products: [] };
          const tbody = div.querySelector('tbody');
          // gather products rows except last row
          const rows = Array.from(tbody.children).filter(r => r.children[0] && r.children[0].querySelector('input'));
          rows.forEach(row => {
            const cells = row.children;
            const prod = {
              name: cells[0].querySelector('input').value.trim(),
              id: cells[1].querySelector('input').value.trim(),
              accessDays: parseInt(cells[2].querySelector('input').value) || 0,
              originalPrice: parseFloat(cells[3].querySelector('input').value) || 0,
              discountPercentage: parseFloat(cells[4].querySelector('input').value) || 0,
              price: parseFloat(cells[5].querySelector('input').value) || 0,
              description: cells[6].querySelector('textarea').value.trim(),
              stock: parseInt(cells[7].querySelector('input').value) || 0,
              image: cells[8].querySelector('input').value.trim()
            };
            if (prod.name && prod.id) groupObj.products.push(prod);
          });
          groups.push(groupObj);
        }
        continue;
      }
      // Existing groups
      const inputs = div.querySelectorAll('.form-group input');
      const name = inputs[0].value.trim();
      const id = inputs[1].value.trim();
      const image = inputs[2].value.trim();
      const groupObj = { id, name, image, products: [] };
      const tbody = div.querySelector('tbody');
      const rows = Array.from(tbody.children).filter(r => r.children.length && r.children[0].querySelector('input'));
      rows.forEach(row => {
        const cells = row.children;
        const prod = {
          name: cells[0].querySelector('input').value.trim(),
          id: cells[1].querySelector('input').value.trim(),
          accessDays: parseInt(cells[2].querySelector('input').value) || 0,
          originalPrice: parseFloat(cells[3].querySelector('input').value) || 0,
          discountPercentage: parseFloat(cells[4].querySelector('input').value) || 0,
          price: parseFloat(cells[5].querySelector('input').value) || 0,
          description: cells[6].querySelector('textarea').value.trim(),
          stock: parseInt(cells[7].querySelector('input').value) || 0,
          image: cells[8].querySelector('input').value.trim()
        };
        if (prod.name && prod.id) groupObj.products.push(prod);
      });
      groups.push(groupObj);
    }
    const payload = { groups };
    fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(res => res.json())
      .then(data => {
        alert('Produtos salvos com sucesso!');
        window.location.reload();
      })
      .catch(err => console.error(err));
  }

  /**
   * Save downloads by reading table values.
   */
  function saveDownloads() {
    const table = document.getElementById('downloads-admin');
    const tbody = table.querySelector('tbody');
    const files = [];
    const rows = Array.from(tbody.children).filter(r => r.children.length && r.children[0].querySelector('input'));
    rows.forEach(row => {
      const cells = row.children;
      const file = {
        name: cells[0].querySelector('input').value.trim(),
        url: cells[1].querySelector('input').value.trim(),
        description: cells[2].querySelector('input').value.trim(),
        id: ''
      };
      if (file.name) files.push(file);
    });
    const payload = { files };
    fetch('/api/downloads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(res => res.json())
      .then(data => {
        alert('Downloads salvos com sucesso!');
        window.location.reload();
      })
      .catch(err => console.error(err));
  }
})();