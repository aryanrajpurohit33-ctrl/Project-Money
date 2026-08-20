async function renderAdminDashboard(container) {
  renderAdminOverview(container);
}

async function renderAdminOverview(container) {
  container.innerHTML = `
    <div class="space-y-6 font-mono text-xs animate-pulse max-w-full">
      <div class="h-10 bg-surface-900 rounded-2xl w-1/3"></div>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="h-28 bg-surface-900 rounded-3xl"></div>
        <div class="h-28 bg-surface-900 rounded-3xl"></div>
        <div class="h-28 bg-surface-900 rounded-3xl"></div>
        <div class="h-28 bg-surface-900 rounded-3xl"></div>
      </div>
      <div class="h-64 bg-surface-900 rounded-3xl"></div>
    </div>
  `;

  try {
    const data = await fetchJSON('/api/admin/dashboard', {
      headers: { 'Authorization': `Bearer ${state.adminToken}` }
    }).catch(() => ({}));

    const kpis = data.kpis || {};
    const totalRev = Number(data.revenue || kpis.revenue?.value || 0);
    const totalOrders = Number(data.sales || kpis.orders?.value || 0);
    const totalCustomers = Number(data.customers || kpis.customers?.value || 0);
    const activeSubs = Number(data.active_subscriptions || kpis.subscriptions?.value || 0);
    const pendingOrders = Number(data.pending_orders || 0);

    container.innerHTML = `
      <div class="space-y-6 font-sans text-xs pb-24 w-full max-w-full animate-fadeIn">
        
        <!-- Header & Live Pulse Status -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider">
              Control Center
            </span>
            <h1 class="text-2xl font-black text-white tracking-tight mt-1">Overview Dashboard</h1>
            <p class="text-slate-400 text-xs font-mono">Real-time store metrics, gross revenues, and pending verifications.</p>
          </div>

          <div class="flex items-center gap-3">
            <span class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-surface-900 border border-white/5 text-emerald-400 font-mono text-[11px] font-bold shadow-lg">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Live Node Engine
            </span>
            <button onclick="renderAdminOverview(document.getElementById('adminMainContent'))" class="p-2.5 rounded-2xl bg-surface-900 hover:bg-surface-800 border border-white/5 text-slate-300 hover:text-white transition-all cursor-pointer shadow-md">
              ↻
            </button>
          </div>
        </div>

        <!-- Metric KPI Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
          
          <!-- Gross Revenue -->
          <div class="admin-card p-4 sm:p-5 rounded-3xl space-y-2 border border-admin-border relative overflow-hidden group hover:border-emerald-500/30 transition-all shadow-xl">
            <div class="absolute -right-4 -bottom-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Gross Revenue</span>
              <span class="text-emerald-400 text-xs">₹</span>
            </div>
            <span class="text-2xl sm:text-3xl font-black text-white block">₹${totalRev.toLocaleString('en-IN')}</span>
            <span class="text-[10px] text-emerald-400 font-bold block">↑ Verified Inflow</span>
          </div>

          <!-- Total Orders -->
          <div class="admin-card p-4 sm:p-5 rounded-3xl space-y-2 border border-admin-border relative overflow-hidden group hover:border-indigo-500/30 transition-all shadow-xl">
            <div class="absolute -right-4 -bottom-4 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Total Orders</span>
              <span class="text-indigo-400 text-xs">🛍</span>
            </div>
            <span class="text-2xl sm:text-3xl font-black text-white block">${totalOrders}</span>
            <span class="text-[10px] text-slate-400 block">${pendingOrders} Pending Verification</span>
          </div>

          <!-- Active Subscriptions -->
          <div class="admin-card p-4 sm:p-5 rounded-3xl space-y-2 border border-admin-border relative overflow-hidden group hover:border-amber-500/30 transition-all shadow-xl">
            <div class="absolute -right-4 -bottom-4 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none"></div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Active Subs</span>
              <span class="text-amber-400 text-xs">⚡</span>
            </div>
            <span class="text-2xl sm:text-3xl font-black text-emerald-400 block">${activeSubs}</span>
            <span class="text-[10px] text-slate-400 block">Assigned Credentials</span>
          </div>

          <!-- Customers -->
          <div class="admin-card p-4 sm:p-5 rounded-3xl space-y-2 border border-admin-border relative overflow-hidden group hover:border-teal-500/30 transition-all shadow-xl">
            <div class="absolute -right-4 -bottom-4 w-16 h-16 bg-teal-500/10 rounded-full blur-xl pointer-events-none"></div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Registered</span>
              <span class="text-teal-400 text-xs">👥</span>
            </div>
            <span class="text-2xl sm:text-3xl font-black text-white block">${totalCustomers}</span>
            <span class="text-[10px] text-teal-400 font-bold block">User Vaults</span>
          </div>

        </div>

        <!-- Quick Navigation / Action Hub -->
        <div class="space-y-3">
          <span class="text-slate-400 text-[10px] uppercase font-mono tracking-wider font-bold block px-1">
            Quick Operations Hub
          </span>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            <div onclick="switchAdminSection('transactions')" class="admin-card p-4 rounded-3xl border border-admin-border hover:border-emerald-500/40 transition-all cursor-pointer space-y-2 group shadow-lg">
              <div class="flex items-center justify-between">
                <span class="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-sm font-mono">💳</span>
                <span class="text-slate-500 text-xs group-hover:translate-x-1 transition-transform">→</span>
              </div>
              <div>
                <h3 class="text-white font-bold text-sm">Verify Transactions</h3>
                <p class="text-slate-400 text-[11px] mt-0.5 font-mono">Approve UPI screenshot receipts</p>
              </div>
            </div>

            <div onclick="switchAdminSection('products')" class="admin-card p-4 rounded-3xl border border-admin-border hover:border-indigo-500/40 transition-all cursor-pointer space-y-2 group shadow-lg">
              <div class="flex items-center justify-between">
                <span class="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-sm font-mono">📦</span>
                <span class="text-slate-500 text-xs group-hover:translate-x-1 transition-transform">→</span>
              </div>
              <div>
                <h3 class="text-white font-bold text-sm">Product Studio</h3>
                <p class="text-slate-400 text-[11px] mt-0.5 font-mono">Manage prices, tiers & image uploads</p>
              </div>
            </div>

            <div onclick="switchAdminSection('slots')" class="admin-card p-4 rounded-3xl border border-admin-border hover:border-amber-500/40 transition-all cursor-pointer space-y-2 group shadow-lg">
              <div class="flex items-center justify-between">
                <span class="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-sm font-mono">🔐</span>
                <span class="text-slate-500 text-xs group-hover:translate-x-1 transition-transform">→</span>
              </div>
              <div>
                <h3 class="text-white font-bold text-sm">Account Slots</h3>
                <p class="text-slate-400 text-[11px] mt-0.5 font-mono">Stock automated profile logins & PINs</p>
              </div>
            </div>

          </div>
        </div>

        <!-- Infrastructure & Health Summary Card -->
        <div class="admin-card p-5 rounded-3xl space-y-3 font-mono border border-admin-border shadow-xl">
          <div class="flex items-center justify-between border-b border-white/5 pb-3">
            <span class="text-white font-bold text-xs flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>System & Gateway Status</span>
            </span>
            <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-bold uppercase">Healthy</span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
            <div>
              <span class="text-slate-500 text-[9px] uppercase block">Database</span>
              <span class="text-white font-bold">MongoDB Atlas</span>
            </div>
            <div>
              <span class="text-slate-500 text-[9px] uppercase block">Cloud Provider</span>
              <span class="text-white font-bold">Render Edge</span>
            </div>
            <div>
              <span class="text-slate-500 text-[9px] uppercase block">Gateway</span>
              <span class="text-emerald-400 font-bold">UPI QR Active</span>
            </div>
            <div>
              <span class="text-slate-500 text-[9px] uppercase block">Platform</span>
              <span class="text-indigo-400 font-bold">Node.js Modular</span>
            </div>
          </div>
        </div>

      </div>
    `;
  } catch (err) {
    container.innerHTML = `
      <div class="admin-card p-8 text-center text-rose-400 text-xs font-mono rounded-3xl">
        Error loading overview dashboard: ${err.message}
      </div>
    `;
  }
}
