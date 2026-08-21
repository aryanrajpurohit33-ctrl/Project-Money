window.currentEditingGalleryImages = [];

async function renderAdminProductsStudio(container) {
  const cached = window.apiCache?.get('/api/products')?.data;
  if (cached && Array.isArray(cached)) {
    paintProductStudioHTML(container, cached);
  } else {
    container.innerHTML = getLoadingSpinnerHTML();
  }

  try {
    const products = await fetchJSON('/api/products');
    window.currentLoadedProductsList = Array.isArray(products) ? products : [];
    paintProductStudioHTML(container, window.currentLoadedProductsList);
  } catch (err) {
    if (!cached) {
      container.innerHTML = `<div class="admin-card p-8 text-center text-rose-400 text-xs font-mono rounded-3xl">Error loading products: ${err.message}</div>`;
    }
  }
}

function paintProductStudioHTML(container, products) {
  container.innerHTML = `
    <div class="space-y-6 font-sans text-xs pb-24 w-full max-w-full animate-fadeIn">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider">
              Inventory Catalog
            </span>
            <span class="text-slate-500 font-mono text-[10px]">Slideshow & Digital Listings</span>
          </div>
          <h1 class="text-2xl font-black text-white tracking-tight mt-1">Product Studio</h1>
        </div>

        <button onclick="openProductStudioModal()" class="w-fit px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-mono text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95">
          <span>+ Create New Product</span>
        </button>
      </div>

      <!-- Products Grid Feed -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${products.length === 0 ? `
          <div class="col-span-full admin-card rounded-3xl p-16 text-center space-y-2 border border-admin-border">
            <span class="text-3xl block">📦</span>
            <p class="text-slate-400 font-mono">No products listed in catalog yet.</p>
          </div>
        ` : products.map(p => {
          const imgs = Array.isArray(p.images) && p.images.length > 0 ? p.images : (p.image ? [p.image] : ['https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800']);
          return `
            <div class="admin-card rounded-3xl p-4 sm:p-5 border border-admin-border hover:border-white/15 transition-all shadow-xl space-y-4 flex flex-col justify-between">
              
              <div class="space-y-3">
                <div class="relative aspect-[16/9] rounded-2xl overflow-hidden bg-surface-950 border border-white/5">
                  <img src="${imgs[0]}" alt="${p.name}" class="w-full h-full object-contain">
                  <span class="absolute top-2 right-2 px-2.5 py-1 rounded-xl bg-surface-950/90 text-emerald-400 font-mono text-[10px] font-bold border border-white/10">
                    📷 ${imgs.length} Image${imgs.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div>
                  <span class="text-emerald-400 font-mono text-[10px] uppercase font-bold">${p.category || 'OTT'} • ${p.brand || 'Nexus'}</span>
                  <h3 class="text-white font-bold text-sm leading-tight">${p.name}</h3>
                </div>

                <div class="flex items-baseline gap-2 font-mono">
                  <span class="text-emerald-400 font-black text-base">₹${p.sale_price}</span>
                  <span class="text-slate-500 line-through text-xs">₹${p.original_price}</span>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center justify-end gap-2 pt-2 border-t border-white/5 font-mono">
                <button onclick="openProductStudioModal('${p._id}')" class="px-3.5 py-2 rounded-xl bg-surface-900 hover:bg-surface-800 border border-white/10 text-white text-[11px] font-bold transition-all cursor-pointer">
                  ✏️ Edit & Plans
                </button>
                <button onclick="handleDeleteProduct('${p._id}')" class="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-bold transition-all cursor-pointer">
                  Delete ✕
                </button>
              </div>

            </div>
          `;
        }).join('')}
      </div>

    </div>
  `;
}

function openProductStudioModal(productId = null) {
  const modal = document.getElementById('globalModal');
  const content = document.getElementById('globalModalContent');
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  let prod = null;
  if (productId) {
    prod = (window.currentLoadedProductsList || []).find(x => x._id === productId);
  }

  window.currentEditingGalleryImages = prod ? (Array.isArray(prod.images) ? [...prod.images] : (prod.image ? [prod.image] : [])) : [];

  const tiers = prod?.subscription_pricing || {};
  const p1Sale = tiers['1_MONTH']?.sale || prod?.sale_price || 149;
  const p1Orig = tiers['1_MONTH']?.orig || prod?.original_price || 649;

  const p3Sale = tiers['3_MONTHS']?.sale || Math.round(p1Sale * 2.6);
  const p3Orig = tiers['3_MONTHS']?.orig || (p1Orig * 3);

  const p6Sale = tiers['6_MONTHS']?.sale || Math.round(p1Sale * 4.8);
  const p6Orig = tiers['6_MONTHS']?.orig || (p1Orig * 6);

  const p12Sale = tiers['1_YEAR']?.sale || Math.round(p1Sale * 8.5);
  const p12Orig = tiers['1_YEAR']?.orig || (p1Orig * 12);

  content.innerHTML = `
    <button onclick="document.getElementById('globalModal').classList.add('hidden')" class="absolute top-4 right-4 text-slate-400 hover:text-white p-2 cursor-pointer">✕</button>
    
    <div class="space-y-4 font-sans text-xs max-h-[85vh] overflow-y-auto custom-scroll pr-1">
      <div class="border-b border-white/10 pb-3">
        <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase">Product Studio</span>
        <h2 class="text-lg font-black text-white mt-1">${prod ? 'Edit Product & Subscription Tiers' : 'Create New Product'}</h2>
      </div>

      <form onsubmit="handleSaveProductSubmit(event, '${productId || ''}')" class="space-y-4 font-mono">
        
        <div>
          <label class="text-slate-400 text-[10px] block mb-1">Product Title</label>
          <input type="text" id="prodTitle" required value="${prod?.name || ''}" placeholder="e.g. Netflix Premium 4K UHD (PRIVATE)" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500 font-sans">
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-slate-400 text-[10px] block mb-1">Category</label>
            <input type="text" id="prodCategory" value="${prod?.category || 'OTT'}" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500">
          </div>
          <div>
            <label class="text-slate-400 text-[10px] block mb-1">Brand Name</label>
            <input type="text" id="prodBrand" value="${prod?.brand || 'Nexus Digital'}" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500">
          </div>
        </div>

        <!-- Multi-Duration Subscription Tier Pricing Matrix -->
        <div class="p-3.5 rounded-2xl bg-surface-950 border border-white/10 space-y-3">
          <div class="flex items-center justify-between border-b border-white/5 pb-2">
            <span class="text-emerald-400 font-bold text-xs">💎 Duration Plans Pricing (1 Device Unit)</span>
            <span class="text-[9px] text-slate-400">Multiplies automatically by device qty</span>
          </div>

          <!-- 1 Month Tier -->
          <div class="p-2.5 rounded-xl bg-surface-900/90 border border-white/5 space-y-2">
            <span class="text-white font-bold text-[11px] block">1 Month Plan (Standard)</span>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-slate-400 text-[9px] block mb-0.5">Discounted Price (₹)</label>
                <input type="number" id="tier1mSale" required value="${p1Sale}" class="w-full px-3 py-2 rounded-xl bg-surface-950 border border-admin-border text-emerald-400 font-bold text-xs outline-none focus:border-emerald-500">
              </div>
              <div>
                <label class="text-slate-400 text-[9px] block mb-0.5">Real / Original Price (₹)</label>
                <input type="number" id="tier1mOrig" required value="${p1Orig}" class="w-full px-3 py-2 rounded-xl bg-surface-950 border border-admin-border text-slate-300 text-xs outline-none focus:border-emerald-500">
              </div>
            </div>
          </div>

          <!-- 3 Months Tier -->
          <div class="p-2.5 rounded-xl bg-surface-900/90 border border-white/5 space-y-2">
            <span class="text-white font-bold text-[11px] block">3 Months Plan</span>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-slate-400 text-[9px] block mb-0.5">Discounted Price (₹)</label>
                <input type="number" id="tier3mSale" required value="${p3Sale}" class="w-full px-3 py-2 rounded-xl bg-surface-950 border border-admin-border text-emerald-400 font-bold text-xs outline-none focus:border-emerald-500">
              </div>
              <div>
                <label class="text-slate-400 text-[9px] block mb-0.5">Real / Original Price (₹)</label>
                <input type="number" id="tier3mOrig" required value="${p3Orig}" class="w-full px-3 py-2 rounded-xl bg-surface-950 border border-admin-border text-slate-300 text-xs outline-none focus:border-emerald-500">
              </div>
            </div>
          </div>

          <!-- 6 Months Tier -->
          <div class="p-2.5 rounded-xl bg-surface-900/90 border border-white/5 space-y-2">
            <span class="text-white font-bold text-[11px] block">6 Months Plan</span>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-slate-400 text-[9px] block mb-0.5">Discounted Price (₹)</label>
                <input type="number" id="tier6mSale" required value="${p6Sale}" class="w-full px-3 py-2 rounded-xl bg-surface-950 border border-admin-border text-emerald-400 font-bold text-xs outline-none focus:border-emerald-500">
              </div>
              <div>
                <label class="text-slate-400 text-[9px] block mb-0.5">Real / Original Price (₹)</label>
                <input type="number" id="tier6mOrig" required value="${p6Orig}" class="w-full px-3 py-2 rounded-xl bg-surface-950 border border-admin-border text-slate-300 text-xs outline-none focus:border-emerald-500">
              </div>
            </div>
          </div>

          <!-- 1 Year Tier -->
          <div class="p-2.5 rounded-xl bg-surface-900/90 border border-white/5 space-y-2">
            <span class="text-white font-bold text-[11px] block">1 Year Plan (12 Months)</span>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-slate-400 text-[9px] block mb-0.5">Discounted Price (₹)</label>
                <input type="number" id="tier12mSale" required value="${p12Sale}" class="w-full px-3 py-2 rounded-xl bg-surface-950 border border-admin-border text-emerald-400 font-bold text-xs outline-none focus:border-emerald-500">
              </div>
              <div>
                <label class="text-slate-400 text-[9px] block mb-0.5">Real / Original Price (₹)</label>
                <input type="number" id="tier12mOrig" required value="${p12Orig}" class="w-full px-3 py-2 rounded-xl bg-surface-950 border border-admin-border text-slate-300 text-xs outline-none focus:border-emerald-500">
              </div>
            </div>
          </div>

        </div>

        <!-- Showcase Gallery Manager (Upload Only) -->
        <div class="p-3.5 rounded-2xl bg-surface-950 border border-white/10 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-emerald-400 font-bold text-xs">📷 Showcase Images</span>
            <span class="text-slate-400 text-[10px]" id="galleryCountBadge">${window.currentEditingGalleryImages.length} images added</span>
          </div>

          <div class="space-y-2">
            <input type="file" id="multiImageFileInput" accept="image/*" multiple onchange="handleMultiImageUpload(event)" class="w-full px-3 py-2.5 rounded-xl bg-surface-900 border border-admin-border text-slate-400 text-xs outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-emerald-500 file:text-gray-950 cursor-pointer">
          </div>

          <div id="galleryThumbnailsContainer" class="flex items-center gap-2 overflow-x-auto py-2 custom-scroll">
            ${renderGalleryThumbnailsHTML()}
          </div>
        </div>

        <div>
          <label class="text-slate-400 text-[10px] block mb-1">Customer Usage Rules & Instructions</label>
          <textarea id="prodInstructions" rows="2" class="w-full p-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500 font-mono">${prod?.custom_instructions || prod?.customer_instructions || 'Never share your account password.'}</textarea>
        </div>

        <div class="flex gap-2 pt-2">
          <button type="submit" id="saveProdListingBtn" class="flex-1 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black uppercase text-xs tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-500/20">
            Save Product Listing
          </button>
          <button type="button" onclick="document.getElementById('globalModal').classList.add('hidden')" class="px-4 py-3.5 rounded-xl bg-white/5 text-slate-300 font-bold cursor-pointer">
            Cancel
          </button>
        </div>

      </form>
    </div>
  `;
}

function renderGalleryThumbnailsHTML() {
  if (!window.currentEditingGalleryImages || window.currentEditingGalleryImages.length === 0) {
    return `<span class="text-slate-500 text-[10px] font-mono">No showcase images uploaded yet.</span>`;
  }
  return window.currentEditingGalleryImages.map((src, idx) => `
    <div class="relative w-16 h-16 rounded-xl overflow-hidden bg-surface-900 border border-white/10 flex-shrink-0 group">
      <img src="${src}" alt="Gallery ${idx + 1}" class="w-full h-full object-cover">
      <button type="button" onclick="removeGalleryImage(${idx})" class="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center hover:scale-110 transition-transform cursor-pointer shadow-md">
        ✕
      </button>
      <span class="absolute bottom-0.5 left-1 text-[8px] font-mono text-white/80 font-bold">#${idx + 1}</span>
    </div>
  `).join('');
}

function handleMultiImageUpload(e) {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (event) => {
      // Compress slightly to prevent large payload sizes
      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        window.currentEditingGalleryImages.push(canvas.toDataURL('image/jpeg', 0.82));
        refreshGalleryView();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function removeGalleryImage(index) {
  window.currentEditingGalleryImages.splice(index, 1);
  refreshGalleryView();
}

function refreshGalleryView() {
  const container = document.getElementById('galleryThumbnailsContainer');
  const count = document.getElementById('galleryCountBadge');
  if (container) container.innerHTML = renderGalleryThumbnailsHTML();
  if (count) count.textContent = `${window.currentEditingGalleryImages.length} images added`;
}

async function handleSaveProductSubmit(e, productId) {
  e.preventDefault();
  const btn = document.getElementById('saveProdListingBtn');
  btn.disabled = true;
  btn.innerHTML = 'Saving Listing...';

  const sale1m = Number(document.getElementById('tier1mSale').value) || 149;
  const orig1m = Number(document.getElementById('tier1mOrig').value) || 649;

  const sale3m = Number(document.getElementById('tier3mSale').value) || Math.round(sale1m * 2.6);
  const orig3m = Number(document.getElementById('tier3mOrig').value) || (orig1m * 3);

  const sale6m = Number(document.getElementById('tier6mSale').value) || Math.round(sale1m * 4.8);
  const orig6m = Number(document.getElementById('tier6mOrig').value) || (orig1m * 6);

  const sale12m = Number(document.getElementById('tier12mSale').value) || Math.round(sale1m * 8.5);
  const orig12m = Number(document.getElementById('tier12mOrig').value) || (orig1m * 12);

  const subscriptionPricing = {
    '1_MONTH': { sale: sale1m, orig: orig1m },
    '3_MONTHS': { sale: sale3m, orig: orig3m },
    '6_MONTHS': { sale: sale6m, orig: orig6m },
    '1_YEAR': { sale: sale12m, orig: orig12m }
  };

  const payload = {
    name: document.getElementById('prodTitle').value.trim(),
    category: document.getElementById('prodCategory').value.trim(),
    brand: document.getElementById('prodBrand').value.trim(),
    sale_price: sale1m,
    original_price: orig1m,
    subscription_pricing: subscriptionPricing,
    custom_instructions: document.getElementById('prodInstructions').value.trim(),
    customer_instructions: document.getElementById('prodInstructions').value.trim(),
    images: window.currentEditingGalleryImages.length > 0 ? window.currentEditingGalleryImages : ['https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800'],
    image: window.currentEditingGalleryImages[0] || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800'
  };

  try {
    if (productId) {
      await fetchJSON(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.adminToken}`
        },
        body: JSON.stringify(payload)
      });
      showToast('✓ Product & pricing tiers updated');
    } else {
      await fetchJSON('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.adminToken}`
        },
        body: JSON.stringify(payload)
      });
      showToast('✓ Product created successfully');
    }

    document.getElementById('globalModal').classList.add('hidden');
    window.apiCache?.clear();
    renderAdminProductsStudio(document.getElementById('adminMainContent'));
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = 'Save Product Listing';
    showToast(err.message, 'error');
  }
}

async function handleDeleteProduct(id) {
  if (!confirm('Are you sure you want to delete this product listing?')) return;
  try {
    await fetchJSON(`/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.adminToken}` }
    });
    showToast('✓ Product deleted');
    window.apiCache?.clear();
    renderAdminProductsStudio(document.getElementById('adminMainContent'));
  } catch (err) {
    showToast(err.message, 'error');
  }
}
