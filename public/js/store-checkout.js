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
  const qrUrl = paySettings.qr_image || `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=${encodeURIComponent(paySettings.upi_name || 'Nexus')}&am=${total}&cu=INR`)}`;

  const customerDefaultName = state.user.name || state.user.username || '';

  container.innerHTML = `
    <div class="space-y-5 max-w-lg mx-auto font-sans text-xs pb-28 animate-fadeIn px-1">
      
      <!-- Top Navigation & Security Header -->
      <div class="flex items-center justify-between">
        <button onclick="navigate('cart')" class="flex items-center gap-1.5 text-slate-400 hover:text-white font-mono text-xs transition-colors py-1 cursor-pointer">
          <span class="text-sm">←</span> <span>Back to Cart</span>
        </button>
        <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold tracking-wide">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> 256-BIT ENCRYPTED
        </span>
      </div>

      <!-- Main Checkout Card -->
      <div class="bg-surface-900/90 rounded-3xl p-5 sm:p-7 border border-white/10 space-y-6 shadow-2xl backdrop-blur-xl">
        
        <!-- Header -->
        <div class="text-center space-y-1">
          <h1 class="text-2xl font-black text-white tracking-tight">Complete Payment</h1>
          <p class="text-slate-400 text-xs font-mono">Logged in as <span class="text-emerald-400 font-bold">${state.user.username}</span></p>
        </div>

        <!-- Total Bill & Quick Copy UPI ID Card -->
        <div class="p-4 rounded-2xl bg-surface-950 border border-white/5 space-y-3 font-mono">
          <div class="flex items-center justify-between">
            <span class="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Total Payable</span>
            <span class="text-2xl font-black text-emerald-400 tracking-tight">₹${total}</span>
          </div>

          <div class="pt-2.5 border-t border-white/5 flex items-center justify-between gap-2">
            <div class="truncate">
              <span class="text-slate-500 text-[9px] uppercase block">Merchant UPI ID</span>
              <span id="upiIdText" class="text-white font-bold text-xs select-all block truncate">${upiId}</span>
            </div>
            <button type="button" onclick="copyUPIAddress('${upiId}')" id="copyUpiBtn" class="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-[10px] font-bold transition-all shrink-0 cursor-pointer active:scale-95 flex items-center gap-1">
              <span>📋</span> <span id="copyUpiLabel">Copy</span>
            </button>
          </div>
        </div>

        <!-- QR Code Display Box -->
        <div class="p-5 rounded-3xl bg-surface-950 border border-white/5 flex flex-col items-center justify-center space-y-4 shadow-inner">
          <div class="p-3.5 bg-white rounded-2xl shadow-2xl relative group">
            <img src="${qrUrl}" alt="Scan QR to Pay" class="w-48 h-48 sm:w-52 sm:h-52 object-contain mx-auto">
          </div>

          <!-- Official Supported UPI Apps Row -->
          <div class="w-full space-y-2 text-center">
            <span class="text-slate-400 font-mono text-[10px] uppercase tracking-widest font-semibold block">
              Scan & Pay using any UPI app
            </span>
            
            <div class="flex items-center justify-center gap-2 pt-1 flex-wrap">
              
              <!-- GPay Pill -->
              <div class="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-1.5 shadow-sm">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                <span class="text-slate-200 font-bold text-[10px]">Google Pay</span>
              </div>

              <!-- PhonePe Pill -->
              <div class="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-1.5 shadow-sm">
                <div class="w-4 h-4 rounded-full bg-[#5f259f] flex items-center justify-center font-bold text-white text-[10px]">पे</div>
                <span class="text-slate-200 font-bold text-[10px]">PhonePe</span>
              </div>

              <!-- Paytm Pill -->
              <div class="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-1.5 shadow-sm">
                <span class="text-[#00baf2] font-black text-[11px] tracking-tight">Paytm</span>
              </div>

              <!-- UPI Generic Pill -->
              <div class="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-1 shadow-sm">
                <span class="text-emerald-400 font-black text-[10px] tracking-widest font-mono">UPI</span>
              </div>

            </div>
          </div>
        </div>

        <!-- Verification & Submission Form -->
        <form onsubmit="handlePlaceOrderSubmit(event, ${total})" class="space-y-4 font-mono">
          
          <!-- Name Input (For Payment Matching) -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="text-slate-300 text-[10px] uppercase font-bold block">Payer / Account Name <span class="text-rose-400">*</span></label>
              <span class="text-[9px] text-slate-500">As shown in your UPI App</span>
            </div>
            <input type="text" id="payerFullName" required value="${customerDefaultName}" placeholder="e.g. Aryan Rajpurohit" class="w-full px-4 py-3 rounded-2xl bg-surface-950 border border-admin-border text-white placeholder-slate-600 text-xs outline-none focus:border-emerald-500 shadow-inner">
          </div>

          <!-- Customer Account Readonly -->
          <div class="space-y-1.5">
            <label class="text-slate-400 text-[10px] uppercase font-bold block">Delivery Account Email</label>
            <input type="text" readonly value="${state.user.email}" class="w-full px-4 py-3 rounded-2xl bg-surface-950/70 border border-white/5 text-slate-400 text-xs outline-none">
          </div>

          <!-- Screenshot File Upload & Preview -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-slate-300 text-[10px] uppercase font-bold block">Upload Payment Screenshot <span class="text-rose-400">*</span></label>
              <span class="text-[9px] text-emerald-400 font-bold">UTR / Ref # must be clear</span>
            </div>
            
            <div class="relative">
              <input type="file" id="proofInput" accept="image/*" required onchange="handleProofImageUpload(event)" class="w-full px-3 py-2.5 rounded-2xl bg-surface-950 border border-admin-border text-slate-400 text-xs outline-none file:mr-3 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-emerald-500 file:text-gray-950 cursor-pointer focus:border-emerald-500">
            </div>

            <!-- Preview Container -->
            <div id="proofPreviewContainer" class="hidden p-2 rounded-2xl bg-surface-950 border border-white/10 flex items-center gap-3">
              <img id="proofPreviewImg" class="w-12 h-12 object-cover rounded-xl border border-white/10">
              <div class="truncate flex-1">
                <span id="proofFileName" class="text-white text-xs font-bold block truncate"></span>
                <span class="text-emerald-400 text-[10px] block">✓ Image loaded successfully</span>
              </div>
            </div>
          </div>

          <!-- Submit Order Button -->
          <button type="submit" id="submitOrderBtn" class="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-gray-950 font-black uppercase text-xs tracking-wider transition-all cursor-pointer shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 mt-2 font-mono">
            <span>✓ SUBMIT ORDER & VERIFY</span>
          </button>

          <p class="text-center text-[10px] text-slate-500 font-sans leading-relaxed pt-1">
            Orders are reviewed by admin within minutes. Credentials will be delivered directly to your <strong class="text-slate-400">Purchased Items Vault</strong>.
          </p>

        </form>

      </div>

    </div>
  `;
}

function copyUPIAddress(upi) {
  navigator.clipboard.writeText(upi).then(() => {
    const label = document.getElementById('copyUpiLabel');
    if (label) {
      label.textContent = 'Copied!';
      setTimeout(() => { label.textContent = 'Copy'; }, 2000);
    }
    showToast('✓ Merchant UPI ID copied to clipboard');
  }).catch(() => {
    showToast('Failed to copy. Please copy manually.', 'error');
  });
}

function handleProofImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const previewBox = document.getElementById('proofPreviewContainer');
  const previewImg = document.getElementById('proofPreviewImg');
  const fileName = document.getElementById('proofFileName');

  const reader = new FileReader();
  reader.onload = (event) => {
    uploadedProofBase64 = event.target.result;
    if (previewBox && previewImg && fileName) {
      previewImg.src = uploadedProofBase64;
      fileName.textContent = file.name;
      previewBox.classList.remove('hidden');
    }
  };
  reader.readAsDataURL(file);
}

async function handlePlaceOrderSubmit(e, totalAmount) {
  e.preventDefault();

  const payerName = document.getElementById('payerFullName').value.trim();
  if (!payerName) {
    showToast('Please enter your full name as shown on UPI', 'error');
    return;
  }

  if (!uploadedProofBase64) {
    showToast('Please attach your payment screenshot proof', 'error');
    return;
  }

  const btn = document.getElementById('submitOrderBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span>⏳ Submitting Application...</span>`;
  }

  const cart = Array.isArray(state.cart) ? state.cart : [];

  const payload = {
    items: cart,
    customer_name: payerName,
    customer_email: state.user.email,
    total_amount: totalAmount,
    proof_screenshot: uploadedProofBase64,
    payment_method: 'UPI QR'
  };

  try {
    await fetchJSON('/api/orders/checkout', {
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
      btn.innerHTML = `<span>✓ SUBMIT ORDER & VERIFY</span>`;
    }
  }
}
