async function renderAdminProductsStudio(container) {
  container.innerHTML = `
    <div class="space-y-6 font-mono text-xs animate-pulse">
      <div class="h-10 bg-surface-900 rounded-2xl w-1/3"></div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="h-20 bg-surface-900 rounded-2xl"></div>
        <div class="h-20 bg-surface-900 rounded-2xl"></div>
        <div class="h-20 bg-surface-900 rounded-2xl"></div>
        <div class="h-20 bg-surface-900 rounded-2xl"></div>
      </div>
      <div class="h-64 bg-surface-900 rounded-3xl"></div>
    </div>
  `;

  try {
    const products = await fetchJSON('/api/admin/products', { headers: { 'Authorization': `Bearer ${state.adminToken}` } });
    state.loadedProducts = Array.isArray(products) ? products : [];
    const prods = state.loadedProducts;

    const total = prods.length;
    const published = prods.filter(p => p.status === 'active').length;
    const drafts = prods.filter(p => p.status === 'draft').length;
    const outOfStock = prods.filter(p => p.status === 'out_of_stock' || (!p.unlimited_stock && p.stock_quantity <= 0)).length;

    container.innerHTML = `
      <div class="space-y-8 font-mono text-xs pb-12 w-full max-w-full overflow-hidden">
        
        <!-- Header & Add Button -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans">
          <div>
            <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight">PRODUCT STUDIO</h1>
            <p class="text-slate-400 text-xs mt-0.5">Manage your products, pricing, availability and digital delivery.</p>
          </div>
          <button onclick="openProductStudioModal('new')" class="w-full sm:w-auto px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-center">
            + ADD PRODUCT
          </button>
        </div>

        <!-- Summary Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="admin-card p-4 rounded-2xl space-y-1"><span class="text-slate-500 block text-[9px] uppercase font-bold">Total Products</span><div class="text-xl font-black text-white font-mono">${total}</div></div>
          <div class="admin-card p-4 rounded-2xl space-y-1"><span class="text-emerald-400 block text-[9px] uppercase font-bold">Published</span><div class="text-xl font-black text-emerald-400 font-mono">${published}</div></div>
          <div class="admin-card p-4 rounded-2xl space-y-1"><span class="text-amber-400 block text-[9px] uppercase font-bold">Drafts</span><div class="text-xl font-black text-amber-400 font-mono">${drafts}</div></div>
          <div class="admin-card p-4 rounded-2xl space-y-1"><span class="text-rose-400 block text-[9px] uppercase font-bold">Out of Stock</span><div class="text-xl font-black text-rose-400 font-mono">${outOfStock}</div></div>
        </div>

        <!-- Search & Filter Toolbar -->
        <div class="admin-card rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div class="relative w-full sm:w-80">
            <input type="text" id="productSearchInput" oninput="filterProductStudioTable()" placeholder="Search products..." class="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white placeholder-slate-500 outline-none focus:border-emerald-500 text-xs">
            <svg class="w-4 h-4 text-slate-500 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <select id="productStatusFilter" onchange="filterProductStudioTable()" class="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs font-bold">
            <option value="ALL">All Statuses</option>
            <option value="active">Published</option>
            <option value="draft">Draft</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>

        <!-- Mobile Cards -->
        <div class="block md:hidden space-y-3" id="productMobileCards">
          ${prods.length === 0 ? `
            <div class="admin-card rounded-2xl p-8 text-center text-slate-500">No products yet.</div>
          ` : prods.map(p => `
            <div class="admin-card rounded-2xl p-4 space-y-3 product-item-card" data-name="${(p.name||'').toLowerCase()}" data-status="${p.status}">
              <div class="flex items-center gap-3">
                <img src="${p.images?.[0] || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=200'}" class="w-12 h-12 rounded-xl object-cover border border-admin-border bg-black/40 shrink-0">
                <div class="min-w-0 flex-1">
                  <span class="text-white font-bold text-sm block truncate">${p.name}</span>
                  <span class="text-emerald-400 font-mono text-xs font-black">₹${p.sale_price} ${p.original_price > p.sale_price ? `<span class="text-slate-500 text-[10px] line-through">₹${p.original_price}</span>` : ''}</span>
                </div>
                <span class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase shrink-0 ${p.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}">${p.status}</span>
              </div>

              <div class="pt-2 border-t border-admin-border flex justify-between items-center text-xs">
                <span class="text-slate-400 text-[10px]">Sales: ${p.sales_count || 0}</span>
                <div class="flex items-center gap-1.5">
                  <button onclick="openProductPreviewModal('${p._id}')" class="px-3 py-1.5 bg-white/5 text-slate-300 rounded-xl font-bold">Preview</button>
                  <button onclick="openProductStudioModal('${p._id}')" class="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl font-bold">Edit</button>
                  <button onclick="deleteProduct('${p._id}')" class="px-2.5 py-1.5 bg-rose-500/10 text-rose-400 rounded-xl font-bold">✕</button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Desktop Table -->
        <div class="hidden md:block admin-card rounded-3xl p-6">
          <div class="overflow-x-auto custom-scroll w-full">
            <table class="w-full text-left min-w-[850px]">
              <thead>
                <tr class="border-b border-admin-border text-slate-500 font-mono text-xs">
                  <th class="pb-3">Product Name</th>
                  <th class="pb-3">Category</th>
                  <th class="pb-3">Price</th>
                  <th class="pb-3">Status</th>
                  <th class="pb-3">Sales</th>
                  <th class="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-admin-border font-sans text-xs">
                ${prods.length === 0 ? `
                  <tr><td colspan="6" class="py-8 text-center text-slate-500">No products found.</td></tr>
                ` : prods.map(p => `
                  <tr class="hover:bg-white/[0.02] transition-colors product-desktop-row" data-name="${(p.name||'').toLowerCase()}" data-status="${p.status}">
                    <td class="py-4 flex items-center gap-3">
                      <img src="${p.images?.[0] || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=200'}" class="w-10 h-10 rounded-xl object-cover border border-admin-border bg-black/40">
                      <span class="text-white font-bold">${p.name}</span>
                    </td>
                    <td class="py-4 text-slate-300 font-mono">${p.category || 'Digital Good'}</td>
                    <td class="py-4 font-mono font-black text-emerald-400">₹${p.sale_price}</td>
                    <td class="py-4 uppercase font-semibold text-[10px]"><span class="px-2 py-0.5 rounded-full ${p.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}">${p.status}</span></td>
                    <td class="py-4 font-mono font-bold text-white">${p.sales_count || 0}</td>
                    <td class="py-4 text-right space-x-2 font-mono">
                      <button onclick="openProductPreviewModal('${p._id}')" class="px-2.5 py-1 bg-white/5 text-slate-300 rounded-lg font-bold">Preview</button>
                      <button onclick="openProductStudioModal('${p._id}')" class="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg font-bold">Edit</button>
                      <button onclick="duplicateProduct('${p._id}')" class="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg font-bold">Duplicate</button>
                      <button onclick="deleteProduct('${p._id}')" class="px-2 py-1 text-rose-400 font-bold">✕</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="admin-card p-8 text-center text-rose-400 text-xs font-mono">Error loading Product Studio: ${err.message}</div>`;
  }
}

function filterProductStudioTable() {
  const q = (document.getElementById('productSearchInput')?.value || '').toLowerCase();
  const status = document.getElementById('productStatusFilter')?.value || 'ALL';

  document.querySelectorAll('.product-item-card, .product-desktop-row').forEach(el => {
    const name = el.getAttribute('data-name') || '';
    const st = el.getAttribute('data-status') || '';
    const matchQ = name.includes(q);
    const matchSt = (status === 'ALL' || st === status);
    if (matchQ && matchSt) el.classList.remove('hidden');
    else el.classList.add('hidden');
  });
}

async function openProductStudioModal(productId) {
  const isNew = productId === 'new';
  const modal = document.getElementById('globalModal');
  const content = document.getElementById('globalModalContent');
  state.productStudioDirty = false;
  modal.classList.remove('hidden'); modal.classList.add('flex');

  let p = {
    name: '', category: 'Software & Digital Goods', original_price: 999, sale_price: 499,
    description: '', images: ['https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800'],
    delivery_type: 'EMAIL_PASSWORD', status: 'active'
  };

  if (!isNew) {
    content.innerHTML = '<div class="text-center py-12 text-slate-400 font-mono">Loading product editor...</div>';
    p = await fetchJSON(`/api/products/${productId}`);
  }

  content.innerHTML = `
    <button onclick="closeAllDrawers()" class="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
    <div class="space-y-6 font-sans text-xs">
      <div>
        <h2 class="text-base font-black text-white">${isNew ? 'Create New Product' : `Edit Product: ${p.name}`}</h2>
        <p class="text-slate-400 text-xs">Configure professional details, pricing, and digital delivery.</p>
      </div>

      <form id="productStudioForm" onsubmit="handleProductFormSubmit(event, '${productId}')" class="space-y-4 font-mono">
        <div>
          <label class="text-slate-400 block mb-1">Product Title *</label>
          <input type="text" id="pName" required value="${p.name || ''}" placeholder="Product Title" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs font-bold">
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="text-slate-400 block mb-1">Real Price (₹)</label>
            <input type="number" id="pOrigPrice" required value="${p.original_price || 999}" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs">
          </div>
          <div>
            <label class="text-slate-400 block mb-1">Selling Price (₹)</label>
            <input type="number" id="pSalePrice" required value="${p.sale_price || 499}" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-emerald-400 font-bold text-xs">
          </div>
        </div>

        <div>
          <label class="text-slate-400 block mb-1">Description</label>
          <textarea id="pDesc" rows="3" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs">${p.description || ''}</textarea>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="text-slate-400 block mb-1">Status</label>
            <select id="pStatus" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-emerald-400 font-bold text-xs">
              <option value="active" ${p.status === 'active' ? 'selected' : ''}>Published (active)</option>
              <option value="draft" ${p.status === 'draft' ? 'selected' : ''}>Draft</option>
              <option value="out_of_stock" ${p.status === 'out_of_stock' ? 'selected' : ''}>Out of Stock</option>
            </select>
          </div>
          <div>
            <label class="text-slate-400 block mb-1">Delivery Type</label>
            <select id="pDelivery" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs">
              <option value="EMAIL_PASSWORD" ${p.delivery_type === 'EMAIL_PASSWORD' ? 'selected' : ''}>Email + Password</option>
              <option value="STANDARD_LINK" ${p.delivery_type === 'STANDARD_LINK' ? 'selected' : ''}>Standard Link</option>
              <option value="LICENSE_KEY" ${p.delivery_type === 'LICENSE_KEY' ? 'selected' : ''}>License Key</option>
            </select>
          </div>
        </div>

        <div>
          <label class="text-slate-400 block mb-1">Image URL</label>
          <input type="text" id="pImage" value="${p.images?.[0] || ''}" placeholder="https://..." class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs">
        </div>

        <button type="submit" id="saveProductSubmitBtn" class="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black uppercase tracking-wider font-sans shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-xs cursor-pointer">
          ${isNew ? 'CREATE PRODUCT' : 'SAVE CHANGES'}
        </button>
      </form>
    </div>
  `;
}

async function handleProductFormSubmit(e, productId) {
  e.preventDefault();
  const isNew = productId === 'new';
  const btn = document.getElementById('saveProductSubmitBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `${SVG_SPINNER} Saving...`;
  }

  const imgUrl = document.getElementById('pImage').value.trim();
  const payload = {
    name: document.getElementById('pName').value.trim(),
    original_price: Number(document.getElementById('pOrigPrice').value) || 999,
    sale_price: Number(document.getElementById('pSalePrice').value) || 499,
    description: document.getElementById('pDesc').value.trim(),
    status: document.getElementById('pStatus').value,
    delivery_type: document.getElementById('pDelivery').value,
    images: imgUrl ? [imgUrl] : ['https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800']
  };

  try {
    const result = await fetchJSON(isNew ? '/api/admin/products' : `/api/admin/products/${productId}`, {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.adminToken}` },
      body: JSON.stringify(payload)
    });

    showToast(isNew ? '✓ Product created successfully.' : '✓ Product updated successfully.');
    document.getElementById('globalModal').classList.add('hidden');
    renderAdminProductsStudio(document.getElementById('adminMainContent'));
  } catch (err) {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = isNew ? 'CREATE PRODUCT' : 'SAVE CHANGES';
    }
    showToast(err.message, 'error');
  }
}

async function duplicateProduct(id) {
  try {
    await fetchJSON(`/api/admin/products/${id}/duplicate`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${state.adminToken}` }
    });
    showToast('✓ Product duplicated as draft!');
    renderAdminProductsStudio(document.getElementById('adminMainContent'));
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteProduct(id) {
  if (!confirm('Are you sure you want to delete this product?')) return;
  try {
    await fetchJSON(`/api/admin/products/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${state.adminToken}` } });
    showToast('✓ Product deleted successfully.');
    renderAdminProductsStudio(document.getElementById('adminMainContent'));
  } catch (err) { showToast(err.message, 'error'); }
}

async function openProductPreviewModal(id) {
  const modal = document.getElementById('globalModal');
  const content = document.getElementById('globalModalContent');
  modal.classList.remove('hidden'); modal.classList.add('flex');
  content.innerHTML = '<div class="text-center py-12 text-slate-400 font-mono">Loading product preview...</div>';

  try {
    const p = await fetchJSON(`/api/products/${id}`);
    content.innerHTML = `
      <button onclick="document.getElementById('globalModal').classList.add('hidden')" class="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
      <div class="space-y-6 font-sans">
        <span class="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[10px] uppercase">Storefront Live Preview</span>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <img src="${p.images?.[0] || ''}" class="w-full h-64 object-cover rounded-2xl border border-white/10 bg-surface-900">
          <div class="space-y-3">
            <h1 class="text-xl font-black text-white">${p.name}</h1>
            <p class="text-xs text-slate-300 leading-relaxed">${p.description || ''}</p>
            <div class="text-2xl font-black text-emerald-400 font-mono">₹${p.sale_price}</div>
          </div>
        </div>
        <div class="flex justify-end pt-4 border-t border-white/5">
          <button onclick="document.getElementById('globalModal').classList.add('hidden')" class="px-6 py-2.5 rounded-xl bg-white/10 text-white font-bold text-xs">Close</button>
        </div>
      </div>
    `;
  } catch (err) { content.innerHTML = `<div class="text-rose-400 p-6">${err.message}</div>`; }
}
