async function renderAdminAccountSlots(container) {
  container.innerHTML = '<div class="text-center py-16 text-slate-500 font-mono">Loading Account Slots...</div>';
  try {
    const data = await fetchJSON('/api/admin/slots', { headers: { 'Authorization': `Bearer ${state.adminToken}` } });
    container.innerHTML = `
      <div class="space-y-6 font-mono text-xs">
        <h1 class="text-xl font-black text-white font-sans">Account Slots Management</h1>
        <div class="admin-card rounded-3xl p-6">
          <table class="w-full text-left">
            <thead><tr class="border-b border-admin-border text-slate-500"><th class="pb-3">Slot</th><th class="pb-3">Email</th><th class="pb-3">Status</th></tr></thead>
            <tbody class="divide-y divide-admin-border">${(data.slots || []).map(s => `<tr><td class="py-3 font-bold text-white">${s.account_label}</td><td class="py-3 text-slate-400">${s.email}</td><td class="py-3 text-emerald-400">${s.status}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) { container.innerHTML = `<div class="admin-card p-8 text-rose-400 text-xs font-mono">${err.message}</div>`; }
}
