window.currentProofData = '';

async function renderStoreCheckout(container) {
  // Ensure body scroll is unlocked when entering checkout
  document.body.style.overflow = '';
  window.currentProofData = '';

  if (!state.cart || state.cart.length === 0) {
    navigate('cart');
    return;
  }

  const total = state.cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
  container.innerHTML = getLoadingSpinnerHTML();

  let s = {};
  try {
    s = await fetchJSON('/api/payment-settings');
  } catch (e1) {
    try {
      s = await fetchJSON('/api/settings');
    } catch (e2) {
      s = {};
    }
  }

  const upiId = s.upi_id || s.merchant_upi || '7696161236-3@ybl';
  const upiName = s.upi_name || 'Nexus Digital Pay';
  const customQR = s.upi_qr_image || s.qr_code || '';
  
  const qrSrc = customQR || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${total}&cu=INR`)}`;

  container.innerHTML = `
    <div class="space-y-6 max-w-lg mx-auto font-sans text-xs pb-28 animate-fadeIn px-1 relative">
      
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
      <div class="space-y-4 font-mono">
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label class="text-slate-300 text-[10px] uppercase font-bold tracking-wider">Payer / Account Name *</label>
            <span class="text-slate-500 text-[9px]">As shown in your UPI App</span>
          </div>
          <input type="text" id="payerNameInput" required placeholder="e.g. Aryan" value="${state.user?.name || state.user?.username || ''}" class="w-full px-4 py-3.5 rounded-2xl bg-surface-900 border border-white/10 text-white text-xs outline-none focus:border-emerald-500">
        </div>

        <!-- File Picker -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label class="text-slate-300 text-[10px] uppercase font-bold tracking-wider">Payment Screenshot Proof *</label>
            <span class="text-emerald-400 text-[9px] font-bold">Auto-Compressed</span>
          </div>
          
          <div class="p-4 rounded-2xl bg-surface-900 border border-white/10 space-y-3">
            <input type="file" id="proofFileInput" accept="image/*" onchange="compressAndPreviewProof(this)" class="w-full px-3 py-2 rounded-xl bg-surface-950 border border-white/10 text-slate-400 text-xs outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-500 file:text-gray-950 cursor-pointer">

            <div id="proofPreviewBox" class="hidden items-center gap-3 pt-1">
              <div class="relative w-16 h-16 rounded-xl overflow-hidden bg-black/40 border border-emerald-500/40 shrink-0">
                <img id="proofPreviewImg" src="" alt="Proof Preview" class="w-full h-full object-cover">
              </div>
              <div class="space-y-0.5">
                <span class="text-emerald-400 text-[11px] font-bold block">✓ Proof Ready</span>
                <span class="text-slate-500 text-[10px] block">Optimized for fast instant verification</span>
              </div>
            </div>
          </div>
        </div>

        <button type="button" onclick="openInstructionsModal()" class="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-gray-950 font-black uppercase text-xs tracking-wider transition-all cursor-pointer shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 font-mono">
          <span>✓ SUBMIT PAYMENT PROOF</span>
        </button>
      </div>

      <!-- Instructions Safety Modal Overlay -->
      <div id="instructionModalOverlay" onclick="closeInstructionsModal()" class="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-3 opacity-0 pointer-events-none transition-all duration-300">
        
        <div id="instructionModalContent" onclick="event.stopPropagation()" class="w-full max-w-md bg-surface-900 border border-white/10 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl transform scale-95 translate-y-8 transition-all duration-300 font-sans max-h-[90vh] overflow-y-auto">
          
          <!-- Modal Header -->
          <div class="flex items-center justify-between border-b border-white/5 pb-3">
            <div class="flex items-center gap-2">
              <span class="text-amber-400 text-lg">⚠️</span>
              <h3 class="text-white font-black text-sm uppercase tracking-wide font-mono">Usage Policy & Rules</h3>
            </div>
            <button type="button" onclick="closeInstructionsModal()" class="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-xs cursor-pointer">✕</button>
          </div>

          <!-- Rules List -->
          <div class="space-y-2.5 text-xs">
            <div class="flex items-start gap-3 p-3 rounded-2xl bg-surface-950/80 border border-white/5">
              <span class="text-rose-400 text-sm font-bold shrink-0">🚫</span>
              <div class="space-y-0.5">
                <strong class="text-white block text-[11px]">Do Not Share Credentials</strong>
                <p class="text-slate-400 text-[10px] leading-relaxed">Never share the account email or password with anyone outside your plan.</p>
              </div>
            </div>

            <div class="flex items-start gap-3 p-3 rounded-2xl bg-surface-950/80 border border-white/5">
              <span class="text-rose-400 text-sm font-bold shrink-0">🔒</span>
              <div class="space-y-0.5">
                <strong class="text-white block text-[11px]">Do Not Modify Account / Password</strong>
                <p class="text-slate-400 text-[10px] leading-relaxed">Do not attempt to change email, password, payment details, or profile settings.</p>
              </div>
            </div>

            <div class="flex items-start gap-3 p-3 rounded-2xl bg-surface-950/80 border border-white/5">
              <span class="text-emerald-400 text-sm font-bold shrink-0">👤</span>
              <div class="space-y-0.5">
                <strong class="text-white block text-[11px]">Use Only Assigned Profile</strong>
                <p class="text-slate-400 text-[10px] leading-relaxed">Stream strictly within your assigned profile number and enter your assigned PIN.</p>
              </div>
            </div>
          </div>

          <!-- Mandatory Acknowledgment Checkbox -->
          <label class="flex items-start gap-3 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 cursor-pointer select-none">
            <input type="checkbox" id="policyAgreementCheckbox" onchange="toggleAgreeButtonState()" class="mt-0.5 w-4 h-4 rounded border-rose-500/40 text-emerald-500 focus:ring-0 cursor-pointer accent-emerald-500 shrink-0">
            <span class="text-[11px] text-rose-200 leading-snug font-mono">
              I understand that violating any of these rules will result in immediate <strong class="text-rose-400 underline">subscription revocation without any refund</strong>.
            </span>
          </label>

          <!-- Action Buttons -->
          <div class="space-y-2 pt-1 font-mono">
            <button id="agreeAndOrderBtn" disabled onclick="confirmAgreementAndSubmit()" class="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-emerald-500 disabled:cursor-not-allowed text-gray-950 font-black uppercase text-xs tracking-wider transition-all cursor-pointer shadow-xl shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center gap-2">
              <span>✓ I AGREE & PLACE ORDER</span>
            </button>
            <button type="button" onclick="closeInstructionsModal()" class="w-full py-2 text-center text-slate-500 hover:text-slate-300 text-[10px] uppercase font-bold cursor-pointer">
              Go Back
            </button>
          </div>

        </div>
      </div>

    </div>
  `;
}

function openInstructionsModal() {
  const payerName = document.getElementById('payerNameInput')?.value.trim();
  if (!payerName) {
    showToast('Please enter your Payer Account Name', 'error');
    return;
  }

  if (!window.currentProofData) {
    showToast('Please attach your payment screenshot proof', 'error');
    return;
  }

  const overlay = document.getElementById('instructionModalOverlay');
  const modal = document.getElementById('instructionModalContent');
  if (!overlay || !modal) return;

  const checkbox = document.getElementById('policyAgreementCheckbox');
  if (checkbox) checkbox.checked = false;
  toggleAgreeButtonState();

  // Lock body scroll
  document.body.style.overflow = 'hidden';

  overlay.classList.remove('opacity-0', 'pointer-events-none');
  modal.classList.remove('scale-95', 'translate-y-8');
  modal.classList.add('scale-100', 'translate-y-0');
}

function closeInstructionsModal() {
  const overlay = document.getElementById('instructionModalOverlay');
  const modal = document.getElementById('instructionModalContent');
  if (!overlay || !modal) return;

  // Restore body scroll
  document.body.style.overflow = '';

  modal.classList.remove('scale-100', 'translate-y-0');
  modal.classList.add('scale-95', 'translate-y-8');
  overlay.classList.add('opacity-0', 'pointer-events-none');
}

function toggleAgreeButtonState() {
  const checkbox = document.getElementById('policyAgreementCheckbox');
  const btn = document.getElementById('agreeAndOrderBtn');
  if (checkbox && btn) {
    btn.disabled = !checkbox.checked;
  }
}

function compressAndPreviewProof(input) {
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 900;
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      window.currentProofData = canvas.toDataURL('image/jpeg', 0.72);

      const box = document.getElementById('proofPreviewBox');
      const previewImg = document.getElementById('proofPreviewImg');
      if (box && previewImg) {
        previewImg.src = window.currentProofData;
        box.classList.remove('hidden');
        box.classList.add('flex');
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function copyCheckoutUpi(id) {
  navigator.clipboard.writeText(id);
  showToast('✓ UPI ID copied to clipboard');
}

async function confirmAgreementAndSubmit() {
  const proof = window.currentProofData;
  if (!proof) {
    showToast('Please select a payment screenshot proof', 'error');
    return;
  }

  const btn = document.getElementById('agreeAndOrderBtn');
  btn.disabled = true;
  btn.innerHTML = 'Submitting Proof...';

  const payerName = document.getElementById('payerNameInput')?.value.trim() || state.user?.name || 'Customer';
  const total = state.cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);

  const payload = {
    items: state.cart,
    total_amount: total,
    amount: total,
    customer_name: payerName,
    customer_email: state.user?.email || '',
    proof_screenshot: proof,
    payment_method: 'UPI'
  };

  try {
    await fetchJSON('/api/orders/checkout', {
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

    closeInstructionsModal();
    showToast('✓ Payment proof submitted! Redirecting to vault...');
    
    setTimeout(() => {
      navigate('orders');
    }, 400);

  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '✓ I AGREE & PLACE ORDER';
    showToast(err.message, 'error');
  }
}
