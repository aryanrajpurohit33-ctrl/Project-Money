async function renderStoreCheckout(container) {
  if (!state.token) return renderCustomerAuthPrompt(container, 'checkout');
  if (!state.cart.length) { navigate('home'); return; }
  const item = state.cart[0];

  container.innerHTML = `
    <div class="max-w-xl mx-auto glass rounded-3xl p-8 space-y-6 font-sans">
      <div>
        <h2 class="text-xl font-black text-white">Secure Checkout</h2>
        <p class="text-xs text-slate-400">Complete payment via UPI or Crypto, then upload transaction proof.</p>
      </div>

      <div class="p-4 rounded-2xl bg-surface-950 border border-white/5 flex justify-between items-center font-mono">
        <div>
          <span class="text-white font-bold block">${item.name}</span>
          <span class="text-[10px] text-slate-500">Digital Delivery</span>
        </div>
        <span class="text-xl font-black text-emerald-400">₹${item.price}</span>
      </div>

      <button onclick="handleCustomerCheckoutSubmit('${item.product_id}')" class="w-full py-4 rounded-2xl bg-emerald-500 text-gray-950 font-black text-xs uppercase shadow-lg active:scale-95 transition-all">
        Confirm Order & Upload Proof
      </button>
    </div>
  `;
}

async function handleCustomerCheckoutSubmit(productId) {
  try {
    const res = await fetchJSON('/api/checkout/initiate-order', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
      body: JSON.stringify({ items: [{ product_id: productId, duration: '1_MONTH' }], payment_method: 'UPI' })
    });
    showToast('✓ Order placed! View in Purchased Items.');
    state.cart = []; localStorage.removeItem('nexus_cart');
    navigate('orders');
  } catch (err) { showToast(err.message, 'error'); }
}
