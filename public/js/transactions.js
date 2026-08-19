async function renderAdminTransactions(container) {
  container.innerHTML = `
    <div class="space-y-6 font-mono text-xs animate-pulse">
      <div class="h-10 bg-surface-900 rounded-2xl w-1/3"></div>
      <div class="h-64 bg-surface-900 rounded-3xl"></div>
    </div>
  `;

  try {
    const txns = await fetchJSON('/api/admin/transactions', { headers: { 'Authorization': `Bearer ${state.adminToken}` } });
    state.loadedTransactions = Array.isArray(txns) ? txns : [];

    container.innerHTML = `
      <div class="space-y-6 font-sans text-xs pb-12 w-full max-w-full animate-fadeIn">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight">TRANSACTIONS & PAYMENTS</h1>
            <p class="text-slate-400 text-xs mt-0.5 font-mono">Verify customer payment proofs and fulfill orders instantly.</p>
          </div>
          <span class="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold w-fit">${state.loadedTransactions.length} Total Transactions</span>
        </div>

        <!-- Mobile & Desktop Responsive Transaction Cards -->
        <div class="grid grid-cols-1 gap-4">
          ${state.loadedTransactions.length === 0 ? `
            <div class="admin-card rounded-3xl p-12 text-center text-slate-500 font-mono">No transactions recorded yet.</div>
          ` : state.loadedTransactions.map(t => `
            <div class="admin-card rounded-3xl p-5 sm:p-6 space-y-4 border border-admin-border hover:border-emerald-500/30 transition-all duration-300 shadow-xl relative overflow-hidden group">
              
              <!-- Top Row: ID & Status Badge -->
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-admin-border pb-3">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full ${t.status === 'SUCCESS' ? 'bg-emerald-400 shadow-lg shadow-emerald-500/50' : 'bg-amber-400 animate-pulse'}"></span>
                  <span class="text-white font-black font-mono text-xs sm:text-sm tracking-wide">${t.txn_id}</span>
                </div>
                <span class="px-3 py-1 rounded-full uppercase text-[10px] font-bold font-mono ${t.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}">
                  ${t.status}
                </span>
              </div>

              <!-- Content Grid -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans">
                <div class="space-y-0.5">
                  <span class="text-slate-500 text-[10px] uppercase font-mono block">Customer Profile</span>
                  <strong class="text-white text-sm block truncate">${t.customer_name}</strong>
                  <span class="text-slate-400 text-[11px] block truncate font-mono">${t.customer_email || 'No email provided'}</span>
                </div>
                <div class="space-y-0.5">
                  <span class="text-slate-500 text-[10px] uppercase font-mono block">Purchased Item(s)</span>
                  <span class="text-slate-200 font-bold block line-clamp-2">${t.product_name}</span>
                </div>
                <div class="space-y-0.5 sm:text-right">
                  <span class="text-slate-500 text-[10px] uppercase font-mono block">Amount Paid</span>
                  <span class="text-emerald-400 font-mono font-black text-base sm:text-lg block">₹${t.amount}</span>
                  <span class="text-[10px] text-slate-500 font-mono uppercase">${t.payment_method || 'UPI'}</span>
                </div>
              </div>

              <!-- Bottom Toolbar -->
              <div class="pt-3 border-t border-admin-border flex flex-col sm:flex-row items-center justify-between gap-3">
                <span class="text-[10px] text-slate-500 font-mono">${new Date(t.created_at || Date.now()).toLocaleString()}</span>
                <button onclick="openVerifyTransactionModal('${t._id}')" class="w-full sm:w-auto px-6 py-2.5 bg-emerald-500 text-gray-950 rounded-2xl font-black font-mono text-[10px] uppercase shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 active:scale-95 transition-all flex items-center justify-center gap-2">
                  <span>Verify Payment Proof</span>
                  <span>→</span>
                </button>
              </div>

            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="admin-card p-8 text-center text-rose-400 text-xs font-mono">Error loading transactions: ${err.message}</div>`;
  }
}

async function openVerifyTransactionModal(txnId) {
  const t = state.loadedTransactions.find(x => x._id === txnId);
  if (!t) return;

  const modal = document.getElementById('globalModal');
  const content = document.getElementById('globalModalContent');
  modal.classList.remove('hidden'); modal.classList.add('flex');

  content.innerHTML = `
    <button onclick="document.getElementById('globalModal').classList.add('hidden')" class="absolute top-4 right-4 text-slate-400 hover:text-white p-2">✕</button>
    <div class="space-y-6 font-sans text-xs">
      
      <!-- Header -->
      <div>
        <span class="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase">Order Verification Hub</span>
        <h2 class="text-lg sm:text-xl font-black text-white mt-1">Transaction: ${t.txn_id}</h2>
        <p class="text-slate-400 text-xs font-mono">Customer: ${t.customer_name} &lt;${t.customer_email || 'N/A'}&gt;</p>
      </div>

      <!-- Details Summary Card -->
      <div class="p-4 sm:p-5 rounded-2xl bg-surface-950 border border-admin-border space-y-3 font-mono">
        <div class="flex justify-between items-center"><span class="text-slate-400">Product(s):</span><span class="text-white font-bold text-right">${t.product_name}</span></div>
        <div class="flex justify-between items-center"><span class="text-slate-400">Total Amount:</span><span class="text-emerald-400 font-black text-base">₹${t.amount}</span></div>
        <div class="flex justify-between items-center"><span class="text-slate-400">Payment Gateway:</span><span class="text-white">${t.payment_method || 'UPI'}</span></div>
        <div class="flex justify-between items-center"><span class="text-slate-400">Current Status:</span><span class="text-amber-400 font-bold uppercase">${t.status}</span></div>
      </div>

      <!-- Payment Proof Screenshot Viewer -->
      <div class="space-y-2">
        <label class="text-slate-400 font-mono block font-bold">Attached Payment Proof Screenshot:</label>
        <div class="p-3 rounded-2xl bg-surface-950 border border-admin-border flex flex-col items-center justify-center min-h-[260px] relative group overflow-hidden">
          ${t.proof_screenshot ? `
            <a href="${t.proof_screenshot}" target="_blank" title="Click to open full screenshot" class="w-full flex justify-center">
              <img src="${t.proof_screenshot}" class="max-h-80 w-auto rounded-xl object-contain border border-admin-border shadow-2xl cursor-zoom-in hover:scale-[1.02] transition-transform duration-300">
            </a>
            <span class="text-[10px] text-slate-500 font-mono mt-2">Tap image to open full size</span>
          ` : `
            <div class="text-center py-10 space-y-2">
              <span class="text-2xl block">⚠️</span>
              <span class="text-slate-500 font-mono italic block">No screenshot was uploaded by the customer for this order.</span>
            </div>
          `}
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col sm:flex-row gap-3 pt-2">
        <button onclick="confirmTransactionPayment('${t._id}')" class="w-full sm:flex-1 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 font-sans text-center cursor-pointer active:scale-95 transition-all text-xs">
          ✓ Confirm Payment & Deliver Credentials
        </button>
        <button onclick="document.getElementById('globalModal').classList.add('hidden')" class="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold font-sans text-center transition-all">
          Close
        </button>
      </div>

    </div>
  `;
}

async function confirmTransactionPayment(txnId) {
  try {
    await fetchJSON(`/api/admin/transactions/${txnId}/verify`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${state.adminToken}` }
    });
    showToast('✓ Payment verified and credentials delivered successfully.');
    document.getElementById('globalModal').classList.add('hidden');
    renderAdminTransactions(document.getElementById('adminMainContent'));
  } catch (err) { showToast(err.message, 'error'); }
}
