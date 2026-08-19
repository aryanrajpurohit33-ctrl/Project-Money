async function renderAdminSubscriptions(container) {
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
    const data = await fetchJSON('/api/admin/subscriptions/advanced', { headers: { 'Authorization': `Bearer ${state.adminToken}` } });
    state.loadedSubs = data.subscriptions || [];
    const stats = data.stats || { total: state.loadedSubs.length, active: 0 };
    const subs = state.loadedSubs;

    container.innerHTML = `
      <div class="space-y-8 font-mono text-xs pb-12 w-full max-w-full overflow-hidden">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans">
          <div>
            <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight">Subscriptions Suite</h1>
            <p class="text-slate-400 text-xs mt-0.5">Manage customer subscriptions, renewals, and expiration schedules.</p>
          </div>
        </div>

        <!-- Summary KPIs -->
        <div class="grid grid-cols-2 gap-3">
          <div class="admin-card p-4 rounded-2xl space-y-1"><span class="text-slate-500 block text-[9px] uppercase font-bold">Total Subscriptions</span><div class="text-xl font-black text-white font-mono">${stats.total}</div></div>
          <div class="admin-card p-4 rounded-2xl space-y-1"><span class="text-emerald-400 block text-[9px] uppercase font-bold">Active Access</span><div class="text-xl font-black text-emerald-400 font-mono">${stats.active}</div></div>
        </div>

        <!-- Search & Filter Toolbar -->
        <div class="admin-card rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div class="relative w-full sm:w-80">
            <input type="text" id="subSearchInput" oninput="filterSubscriptionCards()" placeholder="Search customer or product..." class="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white placeholder-slate-500 outline-none focus:border-emerald-500 text-xs">
            <svg class="w-4 h-4 text-slate-500 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <select id="subStatusFilter" onchange="filterSubscriptionCards()" class="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs font-bold">
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <!-- 📱 MOBILE & DESKTOP RESPONSIVE CARDS VIEW -->
        <div class="space-y-3" id="subCardsContainer">
          ${subs.length === 0 ? `
            <div class="admin-card rounded-2xl p-8 text-center text-slate-500">No subscriptions found.</div>
          ` : subs.map(s => `
            <div class="admin-card rounded-2xl p-4 space-y-3 sub-item-card" data-search="${(s.user_id?.username||'').toLowerCase()} ${(s.product_name||'').toLowerCase()}" data-status="${s.status}">
              <div class="flex justify-between items-start gap-2">
                <div class="min-w-0 flex-1">
                  <span class="text-emerald-400 font-bold text-xs block truncate">@${s.user_id?.username || s.user_id?.name || 'Customer'}</span>
                  <span class="text-white font-bold text-sm block mt-0.5">${s.product_name}</span>
                </div>
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${s.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}">
                  ${s.status}
                </span>
              </div>

              <div class="text-[11px] text-slate-400 space-y-1 font-mono">
                <div>Duration: <span class="text-white">${s.duration}</span></div>
                <div>Expires: <span class="text-amber-300">${new Date(s.expires_at).toLocaleDateString()}</span></div>
              </div>

              <div class="pt-2 border-t border-admin-border flex justify-between items-center text-xs">
                <span class="text-slate-500 text-[10px]">${s.time_remaining_text || ''}</span>
                <button onclick="openSubDetailsModal('${s._id}')" class="px-3.5 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl font-bold hover:bg-emerald-500/20 active:scale-95 transition-all">Manage</button>
              </div>
            </div>
          `).join('')}
        </div>

      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="admin-card p-8 text-center text-rose-400 text-xs font-mono">Error loading Subscriptions Suite: ${err.message}</div>`;
  }
}

function filterSubscriptionCards() {
  const q = (document.getElementById('subSearchInput')?.value || '').toLowerCase();
  const status = document.getElementById('subStatusFilter')?.value || 'ALL';

  document.querySelectorAll('.sub-item-card').forEach(el => {
    const text = el.getAttribute('data-search') || '';
    const st = el.getAttribute('data-status') || '';
    const matchQ = text.includes(q);
    const matchSt = (status === 'ALL' || st === status);
    if (matchQ && matchSt) el.classList.remove('hidden');
    else el.classList.add('hidden');
  });
}

async function openSubDetailsModal(subId) {
  const modal = document.getElementById('globalModal');
  const content = document.getElementById('globalModalContent');
  modal.classList.remove('hidden'); modal.classList.add('flex');
  content.innerHTML = '<div class="text-center py-12 text-slate-400 font-mono">Loading subscription details...</div>';

  const sub = (state.loadedSubs || []).find(s => s._id === subId);
  if (!sub) { content.innerHTML = '<div class="text-rose-400">Subscription not found</div>'; return; }

  content.innerHTML = `
    <button onclick="closeAllDrawers()" class="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
    <div class="space-y-5 font-sans text-xs">
      <div>
        <h2 class="text-base font-black text-white font-sans">Subscription Management</h2>
        <p class="text-slate-400 text-xs">Customer: @${sub.user_id?.username || 'Customer'} • ${sub.product_name}</p>
      </div>

      <div class="p-4 rounded-2xl bg-surface-950 border border-admin-border space-y-2 font-mono text-xs">
        <div>Status: <span class="text-emerald-400 font-bold">${sub.status}</span></div>
        <div>Expires At: <span class="text-white">${new Date(sub.expires_at).toLocaleString()}</span></div>
        <div>Time Left: <span class="text-indigo-400 font-bold">${sub.time_remaining_text}</span></div>
      </div>

      <div class="flex gap-2 pt-2">
        <button onclick="extendSubscription('${sub._id}', '1_MONTH')" class="flex-1 py-3 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold hover:bg-emerald-500/20">Extend +1 Month</button>
        <button onclick="revokeSubscription('${sub._id}')" class="px-4 py-3 rounded-xl bg-rose-500/10 text-rose-400 font-bold hover:bg-rose-500/20">Revoke Access</button>
      </div>
    </div>
  `;
}

async function extendSubscription(subId, type) {
  try {
    await fetchJSON(`/api/admin/subscriptions/${subId}/extend`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.adminToken}` },
      body: JSON.stringify({ extend_type: type })
    });
    showToast('✓ Subscription extended successfully.');
    document.getElementById('globalModal').classList.add('hidden');
    renderAdminSubscriptions(document.getElementById('adminMainContent'));
  } catch (err) { showToast(err.message, 'error'); }
}

async function revokeSubscription(subId) {
  if (!confirm('Are you sure you want to revoke this subscription?')) return;
  try {
    await fetchJSON(`/api/admin/subscriptions/${subId}/revoke`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.adminToken}` },
      body: JSON.stringify({ action_type: 'REVOKE', reason: 'Admin action' })
    });
    showToast('✓ Subscription access revoked.');
    document.getElementById('globalModal').classList.add('hidden');
    renderAdminSubscriptions(document.getElementById('adminMainContent'));
  } catch (err) { showToast(err.message, 'error'); }
}
