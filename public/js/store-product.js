async function renderStoreProductDetails(container, identifier) {
  container.innerHTML = '<div class="text-center py-20 text-slate-500 font-mono animate-pulse">Loading product...</div>';
  try {
    const p = await fetchJSON(`/api/products/${identifier}`);
    container.innerHTML = `
      <div class="space-y-8 font-sans">
        <button onclick="navigate('home')" class="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono">← Back to Store</button>
        
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div class="lg:col-span-7">
            <div class="h-72 sm:h-96 rounded-3xl overflow-hidden glass border border-white/10">
              <img src="${p.images?.[0] || ''}" class="w-full h-full object-cover">
            </div>
          </div>

          <div class="lg:col-span-5 space-y-6">
            <div>
              <span class="text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono block">${p.category}</span>
              <h1 class="text-2xl sm:text-3xl font-black text-white mt-1">${p.name}</h1>
              <p class="text-xs text-slate-300 mt-2 leading-relaxed">${p.description || p.short_description}</p>
            </div>

            <div class="p-5 rounded-3xl glass border border-white/5 space-y-2 font-mono">
              <div class="flex items-center gap-3">
                <span class="text-3xl font-black text-white">₹${p.sale_price}</span>
                ${p.original_price > p.sale_price ? `<span class="text-sm text-slate-500 line-through">₹${p.original_price}</span>` : ''}
              </div>
              <span class="text-xs ${p.in_stock ? 'text-emerald-400' : 'text-rose-400'} font-bold block">
                ${p.in_stock ? '● In Stock & Ready for Delivery' : '✕ Out of Stock'}
              </span>
            </div>

            <button onclick="addToCustomerCart('${p._id}', '${p.name.replace(/'/g, "\\'")}', ${p.sale_price}, '${p.images?.[0]}')" ${!p.in_stock ? 'disabled' : ''} class="w-full py-4 rounded-2xl ${p.in_stock ? 'bg-emerald-500 text-gray-950 font-black' : 'bg-gray-800 text-gray-500 cursor-not-allowed'} text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all font-sans">
              ${p.in_stock ? 'Add to Cart & Checkout' : 'Out of Stock'}
            </button>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="glass p-8 text-center text-rose-400 text-xs">${err.message}</div>`;
  }
}

function addToCustomerCart(product_id, name, price, image) {
  state.cart = [{ product_id, name, price, image, duration: '1_MONTH' }];
  localStorage.setItem('nexus_cart', JSON.stringify(state.cart));
  navigate('checkout');
}
