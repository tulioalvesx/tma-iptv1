document.addEventListener('DOMContentLoaded', () => {
  fetch('/api/downloads')
    .then(res => res.json())
    .then(data => {
      const list = document.getElementById('download-list');
      if (!list) return;
      list.innerHTML = '';
      (Array.isArray(data.files) ? data.files : []).forEach(item => {
        const li = document.createElement('li');
        li.style.marginBottom = '16px';
        li.className = 'flex gap-4 items-center';

        if (item.imagem) {
          const img = document.createElement('img');
          img.src = item.imagem.startsWith('/') ? item.imagem : `/img/${item.imagem}`;
          img.alt = item.name;
          img.style.width = '60px';
          img.style.height = '60px';
          img.style.objectFit = 'contain';
          li.appendChild(img);
        }

        const content = document.createElement('div');
        const link = document.createElement('a');
        link.href = item.url;
        link.textContent = item.name;
        link.style.fontWeight = '600';
        const desc = document.createElement('p');
        desc.textContent = item.description;
        desc.style.margin = '4px 0 0 0';
        content.appendChild(link);
        content.appendChild(desc);
        li.appendChild(content);
        list.appendChild(li);
      });
    })
    .catch(err => console.error(err));
});