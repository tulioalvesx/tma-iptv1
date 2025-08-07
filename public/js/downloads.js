// downloads.js
document.addEventListener("DOMContentLoaded", () => {
  function normalizeUrl(raw) {
    if (!raw) return '#';
    raw = String(raw).trim();
    if (/^https?:\/\//i.test(raw)) return raw;
    return 'https://' + raw.replace(/^\/+/, '');
  }

  function normalizeImage(src) {
    if (!src) return '';
    // mantém paths absolutos ou http(s)
    if (src.startsWith('http') || src.startsWith('/')) {
      // se vier algo tipo "/img/arquivo.png" já está ok
      return src.startsWith('/img/') ? src : src;
    }
    // força para /img/
    return `/img/${src.replace(/^\/?img\/?/i, '')}`;
  }

  fetch("/api/downloads")
    .then(res => res.json())
    .then(data => {
      const list = document.getElementById("download-list");
      if (!list) return;

      list.innerHTML = ""; // a UL já tem classe .downloads-grid no HTML

      const files = Array.isArray(data.files) ? data.files : [];
      files.forEach(item => {
        const li = document.createElement("li"); // estilos vêm do CSS (.downloads-grid > li)

        // Ícone à esquerda
        if (item.imagem) {
          const img = document.createElement("img");
          img.src = normalizeImage(item.imagem);
          img.alt = item.name || 'Download';
          li.appendChild(img);
        }

        // Bloco de texto
        const info = document.createElement("div");
        info.className = "download-info";

        const h3 = document.createElement("h3");
        // título pode ter <strong> etc. se você quiser no futuro
        h3.textContent = item.name || 'Download';
        info.appendChild(h3);

        // Descrição COM quebra de linha e formatação básica (usa innerHTML)
        const desc = document.createElement("p");
        const safeDesc = (item.description || "").trim();
        // permite <br> e <strong> (caso você envie no payload)
        desc.innerHTML = safeDesc.replace(/\n/g, "<br>");
        info.appendChild(desc);

        // Botão "Baixar"
        const link = normalizeUrl(item.url || item.link);
        if (link && link !== '#') {
          const btn = document.createElement("a");
          btn.className = "download-btn";
          btn.href = link;
          btn.target = "_blank";
          btn.rel = "noopener noreferrer";
          btn.textContent = "Baixar";
          info.appendChild(btn);
        }

        li.appendChild(info);
        list.appendChild(li);
      });
    })
    .catch(err => console.error("Erro ao carregar downloads:", err));
});