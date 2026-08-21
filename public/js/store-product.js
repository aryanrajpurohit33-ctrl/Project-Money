async function renderStoreProductDetails(container, productId) {
  const cachedProducts = state.cachedProducts || window.apiCache?.get('/api/products')?.data;
  let prod = null;
  if (Array.isArray(cachedProducts)) {
    prod = cachedProducts.find(p => String(p._id) === String(productId));
  }

  if (prod) {
    paintProductDetailsHTML(container, prod);
  } else {
    container.innerHTML = getLoadingSpinnerHTML();
  }

  try {
    const fresh = await fetchJSON(`/api/products/${productId}`);
    paintProductDetailsHTML(container, fresh);
  } catch (err) {
    if (!prod) {
      container.innerHTML = `
        <div class="space-y-4 max-w-lg mx-auto font-sans text-xs pb-24 animate-fadeIn px-1">
          <div class="p-8 text-center bg-surface-900/80 rounded-3xl border border-white/5 space-y-3">
            <span class="text-3xl block">⚠️</span>
            <p class="text-rose-400 font-mono">Product details unavailable: ${err.message}</p>
            <button onclick="navigate('home')" class="px-4 py-2 bg-white/5 rounded-xl text-white font-mono">Back to Store</button>
          </div>
        </div>
      `;
    }
  }
}

function paintProductDetailsHTML(container, p) {
  const imgUrl = (Array.isArray(p.images) && p.images[0]) || p.image || '/assets/placeholder.png';
  const activePlanPrice = p.sale_price || 499;
  const originalPrice = p.original_price || 999;
  const discount = Math.round(((originalPrice - activePlanPrice) / originalPrice) * 100) || 50;

  container.innerHTML = `
    <div class="space-y-5 max-w-lg mx-auto font-sans text-xs pb-28 animate-fadeIn px-1">
      
      <div class="flex items-center justify-between">
        <button onclick="navigate('home')" class="flex items-center gap-1.5 text-slate-400 hover:text-white font-mono text-xs transition-colors py-1 cursor-pointer">
          <span class="text-sm">←</span> <span>All Products</span>
        </button>
        <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider">
          Verified Stock
        </span>
      </div>

      <div class="relative bg-surface-900/90 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        <div class="relative w-full aspect-[16/10] sm:aspect-[16/9] overflow-hidden bg-surface-950 flex items-center justify-center p-4">
          <img src="${imgUrl}" alt="${p.name}" class="w-full h-full object-contain rounded-2xl">
          <div class="absolute top-3.5 right-3.5">
            <span class="px-2.5 py-1 rounded-xl bg-surface-950/80 backdrop-blur-md border border-white/10 text-emerald-400 font-mono text-[10px] font-bold uppercase flex items-center gap-1">
              <span>⚡</span> <span>${p.category || 'OTT'}</span>
            </span>
          </div>
        </div>

        <div class="p-4 sm:p-5 border-t border-white/5 space-y-1">
          <span class="text-emerald-400 font-mono text-[10px] uppercase font-bold tracking-widest block">${p.brand || 'Nexus Digital'}</span>
          <h1 class="text-lg sm:text-xl font-black text-white leading-tight tracking-tight">${p.name}</h1>
        </div>
      </div>

      <div class="space-y-3 font-mono">
        <div class="flex items-center justify-between text-[10px] uppercase font-bold">
          <span class="text-slate-400">Access Duration</span>
          <span class="text-emerald-400">Standard Plan</span>
        </div>

        <div class="relative">
          <select id="planDurationSelect" class="w-full px-4 py-3.5 rounded-2xl bg-surface-900 border border-white/10 text-white text-xs outline-none focus:border-emerald-500 font-mono cursor-pointer shadow-lg appearance-none">
            <option value="1 Month (Standard Plan)">1 Month (Standard Plan)</option>
            <option value="3 Months (Saver Plan)">3 Months (Saver Plan)</option>
            <option value="6 Months (Pro Plan)">6 Months (Pro Plan)</option>
            <option value="1 Year (Ultimate VIP)">1 Year (Ultimate VIP)</option>
          </select>
          <span class="absolute right-4 top-4 text-slate-400 pointer-events-none text-xs">▼</span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 items-center pt-1 font-mono">
        <div class="space-y-0.5">
          <span class="text-slate-500 text-[10px] uppercase font-bold block">Order Total</span>
          <div class="flex items-baseline gap-2">
            <span class="text-2xl sm:text-3xl font-black text-white">₹${activePlanPrice}</span>
            <span class="text-slate-500 line-through text-xs">₹${originalPrice}</span>
            <span class="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">${discount}% OFF</span>
          </div>
        </div>

        <div class="space-y-0.5 text-right">
          <span class="text-slate-500 text-[10px] uppercase font-bold block">Device Quantity</span>
          <div class="inline-flex items-center gap-2 p-1.5 rounded-2xl bg-surface-900 border border-white/10">
            <button type="button" onclick="adjustProductQty(-1)" class="w-7 h-7 rounded-xl bg-surface-950 text-white font-bold text-xs flex items-center justify-center hover:bg-white/10 cursor-pointer">-</button>
            <span id="productQtyDisplay" class="text-emerald-400 font-bold text-xs px-1">1 Device</span>
            <button type="button" onclick="adjustProductQty(1)" class="w-7 h-7 rounded-xl bg-surface-950 text-white font-bold text-xs flex items-center justify-center hover:bg-white/10 cursor-pointer">+</button>
          </div>
        </div>
      </div>

      <button onclick="handleAddCurrentProductToCart('${p._id}', '${p.name.replace(/'/g, "\\'")}', ${activePlanPrice})" class="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-gray-950 font-black uppercase text-xs tracking-wider transition-all cursor-pointer shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 font-mono">
        <span>+ ADD TO CART</span>
      </button>

      <div class="p-4 rounded-2xl bg-surface-900/80 border border-white/5 flex items-center justify-between font-mono shadow-md">
        <div class="flex items-center gap-2.5">
          <span class="text-xl">🔥</span>
          <div>
            <span class="text-white font-bold text-xs block">Limited Flash Deal</span>
            <span class="text-slate-400 text-[10px] block">Special discount expires in:</span>
          </div>
        </div>
        <div class="flex items-center gap-1 text-emerald-400 font-bold text-xs bg-surface-950 px-2.5 py-1 rounded-xl border border-white/5">
          <span>00</span>:<span>02</span>:<span>08</span>
        </div>
      </div>

      <div class="p-4 rounded-2xl bg-surface-900/80 border border-white/5 space-y-2 text-slate-300">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-amber-400 font-bold text-xs">
            <span>⚠️</span> <span>Important Usage Instructions & Rules</span>
          </div>
          <span class="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-mono text-[9px] font-bold uppercase">Mandatory</span>
        </div>
        <p class="text-[11px] font-sans leading-relaxed text-slate-300">
          ${p.customer_instructions || 'Never share your account password. Log in only to your assigned profile.'}
        </p>
      </div>

    </div>
  `;
}

let selectedDeviceQty = 1;
function adjustProductQty(delta) {
  selectedDeviceQty = Math.max(1, Math.min(5, selectedDeviceQty + delta));
  const el = document.getElementById('productQtyDisplay');
  if (el) el.textContent = `${selectedDeviceQty} Device${selectedDeviceQty > 1 ? 's' : ''}`;
}

function handleAddCurrentProductToCart(prodId, prodName, price) {
  const duration = document.getElementById('planDurationSelect')?.value || '1 Month';
  const item = {
    id: prodId,
    name: `${prodName} (${selectedDeviceQty} Device${selectedDeviceQty > 1 ? 's' : ''} - ${duration.split('(')[0].trim()})`,
    price: price * selectedDeviceQty,
    quantity: 1,
    duration: duration
  };

  state.cart.push(item);
  localStorage.setItem('nexus_cart', JSON.stringify(state.cart));

  const bagBadge = document.getElementById('cartBadgeCount');
  if (bagBadge) {
    bagBadge.textContent = state.cart.length;
    bagBadge.classList.remove('hidden');
  }

  showToast('✓ Added to cart');
  navigate('cart');
}
