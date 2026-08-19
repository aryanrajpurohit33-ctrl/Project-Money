async function renderAdminSubscriptions(container) {
  container.innerHTML = '<div class="text-center py-16 text-slate-500 font-mono">Loading Subscriptions...</div>';
  try {
    const data = await fetchJSON('/api/admin/subscriptions/advanced', { headers: { 'Authorization': `Bearer ${state.adminToken}` } });
    container.innerHTML = `
      <div class="space-y-6 font-mono text-xs">
        <h1 class="text-xl font-black text-white font-sans">Subscriptions Suite</h1>
        <div class="admin-card rounded-3xl p-6">
          <table class="w-full text-left">
            <thead><tr class="border-b border-admin-border text-slate-500"><th class="pb-3">Customer</th><th class="pb-3">Product</th><th class="pb-3">Status</th></tr></thead>
            <tbody class="divide-y divide-admin-border">${(data.subscriptions || []).map(s => `<tr><td class="py-3 text-white font-bold">${s.user_id?.username || 'Customer'}</td><td class="py-3">${s.product_name}</td><td class="py-3 text-emerald-400 font-bold">${s.status}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    `;
  } catch (e) { container.innerHTML = `<div class="admin-card p-8 text-rose-400 text-xs font-mono">${e.message}</div>`; }
}
