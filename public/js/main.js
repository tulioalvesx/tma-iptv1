/*
 * main.js
 * Responsible for fetching product groups and rendering the cards on the home page.
 */

document.addEventListener('DOMContentLoaded', () => {
  fetchGroups();
});

function fetchGroups() {
  fetch('/api/products')
    .then(res => res.json())
    .then(data => {
      const groupsContainer = document.getElementById('groups');
      groupsContainer.innerHTML = '';
      data.groups.forEach(group => {
        const card = createGroupCard(group);
        groupsContainer.appendChild(card);
      });
    })
    .catch(err => {
      console.error('Erro ao carregar grupos:', err);
    });
}

function createGroupCard(group) {
  const card = document.createElement('div');
  card.className = 'card';

  // Badge: show "ANUAL" if the group has only annual products; else empty
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
  // choose language
  const lang = localStorage.getItem('lang') || 'pt';
  const groupName = (lang === 'en' && group.name_en) ? group.name_en : group.name;
  title.textContent = groupName;
  card.appendChild(title);

  const button = document.createElement('button');
  button.className = 'button';
  button.setAttribute('data-i18n', 'button-details');
  // set initial button text based on current language
  button.textContent = (lang === 'en') ? 'See details' : 'Ver detalhes';
  button.addEventListener('click', () => {
    window.location.href = `/grupo.html?id=${encodeURIComponent(group.id)}`;
  });
  card.appendChild(button);

  return card;
}