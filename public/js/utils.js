window.apiCache = new Map();

function getLoadingSpinnerHTML() {
  return `
    <div class="flex items-center justify-center py-16 w-full animate-fadeIn">
      <div class="custom-loader-container">
        <div class="custom-loader-line"></div>
        <div class="custom-loader-line"></div>
        <div class="custom-loader-line"></div>
        <div class="custom-loader-line"></div>
        <div class="custom-loader-line"></div>
        <div class="custom-loader-line"></div>
      </div>
    </div>
  `;
}

function showToast(message, type = 'success') {
  const hub = document.getElementById('toastHub');
  if (!hub) return;
  const toast = document.createElement('div');
  const colors = type === 'success' ? 'bg-emerald-500 text-gray-950 shadow-emerald-500/25' : 'bg-rose-500 text-white shadow-rose-500/25';
  toast.className = `px-5 py-3 rounded-2xl font-bold text-xs shadow-2xl flex items-center gap-2 transform transition-all duration-300 opacity-0 ${colors}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span> <span>${message}</span>`;
  hub.appendChild(toast);
  setTimeout(() => toast.classList.remove('opacity-0'), 10);
  setTimeout(() => {
    toast.classList.add('opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// Turbo In-Memory Cached Fetcher
async function fetchJSON(url, options = {}, useCache = true) {
  const isGet = !options.method || options.method === 'GET';
  const cacheKey = url;

  // Instant response if in memory
  if (isGet && useCache && window.apiCache.has(cacheKey)) {
    const cached = window.apiCache.get(cacheKey);
    // Background refresh after 20s
    if (Date.now() - cached.timestamp > 20000) {
      fetch(url, options).then(r => r.json()).then(fresh => {
        window.apiCache.set(cacheKey, { data: fresh, timestamp: Date.now() });
      }).catch(() => {});
    }
    return cached.data;
  }

  const res = await fetch(url, options);
  if (res.status === 401 || res.status === 403) {
    if (url.includes('/api/admin/')) adminSignOut();
    throw new Error('Session expired or unauthorized');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);

  if (isGet) {
    window.apiCache.set(cacheKey, { data, timestamp: Date.now() });
  } else {
    // Invalidate stale cache on mutations
    window.apiCache.clear();
  }

  return data;
}

// Prefetch all admin data in parallel into RAM on login/boot
async function prefetchAdminData() {
  if (!state.adminToken) return;
  const headers = { 'Authorization': `Bearer ${state.adminToken}` };
  
  Promise.allSettled([
    fetchJSON('/api/admin/dashboard', { headers }),
    fetchJSON('/api/admin/transactions', { headers }),
    fetchJSON('/api/admin/slots', { headers }),
    fetchJSON('/api/admin/products', { headers }),
    fetchJSON('/api/admin/subscriptions', { headers }),
    fetchJSON('/api/admin/customers', { headers }),
    fetchJSON('/api/payment-settings', { headers }),
    fetchJSON('/api/admin/system/infrastructure', { headers })
  ]).catch(() => {});
}

async function prefetchGlobalData() {
  try {
    const products = await fetchJSON('/api/products', {}, false);
    state.cachedProducts = products;
    localStorage.setItem('nexus_local_cache', JSON.stringify(products));
  } catch (e) {}
}
