async function renderAdminProductsStudio(container) {
  container.innerHTML = '<div class="text-center py-16 text-slate-500 font-mono">Loading Product Studio...</div>';
  try {
    const prods = await fetchJSON('/api/admin/products', { headers: { 'Authorization': `Bearer ${state.adminToken}` } });
    container.innerHTML = `
      <div class="space-y-6 font-mono text-xs">
        <div class="flex justify-between items-center font-sans">
          <h1 class="text-xl font-black text-white">Product Studio</h1>
          <button onclick="openProductStudioModal('new')" class="px-4 py-2 bg-emerald-500 text-gray-950 font-black rounded-xl text-xs uppercase">+ Add Product</button>
        </div>
        <div class="admin-card rounded-3xl p-6">
          <table class="w-full text-left">
            <thead><tr class="border-b border-admin-border text-slate-500"><th class="pb-2">Name</th><th class="pb-2">Price</th><th class="pb-2">Status</th></tr></thead>
            <tbody class="divide-y divide-admin-border">${prods.map(p => `<tr><td class="py-3 text-white font-bold">${p.name}</td><td class="py-3 text-emerald-400">₹${p.sale_price}</td><td class="py-3">${p.status}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    `;
  } catch (e) { container.innerHTML = `<div class="admin-card p-8 text-rose-400 text-xs font-mono">${e.message}</div>`; }
}

async function openProductStudioModal(productId) {
  const modal = document.getElementById('globalModal');
  const content = document.getElementById('globalModalContent');
  modal.classList.remove('hidden'); modal.classList.add('flex');
  content.innerHTML = `<div class="text-white">Product Editor Modal Active for ID: ${productId}</div>`;
}
