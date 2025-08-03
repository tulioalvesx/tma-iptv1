document.addEventListener('DOMContentLoaded', async () => {
  const produtosSection = document.getElementById('produtos-section');
  const downloadsSection = document.getElementById('downloads-section');

  const totalProdutos = document.getElementById('total-produtos');
  const totalGrupos = document.getElementById('total-grupos');
  const totalDownloads = document.getElementById('total-downloads');

  // Alternar abas
  const tabProdutos = document.getElementById('tab-produtos');
  const tabDownloads = document.getElementById('tab-downloads');

  if (tabProdutos && tabDownloads && produtosSection && downloadsSection) {
    tabProdutos.addEventListener('click', () => {
      produtosSection.classList.remove('hidden');
      downloadsSection.classList.add('hidden');
    });

    tabDownloads.addEventListener('click', () => {
      produtosSection.classList.add('hidden');
      downloadsSection.classList.remove('hidden');
    });
  }

  // Carregar grupos de produtos
  try {
    const resGrupos = await fetch('/api/groups');
    const grupos = await resGrupos.json();

    if (Array.isArray(grupos)) {
      if (totalGrupos) totalGrupos.textContent = grupos.length;
      if (totalProdutos) totalProdutos.textContent = grupos.length;

      grupos.forEach((grupo) => {
        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded shadow';
        card.innerHTML = `
          <h2 class="text-lg font-bold mb-2">${grupo.nome}</h2>
          <p>${grupo.descricao}</p>
        `;
        if (produtosSection) produtosSection.appendChild(card);
      });
    }
  } catch (e) {
    console.error('Erro ao carregar grupos:', e);
  }

  // Carregar downloads
  try {
    const resDownloads = await fetch('/api/downloads');
    const data = await resDownloads.json();
    const arquivos = Array.isArray(data.files) ? data.files : [];

    if (totalDownloads) totalDownloads.textContent = arquivos.length;

    arquivos.forEach((arquivo) => {
      const card = document.createElement('div');
      card.className = 'bg-white p-4 rounded shadow';
      card.innerHTML = `
        <h2 class="text-lg font-bold mb-2">${arquivo.name}</h2>
        <p>${arquivo.description}</p>
        <a href="${arquivo.url}" class="text-blue-600 underline">Baixar</a>
      `;
      if (downloadsSection) downloadsSection.appendChild(card);
    });
  } catch (e) {
    console.error('Erro ao carregar downloads:', e);
  }
});