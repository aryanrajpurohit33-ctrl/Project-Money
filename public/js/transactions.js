async function renderAdminTransactions(container) {
  container.innerHTML = `
    <div class="space-y-6 font-mono text-xs animate-pulse max-w-full">
      <div class="h-10 bg-surface-900 rounded-2xl w-1/3"></div>
      <div class="h-64 bg-surface-900 rounded-3xl"></div>
    </div>
  `;

  try {
    const txns = await fetchJSON('/api/admin/transactions', {
      headers: { 'Authorization': `Bearer ${state.adminToken}` }
    }).catch(() => []);

    const txnList = Array.isArray(txns) ? txns : [];
    window.currentLoadedTransactions = txnList;

    container.innerHTML = `
      <div class="space-y-6 font-sans text-xs pb-24 w-full max-w-full animate-fadeIn">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider">
                Settlement Verification
              </span>
              <span class="text-slate-500 font-mono text-[10px]">UPI Proof Inspection</span>
            </div>
            <h1 class="text-2xl font-black text-white tracking-tight mt-1">Transaction Approvals</h1>
          </div>

          <button onclick="renderAdminTransactions(document.getElementById('adminMainContent'))" class="w-fit px-4 py-2 rounded-2xl bg-surface-900 hover:bg-surface-800 border border-white/5 text-slate-300 hover:text-white font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md">
            <span>↻</span> <span>Refresh Feed</span>
          </button>
        </div>

        <!-- Filter / Search -->
        <div class="relative">
          <input type="text" oninput="filterTransactionCards(this.value)" placeholder="Search by TXN ID, Customer Name, or Product..." class="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-surface-950 border border-admin-border text-white placeholder-slate-500 text-xs outline-none focus:border-emerald-500 font-mono shadow-inner">
          <svg class="w-4 h-4 text-slate-400 absolute left-4 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>

        <!-- Transactions List Feed -->
        <div class="space-y-3" id="txnFeedList">
          ${txnList.length === 0 ? `
            <div class="admin-card rounded-3xl p-16 text-center space-y-2 border border-admin-border">
              <span class="text-3xl block">💳</span>
              <p class="text-slate-400 font-mono">No customer checkout transactions recorded yet.</p>
            </div>
          ` : txnList.map(t => {
            const status = (t.status || 'PROCESSING').toUpperCase();
            const isSuccess = status === 'SUCCESS' || status === 'PAID';
            const isRejected = status === 'REJECTED';
            const isPending = !isSuccess && !isRejected;
            const dateStr = new Date(t.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

            return `
              <div class="admin-card rounded-3xl p-4 sm:p-5 border border-admin-border hover:border-white/15 transition-all shadow-xl space-y-3.5 txn-card-item" data-search="${(t.txn_id + ' ' + t.customer_name + ' ' + (t.product_name || '')).toLowerCase()}">
                
                <div class="flex items-center justify-between border-b border-white/5 pb-3">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full ${isSuccess ? 'bg-emerald-400 shadow-md shadow-emerald-500/50' : isRejected ? 'bg-rose-500' : 'bg-amber-400 animate-pulse'}"></span>
                    <strong class="text-white font-mono text-xs">${t.txn_id}</strong>
                    <span class="text-slate-500 font-mono text-[10px] hidden sm:inline">• ${dateStr}</span>
                  </div>

                  <span class="px-2.5 py-0.5 rounded-full font-mono text-[9px] uppercase font-bold ${isSuccess ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : isRejected ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}">
                    ${status}
                  </span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-surface-950 p-3 rounded-2xl border border-white/5 font-mono text-[11px]">
                  <div>
                    <span class="text-slate-500 text-[9px] uppercase block">Customer</span>
                    <span class="text-white font-bold block truncate">${t.customer_name}</span>
                    <span class="text-slate-500 text-[10px] block truncate">${t.customer_email || 'No email provided'}</span>
                  </div>
                  <div>
                    <span class="text-slate-500 text-[9px] uppercase block">Product Ordered</span>
                    <span class="text-slate-300 font-bold block truncate">${t.product_name || 'Digital Item'}</span>
                  </div>
                  <div>
                    <span class="text-slate-500 text-[9px] uppercase block">Amount Paid</span>
                    <span class="text-emerald-400 font-black text-sm block">₹${t.amount}</span>
                  </div>
                </div>

                ${isRejected && t.rejection_reason ? `
                  <div class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono text-[11px] flex items-center justify-between">
                    <span><strong>Reason Note:</strong> ${t.rejection_reason}</span>
                    <span class="text-[9px] uppercase text-rose-400 font-bold">Rejected</span>
                  </div>
                ` : ''}

                <div class="flex items-center justify-between pt-1">
                  <span class="text-[10px] text-slate-500 font-mono">${t.payment_method || 'UPI QR'}</span>
                  
                  <button onclick="inspectTransactionDetailModal('${t._id}')" class="px-4 py-2 rounded-xl bg-surface-900 hover:bg-surface-800 border border-white/10 text-slate-200 font-mono text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md">
                    <span>🔍</span> <span>Review Screenshot & Resolve</span>
                  </button>
                </div>

              </div>
            `;
          }).join('')}
        </div>

      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="admin-card p-8 text-center text-rose-400 text-xs font-mono rounded-3xl">Error loading transactions: ${err.message}</div>`;
  }
}

function inspectTransactionDetailModal(txnId) {
  const t = (window.currentLoadedTransactions || []).find(x => x._id === txnId);
  if (!t) return;

  const modal = document.getElementById('globalModal');
  const content = document.getElementById('globalModalContent');
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  const status = (t.status || 'PROCESSING').toUpperCase();
  const isPending = status === 'PROCESSING' || status === 'PENDING';

  content.innerHTML = `
    <button onclick="document.getElementById('globalModal').classList.add('hidden')" class="absolute top-4 right-4 text-slate-400 hover:text-white p-2">✕</button>
    
    <div class="space-y-4 font-sans text-xs">
      
      <div class="border-b border-white/10 pb-3">
        <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase">Inspection</span>
        <h2 class="text-lg font-black text-white mt-1">${t.txn_id}</h2>
        <span class="text-slate-400 font-mono text-[11px] block mt-0.5">${t.product_name}</span>
      </div>

      <!-- Financials Summary -->
      <div class="bg-surface-950 p-3 rounded-2xl border border-white/5 flex items-center justify-between font-mono">
        <div>
          <span class="text-slate-500 text-[9px] uppercase block font-bold">Customer</span>
          <span class="text-white font-bold text-xs">${t.customer_name} (${t.customer_email || 'No Phone/Email'})</span>
        </div>
        <div class="text-right">
          <span class="text-slate-500 text-[9px] uppercase block font-bold">Amount Due</span>
          <span class="text-emerald-400 font-black text-base">₹${t.amount}</span>
        </div>
      </div>

      <!-- Screenshot Display -->
      <div class="space-y-1.5">
        <label class="text-slate-400 text-[10px] font-mono uppercase block font-bold">Attached Payment Proof</label>
        <div class="p-2 bg-surface-950 rounded-2xl border border-white/10 flex flex-col items-center justify-center max-h-72 overflow-hidden">
          ${t.proof_screenshot ? `
            <img src="${t.proof_screenshot}" alt="Payment Proof" class="max-h-64 rounded-xl object-contain cursor-pointer hover:scale-105 transition-transform" onclick="window.open('${t.proof_screenshot}', '_blank')">
            <span class="text-[9px] text-slate-500 font-mono mt-1">Tap image to view full resolution</span>
          ` : `
            <div class="py-12 text-slate-500 font-mono text-xs">No screenshot attached by customer</div>
          `}
        </div>
      </div>

      ${isPending ? `
        <!-- Actions & Rejection Suite -->
        <div class="space-y-3 pt-2">
          
          <!-- Confirm Button -->
          <button onclick="confirmTransactionApproval('${t._id}')" class="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-gray-950 font-black uppercase font-mono text-xs tracking-wider shadow-lg shadow-emerald-500/25 transition-all cursor-pointer flex items-center justify-center gap-2">
            <span>✓ CONFIRM PAYMENT & DELIVER CREDENTIALS</span>
          </button>

          <!-- Rejection Container -->
          <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="text-rose-400 font-mono font-bold text-xs uppercase">Reject Transaction</span>
              <span class="text-[9px] font-mono text-slate-400">Syncs note to customer vault</span>
            </div>

            <!-- Quick Template Chips -->
            <div class="flex flex-wrap gap-1.5 font-mono text-[9px]">
              <button type="button" onclick="setRejectReason('Invalid / Fake Screenshot')" class="px-2 py-1 bg-surface-950 text-rose-300 hover:bg-rose-500/20 rounded-lg border border-rose-500/30">Invalid Screenshot</button>
              <button type="button" onclick="setRejectReason('UTR / Ref Number not received on bank')" class="px-2 py-1 bg-surface-950 text-rose-300 hover:bg-rose-500/20 rounded-lg border border-rose-500/30">UTR Not Found</button>
              <button type="button" onclick="setRejectReason('Incomplete payment amount received')" class="px-2 py-1 bg-surface-950 text-rose-300 hover:bg-rose-500/20 rounded-lg border border-rose-500/30">Amount Mismatch</button>
            </div>

            <textarea id="adminRejectReasonInput" placeholder="Enter reason note for rejection..." rows="2" class="w-full p-2.5 rounded-xl bg-surface-950 border border-rose-500/30 text-white font-mono text-xs outline-none focus:border-rose-400 placeholder:text-slate-600"></textarea>

            <button onclick="submitTransactionRejection('${t._id}')" class="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md">
              ✕ REJECT APPLICATION
            </button>
          </div>

        </div>
      ` : `
        <div class="p-3.5 rounded-2xl ${status === 'SUCCESS' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'} border font-mono text-center font-bold text-xs">
          This transaction has already been marked as ${status}.
        </div>
      `}

      <button type="button" onclick="document.getElementById('globalModal').classList.add('hidden')" class="w-full py-2.5 rounded-xl bg-surface-950 text-slate-400 font-mono text-xs hover:text-white transition-colors">
        Close
      </button>

    </div>
  `;
}

function setRejectReason(reason) {
  const input = document.getElementById('adminRejectReasonInput');
  if (input) input.value = reason;
}

async function confirmTransactionApproval(txnId) {
  try {
    await fetchJSON(`/api/admin/transactions/${txnId}/verify`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${state.adminToken}` }
    });
    showToast('✓ Payment approved! Subscription credentials activated.');
    document.getElementById('globalModal').classList.add('hidden');
    renderAdminTransactions(document.getElementById('adminMainContent'));
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function submitTransactionRejection(txnId) {
  const reason = document.getElementById('adminRejectReasonInput').value.trim() || 'Payment verification failed.';

  try {
    await fetchJSON(`/api/admin/transactions/${txnId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.adminToken}`
      },
      body: JSON.stringify({ reason })
    });
    showToast('✕ Application rejected and synced with customer vault');
    document.getElementById('globalModal').classList.add('hidden');
    renderAdminTransactions(document.getElementById('adminMainContent'));
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function filterTransactionCards(query) {
  const q = (query || '').toLowerCase().trim();
  document.querySelectorAll('.txn-card-item').forEach(card => {
    const text = card.getAttribute('data-search') || '';
    if (text.includes(q)) card.style.display = '';
    else card.style.display = 'none';
  });
}
