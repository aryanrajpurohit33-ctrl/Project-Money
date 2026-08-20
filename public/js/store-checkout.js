async function renderStoreCheckout(container) {
  // Require login before rendering checkout
  if (!state.token || !state.user || state.user.isAdmin) {
    navigate('login', { returnView: 'checkout' });
    return;
  }

  const cart = Array.isArray(state.cart) ? state.cart : [];
  if (cart.length === 0) {
    navigate('cart');
    return;
  }

  container.innerHTML = getLoadingSpinnerHTML();

  try {
    const paySettings = await fetchJSON('/api/payment-settings').catch(() => ({}));
    const totalAmount = cart.reduce((acc, item) => acc + (Number(item.price) || 0), 0);
    const prodNames = cart.map(i => i.name).join(', ');
    const upiId = paySettings.upi_id || 'merchant@okaxis';
    const upiName = paySettings.upi_name || 'Nexus Digital';

    const customerName = state.user?.name || state.user?.username || '';
    const customerEmail = state.user?.email || '';
    const customerMobile = state.user?.mobile || '';

    const qrUrl = paySettings.qr_image || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${totalAmount}&cu=INR`)}`;

    container.innerHTML = `
      <div class="max-w-sm mx-auto py-2 px-1 space-y-4 font-sans text-xs pb-24 animate-fadeIn">
        
        <!-- Header -->
        <div class="flex items-center justify-between">
          <button onclick="navigate('cart')" class="text-slate-400 hover:text-white font-mono text-xs flex items-center gap-1">
            <span>←</span> <span>Cart</span>
          </button>
          <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase">
            ⚡ Secure Payment
          </span>
        </div>

        <div class="bg-surface-900/80 rounded-3xl p-5 border border-white/5 shadow-2xl space-y-4">
          
          <div class="text-center space-y-1">
            <h1 class="text-lg font-black text-white tracking-tight">Complete Payment</h1>
            <p class="text-slate-400 text-[11px]">Logged in as <strong class="text-emerald-400">${customerName}</strong></p>
          </div>

          <!-- Total Amount Card -->
          <div class="p-3.5 rounded-2xl bg-surface-950 border border-white/5 flex items-center justify-between font-mono">
            <div>
              <span class="text-slate-500 text-[9px] uppercase block">Total to Pay</span>
              <span class="text-xl font-black text-emerald-400">₹${totalAmount}</span>
            </div>
            <div class="text-right">
              <span class="text-slate-500 text-[9px] uppercase block">Merchant UPI ID</span>
              <span class="text-white text-[11px] font-bold select-all">${upiId}</span>
            </div>
          </div>

          <!-- UPI QR Code Display -->
          <div class="flex flex-col items-center justify-center p-3.5 bg-surface-950 rounded-2xl border border-white/5 space-y-2">
            <div class="p-2.5 bg-white rounded-xl shadow-xl">
              <img src="${qrUrl}" alt="UPI QR" class="w-36 h-36 object-contain rounded-lg">
            </div>
            <span class="text-[10px] font-mono text-slate-400">Scan via GooglePay, PhonePe, or Paytm</span>
          </div>

          <!-- Order Confirmation Form -->
          <form onsubmit="handleAuthenticatedCheckoutSubmit(event, ${totalAmount}, '${encodeURIComponent(prodNames)}')" class="space-y-3 font-mono">
            
            <div>
              <label class="text-slate-400 text-[10px] uppercase block mb-1 font-bold">Customer Account</label>
              <input type="text" readonly value="${customerName} (${customerEmail || customerMobile})" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950/60 border border-white/5 text-slate-300 text-xs font-sans outline-none cursor-not-allowed">
            </div>

            <!-- Screenshot Upload -->
            <div class="space-y-1">
              <label class="text-slate-400 text-[10px] uppercase block font-bold">Upload Payment Screenshot</label>
              <div class="p-2.5 rounded-xl bg-surface-950 border border-white/10 flex items-center justify-between">
                <input type="file" accept="image/*" id="chkProofFile" onchange="handleProofUpload(event)" class="text-slate-400 text-[10px] file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:bg-emerald-500/10 file:text-emerald-400 file:font-mono file:text-[10px] file:font-bold cursor-pointer">
              </div>
              <input type="hidden" id="chkProofBase64" value="">
            </div>

            <button type="submit" id="chkSubmitBtn" class="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-gray-950 font-black uppercase text-xs tracking-wider shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2">
              <span>CONFIRM ORDER & COMPLETE</span>
              <span>→</span>
            </button>

          </form>

        </div>

      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-rose-400 font-mono text-xs">Error loading checkout: ${err.message}</div>`;
  }
}

function handleProofUpload(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    document.getElementById('chkProofBase64').value = evt.target.result;
    showToast('✓ Screenshot attached');
  };
  reader.readAsDataURL(file);
}

async function handleAuthenticatedCheckoutSubmit(e, totalAmount, encodedProdNames) {
  e.preventDefault();

  const proof = document.getElementById('chkProofBase64').value;
  const prodNames = decodeURIComponent(encodedProdNames);

  const btn = document.getElementById('chkSubmitBtn');
  btn.disabled = true;
  btn.innerHTML = '<span>Processing Order...</span>';

  try {
    const payload = {
      customer_name: state.user.username || 'Customer',
      customer_email: state.user.email || state.user.mobile || '',
      user_id: state.user.id || '',
      product_name: prodNames,
      amount: totalAmount,
      payment_method: 'UPI',
      proof_screenshot: proof
    };

    await fetchJSON('/api/checkout', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify(payload)
    });

    state.cart = [];
    localStorage.removeItem('nexus_cart');

    showToast('✓ Order placed successfully! Verification in progress.');
    navigate('orders');
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
    btn.innerHTML = '<span>CONFIRM ORDER & COMPLETE</span> <span>→</span>';
  }
}
