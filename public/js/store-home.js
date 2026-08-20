async function renderStoreHome(container) {
  container.innerHTML = getLoadingSpinnerHTML();

  try {
    const products = await fetchJSON('/api/products');
    const productList = Array.isArray(products) ? products.filter(p => p.status !== 'DRAFT') : [];

    container.innerHTML = `
      <div class="space-y-7 max-w-xl mx-auto font-sans text-xs pb-24 animate-fadeIn px-1">
        
        <!-- Hero Banner Card -->
        <div class="relative rounded-3xl overflow-hidden bg-gradient-to-b from-surface-900/90 to-surface-950/80 p-6 sm:p-7 border border-white/[0.06] shadow-2xl backdrop-blur-xl space-y-3.5">
          <div class="absolute -top-10 -right-10 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div class="flex items-center justify-between">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Instant Digital Vault
            </span>
            <span class="text-[10px] font-mono text-slate-500 font-semibold">Verified Stock</span>
          </div>

          <div class="space-y-1.5">
            <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              Premium Subscriptions & Licenses
            </h1>
            <p class="text-slate-400 text-xs leading-relaxed font-sans">
              Private accounts, multi-screen access, and instant automated credential delivery upon verification.
            </p>
          </div>

          <!-- Trust Badges Row -->
          <div class="pt-2 flex items-center gap-4 text-[10px] font-mono text-slate-400 border-t border-white/5">
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
        <div class="space-y-3">
          <div class="flex items-center justify-between px-1">
            <div class="flex items-center gap-2">
              <div class="w-1.5 h-4 rounded-full bg-emerald-400"></div>
              <h2 class="text-sm font-black uppercase font-mono tracking-widest text-white">FEATURED PRODUCTS</h2>
            </div>
            <span class="px-2.5 py-0.5 rounded-full bg-white/5 text-slate-400 font-mono text-[10px]">
              ${productList.length} Available
            </span>
          </div>

          <!-- Products Feed Grid -->
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
                <div class="group rounded-3xl bg-surface-900/60 hover:bg-surface-900/80 border border-white/[0.06] overflow-hidden transition-all duration-300 shadow-xl space-y-4 p-3.5 sm:p-4 cursor-pointer" onclick="navigate('product-details', { id: '${p._id}' })">
                  
                  <!-- Card Image Showcase -->
                  <div class="relative rounded-2xl overflow-hidden bg-surface-950 aspect-[16/9] w-full">
                    <img src="${img}" alt="${p.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                    <div class="absolute inset-0 bg-gradient-to-t from-surface-950/90 via-transparent to-transparent"></div>
                    
                    <!-- Top Category & Type Badges -->
                    <div class="absolute top-3 left-3 right-3 flex items-center justify-between">
                      <span class="px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md text-emerald-400 font-mono text-[9px] font-bold uppercase tracking-wider">
                        ⚡ ${p.category || 'OTT'}
                      </span>
                      <span class="px-2.5 py-1 rounded-xl bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 text-emerald-300 font-mono text-[9px] font-bold">
                        ${discountPct}% OFF
                      </span>
                    </div>

                    <!-- Bottom Title Overlay -->
                    <div class="absolute bottom-3 left-3 right-3">
                      <h3 class="text-base sm:text-lg font-black text-white tracking-tight drop-shadow-md group-hover:text-emerald-400 transition-colors">
                        ${p.name}
                      </h3>
                    </div>
                  </div>

                  <!-- Pricing & CTA Bar -->
                  <div class="flex items-center justify-between px-1 pt-1">
                    <div class="space-y-0.5">
                      <span class="text-[9px] font-mono text-slate-500 uppercase block tracking-wider">Starts From</span>
                      <div class="flex items-baseline gap-2">
                        <span class="text-xl font-black text-white font-mono leading-none">₹${salePrice}</span>
                        <span class="text-xs text-slate-600 line-through font-mono leading-none">₹${origPrice}</span>
                      </div>
                    </div>

                    <button class="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-gray-950 font-black font-mono text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer">
                      <span>Get Access</span>
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
  } catch (err) {
    container.innerHTML = `
      <div class="p-8 text-center text-rose-400 font-mono text-xs">
        Error loading store: ${err.message}
      </div>
    `;
  }
}
