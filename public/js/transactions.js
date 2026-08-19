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
      <div class="space-y-6 font-mono text-xs pb-12 w-full max-w-full">
        <div>
          <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight font-sans">TRANSACTIONS & PAYMENTS</h1>
          <p class="text-slate-400 text-xs mt-0.5">Verify customer payment proofs and fulfill orders.</p>
        </div>

        <!-- Fully Responsive Transaction Cards (Mobile & Desktop Friendly) -->
        <div class="space-y-3">
          ${state.loadedTransactions.length === 0 ? `
            <div class="admin-card rounded-2xl p-8 text-center text-slate-500 font-mono">No transactions recorded yet.</div>
          ` : state.loadedTransactions.map(t => `
            <div class="admin-card rounded-2xl p-4 sm:p-5 space-y-3 transition-all border border-admin-border hover:border-emerald-500/30">
              <div class="flex items-center justify-between gap-2">
                <span class="text-white font-bold font-mono text-xs bg-surface-950 px-2.5 py-1 rounded-lg border border-admin-border">${t.txn_id}</span>
                <span class="px-2.5 py-0.5 rounded-full uppercase text-[9px] font-bold font-mono ${t.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}">${t.status}</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-sans pt-1">
                <div>
                  <span class="text-slate-500 text-[10px] uppercase font-mono block">Customer</span>
                  <strong class="text-white block truncate">${t.customer_name}</strong>
                  <span class="text-slate-400 text-[11px] block truncate">${t.customer_email || 'N/A'}</span>
                </div>
                <div>
                  <span class="text-slate-500 text-[10px] uppercase font-mono block">Product</span>
                  <span class="text-slate-200 block truncate">${t.product_name}</span>
                </div>
                <div>
                  <span class="text-slate-500 text-[10px] uppercase font-mono block">Amount</span>
                  <span class="text-emerald-400 font-mono font-black text-sm block">₹${t.amount}</span>
                </div>
              </div>

              <div class="pt-3 border-t border-admin-border flex items-center justify-between">
                <span class="text-[10px] text-slate-500 font-mono">${new Date(t.created_at || Date.now()).toLocaleString()}</span>
                <button onclick="openVerifyTransactionModal('${t._id}')" class="px-4 py-2 bg-emerald-500 text-gray-950 rounded-xl font-black font-mono text-[10px] uppercase shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 active:scale-95 transition-all">
                  Verify & Fulfill →
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
    <button onclick="document.getElementById('globalModal').classList.add('hidden')" class="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
    <div class="space-y-6 font-sans text-xs">
      <div>
        <h2 class="text-base font-black text-white">Verify Payment: ${t.txn_id}</h2>
        <p class="text-slate-400 text-xs">Customer: ${t.customer_name} (${t.customer_email || 'N/A'})</p>
      </div>

      <div class="p-4 rounded-2xl bg-surface-950 border border-admin-border space-y-3 font-mono">
        <div class="flex justify-between"><span class="text-slate-400">Product:</span><span class="text-white font-bold text-right">${t.product_name}</span></div>
        <div class="flex justify-between"><span class="text-slate-400">Amount:</span><span class="text-emerald-400 font-black text-sm">₹${t.amount}</span></div>
        <div class="flex justify-between"><span class="text-slate-400">Method:</span><span class="text-white">${t.payment_method || 'UPI'}</span></div>
        <div class="flex justify-between"><span class="text-slate-400">Status:</span><span class="text-amber-400 font-bold">${t.status}</span></div>
      </div>

      <div class="space-y-2">
        <label class="text-slate-400 font-mono block">Payment Proof Screenshot:</label>
        <div class="p-3 rounded-2xl bg-surface-950 border border-admin-border flex justify-center items-center min-h-[220px]">
          ${t.proof_screenshot ? `
            <a href="${t.proof_screenshot}" target="_blank" title="Click to view full image">
              <img src="${t.proof_screenshot}" class="max-h-72 rounded-xl object-contain border border-admin-border cursor-zoom-in">
            </a>
          ` : `
            <span class="text-slate-500 font-mono italic">No screenshot uploaded by customer.</span>
          `}
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-3 pt-2">
        <button onclick="confirmTransactionPayment('${t._id}')" class="w-full sm:flex-1 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black uppercase tracking-wider shadow-lg font-sans text-center cursor-pointer">
          ✓ Confirm Payment & Deliver
        </button>
        <button onclick="document.getElementById('globalModal').classList.add('hidden')" class="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-white/5 text-slate-300 font-bold font-sans text-center">
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
