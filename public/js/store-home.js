async function renderStoreHome(container) {
  container.innerHTML = '<div class="text-center py-20 text-slate-500 font-mono animate-pulse">Loading Nexus Digital Vault...</div>';
  try {
    const products = await fetchJSON('/api/products');
    container.innerHTML = `
      <div class="space-y-10">
        <!-- Hero Banner -->
        <div class="glass rounded-3xl p-8 sm:p-12 relative overflow-hidden border border-emerald-500/20 auth-glow">
          <div class="relative z-10 max-w-2xl space-y-4">
            <span class="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[10px] uppercase font-mono">⚡ Instant Digital Delivery</span>
            <h1 class="text-3xl sm:text-5xl font-black text-white tracking-tight">Premium Digital Subscriptions & Access</h1>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">Secure, verified digital accounts and license keys delivered instantly after payment confirmation.</p>
            <div class="pt-2 flex gap-3">
              <button onclick="navigate('products')" class="px-6 py-3.5 rounded-2xl bg-emerald-500 text-gray-950 font-black text-xs uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">Explore Catalog</button>
            </div>
          </div>
        </div>

        <!-- Featured Products Grid -->
        <div class="space-y-6">
          <h2 class="text-lg font-black text-white">Available Digital Goods</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            ${products.map(p => `
              <div class="glass-card rounded-3xl overflow-hidden flex flex-col justify-between border border-white/5 relative group cursor-pointer" onclick="navigate('product-details', { id: '${p._id}' })">
                <span class="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full ${p.product_type === 'SUBSCRIPTION' ? 'bg-indigo-500' : 'bg-emerald-500'} text-white font-black text-[10px] uppercase font-mono">
                  ${p.product_type === 'SUBSCRIPTION' ? '🔄 Subscription' : '⚡ Digital'}
                </span>
                <div>
                  <div class="h-48 w-full overflow-hidden bg-surface-900">
                    <img src="${p.images?.[0] || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800'}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                  </div>
                  <div class="p-5 space-y-2">
                    <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">${p.category || 'Digital Good'}</span>
                    <h3 class="text-sm font-bold text-white line-clamp-1 group-hover:text-emerald-400 transition-colors">${p.name}</h3>
                    <p class="text-xs text-slate-400 line-clamp-2">${p.short_description || p.description}</p>
                  </div>
                </div>
                <div class="px-5 pb-5 pt-2 flex items-center justify-between border-t border-white/5 font-mono">
                  <div>
                    <span class="text-base font-black text-white">₹${p.sale_price}</span>
                    ${p.original_price > p.sale_price ? `<span class="text-xs text-slate-500 line-through ml-1">₹${p.original_price}</span>` : ''}
                  </div>
                  <button class="px-4 py-2 rounded-xl bg-emerald-500 text-gray-950 font-black text-xs uppercase shadow-lg shadow-emerald-500/20 active:scale-95">View</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="glass p-8 text-center text-rose-400 text-xs">${err.message}</div>`;
  }
}
