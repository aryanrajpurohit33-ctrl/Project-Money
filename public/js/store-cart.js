function renderStoreCart(container) {
  const cart = Array.isArray(state.cart) ? state.cart : [];
  const subtotal = cart.reduce((acc, item) => acc + (Number(item.price) || 0), 0);

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="max-w-sm mx-auto py-16 px-4 text-center space-y-4 font-sans animate-fadeIn text-xs">
        <div class="w-16 h-16 rounded-full bg-surface-900 mx-auto flex items-center justify-center text-2xl border border-white/5">
          🛒
        </div>
        <div class="space-y-1">
          <h2 class="text-base font-bold text-white">Your Cart is Empty</h2>
          <p class="text-slate-400 text-xs font-mono">Explore the digital vault and add an item to checkout.</p>
        </div>
        <button onclick="navigate('home')" class="px-6 py-3 rounded-xl bg-emerald-500 text-gray-950 font-black font-mono text-xs uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer">
          Browse Products →
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="max-w-md mx-auto py-2 px-1 space-y-5 font-sans text-xs animate-fadeIn pb-24">
      
      <!-- Cart Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <h1 class="text-xl font-black text-white tracking-tight">Your Cart</h1>
          <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold">
            ${cart.length} ${cart.length === 1 ? 'item' : 'items'}
          </span>
        </div>
        <button onclick="navigate('home')" class="text-slate-400 hover:text-white p-1 font-mono text-xs cursor-pointer">
          ✕
        </button>
      </div>

      <!-- Cart Items List -->
      <div class="space-y-3">
        ${cart.map((item, idx) => `
          <div class="p-3.5 rounded-2xl bg-surface-900/80 border border-white/5 shadow-xl flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <img src="${item.image || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=200'}" class="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0">
              <div class="min-w-0">
                <h3 class="text-white font-bold text-xs truncate">${item.name}</h3>
                <span class="text-emerald-400 font-mono font-bold text-[11px] block mt-0.5">₹${item.price} each</span>
              </div>
            </div>

            <!-- Remove Button -->
            <button onclick="removeCartItemIndex(${idx})" class="w-8 h-8 rounded-xl bg-surface-950 hover:bg-rose-500/15 border border-white/5 hover:border-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center font-mono font-bold text-xs transition-colors shrink-0 cursor-pointer">
              ✕
            </button>
          </div>
        `).join('')}
      </div>

      <!-- Subtotal & Checkout Button -->
      <div class="pt-4 border-t border-white/5 space-y-4 font-mono">
        <div class="flex items-center justify-between text-xs px-1">
          <span class="text-slate-400 uppercase tracking-wider font-bold">Subtotal</span>
          <span class="text-xl font-black text-white">₹${subtotal}</span>
        </div>

        <button onclick="handleCartProceedToCheckout()" class="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-gray-950 font-black font-mono uppercase text-xs tracking-wider shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer">
          <span>PROCEED TO CHECKOUT</span>
          <span>→</span>
        </button>
      </div>

    </div>
  `;
}

function removeCartItemIndex(index) {
  if (!Array.isArray(state.cart)) return;
  state.cart.splice(index, 1);
  localStorage.setItem('nexus_cart', JSON.stringify(state.cart));
  
  const bagBadge = document.getElementById('cartBadgeCount');
  if (bagBadge) {
    const count = state.cart.length;
    bagBadge.textContent = count;
    if (count > 0) bagBadge.classList.remove('hidden');
    else bagBadge.classList.add('hidden');
  }

  renderStoreCart(document.getElementById('mainStoreContent'));
}

function handleCartProceedToCheckout() {
  if (!state.token || !state.user || state.user.isAdmin) {
    showToast('Please login or create an account to proceed');
    navigate('login', { returnView: 'checkout' });
    return;
  }

  navigate('checkout');
}
