/* downloads.js
 * Populates the downloads page with list of downloadable files.
 */
document.addEventListener('DOMContentLoaded', () => {
  fetch('/api/downloads')
    .then(res => res.json())
    .then(data => {
      const list = document.getElementById('download-list');
      list.innerHTML = '';
      data.files.forEach(item => {
        const li = document.createElement('li');
        li.style.marginBottom = '16px';
        const link = document.createElement('a');
        link.href = item.url;
        link.textContent = item.name;
        link.style.fontWeight = '600';
        const desc = document.createElement('p');
        desc.textContent = item.description;
        desc.style.margin = '4px 0 0 0';
        li.appendChild(link);
        li.appendChild(desc);
        list.appendChild(li);
      });
    })
    .catch(err => console.error(err));
});