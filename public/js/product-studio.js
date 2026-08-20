async function renderAdminProductsStudio(container) {
  container.innerHTML = `
    <div class="space-y-6 font-mono text-xs animate-pulse">
      <div class="h-10 bg-surface-900 rounded-2xl w-1/3"></div>
      <div class="h-64 bg-surface-900 rounded-3xl"></div>
    </div>
  `;

  try {
    const products = await fetchJSON('/api/products');
    state.loadedProducts = Array.isArray(products) ? products : [];
    const list = state.loadedProducts;

    const publishedCount = list.filter(p => p.status === 'PUBLISHED' || !p.status || p.status === 'ACTIVE').length;
    const draftCount = list.filter(p => p.status === 'DRAFT').length;
    const outCount = list.filter(p => p.status === 'OUT_OF_STOCK').length;

    container.innerHTML = `
      <div class="space-y-6 font-sans text-xs pb-20 w-full max-w-full animate-fadeIn">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-black text-white tracking-tight">PRODUCT STUDIO</h1>
            <p class="text-slate-400 text-xs mt-0.5 font-mono">Manage products, custom tier pricing, images, and feature configs.</p>
          </div>
          <button onclick="openProductEditModal()" class="w-full sm:w-auto px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 rounded-2xl font-black font-mono text-xs uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer">
            <span>+ Add Product</span>
          </button>
        </div>

        <!-- Metric Stat Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
          <div class="admin-card p-4 rounded-2xl space-y-1">
            <span class="text-slate-400 text-[10px] uppercase block">Total Products</span>
            <span class="text-white font-black text-xl">${list.length}</span>
          </div>
          <div class="admin-card p-4 rounded-2xl space-y-1">
            <span class="text-slate-400 text-[10px] uppercase block">Published</span>
            <span class="text-emerald-400 font-black text-xl">${publishedCount}</span>
          </div>
          <div class="admin-card p-4 rounded-2xl space-y-1">
            <span class="text-slate-400 text-[10px] uppercase block">Drafts</span>
            <span class="text-amber-400 font-black text-xl">${draftCount}</span>
          </div>
          <div class="admin-card p-4 rounded-2xl space-y-1">
            <span class="text-slate-400 text-[10px] uppercase block">Out of Stock</span>
            <span class="text-rose-400 font-black text-xl">${outCount}</span>
          </div>
        </div>

        <!-- Product Cards List -->
        <div class="space-y-3">
          ${list.length === 0 ? `
            <div class="admin-card rounded-3xl p-16 text-center text-slate-500 font-mono">No products in catalog yet. Click "+ Add Product" to create one.</div>
          ` : list.map(p => `
            <div class="admin-card rounded-3xl p-4 sm:p-5 space-y-4 border border-admin-border hover:border-emerald-500/30 transition-all shadow-xl">
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <img src="${(p.images && p.images[0]) || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=400'}" class="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0">
                  <div class="min-w-0">
                    <h3 class="text-white font-bold text-sm truncate">${p.name}</h3>
                    <div class="flex items-center gap-2 mt-0.5">
                      <span class="text-emerald-400 font-mono font-bold text-xs">₹${p.sale_price || 499}</span>
                      <span class="text-slate-500 font-mono line-through text-[11px]">₹${p.original_price || 999}</span>
                      <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-slate-400 uppercase">${p.category || 'OTT'}</span>
                    </div>
                  </div>
                </div>
                <span class="px-2.5 py-1 rounded-full uppercase text-[9px] font-mono font-bold ${p.status === 'PUBLISHED' || !p.status || p.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}">
                  ${p.status || 'ACTIVE'}
                </span>
              </div>

              <!-- Action Buttons -->
              <div class="pt-3 border-t border-admin-border flex items-center justify-between gap-2">
                <span class="text-[10px] text-slate-500 font-mono">Type: ${p.product_type || 'SUBSCRIPTION'}</span>
                <div class="flex items-center gap-2">
                  <button onclick="navigate('product-details', { id: '${p._id}' })" class="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-mono text-[11px] font-bold transition-all">
                    Preview
                  </button>
                  <button onclick="openProductEditModal('${p._id}')" class="px-4 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 font-mono text-[11px] font-bold transition-all">
                    Edit All Specs
                  </button>
                  <button onclick="deleteProductStudioItem('${p._id}')" class="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-mono text-[11px] font-bold transition-all">
                    ✕
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>

      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="admin-card p-8 text-center text-rose-400 text-xs font-mono">Error: ${err.message}</div>`;
  }
}

function openProductEditModal(productId = null) {
  const p = productId ? (state.loadedProducts.find(x => x._id === productId) || {}) : {};
  const isEdit = !!productId;

  const modal = document.getElementById('globalModal');
  const content = document.getElementById('globalModalContent');
  modal.classList.remove('hidden'); modal.classList.add('flex');

  // Multi-tier prices defaults
  const pTiers = p.subscription_pricing || {};
  const price1M = pTiers['1_MONTH']?.sale || p.sale_price || 499;
  const orig1M = pTiers['1_MONTH']?.orig || p.original_price || 999;

  const price3M = pTiers['3_MONTHS']?.sale || Math.round(price1M * 2.55);
  const orig3M = pTiers['3_MONTHS']?.orig || (orig1M * 3);

  const price6M = pTiers['6_MONTHS']?.sale || Math.round(price1M * 4.5);
  const orig6M = pTiers['6_MONTHS']?.orig || (orig1M * 6);

  const price1Y = pTiers['1_YEAR']?.sale || Math.round(price1M * 7.2);
  const orig1Y = pTiers['1_YEAR']?.orig || (orig1M * 12);

  const currentImg = (p.images && p.images[0]) || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800';

  content.innerHTML = `
    <button onclick="document.getElementById('globalModal').classList.add('hidden')" class="absolute top-4 right-4 text-slate-400 hover:text-white p-2 z-20">✕</button>
    
    <div class="space-y-6 font-sans text-xs">
      
      <!-- Modal Header -->
      <div class="border-b border-white/10 pb-4">
        <span class="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase">Product Configuration</span>
        <h2 class="text-xl font-black text-white mt-1.5 font-sans">${isEdit ? 'Edit Product & Specs' : 'Create New Product'}</h2>
      </div>

      <form onsubmit="handleSaveProductStudio(event, '${productId || ''}')" class="space-y-5">
        
        <!-- 1. General Product Details -->
        <div class="space-y-3 font-mono">
          <span class="text-slate-400 text-[10px] uppercase tracking-wider block font-bold">1. General Information</span>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="text-slate-400 text-[10px] block mb-1">Product Title</label>
              <input type="text" id="edProdName" required value="${p.name || ''}" placeholder="e.g. Amazon Prime Video" class="w-full px-4 py-3 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500 font-sans font-bold">
            </div>

            <div>
              <label class="text-slate-400 text-[10px] block mb-1">Category Badge</label>
              <input type="text" id="edProdCat" required value="${p.category || 'OTT'}" placeholder="e.g. OTT, STREAMING, SOFTWARE" class="w-full px-4 py-3 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500">
            </div>
          </div>

          <!-- Image URL & Live Preview -->
          <div class="space-y-2">
            <label class="text-slate-400 text-[10px] block">Product Image URL</label>
            <div class="flex gap-2">
              <input type="url" id="edProdImg" required value="${currentImg}" oninput="document.getElementById('edImgPreview').src = this.value" placeholder="https://images.unsplash.com/..." class="flex-1 px-4 py-3 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500">
              <img id="edImgPreview" src="${currentImg}" class="w-11 h-11 rounded-xl object-cover border border-white/10 shrink-0">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="text-slate-400 text-[10px] block mb-1">Product Type</label>
              <select id="edProdType" class="w-full px-4 py-3 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500">
                <option value="SUBSCRIPTION" ${p.product_type === 'SUBSCRIPTION' ? 'selected' : ''}>SUBSCRIPTION</option>
                <option value="ONE_TIME" ${p.product_type === 'ONE_TIME' ? 'selected' : ''}>ONE_TIME / LIFETIME</option>
              </select>
            </div>
            <div>
              <label class="text-slate-400 text-[10px] block mb-1">Store Status</label>
              <select id="edProdStatus" class="w-full px-4 py-3 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500">
                <option value="PUBLISHED" ${p.status === 'PUBLISHED' || !p.status ? 'selected' : ''}>PUBLISHED (Active)</option>
                <option value="DRAFT" ${p.status === 'DRAFT' ? 'selected' : ''}>DRAFT (Hidden)</option>
                <option value="OUT_OF_STOCK" ${p.status === 'OUT_OF_STOCK' ? 'selected' : ''}>OUT OF STOCK</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 2. Subscription Pricing Matrix -->
        <div class="space-y-3 font-mono pt-2 border-t border-white/5">
          <span class="text-slate-400 text-[10px] uppercase tracking-wider block font-bold">2. Subscription Tier Pricing (Sale vs Strikethrough)</span>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            <!-- 1 Month -->
            <div class="p-3.5 rounded-2xl bg-surface-950 border border-admin-border space-y-2">
              <span class="text-emerald-400 font-bold text-xs block">1 Month Plan</span>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-slate-500 text-[9px] block">Sale Price (₹)</label>
                  <input type="number" id="tierPrice1M" required value="${price1M}" class="w-full px-3 py-2 rounded-lg bg-surface-900 border border-admin-border text-white font-bold text-xs outline-none focus:border-emerald-500">
                </div>
                <div>
                  <label class="text-slate-500 text-[9px] block">Original (₹)</label>
                  <input type="number" id="tierOrig1M" required value="${orig1M}" class="w-full px-3 py-2 rounded-lg bg-surface-900 border border-admin-border text-slate-400 text-xs outline-none">
                </div>
              </div>
            </div>

            <!-- 3 Months -->
            <div class="p-3.5 rounded-2xl bg-surface-950 border border-admin-border space-y-2">
              <span class="text-amber-400 font-bold text-xs block">3 Months Plan (Save 15%)</span>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-slate-500 text-[9px] block">Sale Price (₹)</label>
                  <input type="number" id="tierPrice3M" required value="${price3M}" class="w-full px-3 py-2 rounded-lg bg-surface-900 border border-admin-border text-white font-bold text-xs outline-none focus:border-emerald-500">
                </div>
                <div>
                  <label class="text-slate-500 text-[9px] block">Original (₹)</label>
                  <input type="number" id="tierOrig3M" required value="${orig3M}" class="w-full px-3 py-2 rounded-lg bg-surface-900 border border-admin-border text-slate-400 text-xs outline-none">
                </div>
              </div>
            </div>

            <!-- 6 Months -->
            <div class="p-3.5 rounded-2xl bg-surface-950 border border-admin-border space-y-2">
              <span class="text-indigo-400 font-bold text-xs block">6 Months Plan (Save 25%)</span>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-slate-500 text-[9px] block">Sale Price (₹)</label>
                  <input type="number" id="tierPrice6M" required value="${price6M}" class="w-full px-3 py-2 rounded-lg bg-surface-900 border border-admin-border text-white font-bold text-xs outline-none focus:border-emerald-500">
                </div>
                <div>
                  <label class="text-slate-500 text-[9px] block">Original (₹)</label>
                  <input type="number" id="tierOrig6M" required value="${orig6M}" class="w-full px-3 py-2 rounded-lg bg-surface-900 border border-admin-border text-slate-400 text-xs outline-none">
                </div>
              </div>
            </div>

            <!-- 1 Year -->
            <div class="p-3.5 rounded-2xl bg-surface-950 border border-admin-border space-y-2">
              <span class="text-emerald-400 font-bold text-xs block">1 Year / 12 Months (Save 40%)</span>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-slate-500 text-[9px] block">Sale Price (₹)</label>
                  <input type="number" id="tierPrice1Y" required value="${price1Y}" class="w-full px-3 py-2 rounded-lg bg-surface-900 border border-admin-border text-white font-bold text-xs outline-none focus:border-emerald-500">
                </div>
                <div>
                  <label class="text-slate-500 text-[9px] block">Original (₹)</label>
                  <input type="number" id="tierOrig1Y" required value="${orig1Y}" class="w-full px-3 py-2 rounded-lg bg-surface-900 border border-admin-border text-slate-400 text-xs outline-none">
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- 3. Instructions & Rules Override -->
        <div class="space-y-2 font-mono pt-2 border-t border-white/5">
          <label class="text-slate-400 text-[10px] uppercase tracking-wider block font-bold">3. Custom Product Delivery Instructions (Optional)</label>
          <textarea id="edProdInstructions" rows="3" placeholder="Leave blank to use default (No password sharing, 1 device rule, PIN setup...)" class="w-full p-4 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500 font-sans">${p.custom_instructions || ''}</textarea>
        </div>

        <!-- Action Submit -->
        <div class="flex flex-col sm:flex-row gap-3 pt-3 border-t border-white/10">
          <button type="submit" class="w-full sm:flex-1 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 font-mono text-xs cursor-pointer active:scale-95 transition-all">
            ✓ Save & Publish Product
          </button>
          <button type="button" onclick="document.getElementById('globalModal').classList.add('hidden')" class="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold font-mono text-center">
            Cancel
          </button>
        </div>

      </form>

    </div>
  `;
}

async function handleSaveProductStudio(e, productId) {
  e.preventDefault();
  
  const payload = {
    name: document.getElementById('edProdName').value.trim(),
    category: document.getElementById('edProdCat').value.trim() || 'OTT',
    images: [document.getElementById('edProdImg').value.trim()],
    product_type: document.getElementById('edProdType').value,
    status: document.getElementById('edProdStatus').value,
    sale_price: Number(document.getElementById('tierPrice1M').value) || 499,
    original_price: Number(document.getElementById('tierOrig1M').value) || 999,
    subscription_pricing: {
      '1_MONTH': { sale: Number(document.getElementById('tierPrice1M').value) || 499, orig: Number(document.getElementById('tierOrig1M').value) || 999 },
      '3_MONTHS': { sale: Number(document.getElementById('tierPrice3M').value) || 1199, orig: Number(document.getElementById('tierOrig3M').value) || 2997 },
      '6_MONTHS': { sale: Number(document.getElementById('tierPrice6M').value) || 1999, orig: Number(document.getElementById('tierOrig6M').value) || 5994 },
      '1_YEAR': { sale: Number(document.getElementById('tierPrice1Y').value) || 2999, orig: Number(document.getElementById('tierOrig1Y').value) || 11988 }
    },
    custom_instructions: document.getElementById('edProdInstructions').value.trim()
  };

  try {
    const url = productId ? `/api/admin/products/${productId}` : '/api/admin/products';
    const method = productId ? 'PUT' : 'POST';

    await fetchJSON(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.adminToken}`
      },
      body: JSON.stringify(payload)
    });

    showToast(`✓ Product "${payload.name}" saved successfully`);
    document.getElementById('globalModal').classList.add('hidden');
    await prefetchGlobalData();
    renderAdminProductsStudio(document.getElementById('adminMainContent'));
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteProductStudioItem(productId) {
  if (!confirm('Are you sure you want to delete this product?')) return;
  try {
    await fetchJSON(`/api/admin/products/${productId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.adminToken}` }
    });
    showToast('✓ Product deleted');
    await prefetchGlobalData();
    renderAdminProductsStudio(document.getElementById('adminMainContent'));
  } catch (err) {
    showToast(err.message, 'error');
  }
}
