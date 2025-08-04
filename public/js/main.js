/*
 * main.js
 * Responsible for fetching product groups and rendering the cards on the home page.
 */

document.addEventListener('DOMContentLoaded', () => {
  fetchGroups();
});

function normalizeGroupImage(src) {
  if (!src) return 'images/placeholder.jpg';
  src = src.trim();
  if (src.startsWith('/')) return src;
  return `/img/${src.replace(/^\/?img\/?/i, '')}`;
}

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
          name: g.name || g.nome || '',
          name_en: g.name_en || '',
          image: normalizeGroupImage(g.image || g.imagem || 'images/placeholder.jpg'),
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

function createGroupCard(group) {
  const card = document.createElement('div');
  card.className = 'card';

  const badge = document.createElement('div');
  badge.className = 'badge';
  badge.textContent = 'Grupo';
  card.appendChild(badge);

  const img = document.createElement('img');
  img.src = group.image || 'images/placeholder.jpg';
  img.alt = group.name;
  card.appendChild(img);

  const title = document.createElement('div');
  title.className = 'card-title';
  const lang = localStorage.getItem('lang') || 'pt';
  const groupName = (lang === 'en' && group.name_en) ? group.name_en : group.name;
  title.textContent = groupName;
  card.appendChild(title);

  const button = document.createElement('button');
  button.className = 'button';
  button.setAttribute('data-i18n', 'button-details');
  button.textContent = (lang === 'en') ? 'See details' : 'Ver detalhes';
  button.addEventListener('click', () => {
    window.location.href = `/grupo.html?id=${encodeURIComponent(group.id)}`;
  });
  card.appendChild(button);

  return card;
}
