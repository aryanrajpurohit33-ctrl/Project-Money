async function renderAdminOverview(container) {
  container.innerHTML = `
    <div class="space-y-6 font-mono text-xs animate-pulse">
      <div class="h-10 bg-surface-900 rounded-2xl w-1/3"></div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="h-28 bg-surface-900 rounded-3xl"></div>
        <div class="h-28 bg-surface-900 rounded-3xl"></div>
        <div class="h-28 bg-surface-900 rounded-3xl"></div>
        <div class="h-28 bg-surface-900 rounded-3xl"></div>
      </div>
      <div class="h-72 bg-surface-900 rounded-3xl"></div>
    </div>
  `;

  try {
    const d = await fetchJSON(`/api/admin/dashboard/full-overview?range=${state.dashboardRange}`, {
      headers: { 'Authorization': `Bearer ${state.adminToken}` }
    });

    // Responsive SVG Area Chart
    const points = d.revenue_timeline || [];
    const maxVal = Math.max(...points.map(p => p.value), 100);
    const svgW = 600, svgH = 160;
    const coords = points.map((p, idx) => {
      const x = (idx / Math.max(1, points.length - 1)) * (svgW - 40) + 20;
      const y = svgH - 25 - (p.value / maxVal) * (svgH - 50);
      return { x, y, ...p };
    });
    const pointsStr = coords.map(c => `${c.x},${c.y}`).join(' ');
    const areaStr = coords.length ? `20,${svgH - 25} ${pointsStr} ${coords[coords.length - 1].x},${svgH - 25}` : '';

    container.innerHTML = `
      <div class="space-y-8 font-mono text-xs pb-12 w-full max-w-full overflow-hidden">
        
        <!-- Live Visitor Bar -->
        <div class="glass border-emerald-500/20 px-4 py-2.5 rounded-2xl flex justify-between items-center text-[11px] font-bold shadow-lg">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span class="text-emerald-400 font-sans">${d.live_visitors ? `🟢 ${d.live_visitors} LIVE VISITORS` : '🟢 Live visitors online'}</span>
            <span class="text-slate-400 font-normal hidden sm:inline">• Website visitors right now</span>
          </div>
          <span class="text-slate-400">Updated just now</span>
        </div>

        <!-- Dashboard Header & Range Picker -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans">
          <div>
            <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight">OVERVIEW DASHBOARD</h1>
            <p class="text-slate-400 text-xs mt-0.5">Business performance and store analytics</p>
          </div>
          <div class="flex items-center gap-2">
            <select id="overviewDateSelect" onchange="state.dashboardRange=this.value; renderAdminOverview(document.getElementById('adminMainContent'))" class="px-4 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs font-bold outline-none focus:border-emerald-500 font-mono">
              <option value="today" ${state.dashboardRange==='today'?'selected':''}>Today</option>
              <option value="yesterday" ${state.dashboardRange==='yesterday'?'selected':''}>Yesterday</option>
              <option value="7d" ${state.dashboardRange==='7d'?'selected':''}>Last 7 Days</option>
              <option value="30d" ${state.dashboardRange==='30d'?'selected':''}>Last 30 Days</option>
              <option value="90d" ${state.dashboardRange==='90d'?'selected':''}>Last 90 Days</option>
              <option value="this_year" ${state.dashboardRange==='this_year'?'selected':''}>This Year</option>
              <option value="all" ${state.dashboardRange==='all'?'selected':''}>All Time</option>
            </select>

            <button onclick="renderAdminOverview(document.getElementById('adminMainContent'))" class="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all font-mono">
              <span>↻</span> <span>Refresh</span>
            </button>
          </div>
        </div>

        <!-- Primary KPI Cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 font-sans">
          <div class="admin-card p-5 rounded-3xl space-y-2 border border-admin-border hover:border-emerald-500/30 transition-all">
            <span class="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">TOTAL REVENUE</span>
            <div class="text-xl sm:text-2xl font-black text-emerald-400 font-mono">₹${d.kpis.revenue.value.toLocaleString()}</div>
            <div class="text-[10px] font-mono font-bold ${d.kpis.revenue.change !== null ? (d.kpis.revenue.change >= 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-500'}">
              ${d.kpis.revenue.change !== null ? `${d.kpis.revenue.change >= 0 ? '↑' : '↓'} ${Math.abs(d.kpis.revenue.change)}% vs prev period` : 'No previous data'}
            </div>
          </div>

          <div class="admin-card p-5 rounded-3xl space-y-2 border border-admin-border hover:border-emerald-500/30 transition-all">
            <span class="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">TOTAL ORDERS</span>
            <div class="text-xl sm:text-2xl font-black text-white font-mono">${d.kpis.orders.value}</div>
            <div class="text-[10px] font-mono font-bold ${d.kpis.orders.change !== null ? (d.kpis.orders.change >= 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-500'}">
              ${d.kpis.orders.change !== null ? `${d.kpis.orders.change >= 0 ? '↑' : '↓'} ${Math.abs(d.kpis.orders.change)}% vs prev period` : 'Completed'}
            </div>
          </div>

          <div class="admin-card p-5 rounded-3xl space-y-2 border border-admin-border hover:border-emerald-500/30 transition-all">
            <span class="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">TOTAL CUSTOMERS</span>
            <div class="text-xl sm:text-2xl font-black text-white font-mono">${d.kpis.customers.value}</div>
            <div class="text-[10px] font-mono font-bold ${d.kpis.customers.change !== null ? (d.kpis.customers.change >= 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-500'}">
              ${d.kpis.customers.change !== null ? `${d.kpis.customers.change >= 0 ? '↑' : '↓'} ${Math.abs(d.kpis.customers.change)}% vs prev period` : 'Registered'}
            </div>
          </div>

          <div class="admin-card p-5 rounded-3xl space-y-2 border border-admin-border hover:border-emerald-500/30 transition-all">
            <span class="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">ACTIVE SUBSCRIPTIONS</span>
            <div class="text-xl sm:text-2xl font-black text-indigo-400 font-mono">${d.kpis.subscriptions.value}</div>
            <div class="text-[10px] text-indigo-400 font-mono font-bold">● Live active access</div>
          </div>
        </div>

        <!-- Revenue Analytics Chart & Order Breakdown -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div class="lg:col-span-8 admin-card rounded-3xl p-6 space-y-4">
            <div class="flex justify-between items-center">
              <div>
                <h3 class="text-base font-black text-white font-sans">Revenue Overview</h3>
                <p class="text-[10px] text-slate-400 font-mono">Confirmed store earnings across timeline</p>
              </div>
              <span class="text-xs font-bold text-emerald-400 font-mono">Gross: ₹${d.kpis.revenue.value}</span>
            </div>

            <div class="w-full overflow-x-auto custom-scroll">
              <svg viewBox="0 0 ${svgW} ${svgH}" class="w-full h-44 text-emerald-500 overflow-visible">
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#10b981" stop-opacity="0.35"/>
                    <stop offset="100%" stop-color="#10b981" stop-opacity="0.0"/>
                  </linearGradient>
                </defs>
                <line x1="20" y1="20" x2="${svgW-20}" y2="20" stroke="#1c2438" stroke-dasharray="3"/>
                <line x1="20" y1="75" x2="${svgW-20}" y2="75" stroke="#1c2438" stroke-dasharray="3"/>
                <line x1="20" y1="${svgH-25}" x2="${svgW-20}" y2="${svgH-25}" stroke="#1c2438"/>

                ${coords.length ? `<polygon points="${areaStr}" fill="url(#revGrad)" />` : ''}
                ${coords.length ? `<polyline points="${pointsStr}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />` : ''}

                ${coords.map(c => `
                  <circle cx="${c.x}" cy="${c.y}" r="3.5" fill="#0f1422" stroke="#10b981" stroke-width="2"/>
                  <text x="${c.x}" y="${svgH-8}" text-anchor="middle" font-size="8" fill="#64748b" font-family="monospace">${c.label}</text>
                `).join('')}
              </svg>
            </div>
          </div>

          <div class="lg:col-span-4 admin-card rounded-3xl p-6 space-y-4">
            <h3 class="text-base font-black text-white font-sans">Orders Analytics</h3>
            <div class="space-y-3 font-mono">
              <div>
                <div class="flex justify-between text-xs mb-1"><span class="text-emerald-400">Completed (Paid)</span><span class="font-bold text-white">${d.order_statuses.completed}</span></div>
                <div class="w-full bg-surface-950 h-2 rounded-full overflow-hidden"><div class="bg-emerald-500 h-full" style="width: ${d.kpis.orders.value ? (d.order_statuses.completed/d.kpis.orders.value)*100 : 0}%"></div></div>
              </div>
              <div>
                <div class="flex justify-between text-xs mb-1"><span class="text-indigo-400">Processing</span><span class="font-bold text-white">${d.order_statuses.processing}</span></div>
                <div class="w-full bg-surface-950 h-2 rounded-full overflow-hidden"><div class="bg-indigo-500 h-full" style="width: ${d.kpis.orders.value ? (d.order_statuses.processing/d.kpis.orders.value)*100 : 0}%"></div></div>
              </div>
              <div>
                <div class="flex justify-between text-xs mb-1"><span class="text-amber-400">Pending Verification</span><span class="font-bold text-white">${d.order_statuses.pending}</span></div>
                <div class="w-full bg-surface-950 h-2 rounded-full overflow-hidden"><div class="bg-amber-500 h-full" style="width: ${d.kpis.orders.value ? (d.order_statuses.pending/d.kpis.orders.value)*100 : 0}%"></div></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Products & Payment Methods -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans">
          <div class="lg:col-span-8 admin-card rounded-3xl p-6 space-y-4">
            <div class="flex justify-between items-center">
              <h3 class="text-base font-black text-white">Top Best Selling Products</h3>
              <button onclick="switchAdminSection('products')" class="text-xs text-emerald-400 font-bold hover:underline font-mono">View Studio →</button>
            </div>
            <div class="overflow-x-auto custom-scroll">
              <table class="w-full text-left font-mono text-xs min-w-[450px]">
                <thead><tr class="border-b border-admin-border text-slate-500"><th class="pb-2">Rank</th><th class="pb-2">Product Name</th><th class="pb-2">Orders</th><th class="pb-2">Revenue</th></tr></thead>
                <tbody class="divide-y divide-admin-border">
                  ${d.top_products.length === 0 ? `<tr><td colspan="4" class="py-6 text-center text-slate-500">No sales in this period.</td></tr>` : d.top_products.map((p, i) => `
                    <tr class="hover:bg-white/[0.02]">
                      <td class="py-3 font-bold text-emerald-400">#${i+1}</td>
                      <td class="py-3 text-white font-bold">${p.name}</td>
                      <td class="py-3 text-slate-300">${p.orders}</td>
                      <td class="py-3 text-emerald-400 font-bold">₹${p.revenue}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div class="lg:col-span-4 admin-card rounded-3xl p-6 space-y-4">
            <h3 class="text-base font-black text-white">Payment Methods</h3>
            <div class="p-4 rounded-2xl bg-surface-950 border border-admin-border space-y-3 font-mono">
              <div class="flex justify-between items-center">
                <span class="text-white font-bold">UPI Pay</span>
                <span class="text-emerald-400 font-bold">₹${d.payment_methods.upi.amount} (${d.payment_methods.upi.count} txns)</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-white font-bold">Crypto USDT</span>
                <span class="text-teal-400 font-bold">₹${d.payment_methods.crypto.amount} (${d.payment_methods.crypto.count} txns)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Attention Required & Slot Inventory -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans">
          <div class="lg:col-span-6 admin-card rounded-3xl p-6 space-y-4">
            <div class="flex justify-between items-center">
              <h3 class="text-base font-black text-white">Account Slot Inventory</h3>
              <button onclick="switchAdminSection('slots')" class="text-xs text-emerald-400 font-bold hover:underline font-mono">Manage Slots →</button>
            </div>
            <div class="grid grid-cols-3 gap-2 font-mono text-center">
              <div class="p-3 bg-surface-950 rounded-2xl border border-admin-border"><span class="text-slate-500 text-[10px] block">TOTAL</span><span class="text-base font-black text-white">${d.slot_summary.total}</span></div>
              <div class="p-3 bg-surface-950 rounded-2xl border border-admin-border"><span class="text-emerald-400 text-[10px] block">AVAILABLE</span><span class="text-base font-black text-emerald-400">${d.slot_summary.available}</span></div>
              <div class="p-3 bg-surface-950 rounded-2xl border border-admin-border"><span class="text-indigo-400 text-[10px] block">ASSIGNED</span><span class="text-base font-black text-indigo-400">${d.slot_summary.assigned}</span></div>
            </div>
          </div>

          <div class="lg:col-span-6 admin-card rounded-3xl p-6 space-y-4">
            <h3 class="text-base font-black text-white">Attention Required</h3>
            <div class="space-y-2">
              ${d.attention_items.length === 0 ? `
                <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                  ✓ Everything looks good. No action required.
                </div>
              ` : d.attention_items.map(item => `
                <div class="p-3 rounded-2xl bg-surface-950 border border-amber-500/30 flex justify-between items-center text-xs font-mono gap-2">
                  <span class="text-amber-300">⚠ ${item.text}</span>
                  <button onclick="switchAdminSection('${item.link}')" class="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 font-bold hover:bg-amber-500/20 shrink-0">Resolve</button>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="admin-card p-8 text-center text-rose-400 text-xs font-mono">Unable to load dashboard data. <button onclick="renderAdminOverview(document.getElementById('adminMainContent'))" class="ml-2 underline text-white">Retry</button></div>`;
  }
}
