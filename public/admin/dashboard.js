
document.addEventListener("DOMContentLoaded", async () => {
  const totalProdutosEl = document.getElementById("totalProdutos");
  const totalGruposEl = document.getElementById("totalGrupos");
  const totalDownloadsEl = document.getElementById("totalDownloads");
  const totalAcessosEl = document.getElementById("totalAcessos");

  try {
    const response = await fetch("/api/groups");
    const groups = await response.json();

    if (Array.isArray(groups)) {
      const totalProdutos = groups.reduce(
        (sum, g) => sum + (g.produtos?.length || 0),
        0
      );
      totalProdutosEl.textContent = totalProdutos;
      totalGruposEl.textContent = groups.length;
    } else {
      console.warn("API /api/groups não retornou array");
    }
  } catch (error) {
    console.error("Erro ao carregar grupos:", error);
  }

  try {
    const res = await fetch("/api/downloads");
    const downloads = await res.json();

    if (Array.isArray(downloads)) {
      totalDownloadsEl.textContent = downloads.length;
    } else {
      console.warn("API /api/downloads não retornou array");
    }
  } catch (error) {
    console.error("Erro ao carregar downloads:", error);
  }

  // Simulando contagem de acessos (fake)
  totalAcessosEl.textContent = "1234";
});
