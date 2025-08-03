// downloads.js
document.addEventListener("DOMContentLoaded", () => {
  fetch("/api/downloads")
    .then(res => res.json())
    .then(data => {
      const list = document.getElementById("download-list");
      if (!list) return;
      list.innerHTML = "";
      const files = Array.isArray(data.files) ? data.files : [];
      files.forEach(item => {
        const li = document.createElement("li");
        li.className = "flex gap-4 items-center mb-4";

        if (item.imagem) {
          const img = document.createElement("img");
          let src = item.imagem;
          if (!src.startsWith("/")) {
            src = `/img/${src.replace(/^\/?img\/?/i, "")}`;
          }
          img.src = src;
          img.alt = item.name;
          img.style.width = "60px";
          img.style.height = "60px";
          img.style.objectFit = "contain";
          li.appendChild(img);
        }

        const content = document.createElement("div");
        const a = document.createElement("a");
        a.href = item.url || "#";
        a.textContent = item.name;
        a.target = "_blank";
        a.style.fontWeight = "600";
        const desc = document.createElement("p");
        desc.textContent = item.description || "";
        desc.style.margin = "4px 0 0 0";
        content.appendChild(a);
        content.appendChild(desc);
        li.appendChild(content);
        list.appendChild(li);
      });
    })
    .catch(err => console.error("Erro ao carregar downloads:", err));
});
