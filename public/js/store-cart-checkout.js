async function renderStoreCart(container) {
  const cart = state.cart || [];
  
  if (cart.length === 0) {
    container.innerHTML = `
      <div class="glass max-w-md mx-auto rounded-3xl p-8 text-center space-y-4 font-sans">
        <div class="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mx-auto text-2xl">🛒</div>
        <h2 class="text-xl font-black text-white">Your Cart is Empty</h2>
        <p class="text-xs text-slate-400">Explore our digital catalog and add your first subscription or access pass.</p>
        <button onclick="navigate('products')" class="px-6 py-3 rounded-2xl bg-emerald-500 text-gray-950 font-black text-xs uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
          Browse Store
        </button>
      </div>
    `;
    return;
  }

  const subtotal = cart.reduce((acc, item) => acc + (item.price || 0), 0);

  container.innerHTML = `
    <div class="max-w-xl mx-auto space-y-6 font-sans">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-xl font-black text-white">Shopping Cart</h1>
          <p class="text-xs text-slate-400">${cart.length} item(s) selected</p>
        </div>
        <button onclick="clearCustomerCart()" class="text-xs text-rose-400 font-bold hover:underline font-mono">Clear All</button>
      </div>

      <div class="space-y-3" id="cartItemList">
        ${cart.map((item, idx) => `
          <div class="glass rounded-2xl p-4 flex items-center justify-between gap-4 border border-white/5 transform transition-all duration-300">
            <div class="flex items-center gap-3.5 min-w-0">
              <img src="${item.image || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=200'}" class="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0 bg-black">
              <div class="min-w-0">
                <h3 class="text-white font-bold text-xs truncate">${item.name}</h3>
                <span class="text-[10px] text-emerald-400 font-mono block">Digital Access • 1 Month</span>
              </div>
            </div>

            <div class="flex items-center gap-4 shrink-0 font-mono">
              <span class="text-white font-black text-sm">₹${item.price}</span>
              <button onclick="removeCartItem(${idx})" class="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all text-xs font-bold" title="Remove item">
                ✕
              </button>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Order Summary Card -->
      <div class="glass rounded-3xl p-6 space-y-4 border border-white/10">
        <div class="space-y-2 font-mono text-xs pb-4 border-b border-white/5">
          <div class="flex justify-between text-slate-400"><span>Subtotal</span><span class="text-white">₹${subtotal}</span></div>
          <div class="flex justify-between text-slate-400"><span>Instant Delivery Fee</span><span class="text-emerald-400 font-bold">FREE</span></div>
          <div class="flex justify-between text-base font-black text-white pt-2 border-t border-white/5"><span>Total Amount</span><span class="text-emerald-400 font-mono">₹${subtotal}</span></div>
        </div>

        <div class="space-y-3 font-sans">
          <label class="text-slate-400 text-xs block font-bold">Select Payment Method</label>
          <div class="grid grid-cols-2 gap-3">
            <label class="cursor-pointer">
              <input type="radio" name="checkoutPaymentMethod" value="UPI" checked class="peer hidden">
              <div class="p-3.5 rounded-2xl bg-surface-900 border border-white/10 peer-checked:border-emerald-500 peer-checked:bg-emerald-500/10 text-center font-bold text-xs text-white transition-all">
                ⚡ UPI Pay
              </div>
            </label>
            <label class="cursor-pointer">
              <input type="radio" name="checkoutPaymentMethod" value="CRYPTO" class="peer hidden">
              <div class="p-3.5 rounded-2xl bg-surface-900 border border-white/10 peer-checked:border-emerald-500 peer-checked:bg-emerald-500/10 text-center font-bold text-xs text-white transition-all">
                💎 Crypto (USDT)
              </div>
            </label>
          </div>
        </div>

        <button onclick="proceedToCheckoutPayment()" class="w-full py-4 rounded-2xl bg-emerald-500 text-gray-950 font-black text-xs uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all font-sans">
          Proceed to Secure Payment →
        </button>
      </div>
    </div>
  `;
}

async function renderStoreCheckout(container) {
  if (!state.token) return renderCustomerAuthPrompt(container, 'checkout');
  if (!state.cart.length) { navigate('cart'); return; }
  const item = state.cart[0];
  const method = state.checkoutMethod || 'UPI';

  container.innerHTML = `
    <div class="max-w-xl mx-auto glass rounded-3xl p-6 sm:p-8 space-y-6 font-sans">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-black text-white">Complete Payment</h2>
          <p class="text-xs text-slate-400 font-mono">Order Verification & Proof Upload</p>
        </div>
        <button onclick="navigate('cart')" class="text-xs text-slate-400 hover:text-white font-mono">← Back to Cart</button>
      </div>

      <div class="p-5 rounded-2xl bg-surface-950 border border-white/10 space-y-3 font-mono">
        <div class="flex justify-between items-center text-xs">
          <span class="text-slate-400">Payment Gateway:</span>
          <span class="text-emerald-400 font-bold">${method === 'UPI' ? 'UPI QR / ID' : 'USDT (TRC20)'}</span>
        </div>
        <div class="flex justify-between items-center text-sm font-black pt-2 border-t border-white/5">
          <span class="text-white">Amount to Pay:</span>
          <span class="text-emerald-400 text-lg">₹${item.price}</span>
        </div>
      </div>

      <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono leading-relaxed space-y-1">
        <div><strong>Instructions:</strong></div>
        <div>1. Transfer exact amount to merchant UPI / Wallet.</div>
        <div>2. Take a screenshot of the completed transfer.</div>
        <div>3. Click below to submit order & upload proof.</div>
      </div>

      <button onclick="handleCustomerCheckoutSubmit('${item.product_id}', '${method}')" class="w-full py-4 rounded-2xl bg-emerald-500 text-gray-950 font-black text-xs uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
        Confirm Order & Upload Proof
      </button>
    </div>
  `;
}

function removeCartItem(index) {
  state.cart.splice(index, 1);
  localStorage.setItem('nexus_cart', JSON.stringify(state.cart));
  const badge = document.getElementById('storeCartBadge');
  if (badge) badge.textContent = state.cart.length;
  renderStoreCart(document.getElementById('storeContent'));
  showToast('Item removed from cart');
}

function clearCustomerCart() {
  state.cart = [];
  localStorage.removeItem('nexus_cart');
  const badge = document.getElementById('storeCartBadge');
  if (badge) badge.textContent = '0';
  renderStoreCart(document.getElementById('storeContent'));
  showToast('Cart cleared');
}

function proceedToCheckoutPayment() {
  const radios = document.getElementsByName('checkoutPaymentMethod');
  let selected = 'UPI';
  for (const r of radios) { if (r.checked) selected = r.value; }
  state.checkoutMethod = selected;
  navigate('checkout');
}

async function handleCustomerCheckoutSubmit(productId, method) {
  try {
    const res = await fetchJSON('/api/checkout/initiate-order', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
      body: JSON.stringify({ items: [{ product_id: productId, duration: '1_MONTH' }], payment_method: method })
    });
    showToast('✓ Order placed! View in Purchased Items.');
    state.cart = []; localStorage.removeItem('nexus_cart');
    const badge = document.getElementById('storeCartBadge');
    if (badge) badge.textContent = '0';
    navigate('orders');
  } catch (err) { showToast(err.message, 'error'); }
}
