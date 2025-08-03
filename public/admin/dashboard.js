
document.addEventListener("DOMContentLoaded", () => {
  const tabProdutos = document.getElementById("tab-produtos");
  const tabDownloads = document.getElementById("tab-downloads");
  const sectionProdutos = document.getElementById("produtos-section");
  const sectionDownloads = document.getElementById("downloads-section");

  tabProdutos.addEventListener("click", () => {
    sectionProdutos.classList.remove("hidden");
    sectionDownloads.classList.add("hidden");
    tabProdutos.classList.add("bg-blue-600", "text-white");
    tabDownloads.classList.remove("bg-blue-600", "text-white");
    tabDownloads.classList.add("bg-gray-300", "text-black");
  });

  tabDownloads.addEventListener("click", () => {
    sectionDownloads.classList.remove("hidden");
    sectionProdutos.classList.add("hidden");
    tabDownloads.classList.add("bg-blue-600", "text-white");
    tabProdutos.classList.remove("bg-blue-600", "text-white");
    tabProdutos.classList.add("bg-gray-300", "text-black");
  });

  // Simulação de carregamento (substituir por fetch real)
  const produtos = [
    { grupo: "UniTV", itens: ["30 dias", "90 dias", "1 ano"] },
    { grupo: "TV Express", itens: ["30 dias", "1 ano"] },
  ];

  const downloads = ["EPPI.apk", "ExpressTV.apk"];

  // Render produtos
  sectionProdutos.innerHTML = produtos.map((g, idx) => `
    <div class="border rounded">
      <button class="w-full text-left p-4 font-bold bg-gray-200" onclick="toggleAccordion('p${idx}')">
        ${g.grupo}
      </button>
      <div id="p${idx}" class="hidden p-4 space-y-2 bg-white">
        ${g.itens.map(p => `<div class='border p-2 rounded shadow'>${p}</div>`).join('')}
      </div>
    </div>
  `).join('');

  // Render downloads
  sectionDownloads.innerHTML = downloads.map((d, idx) => `
    <div class="border p-4 bg-white rounded shadow">${d}</div>
  `).join('');
});

function toggleAccordion(id) {
  const el = document.getElementById(id);
  el.classList.toggle("hidden");
}
