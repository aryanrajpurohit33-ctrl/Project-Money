async function renderStoreHome(container) {
  container.innerHTML = getLoadingSpinnerHTML();

  try {
    const products = await fetchJSON('/api/products');
    const productList = Array.isArray(products) ? products.filter(p => p.status !== 'DRAFT') : [];

    container.innerHTML = `
      <div class="space-y-6 max-w-xl mx-auto font-sans text-xs pb-24 animate-fadeIn px-1">
        
        <!-- Hero Banner Card -->
        <div class="relative rounded-3xl overflow-hidden bg-gradient-to-b from-surface-900/90 to-surface-950/80 p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-3">
          <div class="absolute -top-10 -right-10 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div class="flex items-center justify-between">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Instant Digital Vault
            </span>
            <span class="text-[10px] font-mono text-slate-500 font-semibold">Verified Stock</span>
          </div>

          <div class="space-y-1">
            <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
              Premium Subscriptions & Access
            </h1>
            <p class="text-slate-400 text-xs leading-relaxed font-sans">
              Private accounts, multi-screen access, and instant automated credential delivery upon verification.
            </p>
          </div>

          <!-- Trust Badges Row -->
          <div class="pt-2 flex items-center gap-4 text-[10px] font-mono text-slate-400">
            <div class="flex items-center gap-1.5">
              <span class="text-emerald-400 font-bold">✓</span>
              <span>100% Warranty</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-emerald-400 font-bold">✓</span>
              <span>4K UHD Streaming</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-emerald-400 font-bold">✓</span>
              <span>Private PIN</span>
            </div>
          </div>
        </div>

        <!-- Featured Products Section Header -->
        <div class="space-y-3.5">
          <div class="flex items-center justify-between px-1">
            <div class="flex items-center gap-2">
              <div class="w-1.5 h-3.5 rounded-full bg-emerald-400"></div>
              <h2 class="text-xs font-black uppercase font-mono tracking-widest text-white">FEATURED PRODUCTS</h2>
            </div>
            <span class="px-2 py-0.5 rounded-full bg-surface-900 text-slate-400 font-mono text-[9px]">
              ${productList.length} Available
            </span>
          </div>

          <!-- Products Feed (Clean Borderless Image Cards) -->
          <div class="space-y-4">
            ${productList.length === 0 ? `
              <div class="bg-surface-900/50 rounded-3xl p-12 text-center text-slate-500 font-mono space-y-2">
                <span class="text-3xl block">📦</span>
                <p>No products available right now.</p>
              </div>
            ` : productList.map(p => {
              const salePrice = p.sale_price || 499;
              const origPrice = p.original_price || (salePrice * 2);
              const discountPct = origPrice > salePrice ? Math.round(((origPrice - salePrice) / origPrice) * 100) : 50;
              const img = (p.images && p.images[0]) || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800';

              return `
                <div class="group relative rounded-3xl overflow-hidden bg-surface-950 shadow-2xl transition-all duration-300 active:scale-[0.98] cursor-pointer" onclick="navigate('product-details', { id: '${p._id}' })">
                  
                  <!-- Full Edge-to-Edge Image Showcase -->
                  <div class="relative w-full aspect-[16/10] overflow-hidden">
                    <img src="${img}" alt="${p.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                    
                    <!-- Dark Gradient Layer for Contrast -->
                    <div class="absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/30 to-black/50"></div>
                    
                    <!-- Top Category & Discount Badges -->
                    <div class="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between pointer-events-none">
                      <span class="px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md text-emerald-400 font-mono text-[9px] font-bold uppercase tracking-wider">
                        ⚡ ${p.category || 'OTT'}
                      </span>
                      <span class="px-2.5 py-1 rounded-xl bg-emerald-500 text-gray-950 font-mono text-[9px] font-black uppercase tracking-wider">
                        ${discountPct}% OFF
                      </span>
                    </div>

                    <!-- Bottom Overlay (Title & Price) -->
                    <div class="absolute bottom-3.5 left-3.5 right-3.5 space-y-1.5">
                      <!-- Compact Product Title -->
                      <h3 class="text-sm sm:text-base font-bold text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] group-hover:text-emerald-400 transition-colors leading-snug">
                        ${p.name}
                      </h3>

                      <!-- Compact Price Row -->
                      <div class="flex items-center justify-between pt-0.5">
                        <div class="flex items-baseline gap-1.5">
                          <span class="text-[9px] font-mono text-slate-300 uppercase font-semibold drop-shadow">Starts:</span>
                          <span class="text-lg font-black text-white font-mono leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">₹${salePrice}</span>
                          <span class="text-[11px] text-slate-400 line-through font-mono leading-none drop-shadow">₹${origPrice}</span>
                        </div>

                        <span class="text-slate-400 text-[10px] font-mono group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all">
                          Select Plan →
                        </span>
                      </div>
                    </div>

                  </div>

                </div>
              `;
            }).join('')}
          </div>
        </div>

      </div>
    `;
  } catch (err) {
    container.innerHTML = `
      <div class="p-8 text-center text-rose-400 font-mono text-xs">
        Error loading store: ${err.message}
      </div>
    `;
  }
}
