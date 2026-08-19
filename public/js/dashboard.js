async function renderAdminOverview(container) {
  container.innerHTML = `<div class="p-8 text-center text-slate-400 font-mono text-xs">Loading Overview Dashboard...</div>`;
  try {
    const d = await fetchJSON(`/api/admin/dashboard/full-overview?range=${state.dashboardRange}`, { headers: { 'Authorization': `Bearer ${state.adminToken}` } });
    container.innerHTML = `
      <div class="space-y-8 font-mono text-xs pb-12">
        <div class="glass border-emerald-500/20 px-4 py-2.5 rounded-2xl flex justify-between items-center text-[11px] font-bold shadow-lg">
          <span class="text-emerald-400 font-sans">🟢 ${d.live_visitors || 1} LIVE VISITORS ONLINE</span>
          <span class="text-slate-400">Updated just now</span>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 font-sans">
          <div class="admin-card p-5 rounded-3xl space-y-2"><span class="text-slate-400 block text-[10px] uppercase font-bold">TOTAL REVENUE</span><div class="text-2xl font-black text-emerald-400 font-mono">₹${d.kpis.revenue.value.toLocaleString()}</div></div>
          <div class="admin-card p-5 rounded-3xl space-y-2"><span class="text-slate-400 block text-[10px] uppercase font-bold">TOTAL ORDERS</span><div class="text-2xl font-black text-white font-mono">${d.kpis.orders.value}</div></div>
          <div class="admin-card p-5 rounded-3xl space-y-2"><span class="text-slate-400 block text-[10px] uppercase font-bold">TOTAL CUSTOMERS</span><div class="text-2xl font-black text-white font-mono">${d.kpis.customers.value}</div></div>
          <div class="admin-card p-5 rounded-3xl space-y-2"><span class="text-slate-400 block text-[10px] uppercase font-bold">ACTIVE SUBSCRIPTIONS</span><div class="text-2xl font-black text-indigo-400 font-mono">${d.kpis.subscriptions.value}</div></div>
        </div>
      </div>
    `;
  } catch (e) { container.innerHTML = `<div class="admin-card p-8 text-rose-400 text-xs font-mono">${e.message}</div>`; }
}
