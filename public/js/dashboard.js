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

    const totalRev = Number(data.revenue || 0);
    const totalOrders = Number(data.sales || 0);
    const totalCustomers = Number(data.customers || 0);
    const activeSubs = Number(data.active_subscriptions || 0);
    const pendingOrders = Number(data.pending_orders || 0);
    const rejectedOrders = Number(data.rejected_orders || 0);
    const aov = Number(data.aov || 0);
    const conversionRate = Number(data.conversion_rate || 100);

    const topProducts = Array.isArray(data.top_products) ? data.top_products : [];
    const timeline = Array.isArray(data.timeline) ? data.timeline : [];

    // Compute Peak Chart Metrics for Auto-Scaling
    const maxRevDay = Math.max(...timeline.map(t => t.revenue), 500);

    container.innerHTML = `
      <div class="space-y-6 font-sans text-xs pb-24 w-full max-w-full animate-fadeIn">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider">
                Financial Intel
              </span>
              <span class="text-slate-500 font-mono text-[10px]">Real-Time Store Performance</span>
            </div>
            <h1 class="text-2xl font-black text-white tracking-tight mt-1">Revenue & Performance Analytics</h1>
          </div>

          <button onclick="renderAdminOverview(document.getElementById('adminMainContent'))" class="w-fit px-4 py-2 rounded-2xl bg-surface-900 hover:bg-surface-800 border border-white/5 text-slate-300 hover:text-white font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md">
            <span>↻</span> <span>Sync Live Data</span>
          </button>
        </div>

        <!-- 4 Primary KPI Summary Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
          
          <div class="admin-card p-4 sm:p-5 rounded-3xl space-y-2 border border-admin-border relative overflow-hidden group hover:border-emerald-500/30 transition-all shadow-xl">
            <div class="absolute -right-4 -bottom-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Gross Revenue</span>
              <span class="text-emerald-400 text-xs font-bold">₹</span>
            </div>
            <span class="text-2xl sm:text-3xl font-black text-white block">₹${totalRev.toLocaleString('en-IN')}</span>
            <span class="text-[10px] text-emerald-400 font-bold block">↑ Verified Settlement</span>
          </div>

          <div class="admin-card p-4 sm:p-5 rounded-3xl space-y-2 border border-admin-border relative overflow-hidden group hover:border-indigo-500/30 transition-all shadow-xl">
            <div class="absolute -right-4 -bottom-4 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Avg Order (AOV)</span>
              <span class="text-indigo-400 text-xs font-bold">💳</span>
            </div>
            <span class="text-2xl sm:text-3xl font-black text-white block">₹${aov}</span>
            <span class="text-[10px] text-indigo-400 font-bold block">${totalOrders} Paid Orders</span>
          </div>

          <div class="admin-card p-4 sm:p-5 rounded-3xl space-y-2 border border-admin-border relative overflow-hidden group hover:border-amber-500/30 transition-all shadow-xl">
            <div class="absolute -right-4 -bottom-4 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none"></div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Pending Orders</span>
              <span class="text-amber-400 text-xs font-bold">⏳</span>
            </div>
            <span class="text-2xl sm:text-3xl font-black text-amber-400 block">${pendingOrders}</span>
            <span class="text-[10px] text-slate-400 block">Needs Approval</span>
          </div>

          <div class="admin-card p-4 sm:p-5 rounded-3xl space-y-2 border border-admin-border relative overflow-hidden group hover:border-teal-500/30 transition-all shadow-xl">
            <div class="absolute -right-4 -bottom-4 w-16 h-16 bg-teal-500/10 rounded-full blur-xl pointer-events-none"></div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Conversion</span>
              <span class="text-teal-400 text-xs font-bold">⚡</span>
            </div>
            <span class="text-2xl sm:text-3xl font-black text-emerald-400 block">${conversionRate}%</span>
            <span class="text-[10px] text-teal-400 font-bold block">Approval Health</span>
          </div>

        </div>

        <!-- Visual Revenue Chart Section -->
        <div class="admin-card p-5 sm:p-6 rounded-3xl border border-admin-border space-y-5 shadow-2xl">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <h2 class="text-sm font-bold text-white font-mono uppercase tracking-wider">7-Day Revenue Velocity</h2>
              <p class="text-slate-400 text-[11px]">Daily settlement volume and revenue inflows</p>
            </div>
            <span class="px-3 py-1 rounded-xl bg-surface-950 border border-white/5 font-mono text-[10px] text-emerald-400 font-bold">
              Peak: ₹${maxRevDay}
            </span>
          </div>

          <!-- Dynamic Bar & Area Heights -->
          <div class="pt-6 pb-2 grid grid-cols-7 gap-2 sm:gap-4 items-end h-44 font-mono">
            ${timeline.map(t => {
              const heightPct = Math.max(Math.round((t.revenue / maxRevDay) * 100), 8);
              return `
                <div class="flex flex-col items-center gap-2 group h-full justify-end">
                  <span class="text-[9px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">₹${t.revenue}</span>
                  <div class="w-full bg-surface-950 rounded-2xl p-1 h-32 flex items-end border border-white/5">
                    <div class="w-full bg-gradient-to-t from-emerald-600 to-teal-400 rounded-xl transition-all duration-700 group-hover:scale-105 group-hover:brightness-110 shadow-lg shadow-emerald-500/20" style="height: ${heightPct}%;"></div>
                  </div>
                  <span class="text-[10px] text-slate-400 font-bold uppercase">${t.day}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Top Selling Products Breakdown -->
        <div class="admin-card p-5 sm:p-6 rounded-3xl border border-admin-border space-y-4 shadow-2xl">
          <div class="flex items-center justify-between border-b border-white/5 pb-3">
            <div class="space-y-0.5">
              <h2 class="text-sm font-bold text-white font-mono uppercase tracking-wider">Top Performing Products</h2>
              <p class="text-slate-400 text-[11px]">Ranked by total earned gross revenue</p>
            </div>
            <span class="text-[10px] font-mono text-slate-400 font-bold">Volume Rank</span>
          </div>

          <div class="space-y-3">
            ${topProducts.length === 0 ? `
              <div class="py-8 text-center text-slate-500 font-mono text-xs">
                No successful transactions recorded yet. Complete an order to view performance analytics.
              </div>
            ` : topProducts.map((p, idx) => {
              const maxProdRev = topProducts[0].revenue || 1;
              const barWidth = Math.round((p.revenue / maxProdRev) * 100);

              return `
                <div class="p-3.5 rounded-2xl bg-surface-950/80 border border-white/5 space-y-2">
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2.5 min-w-0">
                      <span class="w-6 h-6 rounded-lg bg-white/5 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">#${idx + 1}</span>
                      <strong class="text-white text-xs truncate">${p.name}</strong>
                    </div>
                    <div class="text-right shrink-0 font-mono">
                      <span class="text-emerald-400 font-black text-xs">₹${p.revenue.toLocaleString('en-IN')}</span>
                      <span class="text-slate-500 text-[10px] block">${p.sales} Units</span>
                    </div>
                  </div>

                  <!-- Visual Progress Fill -->
                  <div class="w-full bg-surface-900 rounded-full h-1.5 overflow-hidden">
                    <div class="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-700" style="width: ${barWidth}%;"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Orders Settlement Pipeline Status -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
          
          <div class="admin-card p-4 rounded-2xl border border-admin-border space-y-1">
            <span class="text-slate-500 text-[10px] uppercase font-bold block">Settled & Delivered</span>
            <div class="flex items-center justify-between">
              <span class="text-emerald-400 font-black text-lg">${totalOrders} Orders</span>
              <span class="text-xs">✅</span>
            </div>
          </div>

          <div class="admin-card p-4 rounded-2xl border border-admin-border space-y-1">
            <span class="text-slate-500 text-[10px] uppercase font-bold block">In Verification Queue</span>
            <div class="flex items-center justify-between">
              <span class="text-amber-400 font-black text-lg">${pendingOrders} Orders</span>
              <span class="text-xs">⏳</span>
            </div>
          </div>

          <div class="admin-card p-4 rounded-2xl border border-admin-border space-y-1">
            <span class="text-slate-500 text-[10px] uppercase font-bold block">Rejected Receipts</span>
            <div class="flex items-center justify-between">
              <span class="text-rose-400 font-black text-lg">${rejectedOrders} Orders</span>
              <span class="text-xs">✕</span>
            </div>
          </div>

        </div>

      </div>
    `;
  } catch (err) {
    container.innerHTML = `
      <div class="admin-card p-8 text-center text-rose-400 text-xs font-mono rounded-3xl">
        Error loading analytics dashboard: ${err.message}
      </div>
    `;
  }
}
