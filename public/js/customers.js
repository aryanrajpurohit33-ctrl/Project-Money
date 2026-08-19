async function renderAdminCustomers(container) {
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
    const custs = await fetchJSON('/api/admin/customers/list', { headers: { 'Authorization': `Bearer ${state.adminToken}` } });
    state.loadedCustomers = Array.isArray(custs) ? custs : [];

    container.innerHTML = `
      <div class="space-y-8 font-mono text-xs pb-12 w-full max-w-full overflow-hidden">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans">
          <div>
            <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight">Customer Directory</h1>
            <p class="text-slate-400 text-xs mt-0.5">View registered customer accounts, order counts, and active subscriptions.</p>
          </div>
        </div>

        <!-- Search Toolbar -->
        <div class="admin-card rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div class="relative w-full sm:w-80">
            <input type="text" id="custSearchInput" oninput="filterCustomerCards()" placeholder="Search username, name, email..." class="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white placeholder-slate-500 outline-none focus:border-emerald-500 text-xs">
            <svg class="w-4 h-4 text-slate-500 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
        </div>

        <!-- 📱 MOBILE & DESKTOP RESPONSIVE CARDS VIEW -->
        <div class="space-y-3" id="custCardsContainer">
          ${custs.length === 0 ? `
            <div class="admin-card rounded-2xl p-8 text-center text-slate-500">No registered customers yet.</div>
          ` : custs.map(c => `
            <div class="admin-card rounded-2xl p-4 space-y-3 cust-item-card" data-search="${(c.username||'').toLowerCase()} ${(c.name||'').toLowerCase()} ${(c.email||'').toLowerCase()}">
              <div class="flex justify-between items-start gap-2">
                <div class="min-w-0 flex-1">
                  <span class="text-emerald-400 font-bold text-sm block truncate">@${c.username || c.name}</span>
                  <span class="text-slate-300 text-xs break-all block mt-0.5">${c.email}</span>
                </div>
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 bg-emerald-500/10 text-emerald-400">
                  Active
                </span>
              </div>

              <div class="flex justify-between items-center text-[11px] text-slate-400 font-mono pt-1">
                <span>Orders: <strong class="text-white">${c.orders_count || 0}</strong></span>
                <span>Joined: ${new Date(c.created_at).toLocaleDateString()}</span>
              </div>

              <div class="pt-2 border-t border-admin-border flex justify-end items-center">
                <button onclick="openCustomerDetailsModal('${c._id}')" class="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl font-bold hover:bg-emerald-500/20 active:scale-95 transition-all text-xs">
                  View Profile & Subscriptions
                </button>
              </div>
            </div>
          `).join('')}
        </div>

      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="admin-card p-8 text-center text-rose-400 text-xs font-mono">Error loading customers: ${err.message}</div>`;
  }
}

function filterCustomerCards() {
  const q = (document.getElementById('custSearchInput')?.value || '').toLowerCase();

  document.querySelectorAll('.cust-item-card').forEach(el => {
    const text = el.getAttribute('data-search') || '';
    if (text.includes(q)) el.classList.remove('hidden');
    else el.classList.add('hidden');
  });
}

async function openCustomerDetailsModal(custId) {
  const modal = document.getElementById('globalModal');
  const content = document.getElementById('globalModalContent');
  modal.classList.remove('hidden'); modal.classList.add('flex');
  content.innerHTML = '<div class="text-center py-12 text-slate-400 font-mono">Loading customer profile...</div>';

  const c = (state.loadedCustomers || []).find(x => x._id === custId);
  if (!c) { content.innerHTML = '<div class="text-rose-400">Customer not found</div>'; return; }

  content.innerHTML = `
    <button onclick="closeAllDrawers()" class="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
    <div class="space-y-6 font-sans text-xs">
      <div>
        <h2 class="text-lg font-black text-white">Customer: @${c.username || c.name}</h2>
        <p class="text-slate-400 text-xs">${c.email} • Joined ${new Date(c.created_at).toLocaleDateString()}</p>
      </div>

      <div class="grid grid-cols-2 gap-3 font-mono">
        <div class="p-4 rounded-2xl bg-surface-950 border border-admin-border">
          <span class="text-slate-500 block text-[10px]">TOTAL ORDERS</span>
          <span class="text-lg font-black text-white">${c.orders_count || 0}</span>
        </div>
        <div class="p-4 rounded-2xl bg-surface-950 border border-admin-border">
          <span class="text-slate-500 block text-[10px]">ACTIVE SUBSCRIPTIONS</span>
          <span class="text-lg font-black text-emerald-400">${(c.active_subscriptions || []).length}</span>
        </div>
      </div>

      <div class="space-y-2">
        <span class="text-slate-400 font-bold block">Active Subscriptions & Credentials:</span>
        <div class="space-y-2 font-mono">
          ${(c.active_subscriptions || []).length === 0 ? '<div class="p-4 bg-surface-950 rounded-xl text-slate-500">No active subscriptions.</div>' : (c.active_subscriptions || []).map(sub => `
            <div class="p-3 bg-surface-950 rounded-xl border border-admin-border flex justify-between items-center">
              <div>
                <span class="text-white font-bold block">${sub.product_id?.name || sub.product_name}</span>
                <span class="text-[10px] text-emerald-400">Expires: ${new Date(sub.expires_at).toLocaleDateString()}</span>
              </div>
              <span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[10px]">ACTIVE</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="flex justify-end pt-4 border-t border-white/5">
        <button onclick="closeAllDrawers()" class="px-6 py-2.5 rounded-xl bg-white/10 text-white font-bold text-xs">Close Profile</button>
      </div>
    </div>
  `;
}
