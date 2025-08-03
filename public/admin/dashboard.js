
document.addEventListener("DOMContentLoaded", () => {
  const tabProdutos = document.getElementById("tab-produtos");
  const tabDownloads = document.getElementById("tab-downloads");
  const sectionProdutos = document.getElementById("produtos-section");
  const sectionDownloads = document.getElementById("downloads-section");

  const totalProdutos = document.getElementById("total-produtos");
  const totalGrupos = document.getElementById("total-grupos");
  const totalDownloads = document.getElementById("total-downloads");

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

  // Carregar dados reais
  fetch("/api/groups")
    .then(res => res.json())
    .then(data => {
      totalGrupos.textContent = data.length;
      let total = 0;
      sectionProdutos.innerHTML = data.map((grupo, idx) => {
        total += grupo.products.length;
        return `
          <div class="border rounded">
            <button onclick="toggleAccordion('grupo${idx}')" class="w-full text-left p-4 bg-gray-200 font-bold">${grupo.name}</button>
            <div id="grupo${idx}" class="hidden p-4 bg-white space-y-2">
              ${grupo.products.map(prod => `
                <div class="border p-2 rounded shadow flex justify-between items-center">
                  <span>${prod.name} - R$ ${prod.price}</span>
                  <div class="space-x-2">
                    <button class="bg-yellow-400 text-white px-2 py-1 rounded">Editar</button>
                    <button class="bg-red-500 text-white px-2 py-1 rounded">Excluir</button>
                  </div>
                </div>
              `).join('')}
              <button class="mt-2 bg-green-600 text-white px-3 py-1 rounded">+ Novo Produto</button>
            </div>
          </div>
        `;
      }).join('');
      totalProdutos.textContent = total;
    });

  fetch("/api/downloads")
    .then(res => res.json())
    .then(data => {
      totalDownloads.textContent = data.length;
      sectionDownloads.innerHTML = data.map((app, idx) => `
        <div class="border p-4 bg-white rounded shadow flex justify-between items-center">
          <span>${app.name}</span>
          <div class="space-x-2">
            <button class="bg-yellow-400 text-white px-2 py-1 rounded">Editar</button>
            <button class="bg-red-500 text-white px-2 py-1 rounded">Excluir</button>
          </div>
        </div>
      `).join('') + '<button class="mt-4 bg-green-600 text-white px-4 py-2 rounded">+ Novo App</button>';
    });
});

function toggleAccordion(id) {
  const el = document.getElementById(id);
  el.classList.toggle("hidden");
}
