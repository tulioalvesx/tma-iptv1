function fetchGroups() {
  fetch('/api/groups')
    .then(res => res.json())
    .then(rawGroups => {
      const groupsContainer = document.getElementById('groups');
      if (!groupsContainer) return;
      groupsContainer.innerHTML = '';

      if (!Array.isArray(rawGroups)) {
        console.error('Grupos retornados não são array:', rawGroups);
        return;
      }

      rawGroups.forEach(g => {
        // normaliza para o formato que o resto do código espera
        const group = {
          id: g.id,
          name: g.nome || g.name || '',
          name_en: g.name_en || '',
          image: g.imagem || g.image || 'images/placeholder.jpg',
          // preserve outros campos se precisar
          ...g
        };
        const card = createGroupCard(group);
        groupsContainer.appendChild(card);
      });
    })
    .catch(err => {
      console.error('Erro ao buscar grupos:', err);
    });
}
