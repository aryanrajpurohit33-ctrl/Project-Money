window.currentUploadedQRCode = '';

async function renderAdminPaymentSettings(container) {
  container.innerHTML = `
    <div class="space-y-6 font-mono text-xs animate-pulse">
      <div class="h-10 bg-surface-900 rounded-2xl w-1/3"></div>
      <div class="h-64 bg-surface-900 rounded-3xl"></div>
    </div>
  `;

  try {
    const s = await fetchJSON('/api/admin/payment-settings', { 
      headers: { 'Authorization': `Bearer ${state.adminToken}` } 
    });

    window.currentUploadedQRCode = s.upi_qr_image || s.qr_code || '';

    container.innerHTML = `
      <div class="space-y-8 font-mono text-xs pb-12 w-full max-w-full overflow-hidden">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans">
          <div>
            <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight">Payment Gateway Configuration</h1>
            <p class="text-slate-400 text-xs mt-0.5">Configure customer checkout UPI payment method, instructions, and custom QR code.</p>
          </div>
        </div>

        <!-- Configuration Form -->
        <form onsubmit="handlePaymentSettingsSubmit(event)" class="space-y-6 max-w-3xl">
          
          <!-- UPI Settings Card -->
          <div class="admin-card rounded-3xl p-6 space-y-4">
            <div class="flex justify-between items-center pb-3 border-b border-admin-border font-sans">
              <h3 class="text-sm font-black text-white">UPI Payment Settings</h3>
              <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">Active</span>
            </div>

            <div class="space-y-4">
              <div>
                <label class="text-slate-400 block mb-1">Merchant UPI ID</label>
                <input type="text" id="payUpiId" required value="${s.upi_id || ''}" placeholder="merchant@okaxis" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs font-bold font-mono">
              </div>

              <div>
                <label class="text-slate-400 block mb-1">UPI Display Name</label>
                <input type="text" id="payUpiName" value="${s.upi_name || ''}" placeholder="Nexus Digital Pay" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs font-mono">
              </div>

              <!-- Custom QR Code Upload Section -->
              <div class="p-4 rounded-2xl bg-surface-950 border border-admin-border space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-emerald-400 text-xs font-bold">📷 Merchant QR Code</span>
                  <span class="text-[10px] text-slate-500">PNG, JPG, WEBP</span>
                </div>

                <div class="space-y-2">
                  <input type="file" id="qrFileInput" accept="image/*" onchange="handleQRFileUpload(event)" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-900 border border-admin-border text-slate-400 text-xs outline-none file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-500 file:text-gray-950 cursor-pointer font-mono">
                  
                  <div class="flex items-center gap-2">
                    <input type="url" id="qrUrlInput" value="${window.currentUploadedQRCode}" placeholder="Or paste direct QR image URL (https://...)" class="flex-1 px-3.5 py-2.5 rounded-xl bg-surface-900 border border-admin-border text-white text-xs outline-none font-mono">
                    <button type="button" onclick="handleApplyQRUrl()" class="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold cursor-pointer">
                      Apply
                    </button>
                  </div>
                </div>

                <div id="qrCodePreviewContainer" class="pt-2 flex items-center gap-4">
                  ${renderQRPreviewHTML()}
                </div>
              </div>

              <div>
                <label class="text-slate-400 block mb-1">UPI Instructions</label>
                <textarea id="payUpiInstructions" rows="3" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs leading-relaxed font-mono">${s.upi_instructions || ''}</textarea>
              </div>
            </div>
          </div>

          <button type="submit" id="savePaymentBtn" class="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black uppercase tracking-wider font-sans shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-xs cursor-pointer">
            Save Payment Gateway Settings
          </button>

        </form>

      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="admin-card p-8 text-center text-rose-400 text-xs font-mono">Error loading payment settings: ${err.message}</div>`;
  }
}

function renderQRPreviewHTML() {
  if (!window.currentUploadedQRCode) {
    return `
      <div class="w-24 h-24 rounded-2xl bg-surface-900 border border-dashed border-white/10 flex flex-col items-center justify-center text-slate-500 font-mono text-[9px] text-center p-1">
        <span>No QR code</span>
        <span>uploaded</span>
      </div>
      <p class="text-slate-400 font-mono text-[10px] leading-tight">If empty, dynamic QR code will be generated on checkout using your UPI ID.</p>
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
      <p class="text-slate-400 font-mono text-[10px] leading-tight">This QR image will be displayed on customer checkout.</p>
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

async function handlePaymentSettingsSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('savePaymentBtn');
  btn.disabled = true;
  btn.innerHTML = 'Saving Settings...';

  const payload = {
    upi_id: document.getElementById('payUpiId').value.trim(),
    merchant_upi: document.getElementById('payUpiId').value.trim(),
    upi_name: document.getElementById('payUpiName').value.trim(),
    upi_instructions: document.getElementById('payUpiInstructions').value.trim(),
    upi_qr_image: window.currentUploadedQRCode,
    qr_code: window.currentUploadedQRCode
  };

  try {
    await fetchJSON('/api/admin/payment-settings', {
      method: 'POST', 
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${state.adminToken}` 
      },
      body: JSON.stringify(payload)
    });

    window.apiCache?.clear();
    showToast('✓ Payment gateway settings updated successfully.');
    btn.disabled = false;
    btn.innerHTML = 'Save Payment Gateway Settings';
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = 'Save Payment Gateway Settings';
    showToast(err.message, 'error');
  }
}
