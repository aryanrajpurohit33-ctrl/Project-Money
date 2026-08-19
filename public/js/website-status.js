async function renderAdminSystemMonitor(container) {
  try {
    const d = await fetchJSON('/api/admin/system/infrastructure', { headers: { 'Authorization': `Bearer ${state.adminToken}` } });
    container.innerHTML = `<div class="admin-card rounded-3xl p-6 text-white font-mono text-xs space-y-2"><h1 class="text-xl font-black font-sans">Website Status</h1><div>Database: <span class="text-emerald-400">${d.database?.status}</span> (${d.database?.ping_latency_ms}ms)</div></div>`;
  } catch (e) { container.innerHTML = `<div class="admin-card p-8 text-rose-400 text-xs font-mono">${e.message}</div>`; }
}
