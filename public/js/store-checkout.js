let uploadedProofBase64 = '';

async function renderStoreCheckout(container) {
  if (!state.user || !state.token) {
    navigate('login', { returnView: 'checkout' });
    return;
  }

  const cart = Array.isArray(state.cart) ? state.cart : [];
  if (cart.length === 0) {
    navigate('cart');
    return;
  }

  const total = cart.reduce((acc, item) => acc + (Number(item.price) || 0), 0);
  uploadedProofBase64 = '';

  // Retrieve payment gateway settings
  let paySettings = { upi_id: 'merchant@okaxis', upi_name: 'Nexus Pay', qr_image: '' };
  try {
    paySettings = await fetchJSON('/api/payment-settings').catch(() => paySettings);
  } catch (e) {}

  const upiId = paySettings.upi_id || 'merchant@okaxis';
  const qrUrl = paySettings.qr_image || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=${encodeURIComponent(paySettings.upi_name || 'Nexus')}&am=${total}&cu=INR`)}`;

  container.innerHTML = `
    <div class="space-y-6 max-w-lg mx-auto font-sans text-xs pb-24 animate-fadeIn px-1">
      
      <!-- Back Link -->
      <div class="flex items-center justify-between">
        <button onclick="navigate('cart')" class="flex items-center gap-1.5 text-slate-400 hover:text-white font-mono text-xs transition-colors py-1 cursor-pointer">
          <span class="text-sm">←</span> <span>Cart</span>
        </button>
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold">
          ⚡ SECURE PAYMENT
        </span>
      </div>

      <!-- Checkout Card -->
      <div class="bg-surface-900/80 rounded-3xl p-5 sm:p-6 border border-white/5 space-y-5 shadow-2xl backdrop-blur-xl">
        
        <div class="text-center space-y-1">
          <h1 class="text-2xl font-black text-white tracking-tight">Complete Payment</h1>
          <p class="text-slate-400 text-xs font-mono">Logged in as <strong class="text-emerald-400 font-bold">${state.user.username}</strong></p>
        </div>

        <!-- Financial Breakdown -->
        <div class="p-4 rounded-2xl bg-surface-950 border border-white/5 flex items-center justify-between font-mono">
          <div>
            <span class="text-slate-500 text-[10px] uppercase font-bold block">Total to Pay</span>
            <span class="text-2xl font-black text-emerald-400 block">₹${total}</span>
          </div>
          <div class="text-right">
            <span class="text-slate-500 text-[10px] uppercase font-bold block">Merchant UPI ID</span>
            <span class="text-white font-bold text-xs select-all block">${upiId}</span>
          </div>
        </div>

        <!-- QR Code Display -->
        <div class="p-5 rounded-3xl bg-surface-950 border border-white/5 flex flex-col items-center justify-center space-y-3 shadow-inner">
          <div class="p-3 bg-white rounded-2xl shadow-xl">
            <img src="${qrUrl}" alt="Payment QR" class="w-48 h-48 object-contain">
          </div>
          <span class="text-slate-400 font-mono text-[11px] text-center">Scan via GooglePay, PhonePe, or Paytm</span>
        </div>

        <!-- Form Submission -->
        <form onsubmit="handlePlaceOrderSubmit(event, ${total})" class="space-y-4 font-mono">
          
          <div>
            <label class="text-slate-400 text-[10px] uppercase font-bold block mb-1.5">Customer Account</label>
            <input type="text" readonly value="${state.user.username} (${state.user.email})" class="w-full px-4 py-3 rounded-2xl bg-surface-950 border border-white/5 text-slate-300 text-xs outline-none">
          </div>

          <div class="space-y-1.5">
            <label class="text-slate-400 text-[10px] uppercase font-bold block">Upload Payment Screenshot</label>
            <div class="relative">
              <input type="file" id="proofInput" accept="image/*" required onchange="handleProofImageUpload(event)" class="w-full px-4 py-3 rounded-2xl bg-surface-950 border border-admin-border text-slate-400 text-xs outline-none file:mr-3 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-emerald-500 file:text-gray-950 cursor-pointer">
            </div>
            <span id="proofUploadStatus" class="text-[10px] text-slate-500 block">Attach UPI receipt with clear UTR transaction reference.</span>
          </div>

          <button type="submit" id="submitOrderBtn" class="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black uppercase text-xs tracking-wider transition-all cursor-pointer shadow-xl shadow-emerald-500/25 active:scale-[0.98] flex items-center justify-center gap-2">
            <span>✓ SUBMIT PAYMENT PROOF</span>
          </button>

        </form>

      </div>

    </div>
  `;
}

function handleProofImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const statusEl = document.getElementById('proofUploadStatus');
  if (statusEl) statusEl.textContent = 'Processing screenshot...';

  const reader = new FileReader();
  reader.onload = (event) => {
    uploadedProofBase64 = event.target.result;
    if (statusEl) statusEl.textContent = `✓ Screenshot ready (${file.name})`;
  };
  reader.readAsDataURL(file);
}

async function handlePlaceOrderSubmit(e, totalAmount) {
  e.preventDefault();

  if (!uploadedProofBase64) {
    showToast('Please attach your payment screenshot proof', 'error');
    return;
  }

  const btn = document.getElementById('submitOrderBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Submitting Application...';
  }

  const cart = Array.isArray(state.cart) ? state.cart : [];

  const payload = {
    items: cart,
    customer_name: state.user.username,
    customer_email: state.user.email,
    total_amount: totalAmount,
    proof_screenshot: uploadedProofBase64,
    payment_method: 'UPI QR'
  };

  try {
    const res = await fetchJSON('/api/orders/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify(payload)
    });

    // Clear cart on successful submission
    state.cart = [];
    localStorage.removeItem('nexus_cart');
    const bagBadge = document.getElementById('cartBadgeCount');
    if (bagBadge) bagBadge.classList.add('hidden');

    showToast('✓ Payment submitted! Verification in progress.');
    navigate('orders');
  } catch (err) {
    showToast(err.message, 'error');
    if (btn) {
      btn.disabled = false;
      btn.textContent = '✓ SUBMIT PAYMENT PROOF';
    }
  }
}
