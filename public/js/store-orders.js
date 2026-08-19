async function renderStoreOrders(container) {
  if (!state.token) return renderCustomerAuthPrompt(container, 'orders');
  container.innerHTML = '<div class="text-center py-20 text-slate-500 font-mono animate-pulse">Loading your vault...</div>';
  try {
    const orders = await fetchJSON('/api/customer/orders', { headers: { 'Authorization': `Bearer ${state.token}` } });
    container.innerHTML = `
      <div class="space-y-6 font-sans">
        <div>
          <h1 class="text-xl font-black text-white">Purchased Items Vault</h1>
          <p class="text-xs text-slate-400">Your unlocked account credentials and download links.</p>
        </div>

        <div class="space-y-4">
          ${orders.length === 0 ? '<div class="glass p-8 text-center text-slate-500 font-mono text-xs">No orders yet.</div>' : orders.map(o => `
            <div class="glass rounded-3xl p-6 space-y-4 border border-white/5">
              <div class="flex justify-between items-center text-xs font-mono pb-3 border-b border-white/5">
                <span class="text-emerald-400 font-bold">${o.order_number}</span>
                <span class="text-white font-bold">₹${o.total_amount} • <span class="${o.payment_status==='Paid'?'text-emerald-400':'text-amber-400'}">${o.payment_status}</span></span>
              </div>
              <div class="space-y-3">
                ${(o.items || []).map(it => `
                  <div class="p-4 rounded-2xl bg-surface-950 border border-white/5 space-y-2">
                    <span class="text-white font-bold text-sm block">${it.name}</span>
                    ${it.delivered_data ? `
                      <div class="p-3 bg-black/60 rounded-xl border border-emerald-500/30 space-y-1 font-mono text-xs">
                        <div class="text-emerald-400 font-bold">● Unlocked Credentials:</div>
                        <div>Email: <strong class="text-white select-all">${it.delivered_data.email}</strong></div>
                        <div>Password: <strong class="text-emerald-300 select-all">${it.delivered_data.password}</strong></div>
                      </div>
                    ` : `
                      <div class="text-[11px] text-amber-400 font-mono">
                        ⚠ Credentials will appear here once payment is verified by admin.
                      </div>
                    `}
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="glass p-8 text-center text-rose-400 text-xs">${err.message}</div>`;
  }
}
