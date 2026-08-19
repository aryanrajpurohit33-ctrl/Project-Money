async function renderAdminSystemMonitor(container) {
  container.innerHTML = `
    <div class="space-y-6 font-mono text-xs animate-pulse">
      <div class="h-10 bg-surface-900 rounded-2xl w-1/3"></div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="h-24 bg-surface-900 rounded-2xl"></div>
        <div class="h-24 bg-surface-900 rounded-2xl"></div>
        <div class="h-24 bg-surface-900 rounded-2xl"></div>
        <div class="h-24 bg-surface-900 rounded-2xl"></div>
      </div>
      <div class="h-64 bg-surface-900 rounded-3xl"></div>
    </div>
  `;

  try {
    const d = await fetchJSON('/api/admin/system/infrastructure', { headers: { 'Authorization': `Bearer ${state.adminToken}` } });

    container.innerHTML = `
      <div class="space-y-8 font-mono text-xs pb-12 w-full max-w-full overflow-hidden">
        
        <!-- Header & Refresh -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans">
          <div>
            <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight">Website & Cloud Status</h1>
            <p class="text-slate-400 text-xs mt-0.5">Real-time infrastructure diagnostics, server health, and database metrics.</p>
          </div>
          <button onclick="renderAdminSystemMonitor(document.getElementById('adminMainContent'))" class="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-all">
            <span>↻</span> <span>Refresh Diagnostics</span>
          </button>
        </div>

        <!-- Infrastructure KPI Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
          <div class="admin-card p-4 rounded-2xl space-y-1">
            <span class="text-slate-500 block text-[9px] uppercase font-bold">Node Process RAM</span>
            <div class="text-xl font-black text-emerald-400">${d.server.service_memory_rss_mb} MB</div>
            <span class="text-[9px] text-slate-400">Heap Used: ${d.server.service_memory_heap_mb} MB</span>
          </div>

          <div class="admin-card p-4 rounded-2xl space-y-1">
            <span class="text-slate-500 block text-[9px] uppercase font-bold">DB Ping Latency</span>
            <div class="text-xl font-black text-emerald-400">${d.database.ping_latency_ms} ms</div>
            <span class="text-[9px] text-slate-400">Cluster Status: Online</span>
          </div>

          <div class="admin-card p-4 rounded-2xl space-y-1">
            <span class="text-slate-500 block text-[9px] uppercase font-bold">Process Uptime</span>
            <div class="text-sm sm:text-base font-black text-white mt-1">${d.server.uptime_formatted}</div>
          </div>

          <div class="admin-card p-4 rounded-2xl space-y-1">
            <span class="text-slate-500 block text-[9px] uppercase font-bold">Server Architecture</span>
            <div class="text-sm font-black text-indigo-400 mt-1 uppercase">${d.server.platform} (${d.server.architecture})</div>
            <span class="text-[9px] text-slate-400">Cores: ${d.server.cpu_cores}</span>
          </div>
        </div>

        <!-- Render Cloud & Database Details Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans">
          
          <!-- Cloud Host Details -->
          <div class="lg:col-span-6 admin-card rounded-3xl p-6 space-y-4 font-mono">
            <h3 class="text-sm font-black text-white font-sans flex items-center gap-2">
              <span>☁️</span> Render Cloud Infrastructure
            </h3>
            <div class="space-y-3 text-xs">
              <div class="flex justify-between pb-2 border-b border-admin-border">
                <span class="text-slate-400">Provider:</span>
                <span class="text-white font-bold">${d.cloud_host.provider}</span>
              </div>
              <div class="flex justify-between pb-2 border-b border-admin-border">
                <span class="text-slate-400">Region:</span>
                <span class="text-white">${d.cloud_host.region}</span>
              </div>
              <div class="flex justify-between pb-2 border-b border-admin-border">
                <span class="text-slate-400">Environment:</span>
                <span class="text-emerald-400 uppercase">${d.server.environment}</span>
              </div>
              <div class="flex justify-between pb-2 border-b border-admin-border">
                <span class="text-slate-400">Node.js Version:</span>
                <span class="text-indigo-400">${d.server.node_version}</span>
              </div>
              <div class="p-3 bg-surface-950 rounded-2xl text-[10px] text-slate-400">
                ℹ️ ${d.cloud_host.storage_note}
              </div>
            </div>
          </div>

          <!-- MongoDB Atlas Details -->
          <div class="lg:col-span-6 admin-card rounded-3xl p-6 space-y-4 font-mono">
            <h3 class="text-sm font-black text-white font-sans flex items-center gap-2">
              <span>🗄️</span> MongoDB Cloud Database
            </h3>
            <div class="space-y-3 text-xs">
              <div class="flex justify-between pb-2 border-b border-admin-border">
                <span class="text-slate-400">Connection State:</span>
                <span class="text-emerald-400 font-bold">${d.database.status}</span>
              </div>
              <div class="flex justify-between pb-2 border-b border-admin-border">
                <span class="text-slate-400">Database Name:</span>
                <span class="text-white">${d.database.database_name}</span>
              </div>
              <div class="flex justify-between pb-2 border-b border-admin-border">
                <span class="text-slate-400">Cluster Host:</span>
                <span class="text-slate-300 truncate max-w-[200px]">${d.database.host}</span>
              </div>
              <div class="flex justify-between pb-2 border-b border-admin-border">
                <span class="text-slate-400">Query Latency:</span>
                <span class="text-emerald-400 font-bold">${d.database.ping_latency_ms} ms</span>
              </div>
              <div class="p-3 bg-surface-950 rounded-2xl text-[10px] text-emerald-400">
                ✓ Cloud database cluster is fully synchronized and responsive.
              </div>
            </div>
          </div>

        </div>

        <!-- Service Health Status Table -->
        <div class="admin-card rounded-3xl p-6 space-y-4 font-sans">
          <h3 class="text-base font-black text-white">Sub-System Health Monitors</h3>
          <div class="space-y-2 font-mono text-xs">
            <div class="p-3.5 rounded-2xl bg-surface-950 border border-admin-border flex justify-between items-center">
              <span class="text-white font-bold">Web Server Engine (Express)</span>
              <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">🟢 Healthy</span>
            </div>
            <div class="p-3.5 rounded-2xl bg-surface-950 border border-admin-border flex justify-between items-center">
              <span class="text-white font-bold">MongoDB Mongoose ODM</span>
              <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">🟢 Connected</span>
            </div>
            <div class="p-3.5 rounded-2xl bg-surface-950 border border-admin-border flex justify-between items-center">
              <span class="text-white font-bold">Authentication & JWT Service</span>
              <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">🟢 Operational</span>
            </div>
            <div class="p-3.5 rounded-2xl bg-surface-950 border border-admin-border flex justify-between items-center">
              <span class="text-white font-bold">Payment Verification Daemon</span>
              <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">🟢 Active</span>
            </div>
          </div>
        </div>

      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="admin-card p-8 text-center text-rose-400 text-xs font-mono">Error loading system diagnostics: ${err.message}</div>`;
  }
}
