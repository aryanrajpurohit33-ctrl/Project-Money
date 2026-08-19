async function renderStoreHome(container) {
  const isAllProductsView = state.currentView === 'products';
  
  // Render instantly using cached data if available, eliminating any loading state
  const products = state.cachedProducts || [];
  buildStoreProductsHTML(container, products, isAllProductsView);

  // Fetch fresh data in the background silently
  try {
    const freshProducts = await fetchJSON('/api/products');
    state.cachedProducts = freshProducts;
    buildStoreProductsHTML(container, freshProducts, isAllProductsView);
  } catch (err) {}
}

function buildStoreProductsHTML(container, products, isAllProductsView) {
  container.innerHTML = `
    <div class="space-y-8 pb-12 animate-fadeIn">
      ${!isAllProductsView ? `
        <div class="glass rounded-3xl p-6 sm:p-10 relative overflow-hidden border border-emerald-500/20 auth-glow space-y-3">
          <span class="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[10px] uppercase font-mono">⚡ Instant Digital Delivery</span>
          <h1 class="text-2xl sm:text-4xl font-black text-white tracking-tight">Premium Digital Subscriptions & Access</h1>
          <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">Secure, verified digital accounts and license keys delivered instantly after payment confirmation.</p>
        </div>
      ` : `
        <div class="space-y-1">
          <h1 class="text-xl sm:text-2xl font-black text-white">All Digital Products</h1>
          <p class="text-xs text-slate-400 font-mono">${products.length} items available in vault</p>
        </div>
      `}

      <div class="space-y-4">
        ${!isAllProductsView ? '<h2 class="text-base font-black text-white">Available Digital Goods</h2>' : ''}
        
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          ${products.map(p => {
            const imgSrc = p.images?.[0] || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800';

            return `
              <div class="glass-card rounded-3xl overflow-hidden flex flex-col justify-between border border-white/5 relative group cursor-pointer transform hover:-translate-y-1 transition-all duration-300" onclick="navigate('product-details', { id: '${p._id}' })">
                <span class="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full ${p.product_type === 'SUBSCRIPTION' ? 'bg-indigo-500' : 'bg-emerald-500'} text-white font-black text-[9px] uppercase font-mono shadow-md">
                  ${p.product_type === 'SUBSCRIPTION' ? '🔄 Subscription' : '⚡ Digital'}
                </span>

                <div>
                  <div class="h-44 w-full overflow-hidden bg-surface-900">
                    <img src="${imgSrc}" onerror="this.src='https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800'" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                  </div>
                  <div class="p-4 space-y-1.5">
                    <span class="text-[9px] font-bold text-slate-500 uppercase tracking-widest block font-mono">${p.category || 'Digital Good'}</span>
                    <h3 class="text-xs sm:text-sm font-bold text-white line-clamp-1 group-hover:text-emerald-400 transition-colors">${p.name}</h3>
                    <p class="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">${p.short_description || p.description}</p>
                  </div>
                </div>

                <div class="px-4 pb-4 pt-2 flex items-center justify-between border-t border-white/5 font-mono" onclick="event.stopPropagation()">
                  <div>
                    <span class="text-sm sm:text-base font-black text-white">₹${p.sale_price}</span>
                    ${p.original_price > p.sale_price ? `<span class="text-[10px] text-slate-500 line-through ml-1">₹${p.original_price}</span>` : ''}
                  </div>
                  <button onclick="addToCustomerCart('${p._id}', '${p.name.replace(/'/g, "\\'")}', ${p.sale_price}, '${imgSrc}')" class="px-3.5 py-2 rounded-xl bg-emerald-500 text-gray-950 font-black text-[10px] uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                    Add to Cart
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
