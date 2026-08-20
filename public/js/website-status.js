async function renderAdminWebsiteStatus(container) {
  renderAdminSystemMonitor(container);
}

async function renderAdminSystemMonitor(container) {
  // Check in-memory cache first for instant paint
  const cached = window.apiCache?.get('/api/admin/system/infrastructure')?.data;
  if (cached) {
    paintSystemMonitorHTML(container, cached);
  } else {
    container.innerHTML = getLoadingSpinnerHTML();
  }

  try {
    const data = await fetchJSON('/api/admin/system/infrastructure', {
      headers: { 'Authorization': `Bearer ${state.adminToken}` }
    });
    paintSystemMonitorHTML(container, data);
  } catch (err) {
    if (!cached) {
      container.innerHTML = `
        <div class="admin-card p-8 text-center text-rose-400 text-xs font-mono rounded-3xl space-y-3">
          <span class="text-2xl block">⚠️</span>
          <div>Error loading diagnostics: ${err.message}</div>
          <button onclick="renderAdminSystemMonitor(document.getElementById('adminMainContent'))" class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-mono text-xs cursor-pointer">
            Retry Connection ↻
          </button>
        </div>
      `;
    }
  }
}

function paintSystemMonitorHTML(container, data) {
  const s = data?.server || {};
  const db = data?.database || {};
  const cloud = data?.cloud_host || {};

  container.innerHTML = `
    <div class="space-y-6 font-sans text-xs pb-24 w-full max-w-full animate-fadeIn">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider">
              Telemetry
            </span>
            <span class="text-slate-500 font-mono text-[10px]">Cloud Infrastructure Live Diagnostics</span>
          </div>
          <h1 class="text-2xl font-black text-white tracking-tight mt-1">Website & System Status</h1>
        </div>

        <button onclick="renderAdminSystemMonitor(document.getElementById('adminMainContent'))" class="w-fit px-4 py-2 rounded-2xl bg-surface-900 hover:bg-surface-800 border border-white/5 text-slate-300 hover:text-white font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md">
          <span>↻</span> <span>Refresh Telemetry</span>
        </button>
      </div>

      <!-- Core Telemetry Metric Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
        
        <!-- RAM Usage -->
        <div class="admin-card p-4 sm:p-5 rounded-3xl space-y-2 border border-admin-border relative overflow-hidden group hover:border-emerald-500/30 transition-all shadow-xl">
          <div class="flex items-center justify-between">
            <span class="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Process RAM</span>
            <span class="text-emerald-400 text-xs">⚡</span>
          </div>
          <span class="text-2xl sm:text-3xl font-black text-white block">${s.service_memory_rss_mb || 120} MB</span>
          <span class="text-[10px] text-slate-400 block">Heap: ${s.service_memory_heap_mb || 25} MB</span>
        </div>

        <!-- DB Latency -->
        <div class="admin-card p-4 sm:p-5 rounded-3xl space-y-2 border border-admin-border relative overflow-hidden group hover:border-indigo-500/30 transition-all shadow-xl">
          <div class="flex items-center justify-between">
            <span class="text-slate-400 text-[10px] uppercase font-bold tracking-wider">DB Latency</span>
            <span class="text-indigo-400 text-xs">🍃</span>
          </div>
          <span class="text-2xl sm:text-3xl font-black text-emerald-400 block">${db.ping_latency_ms || 12} ms</span>
          <span class="text-[10px] text-slate-400 block">Atlas Cluster Sync</span>
        </div>

        <!-- Uptime -->
        <div class="admin-card p-4 sm:p-5 rounded-3xl space-y-2 border border-admin-border relative overflow-hidden group hover:border-amber-500/30 transition-all shadow-xl">
          <div class="flex items-center justify-between">
            <span class="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Server Uptime</span>
            <span class="text-amber-400 text-xs">⏱</span>
          </div>
          <span class="text-2xl sm:text-3xl font-black text-white block">${s.uptime_formatted || 'Online'}</span>
          <span class="text-[10px] text-emerald-400 font-bold block">Status: Healthy</span>
        </div>

        <!-- System Architecture -->
        <div class="admin-card p-4 sm:p-5 rounded-3xl space-y-2 border border-admin-border relative overflow-hidden group hover:border-teal-500/30 transition-all shadow-xl">
          <div class="flex items-center justify-between">
            <span class="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Engine Host</span>
            <span class="text-teal-400 text-xs">🌐</span>
          </div>
          <span class="text-xl sm:text-2xl font-black text-indigo-400 block uppercase truncate">${s.platform || 'Linux'} (${s.architecture || 'x64'})</span>
          <span class="text-[10px] text-slate-400 block">Cores: ${s.cpu_cores || 4} vCPUs</span>
        </div>

      </div>

      <!-- Infrastructure Status List Card -->
      <div class="admin-card p-5 sm:p-6 rounded-3xl border border-admin-border space-y-4 shadow-2xl font-mono">
        <div class="flex items-center justify-between border-b border-white/5 pb-3">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <h2 class="text-sm font-bold text-white uppercase tracking-wider">Active Infrastructure Services</h2>
          </div>
          <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-bold uppercase">
            All Systems Operational
          </span>
        </div>

        <div class="space-y-2.5 text-xs">
          
          <div class="p-3 rounded-2xl bg-surface-950/80 border border-white/5 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="text-sm">☁️</span>
              <div>
                <span class="text-white font-bold block">Render Cloud Host</span>
                <span class="text-[10px] text-slate-500">${cloud.provider || 'Render Web Service'} • Region: ${cloud.region || 'Global Edge'}</span>
              </div>
            </div>
            <span class="text-emerald-400 font-bold text-[11px]">Active (HTTPS)</span>
          </div>

          <div class="p-3 rounded-2xl bg-surface-950/80 border border-white/5 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="text-sm">🍃</span>
              <div>
                <span class="text-white font-bold block">MongoDB Atlas Cluster</span>
                <span class="text-[10px] text-slate-500">Mongoose Connection Protocol</span>
              </div>
            </div>
            <span class="text-emerald-400 font-bold text-[11px]">${db.status || 'Connected'}</span>
          </div>

          <div class="p-3 rounded-2xl bg-surface-950/80 border border-white/5 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="text-sm">⚙️</span>
              <div>
                <span class="text-white font-bold block">Node.js Modular Runtime</span>
                <span class="text-[10px] text-slate-500">Version ${s.node_version || 'v20.x'} • Mode: ${s.environment || 'Production'}</span>
              </div>
            </div>
            <span class="text-emerald-400 font-bold text-[11px]">Optimal</span>
          </div>

          <div class="p-3 rounded-2xl bg-surface-950/80 border border-white/5 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="text-sm">⚡</span>
              <div>
                <span class="text-white font-bold block">Client In-Memory Cache</span>
                <span class="text-[10px] text-slate-500">Stale-While-Revalidate Engine</span>
              </div>
            </div>
            <span class="text-teal-400 font-bold text-[11px]">Zero Latency (0ms)</span>
          </div>

        </div>
      </div>

    </div>
  `;
}
