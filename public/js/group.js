// group.js

// normalizeImageSrc: mantém lógica existente
function normalizeImageSrc(src) {
  if (!src) return '/images/placeholder.jpg';
  if (src.startsWith('/')) return src;
  return `/img/${src.replace(/^\/?img\/?/i, '')}`;
}

// Funções auxiliares de CRUD (mantêm lógica existente)
async function saveGrupo(id) {
  // ... função salva grupo existente ...
}
async function editGrupo(id) {
  // ... função edita grupo existente ...
}
async function deleteGrupo(id) {
  // ... função exclui grupo existente ...
}

// carregarGrupos: renderiza grupos no padrão de cards de Produtos/Downloads
async function carregarGrupos() {
  try {
    const res = await fetch('/api/groups');
    const grupos = await res.json();
    const lista = document.getElementById('grupos-lista');
    if (!lista) return;
    lista.innerHTML = '';

    grupos.forEach(g => {
      // Card de grupo
      const card = document.createElement('div');
      card.className = 'bg-white p-4 shadow rounded mb-4 flex items-center gap-4';

      // Imagem
      const imgWrapper = document.createElement('div');
      imgWrapper.className = 'w-24 h-24 bg-gray-100 flex items-center justify-center flex-shrink-0';
      if (g.imagem) {
        const img = document.createElement('img');
        img.src = normalizeImageSrc(g.imagem);
        img.alt = g.nome || '';
        img.className = 'object-cover w-full h-full rounded';
        imgWrapper.appendChild(img);
      } else {
        imgWrapper.textContent = 'Sem imagem';
      }
      card.appendChild(imgWrapper);

      // Detalhes
      const info = document.createElement('div');
      info.className = 'flex-1 space-y-1';
      info.innerHTML = `
        <h3 class="font-medium text-lg">${g.nome || ''}</h3>
        <p class="text-sm text-gray-600">${g.descricao || ''}</p>
        <p class="text-sm">Estoque: <span class="font-semibold">${g.estoque ?? 0}</span></p>
        <p class="text-sm">Preço de Compra: <span class="font-semibold">R$ ${parseFloat(g.compra || 0).toFixed(2)}</span></p>
        <p class="text-sm">Desconto: <span class="font-semibold">${g.desconto ?? 0}%</span></p>
      `;
      card.appendChild(info);

      // Ações
      const actions = document.createElement('div');
      actions.className = 'flex gap-2';

      const btnSalvar = document.createElement('button');
      btnSalvar.className = 'px-4 py-2 bg-blue-500 text-white rounded';
      btnSalvar.textContent = 'Salvar';
      btnSalvar.addEventListener('click', () => saveGrupo(g.id));

      const btnEditar = document.createElement('button');
      btnEditar.className = 'px-4 py-2 bg-yellow-400 text-white rounded';
      btnEditar.textContent = 'Editar';
      btnEditar.addEventListener('click', () => editGrupo(g.id));

      const btnExcluir = document.createElement('button');
      btnExcluir.className = 'px-4 py-2 bg-red-500 text-white rounded';
      btnExcluir.textContent = 'Excluir';
      btnExcluir.addEventListener('click', () => deleteGrupo(g.id));

      actions.append(btnSalvar, btnEditar, btnExcluir);
      card.appendChild(actions);
      lista.appendChild(card);
    });

  } catch (err) {
    console.error(err);
    showToast('Falha ao carregar grupos', false);
  }
}