
if (!localStorage.getItem('logado')) {
  window.location.href = 'login.html';
}

function logout() {
  localStorage.removeItem('logado');
  window.location.href = 'login.html';
}

let produtos = [];

function carregarProdutos() {
  fetch('../data/produtos.json')
    .then(res => res.json())
    .then(data => {
      produtos = data;
      renderizar();
    });
}

function renderizar() {
  const lista = document.getElementById('lista-produtos');
  lista.innerHTML = '';
  produtos.forEach((produto, i) => {
    produto.variantes.forEach((v, j) => {
      const div = document.createElement('div');
      div.className = "bg-white p-4 rounded shadow";
      div.innerHTML = `
        <h3 class="font-bold text-lg">${produto.nome} - ${v.tipo}</h3>
        <p>${v.descricao}</p>
        <p><strong>${v.preco}</strong></p>
        <p><em>${v.imagem}</em></p>
      `;
      lista.appendChild(div);
    });
  });
}

document.getElementById('form-produto').addEventListener('submit', function (e) {
  e.preventDefault();
  const nome = document.getElementById('nome').value;
  const tipo = document.getElementById('tipo').value;
  const preco = document.getElementById('preco').value;
  const descricao = document.getElementById('descricao').value;
  const imagem = document.getElementById('imagem').value;

  let existente = produtos.find(p => p.nome === nome);
  if (!existente) {
    produtos.push({ nome, variantes: [{ tipo, preco, descricao, imagem }] });
  } else {
    existente.variantes.push({ tipo, preco, descricao, imagem });
  }

  // Atualiza a visualização
  renderizar();

  // Simula o salvamento em JSON
  alert('Produto salvo localmente. Para persistir, editar o JSON diretamente.');
});

carregarProdutos();
