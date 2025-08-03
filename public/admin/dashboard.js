document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab-btn");
  const sections = document.querySelectorAll(".tab-section");
  const toast = document.getElementById("toast");

  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 3000);
  };

  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("bg-blue-500", "text-white"));
      btn.classList.add("bg-blue-500", "text-white");

      sections.forEach(sec => sec.classList.add("hidden"));
      document.getElementById("tab-" + btn.dataset.tab).classList.remove("hidden");
    });
  });

  async function carregarDashboard() {
    try {
      const res1 = await fetch("/api/products");
      const produtos = await res1.json();
      const res2 = await fetch("/api/downloads");
      const downloads = await res2.json();
      const res3 = await fetch("/api/groups");
      const grupos = await res3.json();
      const res4 = await fetch("/api/analytics");
      const analytics = await res4.json();

      document.getElementById("total-produtos").textContent = produtos.length;
      document.getElementById("total-downloads").textContent = downloads.files.length;
      document.getElementById("total-grupos").textContent = grupos.length;
      document.getElementById("acessos-hoje").textContent = analytics.hoje || 0;

      gerarGrafico(analytics.dias || []);
    } catch (err) {
      console.error("Erro carregando dashboard:", err);
    }
  }

  function gerarGrafico(dados) {
    const ctx = document.getElementById("grafico-acessos").getContext("2d");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: dados.map(d => d.dia),
        datasets: [{
          label: "Acessos",
          data: dados.map(d => d.total),
          backgroundColor: "#3b82f6"
        }]
      },
      options: {
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  async function carregarProdutos() {
    const res = await fetch("/api/products");
    const produtos = await res.json();
    const container = document.getElementById("produtos-lista");
    container.innerHTML = "";
    produtos.forEach(p => {
      const div = document.createElement("div");
      div.className = "bg-white p-4 rounded shadow";
      div.innerHTML = `
        <div class="flex justify-between items-center">
          <div>
            <h3 class="font-bold text-lg">${p.nome}</h3>
            <p class="text-sm text-gray-500">${p.descricao}</p>
            <p class="mt-1 text-green-600 font-semibold">R$ ${p.preco}</p>
          </div>
          <button class="bg-blue-500 text-white px-4 py-1 rounded">Editar</button>
        </div>
      `;
      container.appendChild(div);
    });
  }

  async function carregarDownloads() {
    const res = await fetch("/api/downloads");
    const { files } = await res.json();
    const container = document.getElementById("downloads-lista");
    container.innerHTML = "";
    files.forEach(d => {
      const div = document.createElement("div");
      div.className = "bg-white p-4 rounded shadow";
      div.innerHTML = `
        <div class="flex justify-between items-center">
          <div>
            <h3 class="font-bold text-lg">${d.name}</h3>
            <p class="text-sm text-gray-500">${d.description}</p>
          </div>
          <button class="bg-blue-500 text-white px-4 py-1 rounded">Editar</button>
        </div>
      `;
      container.appendChild(div);
    });
  }

  async function carregarGrupos() {
    const res = await fetch("/api/groups");
    const grupos = await res.json();
    const container = document.getElementById("grupos-lista");
    container.innerHTML = "";
    grupos.forEach(g => {
      const div = document.createElement("div");
      div.className = "bg-white p-4 rounded shadow";
      div.innerHTML = `
        <div class="flex justify-between items-center">
          <div>
            <h3 class="font-bold text-lg">${g.nome}</h3>
            <p class="text-sm text-gray-500">${g.descricao}</p>
          </div>
          <button class="bg-blue-500 text-white px-4 py-1 rounded">Editar</button>
        </div>
      `;
      container.appendChild(div);
    });
  }

  carregarDashboard();
  carregarProdutos();
  carregarDownloads();
  carregarGrupos();

  document.getElementById("add-produto").addEventListener("click", () => {
    showToast("Função de adicionar produto em desenvolvimento");
  });

  document.getElementById("add-download").addEventListener("click", () => {
    showToast("Função de adicionar download em desenvolvimento");
  });

  document.getElementById("add-grupo").addEventListener("click", () => {
    showToast("Função de adicionar grupo em desenvolvimento");
  });
});