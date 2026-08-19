function openCartDrawer() {
  let drawer = document.getElementById('cartSlideDrawer');
  if (!drawer) {
    drawer = document.createElement('div');
    drawer.id = 'cartSlideDrawer';
    drawer.className = 'fixed inset-y-0 right-0 z-50 w-full max-w-md bg-surface-900 border-l border-white/10 shadow-2xl transform translate-x-full transition-transform duration-300 ease-in-out flex flex-col justify-between';
    document.body.appendChild(drawer);
  }

  const drop = document.getElementById('appBackdrop');
  if (drop) {
    drop.classList.remove('hidden');
    drop.onclick = closeCartDrawer;
  }

  updateCartDrawerContent();
  setTimeout(() => drawer.classList.remove('translate-x-full'), 10);
}

function closeCartDrawer() {
  const drawer = document.getElementById('cartSlideDrawer');
  if (drawer) drawer.classList.add('translate-x-full');
  const drop = document.getElementById('appBackdrop');
  if (drop) drop.classList.add('hidden');
}

function updateCartDrawerContent() {
  const drawer = document.getElementById('cartSlideDrawer');
  if (!drawer) return;
  const cart = state.cart || [];
  const totalQty = cart.reduce((acc, i) => acc + (i.qty || 1), 0);
  const subtotal = cart.reduce((acc, i) => acc + (i.price || 0) * (i.qty || 1), 0);

  drawer.innerHTML = `
    <div class="p-5 border-b border-white/5 flex items-center justify-between font-sans">
      <div class="flex items-center gap-2">
        <h2 class="text-base font-black text-white">Your Cart</h2>
        <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold">${totalQty} items</span>
      </div>
      <button onclick="closeCartDrawer()" class="text-slate-400 hover:text-white p-1 text-sm font-bold">✕</button>
    </div>

    <div class="flex-1 overflow-y-auto p-5 space-y-3 custom-scroll">
      ${cart.length === 0 ? `
        <div class="text-center py-20 text-slate-500 font-mono text-xs">
          Your cart is currently empty.<br>
          <button onclick="closeCartDrawer(); navigate('products');" class="mt-4 px-4 py-2 bg-emerald-500 text-gray-950 font-black rounded-xl text-[10px] uppercase">Shop Catalog</button>
        </div>
      ` : cart.map((item, idx) => `
        <div class="glass rounded-2xl p-3.5 flex items-center justify-between gap-3 border border-white/5">
          <div class="flex items-center gap-3 min-w-0">
            <img src="${item.image || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=200'}" class="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0 bg-black">
            <div class="min-w-0">
              <h4 class="text-white font-bold text-xs truncate">${item.name}</h4>
              <span class="text-[10px] text-emerald-400 font-mono block">₹${item.price} each</span>
            </div>
          </div>

          <div class="flex items-center gap-3 shrink-0 font-mono">
            <div class="flex items-center gap-1.5 bg-surface-950 px-2 py-1 rounded-xl border border-white/10 text-xs">
              <button onclick="adjustCartQty(${idx}, -1)" class="text-slate-400 hover:text-white px-1">-</button>
              <span class="text-white font-bold w-4 text-center">${item.qty || 1}</span>
              <button onclick="adjustCartQty(${idx}, 1)" class="text-slate-400 hover:text-white px-1">+</button>
            </div>
            <button onclick="removeCartItemDrawer(${idx})" class="text-rose-400 hover:text-rose-300 font-bold p-1 text-xs" title="Remove">✕</button>
          </div>
        </div>
      `).join('')}
    </div>

    ${cart.length > 0 ? `
      <div class="p-5 border-t border-white/5 space-y-4 bg-surface-950 font-sans">
        <div class="flex justify-between items-center text-xs font-mono">
          <span class="text-slate-400">Subtotal</span>
          <span class="text-white font-black text-sm">₹${subtotal}</span>
        </div>
        <button onclick="closeCartDrawer(); navigate('checkout');" class="w-full py-3.5 rounded-2xl bg-emerald-500 text-gray-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
          Proceed to Checkout →
        </button>
      </div>
    ` : ''}
  `;
}

function adjustCartQty(index, delta) {
  const cart = state.cart || [];
  if (!cart[index]) return;
  cart[index].qty = (cart[index].qty || 1) + delta;
  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }
  localStorage.setItem('nexus_cart', JSON.stringify(cart));
  const badge = document.getElementById('storeCartBadge');
  if (badge) badge.textContent = cart.reduce((a,b)=>a+(b.qty||1),0);
  updateCartDrawerContent();
}

function removeCartItemDrawer(index) {
  const cart = state.cart || [];
  cart.splice(index, 1);
  localStorage.setItem('nexus_cart', JSON.stringify(cart));
  const badge = document.getElementById('storeCartBadge');
  if (badge) badge.textContent = cart.reduce((a,b)=>a+(b.qty||1),0);
  updateCartDrawerContent();
  showToast('Item removed from cart');
}

async function renderStoreCheckout(container) {
  if (!state.token) return renderCustomerAuthPrompt(container, 'checkout');
  const cart = state.cart || [];
  if (!cart.length) { navigate('home'); return; }
  const subtotal = cart.reduce((acc, i) => acc + (i.price || 0) * (i.qty || 1), 0);
  const method = state.checkoutMethod || 'UPI';

  container.innerHTML = `
    <div class="max-w-xl mx-auto glass rounded-3xl p-6 sm:p-8 space-y-6 font-sans">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-black text-white">Complete Payment</h2>
          <p class="text-xs text-slate-400 font-mono">Secure Order Verification</p>
        </div>
        <button onclick="navigate('home')" class="text-xs text-slate-400 hover:text-white font-mono">← Store</button>
      </div>

      <div class="p-5 rounded-2xl bg-surface-950 border border-white/10 space-y-3 font-mono">
        <div class="flex justify-between items-center text-xs">
          <span class="text-slate-400">Payment Gateway:</span>
          <span class="text-emerald-400 font-bold">${method === 'UPI' ? 'UPI QR / ID' : 'USDT (TRC20)'}</span>
        </div>
        <div class="flex justify-between items-center text-sm font-black pt-2 border-t border-white/5">
          <span class="text-white">Amount to Pay:</span>
          <span class="text-emerald-400 text-lg">₹${subtotal}</span>
        </div>
      </div>

      <button onclick="handleCustomerMultiCheckoutSubmit('${method}')" class="w-full py-4 rounded-2xl bg-emerald-500 text-gray-950 font-black text-xs uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
        Confirm Order & Complete
      </button>
    </div>
  `;
}

async function handleCustomerMultiCheckoutSubmit(method) {
  try {
    const cart = state.cart || [];
    const itemsPayload = [];
    cart.forEach(item => {
      const q = item.qty || 1;
      for (let i = 0; i < q; i++) {
        itemsPayload.push({ product_id: item.product_id, duration: '1_MONTH' });
      }
    });

    await fetchJSON('/api/checkout/initiate-order', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
      body: JSON.stringify({ items: itemsPayload, payment_method: method })
    });
    showToast('✓ Order placed successfully! View in Purchased Items.');
    state.cart = []; localStorage.removeItem('nexus_cart');
    const badge = document.getElementById('storeCartBadge');
    if (badge) badge.textContent = '0';
    navigate('orders');
  } catch (err) { showToast(err.message, 'error'); }
}

function addToCustomerCart(product_id, name, price, image) {
  let cart = state.cart || [];
  const existing = cart.find(i => i.product_id === product_id);
  if (existing) {
    existing.qty = (existing.qty || 1) + 1;
  } else {
    cart.push({ product_id, name, price, image, qty: 1, duration: '1_MONTH' });
  }
  state.cart = cart;
  localStorage.setItem('nexus_cart', JSON.stringify(cart));
  const badge = document.getElementById('storeCartBadge');
  if (badge) badge.textContent = cart.reduce((a,b)=>a+(b.qty||1),0);
  openCartDrawer();
}
