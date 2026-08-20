async function renderAdminCustomers(container) {
  container.innerHTML = `
    <div class="space-y-6 font-mono text-xs animate-pulse">
      <div class="h-10 bg-surface-900 rounded-2xl w-1/3"></div>
      <div class="h-64 bg-surface-900 rounded-3xl"></div>
    </div>
  `;

  try {
    const customers = await fetchJSON('/api/admin/customers', {
      headers: { 'Authorization': `Bearer ${state.adminToken}` }
    });
    const list = Array.isArray(customers) ? customers : [];

    container.innerHTML = `
      <div class="space-y-6 font-sans text-xs pb-20 w-full max-w-full animate-fadeIn">
        
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-black text-white tracking-tight">Customer Accounts</h1>
            <p class="text-slate-400 text-xs mt-0.5 font-mono">Registered buyer profiles, contact phone numbers & history.</p>
          </div>
          <span class="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold">
            ${list.length} Registered
          </span>
        </div>

        <!-- Search Customer Input -->
        <div class="relative">
          <input type="text" oninput="filterCustomerRows(this.value)" placeholder="Search username, email, or mobile number..." class="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-surface-950 border border-admin-border text-white placeholder-slate-500 text-xs outline-none focus:border-emerald-500 font-mono shadow-inner">
          <svg class="w-4 h-4 text-slate-400 absolute left-4 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>

        <!-- Customer Cards Feed -->
        <div class="space-y-3" id="customersListFeed">
          ${list.length === 0 ? `
            <div class="admin-card rounded-3xl p-16 text-center text-slate-500 font-mono">No customers registered yet.</div>
          ` : list.map(c => `
            <div class="admin-card rounded-3xl p-4 sm:p-5 space-y-3 border border-admin-border hover:border-emerald-500/30 transition-all shadow-xl cust-card-item" data-search="${(c.username + ' ' + c.email + ' ' + (c.mobile || '')).toLowerCase()}">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-black font-mono flex items-center justify-center text-sm">
                    ${(c.username || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <strong class="text-white text-sm block">${c.username}</strong>
                    <span class="text-slate-400 text-[10px] font-mono">${c.email}</span>
                  </div>
                </div>

                <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[9px] uppercase font-bold">
                  Active
                </span>
              </div>

              <!-- Contact & Metadata Grid -->
              <div class="grid grid-cols-2 gap-2 bg-surface-950 p-3 rounded-2xl border border-white/5 font-mono text-[11px]">
                <div>
                  <span class="text-slate-500 text-[9px] uppercase block">Mobile Phone</span>
                  <span class="text-emerald-400 font-bold block">${c.mobile || 'Not Provided'}</span>
                </div>
                <div>
                  <span class="text-slate-500 text-[9px] uppercase block">Registered Date</span>
                  <span class="text-slate-300 block">${new Date(c.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>

      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="admin-card p-8 text-center text-rose-400 text-xs font-mono">Error: ${err.message}</div>`;
  }
}

function filterCustomerRows(query) {
  const q = (query || '').toLowerCase().trim();
  document.querySelectorAll('.cust-card-item').forEach(card => {
    const text = card.getAttribute('data-search') || '';
    if (text.includes(q)) card.style.display = '';
    else card.style.display = 'none';
  });
}
