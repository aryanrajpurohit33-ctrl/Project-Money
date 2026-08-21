async function renderStoreCheckout(container) {
  if (!state.cart || state.cart.length === 0) {
    navigate('cart');
    return;
  }

  const total = state.cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
  container.innerHTML = getLoadingSpinnerHTML();

  try {
    const s = await fetchJSON('/api/settings');

    const upiId = s.upi_id || s.merchant_upi || 'merchant@okaxis';
    const upiName = s.upi_name || 'Nexus Digital Pay';
    const customQR = s.upi_qr_image || s.qr_code || '';
    
    // Use custom uploaded QR code if available; otherwise generate dynamic QR with amount
    const qrSrc = customQR ? customQR : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${total}&cu=INR`)}`;

    container.innerHTML = `
      <div class="space-y-6 max-w-lg mx-auto font-sans text-xs pb-28 animate-fadeIn px-1">
        
        <!-- Header -->
        <div class="text-center space-y-1">
          <h1 class="text-2xl font-black text-white tracking-tight">Complete Payment</h1>
          <p class="text-slate-400 font-mono text-[11px]">Logged in as <span class="text-emerald-400 font-bold">${state.user?.username || state.user?.name || 'Customer'}</span></p>
        </div>

        <!-- Total Payable Card -->
        <div class="p-5 rounded-3xl bg-surface-900/90 border border-white/10 space-y-4 shadow-xl font-mono">
          <div class="flex items-center justify-between">
            <span class="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Total Payable</span>
            <span class="text-2xl sm:text-3xl font-black text-emerald-400">₹${total}</span>
          </div>

          <div class="pt-3 border-t border-white/5 flex items-center justify-between">
            <div class="space-y-0.5">
              <span class="text-slate-500 text-[9px] uppercase font-bold block">Merchant UPI ID</span>
              <span class="text-white font-bold text-xs" id="checkoutUpiText">${upiId}</span>
            </div>
            <button type="button" onclick="copyCheckoutUpi('${upiId}')" class="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5">
              <span>📋</span> <span>Copy</span>
            </button>
          </div>
        </div>

        <!-- QR Code Container -->
        <div class="p-6 rounded-3xl bg-surface-900/90 border border-white/10 flex flex-col items-center space-y-4 shadow-xl">
          <div class="w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden bg-white p-3 shadow-2xl flex items-center justify-center">
            <img src="${qrSrc}" alt="UPI QR Code" class="w-full h-full object-contain select-none">
          </div>

          <div class="text-center space-y-3">
            <span class="text-slate-400 font-mono text-[10px] uppercase font-bold tracking-wider block">
              Scan & Pay Using Any UPI App
            </span>

            <div class="flex items-center justify-center gap-2 flex-wrap">
              <span class="px-3 py-1.5 rounded-xl bg-surface-950 border border-white/10 text-white font-mono text-[10px] font-bold flex items-center gap-1.5">
                <span class="text-emerald-400">●</span> Google Pay
              </span>
              <span class="px-3 py-1.5 rounded-xl bg-surface-950 border border-white/10 text-white font-mono text-[10px] font-bold flex items-center gap-1.5">
                <span class="text-purple-400">●</span> PhonePe
              </span>
              <span class="px-3 py-1.5 rounded-xl bg-surface-950 border border-white/10 text-white font-mono text-[10px] font-bold flex items-center gap-1.5">
                <span class="text-sky-400">●</span> Paytm
              </span>
              <span class="px-3 py-1.5 rounded-xl bg-surface-950 border border-white/10 text-emerald-400 font-mono text-[10px] font-bold">
                UPI
              </span>
            </div>
          </div>
        </div>

        <!-- Payment Verification Form -->
        <form onsubmit="handleCustomerPaymentProofSubmit(event)" class="space-y-4 font-mono">
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="text-slate-300 text-[10px] uppercase font-bold tracking-wider">Payer / Account Name *</label>
              <span class="text-slate-500 text-[9px]">As shown in your UPI App</span>
            </div>
            <input type="text" id="payerNameInput" required placeholder="e.g. Aryan" value="${state.user?.name || ''}" class="w-full px-4 py-3.5 rounded-2xl bg-surface-900 border border-white/10 text-white text-xs outline-none focus:border-emerald-500">
          </div>

          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="text-slate-300 text-[10px] uppercase font-bold tracking-wider">12-Digit UTR / Transaction ID *</label>
              <span class="text-slate-500 text-[9px]">Mandatory for verification</span>
            </div>
            <input type="text" id="transactionIdInput" required maxlength="12" placeholder="e.g. 423456789012" class="w-full px-4 py-3.5 rounded-2xl bg-surface-900 border border-white/10 text-emerald-400 font-bold text-xs outline-none focus:border-emerald-500">
          </div>

          <button type="submit" id="confirmOrderBtn" class="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-gray-950 font-black uppercase text-xs tracking-wider transition-all cursor-pointer shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2">
            <span>✓ SUBMIT PAYMENT VERIFICATION</span>
          </button>
        </form>

      </div>
    `;
  } catch (err) {
    container.innerHTML = `
      <div class="p-8 text-center text-rose-400 font-mono text-xs rounded-3xl bg-surface-900/80 border border-white/5">
        Error loading checkout: ${err.message}
      </div>
    `;
  }
}

function copyCheckoutUpi(id) {
  navigator.clipboard.writeText(id);
  showToast('✓ UPI ID copied to clipboard');
}

async function handleCustomerPaymentProofSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('confirmOrderBtn');
  btn.disabled = true;
  btn.innerHTML = 'Verifying & Creating Order...';

  const payerName = document.getElementById('payerNameInput').value.trim();
  const utr = document.getElementById('transactionIdInput').value.trim();

  const total = state.cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);

  const payload = {
    items: state.cart,
    total_amount: total,
    payer_name: payerName,
    transaction_id: utr,
    payment_method: 'UPI'
  };

  try {
    await fetchJSON('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': state.token ? `Bearer ${state.token}` : ''
      },
      body: JSON.stringify(payload)
    });

    state.cart = [];
    localStorage.removeItem('nexus_cart');
    const bagBadge = document.getElementById('cartBadgeCount');
    if (bagBadge) bagBadge.classList.add('hidden');

    showToast('✓ Order submitted successfully!');
    navigate('dashboard');
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '✓ SUBMIT PAYMENT VERIFICATION';
    showToast(err.message, 'error');
  }
}
