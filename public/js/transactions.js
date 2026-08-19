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

    const pendingCount = list.filter(t => t.status !== 'SUCCESS').length;
    const totalRev = list.filter(t => t.status === 'SUCCESS').reduce((acc, t) => acc + (t.amount || 0), 0);

    container.innerHTML = `
      <div class="space-y-6 font-sans text-xs pb-20 w-full max-w-full animate-fadeIn">
        
        <!-- Header Banner -->
        <div class="glass rounded-3xl p-6 sm:p-8 relative overflow-hidden border border-emerald-500/20 auth-glow space-y-3">
          <div class="flex items-center justify-between">
            <span class="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[10px] uppercase font-mono tracking-wider">⚡ Secure Payment Operations</span>
            <span class="text-emerald-400 font-mono font-bold text-xs">Total: ₹${totalRev}</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight">Transactions & Proofs</h1>
          <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">Review customer payment screenshots, verify transaction IDs, and authorize instant fulfillment.</p>
        </div>

        <!-- Quick Stats & Filter -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="admin-card p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span class="text-slate-400 text-[10px] uppercase font-mono block">Pending Verification</span>
              <span class="text-amber-400 font-mono font-black text-lg">${pendingCount} Orders</span>
            </div>
            <div class="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 font-bold">⏳</div>
          </div>
          <div class="admin-card p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span class="text-slate-400 text-[10px] uppercase font-mono block">Successfully Processed</span>
              <span class="text-emerald-400 font-mono font-black text-lg">${list.length - pendingCount} Orders</span>
            </div>
            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold">✓</div>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="relative">
          <input type="text" id="txnSearchInput" oninput="filterTransactionsList(this.value)" placeholder="Search transaction ID or customer..." class="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-surface-950 border border-admin-border text-white placeholder-slate-500 text-xs outline-none focus:border-emerald-500 font-mono shadow-inner">
          <svg class="w-4 h-4 text-slate-400 absolute left-4 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>

        <!-- Mobile-First Transaction Feed -->
        <div class="space-y-4" id="transactionsCardsFeed">
          ${list.length === 0 ? `
            <div class="admin-card rounded-3xl p-16 text-center text-slate-500 font-mono">No transactions found in system.</div>
          ` : list.map(t => `
            <div class="admin-card rounded-3xl p-5 sm:p-6 space-y-4 border border-admin-border hover:border-emerald-500/40 transition-all duration-300 shadow-2xl txn-card-item relative overflow-hidden" data-search="${(t.txn_id + ' ' + t.customer_name + ' ' + t.customer_email).toLowerCase()}">
              
              <!-- Card Header -->
              <div class="flex items-center justify-between gap-2 border-b border-admin-border pb-3">
                <div class="flex items-center gap-2.5">
                  <span class="w-2.5 h-2.5 rounded-full ${t.status === 'SUCCESS' ? 'bg-emerald-400 shadow-md shadow-emerald-500/50' : 'bg-amber-400 animate-pulse'}"></span>
                  <span class="text-white font-mono font-black text-xs sm:text-sm tracking-wider">${t.txn_id}</span>
                </div>
                <span class="px-3 py-1 rounded-full uppercase text-[9px] font-bold font-mono tracking-wider ${t.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}">
                  ${t.status}
                </span>
              </div>

              <!-- Main Details Grid -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div class="bg-surface-950 p-3 rounded-2xl border border-white/5 space-y-0.5">
                  <span class="text-slate-500 text-[9px] uppercase font-mono block">Customer</span>
                  <strong class="text-white block truncate">${t.customer_name}</strong>
                  <span class="text-slate-400 text-[10px] block truncate font-mono">${t.customer_email || 'No email'}</span>
                </div>
                <div class="bg-surface-950 p-3 rounded-2xl border border-white/5 space-y-0.5">
                  <span class="text-slate-500 text-[9px] uppercase font-mono block">Product Item</span>
                  <strong class="text-slate-200 block line-clamp-2">${t.product_name}</strong>
                </div>
                <div class="bg-surface-950 p-3 rounded-2xl border border-white/5 space-y-0.5 flex flex-col justify-between">
                  <span class="text-slate-500 text-[9px] uppercase font-mono block">Amount & Method</span>
                  <div class="flex items-center justify-between sm:justify-start sm:gap-4">
                    <span class="text-emerald-400 font-mono font-black text-base">₹${t.amount}</span>
                    <span class="px-2 py-0.5 rounded bg-white/5 text-[10px] font-mono text-slate-300 uppercase">${t.payment_method || 'UPI'}</span>
                  </div>
                </div>
              </div>

              <!-- Action Bar -->
              <div class="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span class="text-[10px] text-slate-500 font-mono">${new Date(t.created_at || Date.now()).toLocaleString()}</span>
                <button onclick="openVerifyTransactionModal('${t._id}')" class="w-full sm:w-auto px-6 py-3 bg-emerald-500 text-gray-950 rounded-2xl font-black font-mono text-[10px] uppercase shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer">
                  <span>Review & Verify Payment</span>
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
    <button onclick="document.getElementById('globalModal').classList.add('hidden')" class="absolute top-4 right-4 text-slate-400 hover:text-white p-2 z-10">✕</button>
    <div class="space-y-6 font-sans text-xs">
      
      <!-- Modal Header -->
      <div class="border-b border-white/10 pb-4">
        <span class="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase">Order Verification Modal</span>
        <h2 class="text-xl font-black text-white mt-1.5 font-mono">${t.txn_id}</h2>
        <p class="text-slate-400 text-xs mt-0.5">Customer: <strong class="text-white">${t.customer_name}</strong> &lt;${t.customer_email || 'N/A'}&gt;</p>
      </div>

      <!-- Order Summary Card -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
        <div class="p-4 rounded-2xl bg-surface-950 border border-admin-border space-y-1">
          <span class="text-slate-500 text-[10px] uppercase block">Product Details</span>
          <span class="text-white font-bold block text-sm">${t.product_name}</span>
        </div>
        <div class="p-4 rounded-2xl bg-surface-950 border border-admin-border space-y-1">
          <span class="text-slate-500 text-[10px] uppercase block">Financials</span>
          <div class="text-emerald-400 font-black text-lg">₹${t.amount} <span class="text-xs text-slate-400 font-normal">via ${t.payment_method || 'UPI'}</span></div>
        </div>
      </div>

      <!-- Safe Payment Proof Preview Box -->
      <div class="space-y-2">
        <label class="text-slate-400 font-mono block font-bold text-xs">Payment Proof Screenshot:</label>
        <div class="p-4 rounded-3xl bg-surface-950 border border-admin-border flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
          ${t.proof_screenshot ? `
            <div class="w-full flex flex-col items-center space-y-3">
              <div class="max-h-80 w-full overflow-hidden rounded-2xl border border-white/10 bg-black/60 flex items-center justify-center p-2">
                <img src="${t.proof_screenshot}" alt="Payment Proof" class="max-h-72 w-auto object-contain rounded-xl shadow-2xl cursor-zoom-in" onclick="window.open(this.src, '_blank')">
              </div>
              <a href="${t.proof_screenshot}" target="_blank" class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-emerald-400 font-mono font-bold text-[10px] uppercase tracking-wider transition-all">
                🔍 Open Full-Res Image in New Tab
              </a>
            </div>
          ` : `
            <div class="text-center py-16 space-y-2">
              <span class="text-3xl block">⚠️</span>
              <span class="text-slate-500 font-mono italic block text-xs">No screenshot was attached by the customer for this order.</span>
            </div>
          `}
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col sm:flex-row gap-3 pt-3 border-t border-white/10">
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
