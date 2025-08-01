
fetch('data/produtos.json')
  .then(response => response.json())
  .then(produtos => {
    const container = document.getElementById('produtos');
    produtos.forEach(produto => {
      produto.variantes.forEach(variacao => {
        const card = document.createElement('div');
        card.className = "bg-white rounded-lg shadow p-4 flex flex-col";

        card.innerHTML = `
          <div class="relative">
            <img src="assets/img/${variacao.imagem}" alt="${produto.nome}" class="w-full h-48 object-cover rounded">
            <div class="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 text-xs font-bold rounded">${variacao.tipo}</div>
          </div>
          <div class="flex-1 flex flex-col justify-between mt-4">
            <h2 class="text-lg font-semibold">${produto.nome}</h2>
            <p class="text-sm text-gray-600 mt-1">${variacao.descricao}</p>
            <p class="text-xl font-bold text-green-600 mt-2">${variacao.preco}</p>
            <div class="flex justify-between mt-4 space-x-2">
              <a href="#" class="bg-blue-600 text-white px-4 py-2 rounded text-sm flex-1 text-center">Comprar</a>
              <a href="#" class="bg-gray-700 text-white px-4 py-2 rounded text-sm flex-1 text-center">Download</a>
            </div>
          </div>
        `;
        container.appendChild(card);
      });
    });
  });
