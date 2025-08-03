// group.js

// helper de toast (porque é usado aqui)
function showToast(msg, success = true) {
  let toastEl = document.getElementById("toast");
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.id = "toast";
    toastEl.className = "fixed bottom-4 right-4 text-white px-4 py-2 rounded shadow transition-opacity z-50";
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.style.backgroundColor = success ? "#16a34a" : "#dc2626";
  toastEl.style.opacity = "1";
  setTimeout(() => {
    toastEl.style.opacity = "0";
  }, 2200);
}

// Normalização de src de imagem (remove prefixos errados)
function normalizeImageSrc(src) {
  if (!src) return "images/placeholder.jpg";
  if (src.startsWith("/")) return src;
  return `/img/${src.replace(/^\/?img\/?/i, "")}`;
}

// ----------------- PÁGINA PÚBLICA DE GRUPO -----------------
document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const groupId = urlParams.get("id");
  if (!groupId) return;

  try {
    const [groupsRes, productsRes] = await Promise.all([
      fetch("/api/groups"),
      fetch("/api/products")
    ]);
    const groups = await groupsRes.json();
    const produtos = await productsRes.json();

    const group = Array.isArray(groups) ? groups.find(g => g.id === groupId) : null;
    if (!group) return;

    const lang = localStorage.getItem("lang") || "pt";
    const titleEl = document.getElementById("group-title");
    const groupName = (lang === "en" && group.name_en) ? group.name_en : (group.nome || group.name || "");
    if (titleEl) titleEl.textContent = groupName;

    const filtered = Array.isArray(produtos) ? produtos.filter(p => p.grupo === groupId) : [];
    renderProducts(filtered);
  } catch (err) {
    console.error("Erro ao carregar grupo/produtos:", err);
  }
});

function renderProducts(products) {
  const container = document.getElementById("products");
  if (!container) return;
  container.innerHTML = "";
  const lang = localStorage.getItem("lang") || "pt";

  products.forEach(product => {
    const card = document.createElement("div");
    card.className = "product-card flex gap-4 mb-4 p-4 bg-white rounded shadow";

    const imgWrapper = document.createElement("div");
    imgWrapper.className = "w-32 h-32 flex-shrink-0";
    const img = document.createElement("img");
    img.src = product.imagem ? normalizeImageSrc(product.imagem) : "images/placeholder.jpg";
    img.alt = product.nome || product.name || "";
    img.className = "object-contain w-full h-full";
    imgWrapper.appendChild(img);
    card.appendChild(imgWrapper);

    const details = document.createElement("div");
    details.className = "flex-1";

    const title = document.createElement("h3");
    const prodName = (lang === "en" && product.name_en)
      ? product.name_en
      : (product.nome || product.name || "");
    title.textContent = prodName;
    title.className = "text-xl font-bold";
    details.appendChild(title);

    const desc = document.createElement("p");
    const description = (lang === "en" && product.description_en)
      ? product.description_en
      : (product.descricao || product.description || "");
    desc.textContent = description;
    desc.className = "text-sm text-gray-600";
    details.appendChild(desc);

    const priceLine = document.createElement("div");
    priceLine.className = "mt-2 flex items-center gap-2";
    const precoNum = parseFloat(product.preco || 0) || 0;
    const priceSpan = document.createElement("span");
    priceSpan.className = "text-green-600 font-semibold";
    priceSpan.textContent = `R$ ${precoNum.toFixed(2)}`;
    priceLine.appendChild(priceSpan);
    if (product.desconto && product.desconto > 0) {
      const original = document.createElement("span");
      original.className = "line-through text-sm text-gray-500";
      original.textContent = `R$ ${precoNum.toFixed(2)}`;
      priceLine.appendChild(original);
    }
    details.appendChild(priceLine);

    const actions = document.createElement("div");
    actions.className = "mt-3 flex gap-2";
    const buyBtn = document.createElement("button");
    buyBtn.className = "px-3 py-1 bg-blue-600 text-white rounded";
    buyBtn.textContent = (lang === "en") ? "Buy" : "Comprar";
    const downloadBtn = document.createElement("button");
    downloadBtn.className = "px-3 py-1 border rounded";
    downloadBtn.textContent = (lang === "en") ? "Download" : "Download";
    actions.appendChild(buyBtn);
    actions.appendChild(downloadBtn);
    details.appendChild(actions);

    card.appendChild(details);
    container.appendChild(card);
  });
}

// ----------------- PAINEL ADMIN (carregar grupos com upload e edição inline) -----------------

async function carregarGruposAdmin() {
  try {
    const res = await fetch("/api/groups");
    const grupos = await res.json();
    const container = document.getElementById("grupos-lista");
    if (!container) return;
    container.innerHTML = "";
    if (!Array.isArray(grupos)) return;

    grupos.forEach(g => {
      const div = document.createElement("div");
      div.className = "bg-white p-4 rounded shadow flex justify-between items-center mb-3";
      div.innerHTML = `
        <div class="flex-1 flex gap-3 items-start">
          <div class="flex-shrink-0">
            <div class="w-24 h-24 bg-gray-100 flex items-center justify-center mb-1">
              ${g.imagem ? `<img src="${normalizeImageSrc(g.imagem)}" alt="${g.nome}" class="object-contain w-full h-full">` : "Sem imagem"}
            </div>
            <div class="text-xs mb-1">Upload imagem</div>
            <input type="file" data-type="grupo" data-id="${g.id}" class="upload-image-input mb-2" accept="image/*" />
            <div class="text-xs mb-1">Imagem (nome ou caminho)</div>
            <input type="text" value="${g.imagem || ""}" data-field="imagem" data-id="${g.id}" class="border px-2 py-1 rounded w-full mb-1" />
          </div>
          <div>
            <div class="font-bold text-lg">${g.nome}</div>
            <div class="text-sm text-gray-500">${g.descricao || ""}</div>
          </div>
        </div>
        <div class="flex flex-col gap-2 ml-4">
          <button data-id="${g.id}" class="btn-save-inline-grupo bg-blue-500 text-white px-3 py-1 rounded text-sm">Salvar rápido</button>
          <button data-id="${g.id}" class="btn-edit-grupo bg-yellow-400 text-white px-3 py-1 rounded text-sm">Editar completo</button>
          <button data-id="${g.id}" class="btn-delete-grupo bg-red-500 text-white px-3 py-1 rounded text-sm">Excluir</button>
        </div>
      `;
      container.appendChild(div);
    });

    // upload de imagem grupo
    container.querySelectorAll("input[data-type='grupo']").forEach(input => {
      input.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const id = e.target.dataset.id;
        const form = new FormData();
        form.append("image", file);
        form.append("type", "grupo");
        form.append("id", id);
        try {
          const up = await fetch("/api/upload-image", {
            method: "POST",
            body: form
          });
          const info = await up.json();
          if (info.success) {
            await fetch(`/api/groups/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imagem: info.filename })
            });
            showToast("Imagem do grupo atualizada");
            await carregarGruposAdmin();
          } else {
            showToast("Erro upload grupo", false);
          }
        } catch (err) {
          console.error(err);
          showToast("Erro de rede", false);
        }
      });
    });

    // salvar rápido (imagem)
    container.querySelectorAll(".btn-save-inline-grupo").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        const imagemInput = document.querySelector(`input[data-field="imagem"][data-id="${id}"]`);
        const updated = {};
        if (imagemInput) updated.imagem = imagemInput.value.trim();
        try {
          const res = await fetch(`/api/groups/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updated)
          });
          if (res.ok) {
            showToast("Grupo salvo");
            await carregarGruposAdmin();
          } else {
            showToast("Erro ao salvar grupo", false);
          }
        } catch (err) {
          console.error(err);
          showToast("Erro rede grupo", false);
        }
      });
    });

    // editar completo grupo (modal)
    container.querySelectorAll(".btn-edit-grupo").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        const groups = await fetch("/api/groups").then(r => r.json());
        const group = Array.isArray(groups) ? groups.find(g => g.id === id) : null;
        if (!group) return showToast("Grupo não encontrado", false);
        abrirModalEdicaoGrupo(group);
      });
    });

    container.querySelectorAll(".btn-delete-grupo").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        if (!confirm("Excluir grupo?")) return;
        await fetch(`/api/groups/${id}`, { method: "DELETE" });
        showToast("Grupo excluído");
        await carregarGruposAdmin();
      });
    });
  } catch (err) {
    console.error("Erro carregar grupos admin:", err);
    showToast("Falha ao carregar grupos", false);
  }
}

function abrirModalEdicaoGrupo(g) {
  const modalId = "modal-grupo";
  let existing = document.getElementById(modalId);
  if (existing) existing.remove();
  const modal = document.createElement("div");
  modal.id = modalId;
  modal.className = "fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50";
  modal.innerHTML = `
    <div class="bg-white rounded shadow max-w-md w-full p-6 relative">
      <h2 class="text-xl font-bold mb-4">Editar Grupo</h2>
      <div class="space-y-3">
        <div>
          <label class="block font-semibold">Nome</label>
          <input type="text" id="edit-grupo-nome" value="${g.nome}" class="w-full border px-2 py-1 rounded" />
        </div>
        <div>
          <label class="block font-semibold">Descrição</label>
          <textarea id="edit-grupo-desc" class="w-full border px-2 py-1 rounded">${g.descricao || ""}</textarea>
        </div>
      </div>
      <div class="mt-6 flex justify-end gap-3">
        <button id="close-grupo-modal" class="px-4 py-2 border rounded">Cancelar</button>
        <button id="save-grupo-modal" class="px-4 py-2 bg-blue-600 text-white rounded">Salvar</button>
      </div>
      <button id="x-close-grupo" class="absolute top-2 right-2 text-gray-500">&times;</button>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector("#close-grupo-modal").addEventListener("click", () => modal.remove());
  modal.querySelector("#x-close-grupo").addEventListener("click", () => modal.remove());
  modal.querySelector("#save-grupo-modal").addEventListener("click", async () => {
    const updated = {
      nome: document.getElementById("edit-grupo-nome").value,
      descricao: document.getElementById("edit-grupo-desc").value
    };
    const res = await fetch(`/api/groups/${g.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated)
    });
    if (res.ok) {
      showToast("Grupo salvo");
      await carregarGruposAdmin();
      modal.remove();
    } else {
      showToast("Erro ao salvar grupo", false);
    }
  });
}
