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
                  ✏️ Edit & Photos
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

  content.innerHTML = `
    <button onclick="document.getElementById('globalModal').classList.add('hidden')" class="absolute top-4 right-4 text-slate-400 hover:text-white p-2">✕</button>
    
    <div class="space-y-4 font-sans text-xs">
      <div class="border-b border-white/10 pb-3">
        <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase">Product Studio</span>
        <h2 class="text-lg font-black text-white mt-1">${prod ? 'Edit Product & Showcase Gallery' : 'Create New Product'}</h2>
      </div>

      <form onsubmit="handleSaveProductSubmit(event, '${productId || ''}')" class="space-y-4 font-mono">
        
        <div>
          <label class="text-slate-400 text-[10px] block mb-1">Product Title</label>
          <input type="text" id="prodTitle" required value="${prod?.name || ''}" placeholder="e.g. Netflix Premium 4K UHD (PRIVATE)" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500">
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

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-slate-400 text-[10px] block mb-1">Sale Price (₹)</label>
            <input type="number" id="prodSalePrice" required value="${prod?.sale_price || 499}" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500">
          </div>
          <div>
            <label class="text-slate-400 text-[10px] block mb-1">Original Price (₹)</label>
            <input type="number" id="prodOrigPrice" required value="${prod?.original_price || 999}" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500">
          </div>
        </div>

        <!-- Multi-Image Showcase Gallery Manager -->
        <div class="p-3.5 rounded-2xl bg-surface-950 border border-white/10 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-emerald-400 font-bold text-xs">📷 Showcase Images</span>
            <span class="text-slate-400 text-[10px]" id="galleryCountBadge">${window.currentEditingGalleryImages.length} images added</span>
          </div>

          <!-- Add Image by File Upload or URL -->
          <div class="space-y-2">
            <div class="flex gap-2">
              <input type="url" id="newImageUrlInput" placeholder="Paste Image URL (https://...)" class="flex-1 px-3 py-2 rounded-xl bg-surface-900 border border-admin-border text-white text-xs outline-none focus:border-emerald-500">
              <button type="button" onclick="handleAddImageUrl()" class="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer">
                + Add URL
              </button>
            </div>

            <div class="relative">
              <input type="file" id="multiImageFileInput" accept="image/*" multiple onchange="handleMultiImageUpload(event)" class="w-full px-3 py-2 rounded-xl bg-surface-900 border border-admin-border text-slate-400 text-xs outline-none file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-emerald-500 file:text-gray-950 cursor-pointer">
            </div>
          </div>

          <!-- Live Thumbnails Strip -->
          <div id="galleryThumbnailsContainer" class="flex items-center gap-2 overflow-x-auto py-2 custom-scroll">
            ${renderGalleryThumbnailsHTML()}
          </div>
        </div>

        <div>
          <label class="text-slate-400 text-[10px] block mb-1">Customer Usage Rules & Instructions</label>
          <textarea id="prodInstructions" rows="2" class="w-full p-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500 font-mono">${prod?.custom_instructions || prod?.customer_instructions || 'Never share your account password.'}</textarea>
        </div>

        <div class="flex gap-2 pt-2">
          <button type="submit" class="flex-1 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black uppercase text-xs tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-500/20">
            Save Product Listing
          </button>
          <button type="button" onclick="document.getElementById('globalModal').classList.add('hidden')" class="px-4 py-3.5 rounded-xl bg-white/5 text-slate-300 font-bold">
            Cancel
          </button>
        </div>

      </form>
    </div>
  `;
}

function renderGalleryThumbnailsHTML() {
  if (!window.currentEditingGalleryImages || window.currentEditingGalleryImages.length === 0) {
    return `<span class="text-slate-500 text-[10px] font-mono">No showcase images added yet.</span>`;
  }
  return window.currentEditingGalleryImages.map((src, idx) => `
    <div class="relative w-16 h-16 rounded-xl overflow-hidden bg-surface-900 border border-white/10 flex-shrink-0 group">
      <img src="${src}" alt="Gallery ${idx + 1}" class="w-full h-full object-cover">
      <button type="button" onclick="removeGalleryImage(${idx})" class="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white font-bold text-[9px] flex items-center justify-center hover:scale-110 transition-transform">
        ✕
      </button>
      <span class="absolute bottom-0.5 left-1 text-[8px] font-mono text-white/80 font-bold">#${idx + 1}</span>
    </div>
  `).join('');
}

function handleAddImageUrl() {
  const input = document.getElementById('newImageUrlInput');
  const val = input.value.trim();
  if (!val) return;
  window.currentEditingGalleryImages.push(val);
  input.value = '';
  refreshGalleryView();
}

function handleMultiImageUpload(e) {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (event) => {
      window.currentEditingGalleryImages.push(event.target.result);
      refreshGalleryView();
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

  const payload = {
    name: document.getElementById('prodTitle').value.trim(),
    category: document.getElementById('prodCategory').value.trim(),
    brand: document.getElementById('prodBrand').value.trim(),
    sale_price: Number(document.getElementById('prodSalePrice').value) || 499,
    original_price: Number(document.getElementById('prodOrigPrice').value) || 999,
    custom_instructions: document.getElementById('prodInstructions').value.trim(),
    customer_instructions: document.getElementById('prodInstructions').value.trim(),
    images: window.currentEditingGalleryImages.length > 0 ? window.currentEditingGalleryImages : ['https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800']
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
      showToast('✓ Product updated with showcase images');
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
