async function renderAdminPaymentSettings(container) {
  container.innerHTML = `
    <div class="space-y-6 font-mono text-xs animate-pulse">
      <div class="h-10 bg-surface-900 rounded-2xl w-1/3"></div>
      <div class="h-64 bg-surface-900 rounded-3xl"></div>
    </div>
  `;

  try {
    const s = await fetchJSON('/api/admin/payment-settings', { headers: { 'Authorization': `Bearer ${state.adminToken}` } });

    container.innerHTML = `
      <div class="space-y-8 font-mono text-xs pb-12 w-full max-w-full overflow-hidden">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans">
          <div>
            <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight">Payment Gateway Configuration</h1>
            <p class="text-slate-400 text-xs mt-0.5">Configure customer checkout payment methods, UPI handles, and Crypto wallets.</p>
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

            <div class="space-y-3">
              <div>
                <label class="text-slate-400 block mb-1">Merchant UPI ID</label>
                <input type="text" id="payUpiId" required value="${s.upi_id || ''}" placeholder="merchant@okaxis" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs font-bold">
              </div>

              <div>
                <label class="text-slate-400 block mb-1">UPI Display Name</label>
                <input type="text" id="payUpiName" value="${s.upi_name || ''}" placeholder="Nexus Digital Pay" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs">
              </div>

              <div>
                <label class="text-slate-400 block mb-1">UPI Instructions</label>
                <textarea id="payUpiInstructions" rows="3" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs leading-relaxed">${s.upi_instructions || ''}</textarea>
              </div>
            </div>
          </div>

          <!-- Crypto Settings Card -->
          <div class="admin-card rounded-3xl p-6 space-y-4">
            <div class="flex justify-between items-center pb-3 border-b border-admin-border font-sans">
              <h3 class="text-sm font-black text-white">Crypto Payment Settings (USDT)</h3>
              <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400">TRC20</span>
            </div>

            <div class="space-y-3">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="text-slate-400 block mb-1">Cryptocurrency</label>
                  <input type="text" id="payCryptoCurr" value="${s.crypto_currency || 'USDT'}" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs">
                </div>
                <div>
                  <label class="text-slate-400 block mb-1">Network</label>
                  <input type="text" id="payCryptoNetwork" value="${s.crypto_network || 'TRC20'}" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs">
                </div>
              </div>

              <div>
                <label class="text-slate-400 block mb-1">Wallet Address</label>
                <input type="text" id="payCryptoWallet" value="${s.crypto_wallet_address || ''}" placeholder="TXYz98765..." class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-emerald-400 font-bold text-xs">
              </div>

              <div>
                <label class="text-slate-400 block mb-1">Crypto Instructions</label>
                <textarea id="payCryptoInstructions" rows="3" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs leading-relaxed">${s.crypto_instructions || ''}</textarea>
              </div>
            </div>
          </div>

          <button type="submit" id="savePaymentBtn" class="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black uppercase tracking-wider font-sans shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-xs">
            Save Payment Gateway Settings
          </button>

        </form>

      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="admin-card p-8 text-center text-rose-400 text-xs font-mono">Error loading payment settings: ${err.message}</div>`;
  }
}

async function handlePaymentSettingsSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('savePaymentBtn');
  btn.disabled = true;
  btn.innerHTML = 'Saving Settings...';

  const payload = {
    upi_id: document.getElementById('payUpiId').value.trim(),
    upi_name: document.getElementById('payUpiName').value.trim(),
    upi_instructions: document.getElementById('payUpiInstructions').value.trim(),
    crypto_currency: document.getElementById('payCryptoCurr').value.trim(),
    crypto_network: document.getElementById('payCryptoNetwork').value.trim(),
    crypto_wallet_address: document.getElementById('payCryptoWallet').value.trim(),
    crypto_instructions: document.getElementById('payCryptoInstructions').value.trim()
  };

  try {
    await fetchJSON('/api/admin/payment-settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.adminToken}` },
      body: JSON.stringify(payload)
    });
    showToast('✓ Payment gateway settings updated successfully.');
    btn.disabled = false;
    btn.innerHTML = 'Save Payment Gateway Settings';
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = 'Save Payment Gateway Settings';
    showToast(err.message, 'error');
  }
}
