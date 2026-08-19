async function renderAdminCustomers(container) {
  try {
    const custs = await fetchJSON('/api/admin/customers/list', { headers: { 'Authorization': `Bearer ${state.adminToken}` } });
    container.innerHTML = `
      <div class="space-y-6 font-mono text-xs">
        <h1 class="text-xl font-black text-white font-sans">Customers</h1>
        <div class="admin-card rounded-3xl p-6">
          <table class="w-full text-left">
            <thead><tr class="border-b border-admin-border text-slate-500"><th class="pb-3">Username</th><th class="pb-3">Email</th></tr></thead>
            <tbody class="divide-y divide-admin-border">${custs.map(c => `<tr><td class="py-3 text-white font-bold">@${c.username || c.name}</td><td class="py-3 text-slate-400">${c.email}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    `;
  } catch (e) { container.innerHTML = `<div class="admin-card p-8 text-rose-400 text-xs font-mono">${e.message}</div>`; }
}
