async function renderAdminTransactions(container) {
  try {
    const txns = await fetchJSON('/api/admin/transactions', { headers: { 'Authorization': `Bearer ${state.adminToken}` } });
    container.innerHTML = `
      <div class="space-y-6 font-mono text-xs">
        <h1 class="text-xl font-black text-white font-sans">Transactions</h1>
        <div class="admin-card rounded-3xl p-6">
          <table class="w-full text-left">
            <thead><tr class="border-b border-admin-border text-slate-500"><th class="pb-3">TXN</th><th class="pb-3">Customer</th><th class="pb-3">Amount</th><th class="pb-3">Status</th></tr></thead>
            <tbody class="divide-y divide-admin-border">${txns.map(t => `<tr><td class="py-3 text-white font-bold">${t.txn_id}</td><td class="py-3">${t.customer_name}</td><td class="py-3 text-emerald-400 font-bold">₹${t.amount}</td><td class="py-3">${t.status}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    `;
  } catch (e) { container.innerHTML = `<div class="admin-card p-8 text-rose-400 text-xs font-mono">${e.message}</div>`; }
}
