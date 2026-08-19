async function renderAdminTransactions(container) {
  container.innerHTML = `
    <div class="flex items-center justify-center py-24 w-full">
      <div class="custom-loader-container">
        <div class="custom-loader-line"></div>
        <div class="custom-loader-line"></div>
        <div class="custom-loader-line"></div>
        <div class="custom-loader-line"></div>
        <div class="custom-loader-line"></div>
        <div class="custom-loader-line"></div>
      </div>
    </div>
  `;

  try {
    const txns = await fetchJSON('/api/admin/transactions', { headers: { 'Authorization': `Bearer ${state.adminToken}` } });
    state.loadedTransactions = Array.isArray(txns) ? txns : [];
    const list = state.loadedTransactions;

    container.innerHTML = `
      <div class="space-y-6 font-sans text-xs pb-16 w-full max-w-full animate-fadeIn">
        <!-- Header Banner -->
        <div class="glass rounded-3xl p-6 sm:p-8 relative overflow-hidden border border-emerald-500/20 auth-glow space-y-2">
          <span class="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[10px] uppercase font-mono">💳 Payment Verification Hub</span>
          <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight">Transactions & Orders</h1>
          <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">Review customer payment screenshots, verify transaction IDs, and instantly deliver digital credentials.</p>
        </div>

        <!-- Filters / Stats Bar -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div class="relative flex-1">
            <input type="text" id="txnSearchInput" oninput="filterTransactionsList(this.value)" placeholder="Search by Transaction ID or customer name..." class="w-full pl-10 pr-4 py-3 rounded-2xl bg-surface-950 border border-admin-border text-white placeholder-slate-500 text-xs outline-none focus:border-emerald-500 font-mono">
            <svg class="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <div class="px-4 py-3 rounded-2xl admin-card text-emerald-400 font-mono font-bold text-xs text-center">
            Total Orders: <span class="text-white">${list.length}</span>
          </div>
        </div>

        <!-- Transaction Cards Grid -->
        <div class="grid grid-cols-1 gap-4" id="transactionsCardsGrid">
          ${list.length === 0 ? `
            <div class="admin-card rounded-3xl p-16 text-center text-slate-500 font-mono">No transactions recorded yet.</div>
          ` : list.map(t => `
            <div class="admin-card rounded-3xl p-5 sm:p-6 space-y-4 border border-admin-border hover:border-emerald-500/40 transition-all duration-300 shadow-xl txn-card-item" data-search="${(t.txn_id + ' ' + t.customer_name + ' ' + t.customer_email).toLowerCase()}">
              
              <!-- Top Row -->
              <div class="flex items-center justify-between gap-2 border-b border-admin-border pb-3">
                <div class="flex items-center gap-2.5">
                  <div class="w-3 h-3 rounded-full ${t.status === 'SUCCESS' ? 'bg-emerald-400 shadow-lg shadow-emerald-500/50' : 'bg-amber-400 animate-pulse'}"></div>
                  <span class="text-white font-black font-mono text-xs sm:text-sm">${t.txn_id}</span>
                </div>
                <span class="px-3 py-1 rounded-full uppercase text-[10px] font-bold font-mono ${t.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}">
                  ${t.status}
                </span>
              </div>

              <!-- Customer & Product Info -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div class="space-y-1">
                  <span class="text-slate-500 text-[10px] uppercase font-mono block">Customer Details</span>
                  <strong class="text-white text-sm block truncate">${t.customer_name}</strong>
                  <span class="text-slate-400 text-[11px] block truncate font-mono">${t.customer_email || 'No email'}</span>
                </div>
                <div class="space-y-1">
                  <span class="text-slate-500 text-[10px] uppercase font-mono block">Purchased Goods</span>
                  <span class="text-slate-200 font-bold block line-clamp-2">${t.product_name}</span>
                </div>
                <div class="space-y-1 sm:text-right">
                  <span class="text-slate-500 text-[10px] uppercase font-mono block">Amount Due</span>
                  <span class="text-emerald-400 font-mono font-black text-base sm:text-lg block">₹${t.amount}</span>
                  <span class="text-[10px] text-slate-500 font-mono uppercase">${t.payment_method || 'UPI'}</span>
                </div>
              </div>

              <!-- Footer Toolbar -->
              <div class="pt-3 border-t border-admin-border flex flex-col sm:flex-row items-center justify-between gap-3">
                <span class="text-[10px] text-slate-500 font-mono">${new Date(t.created_at || Date.now()).toLocaleString()}</span>
                <button onclick="openVerifyTransactionModal('${t._id}')" class="w-full sm:w-auto px-6 py-3 bg-emerald-500 text-gray-950 rounded-2xl font-black font-mono text-[10px] uppercase shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer">
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

function filterTransactionsList(query) {
  const q = (query || '').toLowerCase().trim();
  document.querySelectorAll('.txn-card-item').forEach(card => {
    const text = card.getAttribute('data-search') || '';
    if (text.includes(q)) card.style.display = '';
    else card.style.display = 'none';
  });
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
      
      <!-- Modal Header -->
      <div>
        <span class="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase">Verification Suite</span>
        <h2 class="text-lg sm:text-xl font-black text-white mt-1">Transaction ID: ${t.txn_id}</h2>
        <p class="text-slate-400 text-xs font-mono">Customer: ${t.customer_name} &lt;${t.customer_email || 'N/A'}&gt;</p>
      </div>

      <!-- Order Summary Card -->
      <div class="p-4 sm:p-5 rounded-2xl bg-surface-950 border border-admin-border space-y-3 font-mono">
        <div class="flex justify-between items-center"><span class="text-slate-400">Product(s):</span><span class="text-white font-bold text-right">${t.product_name}</span></div>
        <div class="flex justify-between items-center"><span class="text-slate-400">Total Amount:</span><span class="text-emerald-400 font-black text-base">₹${t.amount}</span></div>
        <div class="flex justify-between items-center"><span class="text-slate-400">Payment Gateway:</span><span class="text-white">${t.payment_method || 'UPI'}</span></div>
        <div class="flex justify-between items-center"><span class="text-slate-400">Current Status:</span><span class="text-amber-400 font-bold uppercase">${t.status}</span></div>
      </div>

      <!-- Payment Proof Screenshot Box -->
      <div class="space-y-2">
        <label class="text-slate-400 font-mono block font-bold">Attached Payment Proof Screenshot:</label>
        <div class="p-4 rounded-2xl bg-surface-950 border border-admin-border flex flex-col items-center justify-center min-h-[280px] relative">
          ${t.proof_screenshot ? `
            <a href="${t.proof_screenshot}" target="_blank" title="Click to view full screenshot" class="w-full flex justify-center">
              <img src="${t.proof_screenshot}" class="max-h-80 w-auto rounded-xl object-contain border border-admin-border shadow-2xl cursor-zoom-in hover:scale-[1.01] transition-transform duration-300">
            </a>
            <span class="text-[10px] text-slate-400 font-mono mt-3">💡 Tap image to open full size in new tab</span>
          ` : `
            <div class="text-center py-12 space-y-2">
              <span class="text-3xl block">⚠️</span>
              <span class="text-slate-500 font-mono italic block text-sm">No payment screenshot was uploaded by the customer.</span>
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
