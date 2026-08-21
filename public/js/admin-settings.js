window.currentUploadedQRCode = '';

async function renderAdminSettings(container) {
  container.innerHTML = getLoadingSpinnerHTML();

  try {
    const config = await fetchJSON('/api/settings');
    paintAdminPaymentSettingsHTML(container, config || {});
  } catch (err) {
    container.innerHTML = `
      <div class="admin-card p-8 text-center text-rose-400 font-mono text-xs rounded-3xl border border-admin-border">
        Error loading settings: ${err.message}
      </div>
    `;
  }
}

function paintAdminPaymentSettingsHTML(container, cfg) {
  window.currentUploadedQRCode = cfg.upi_qr_image || '';

  container.innerHTML = `
    <div class="space-y-6 font-sans text-xs pb-24 max-w-2xl mx-auto animate-fadeIn px-1">
      
      <!-- Header -->
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider">
            Gateway Config
          </span>
          <span class="text-slate-500 font-mono text-[10px]">Instant Checkout</span>
        </div>
        <h1 class="text-2xl font-black text-white tracking-tight">Payment Gateway Configuration</h1>
        <p class="text-slate-400 text-xs font-mono">Configure customer UPI payment method, custom QR code, and checkout instructions.</p>
      </div>

      <form onsubmit="handleSavePaymentGatewaySettings(event)" class="space-y-5">
        
        <!-- UPI Payment Settings Card -->
        <div class="admin-card rounded-3xl p-5 sm:p-6 border border-admin-border space-y-5 bg-surface-900/80 shadow-2xl">
          
          <div class="flex items-center justify-between border-b border-white/5 pb-3">
            <div class="flex items-center gap-2">
              <span class="text-emerald-400 text-base">⚡</span>
              <h2 class="text-white font-bold text-sm font-mono">UPI Payment Settings</h2>
            </div>
            <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase">
              Active
            </span>
          </div>

          <div class="space-y-4 font-mono">
            
            <!-- Merchant UPI ID -->
            <div class="space-y-1.5">
              <label class="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Merchant UPI ID</label>
              <input type="text" id="merchantUpiId" required value="${cfg.merchant_upi || cfg.upi_id || 'merchant@okaxis'}" placeholder="e.g. merchant@okaxis" class="w-full px-4 py-3 rounded-2xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500 transition-all font-mono">
            </div>

            <!-- UPI Display Name -->
            <div class="space-y-1.5">
              <label class="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">UPI Display Name</label>
              <input type="text" id="upiDisplayName" required value="${cfg.upi_name || 'Nexus Digital Pay'}" placeholder="e.g. Nexus Digital Pay" class="w-full px-4 py-3 rounded-2xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500 transition-all font-mono">
            </div>

            <!-- UPI Custom QR Code Upload Section -->
            <div class="p-4 rounded-2xl bg-surface-950 border border-white/5 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-emerald-400 text-xs font-bold font-mono">📷 Merchant QR Code</span>
                <span class="text-[10px] text-slate-500 font-mono">PNG, JPG, WEBP</span>
              </div>

              <!-- Upload File & URL Input -->
              <div class="space-y-2">
                <input type="file" id="qrFileInput" accept="image/*" onchange="handleQRFileUpload(event)" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-900 border border-admin-border text-slate-400 text-xs outline-none file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-500 file:text-gray-950 cursor-pointer font-mono">
                
                <div class="flex items-center gap-2">
                  <input type="url" id="qrUrlInput" value="${window.currentUploadedQRCode}" placeholder="Or paste direct QR image URL (https://...)" class="flex-1 px-3.5 py-2.5 rounded-xl bg-surface-900 border border-admin-border text-white text-xs outline-none focus:border-emerald-500 font-mono">
                  <button type="button" onclick="handleApplyQRUrl()" class="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold cursor-pointer">
                    Apply
                  </button>
                </div>
              </div>

              <!-- Live QR Code Preview Box -->
              <div id="qrCodePreviewContainer" class="pt-2 flex items-center gap-4">
                ${renderQRPreviewHTML()}
              </div>
            </div>

            <!-- UPI Instructions -->
            <div class="space-y-1.5">
              <label class="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">UPI Instructions</label>
              <textarea id="upiInstructions" rows="4" class="w-full p-3.5 rounded-2xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500 transition-all font-mono leading-relaxed">${cfg.upi_instructions || '1. Scan QR code or copy UPI ID.\n2. Pay the exact order amount.\n3. Take a screenshot of the completed payment.'}</textarea>
            </div>

          </div>

        </div>

        <!-- Submit Save Button -->
        <button type="submit" class="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-gray-950 font-mono text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2">
          <span>💾 Save Payment Configuration</span>
        </button>

      </form>

    </div>
  `;
}

function renderQRPreviewHTML() {
  if (!window.currentUploadedQRCode) {
    return `
      <div class="w-24 h-24 rounded-2xl bg-surface-900 border border-dashed border-white/10 flex flex-col items-center justify-center text-slate-500 font-mono text-[9px] text-center p-1">
        <span>No QR code</span>
        <span>uploaded</span>
      </div>
      <p class="text-slate-400 font-mono text-[10px] leading-tight">If empty, dynamic QR code will be generated automatically using UPI ID.</p>
    `;
  }

  return `
    <div class="relative w-24 h-24 rounded-2xl overflow-hidden bg-white p-1 border border-emerald-500/40 shadow-lg shrink-0">
      <img src="${window.currentUploadedQRCode}" alt="UPI QR Code" class="w-full h-full object-contain">
      <button type="button" onclick="handleRemoveQRCode()" class="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center transition-transform active:scale-90 cursor-pointer shadow-md">
        ✕
      </button>
    </div>
    <div class="space-y-1">
      <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[9px] font-bold uppercase inline-block">
        Custom QR Active
      </span>
      <p class="text-slate-400 font-mono text-[10px] leading-tight">This QR image will be displayed on the customer checkout page.</p>
    </div>
  `;
}

function handleQRFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    window.currentUploadedQRCode = event.target.result;
    document.getElementById('qrUrlInput').value = '';
    refreshQRPreview();
    showToast('✓ QR Code loaded');
  };
  reader.readAsDataURL(file);
}

function handleApplyQRUrl() {
  const url = document.getElementById('qrUrlInput').value.trim();
  if (!url) return;
  window.currentUploadedQRCode = url;
  refreshQRPreview();
  showToast('✓ QR URL applied');
}

function handleRemoveQRCode() {
  window.currentUploadedQRCode = '';
  const fileInput = document.getElementById('qrFileInput');
  const urlInput = document.getElementById('qrUrlInput');
  if (fileInput) fileInput.value = '';
  if (urlInput) urlInput.value = '';
  refreshQRPreview();
}

function refreshQRPreview() {
  const container = document.getElementById('qrCodePreviewContainer');
  if (container) container.innerHTML = renderQRPreviewHTML();
}

async function handleSavePaymentGatewaySettings(e) {
  e.preventDefault();

  const payload = {
    merchant_upi: document.getElementById('merchantUpiId').value.trim(),
    upi_id: document.getElementById('merchantUpiId').value.trim(),
    upi_name: document.getElementById('upiDisplayName').value.trim(),
    upi_instructions: document.getElementById('upiInstructions').value.trim(),
    upi_qr_image: window.currentUploadedQRCode
  };

  try {
    await fetchJSON('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.adminToken}`
      },
      body: JSON.stringify(payload)
    });

    window.apiCache?.clear();
    showToast('✓ Payment configuration saved successfully');
    renderAdminSettings(document.getElementById('adminMainContent'));
  } catch (err) {
    showToast(`Error saving settings: ${err.message}`, 'error');
  }
}
