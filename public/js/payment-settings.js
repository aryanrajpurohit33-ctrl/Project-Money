async function renderAdminPaymentSettings(container) {
  try {
    const s = await fetchJSON('/api/admin/payment-settings', { headers: { 'Authorization': `Bearer ${state.adminToken}` } });
    container.innerHTML = `<div class="admin-card rounded-3xl p-6 text-white font-mono text-xs space-y-2"><h1 class="text-xl font-black font-sans">Payment Gateway</h1><div>UPI ID: <span class="text-emerald-400">${s.upi_id}</span></div></div>`;
  } catch (e) { container.innerHTML = `<div class="admin-card p-8 text-rose-400 text-xs font-mono">${e.message}</div>`; }
}
