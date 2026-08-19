async function renderAdminTransactions(container) {
  container.innerHTML = `
    <div class="space-y-6 font-mono text-xs animate-pulse">
      <div class="h-10 bg-surface-900 rounded-2xl w-1/3"></div>
      <div class="grid grid-cols-2 gap-3">
        <div class="h-20 bg-surface-900 rounded-2xl"></div>
        <div class="h-20 bg-surface-900 rounded-2xl"></div>
      </div>
      <div class="h-64 bg-surface-900 rounded-3xl"></div>
    </div>
  `;

  try {
    const txns = await fetchJSON('/api/admin/transactions', { headers: { 'Authorization': `Bearer ${state.adminToken}` } });
    state.loadedTransactions = Array.isArray(txns) ? txns : [];

    container.innerHTML = `
      <div class="space-y-8 font-mono text-xs pb-12 w-full max-w-full overflow-hidden">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans">
          <div>
            <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight">Transactions Queue</h1>
            <p class="text-slate-400 text-xs mt-0.5">Verify customer payment proofs and confirm digital delivery.</p>
          </div>
        </div>

        <!-- Search & Filter Toolbar -->
        <div class="admin-card rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div class="relative w-full sm:w-80">
            <input type="text" id="txnSearchInput" oninput="filterTransactionCards()" placeholder="Search transaction ID, customer..." class="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white placeholder-slate-500 outline-none focus:border-emerald-500 text-xs">
            <svg class="w-4 h-4 text-slate-500 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <select id="txnStatusFilter" onchange="filterTransactionCards()" class="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs font-bold">
            <option value="ALL">All Statuses</option>
            <option value="PROCESSING">Processing / Submitted</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="REJECTED">Rejected</option>
            <option value="PENDING_PAYMENT">Pending Payment</option>
          </select>
        </div>

        <!-- 📱 MOBILE & DESKTOP RESPONSIVE CARDS VIEW -->
        <div class="space-y-3" id="txnCardsContainer">
          ${txns.length === 0 ? `
            <div class="admin-card rounded-2xl p-8 text-center text-slate-500">No transactions recorded.</div>
          ` : txns.map(t => `
            <div class="admin-card rounded-2xl p-4 space-y-3 txn-item-card" data-search="${(t.txn_id||'').toLowerCase()} ${(t.customer_name||'').toLowerCase()} ${(t.customer_email||'').toLowerCase()}" data-status="${t.status}">
              <div class="flex justify-between items-start gap-2">
                <div class="min-w-0 flex-1">
                  <span class="text-white font-bold text-xs block font-mono">${t.txn_id}</span>
                  <span class="text-slate-300 text-sm font-sans font-bold block mt-0.5">${t.customer_name}</span>
                  <span class="text-slate-500 text-[10px] block truncate">${t.customer_email || ''}</span>
                </div>
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                  t.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400' :
                  t.status === 'PROCESSING' ? 'bg-indigo-500/10 text-indigo-400' :
                  t.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                }">
                  ${t.status}
                </span>
              </div>

              <div class="flex justify-between items-center text-xs pt-1 font-mono">
                <span class="text-emerald-400 font-black text-sm">₹${t.amount} <span class="text-[10px] text-slate-500">(${t.payment_method})</span></span>
                <span class="text-slate-500 text-[10px]">${new Date(t.created_at).toLocaleDateString()}</span>
              </div>

              <div class="pt-2 border-t border-admin-border flex justify-end items-center gap-2">
                <button onclick="openTransactionModal('${t._id}')" class="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl font-bold hover:bg-emerald-500/20 active:scale-95 transition-all text-xs">
                  Review & Verify
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

function filterTransactionCards() {
  const q = (document.getElementById('txnSearchInput')?.value || '').toLowerCase();
  const status = document.getElementById('txnStatusFilter')?.value || 'ALL';

  document.querySelectorAll('.txn-item-card').forEach(el => {
    const text = el.getAttribute('data-search') || '';
    const st = el.getAttribute('data-status') || '';
    const matchQ = text.includes(q);
    const matchSt = (status === 'ALL' || st === status);
    if (matchQ && matchSt) el.classList.remove('hidden');
    else el.classList.add('hidden');
  });
}

async function openTransactionModal(txnId) {
  const modal = document.getElementById('globalModal');
  const content = document.getElementById('globalModalContent');
  modal.classList.remove('hidden'); modal.classList.add('flex');
  content.innerHTML = '<div class="text-center py-12 text-slate-400 font-mono">Loading transaction details & screenshot...</div>';

  try {
    const txn = (state.loadedTransactions || []).find(t => t._id === txnId);
    if (!txn) throw new Error('Transaction not found in cache');

    const proofRes = await fetchJSON(`/api/admin/transactions/${txnId}/proof`, {
      headers: { 'Authorization': `Bearer ${state.adminToken}` }
    }).catch(() => ({}));

    const proofImg = proofRes.proof_screenshot || '';
    const availableSlots = txn.available_slots || [];

    content.innerHTML = `
      <button onclick="closeAllDrawers()" class="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
      <div class="space-y-6 font-sans text-xs">
        <div>
          <h2 class="text-base font-black text-white">Verify Payment: ${txn.txn_id}</h2>
          <p class="text-slate-400 text-xs">Customer: <strong class="text-white">${txn.customer_name}</strong> (${txn.customer_email})</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div class="space-y-3">
            <div class="p-4 rounded-2xl bg-surface-950 border border-admin-border space-y-2 font-mono">
              <div>Product: <span class="text-white font-bold">${txn.product_name}</span></div>
              <div>Amount: <span class="text-emerald-400 font-black text-sm">₹${txn.amount}</span></div>
              <div>Method: <span class="text-slate-300">${txn.payment_method}</span></div>
              <div>Status: <span class="text-amber-400 font-bold">${txn.status}</span></div>
            </div>

            ${txn.status !== 'CONFIRMED' ? `
              <div class="p-4 rounded-2xl bg-surface-950 border border-admin-border space-y-3">
                <span class="text-[11px] text-emerald-400 font-bold uppercase block">Assign Account Slot</span>
                <select id="txnAssignSlotId" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-900 border border-white/10 text-white text-xs">
                  <option value="">-- Auto-Assign Available Slot --</option>
                  ${availableSlots.map(s => `<option value="${s._id}">${s.account_label} (${s.email}) — [${s.usage}]</option>`).join('')}
                </select>
              </div>
            ` : ''}
          </div>

          <div class="space-y-2">
            <span class="text-slate-400 block font-bold">Payment Proof Screenshot:</span>
            ${proofImg ? `
              <div class="rounded-2xl overflow-hidden border border-admin-border bg-black max-h-72 flex items-center justify-center">
                <img src="${proofImg}" class="max-w-full max-h-72 object-contain">
              </div>
            ` : `
              <div class="p-8 rounded-2xl bg-surface-950 border border-admin-border text-center text-slate-500 font-mono">
                No screenshot uploaded by customer.
              </div>
            `}
          </div>
        </div>

        <div class="pt-4 flex gap-3 border-t border-white/5">
          ${txn.status !== 'CONFIRMED' ? `
            <button onclick="confirmTransaction('${txn._id}')" class="flex-1 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black uppercase tracking-wider font-sans shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-xs">
              ✓ Confirm Payment & Deliver Credentials
            </button>
            <button onclick="rejectTransaction('${txn._id}')" class="px-5 py-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs">
              Reject
            </button>
          ` : `
            <div class="w-full p-3 rounded-xl bg-emerald-500/10 text-emerald-400 text-center font-bold font-mono">
              ✓ Payment Confirmed & Delivered Successfully
            </div>
          `}
        </div>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div class="text-rose-400 p-6 font-mono text-xs">Error loading proof: ${err.message}</div>`;
  }
}

async function confirmTransaction(txnId) {
  const slotId = document.getElementById('txnAssignSlotId')?.value || '';
  try {
    await fetchJSON(`/api/admin/transactions/${txnId}/confirm-and-assign`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.adminToken}` },
      body: JSON.stringify({ slot_id: slotId })
    });
    showToast('✓ Payment confirmed & credentials dispatched!');
    document.getElementById('globalModal').classList.add('hidden');
    renderAdminTransactions(document.getElementById('adminMainContent'));
  } catch (err) { showToast(err.message, 'error'); }
}

async function rejectTransaction(txnId) {
  if (!confirm('Reject this payment transaction?')) return;
  try {
    await fetchJSON(`/api/admin/transactions/${txnId}/reject`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.adminToken}` },
      body: JSON.stringify({ reason: 'Rejected by admin' })
    });
    showToast('Transaction rejected.');
    document.getElementById('globalModal').classList.add('hidden');
    renderAdminTransactions(document.getElementById('adminMainContent'));
  } catch (err) { showToast(err.message, 'error'); }
}
