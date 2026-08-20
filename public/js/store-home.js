async function renderStoreHome(container) {
  // 1. Instant Cache Render (Zero Delay)
  const cached = state.cachedProducts || (window.apiCache.get('/api/products')?.data);
  if (cached && Array.isArray(cached) && cached.length > 0) {
    renderHomeProductsHTML(container, cached);
  } else {
    container.innerHTML = getLoadingSpinnerHTML();
  }

  // 2. Fetch fresh list in background
  try {
    const products = await fetchJSON('/api/products');
    state.cachedProducts = products;
    localStorage.setItem('nexus_local_cache', JSON.stringify(products));
    renderHomeProductsHTML(container, products);
  } catch (err) {
    if (!cached) {
      container.innerHTML = `<div class="p-8 text-center text-rose-400 font-mono text-xs">Error loading store: ${err.message}</div>`;
    }
  }
}

function renderHomeProductsHTML(container, products) {
  container.innerHTML = `
    <div class="space-y-6 animate-fadeIn pb-24 font-sans text-xs">
      
      <!-- Hero Banner -->
      <div class="p-6 rounded-3xl bg-surface-900/80 border border-white/5 space-y-3 relative overflow-hidden shadow-2xl">
        <div class="flex items-center justify-between">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Instant Digital Vault
          </span>
          <span class="text-slate-500 font-mono text-[10px]">Verified Stock</span>
        </div>

        <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
          Premium Subscriptions & Access
        </h1>
        <p class="text-slate-400 text-xs leading-relaxed">
          Private accounts, multi-screen access, and instant automated credential delivery upon verification.
        </p>

        <div class="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 font-mono text-[10px] text-slate-400">
          <div><span class="text-emerald-400 font-bold">✓</span> 100% Warranty</div>
          <div><span class="text-emerald-400 font-bold">✓</span> 4K UHD</div>
          <div><span class="text-emerald-400 font-bold">✓</span> Private PIN</div>
        </div>
      </div>

      <!-- Products Grid -->
      <div class="space-y-3">
        <div class="flex items-center justify-between px-1">
          <div class="flex items-center gap-2">
            <span class="w-1.5 h-3.5 bg-emerald-500 rounded-full"></span>
            <h2 class="text-xs font-black uppercase font-mono tracking-widest text-white">Featured Products</h2>
          </div>
          <span class="text-slate-500 font-mono text-[10px]">${products.length} Available</span>
        </div>

        <div class="grid grid-cols-1 gap-4">
          ${products.map(p => {
            const sale = p.sale_price || 499;
            const orig = p.original_price || 999;
            const disc = p.discount_percentage || Math.round(((orig - sale) / orig) * 100);
            const imgUrl = (p.images && p.images[0]) || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800';

            return `
              <div onclick="navigate('product-details', { id: '${p._id || p.slug}' })" class="group bg-surface-900/90 rounded-3xl overflow-hidden border border-white/5 hover:border-emerald-500/30 transition-all duration-200 cursor-pointer shadow-xl relative">
                
                <div class="relative aspect-[16/9] w-full bg-surface-950 overflow-hidden">
                  <img src="${imgUrl}" alt="${p.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy">
                  <div class="absolute inset-0 bg-gradient-to-t from-surface-900 via-transparent to-transparent"></div>
                  
                  <div class="absolute top-3 left-3">
                    <span class="px-2.5 py-1 rounded-xl bg-surface-950/80 backdrop-blur-md text-emerald-400 font-mono text-[9px] font-black uppercase border border-white/10">
                      ⚡ ${p.category || 'OTT'}
                    </span>
                  </div>

                  <div class="absolute top-3 right-3">
                    <span class="px-2.5 py-1 rounded-xl bg-emerald-500 text-gray-950 font-mono text-[10px] font-black uppercase shadow-lg">
                      ${disc}% OFF
                    </span>
                  </div>
                </div>

                <div class="p-4 sm:p-5 flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <h3 class="text-sm font-black text-white group-hover:text-emerald-400 transition-colors truncate">${p.name}</h3>
                    <div class="flex items-center gap-2 mt-1 font-mono">
                      <span class="text-slate-500 text-[10px] uppercase">Starts:</span>
                      <span class="text-emerald-400 font-black text-sm">₹${sale}</span>
                      <span class="text-slate-500 line-through text-xs">₹${orig}</span>
                    </div>
                  </div>

                  <button class="px-4 py-2 rounded-xl bg-surface-950 group-hover:bg-emerald-500 group-hover:text-gray-950 text-slate-300 font-mono text-xs font-bold transition-all border border-white/5 shrink-0 flex items-center gap-1.5 shadow-md">
                    <span>Select Plan</span>
                    <span>→</span>
                  </button>
                </div>

              </div>
            `;
          }).join('')}
        </div>
      </div>

    </div>
  `;
}
