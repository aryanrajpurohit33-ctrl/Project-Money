function getLoadingSpinnerHTML() {
  return `
    <div class="flex items-center justify-center py-24 w-full">
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
  }, 3000);
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  if (res.status === 401 || res.status === 403) {
    if (url.includes('/api/admin/')) adminSignOut();
    throw new Error('Session expired or unauthorized');
  }
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error('Server response error (Invalid JSON)');
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

async function prefetchGlobalData() {
  try {
    const products = await fetchJSON('/api/products');
    state.cachedProducts = products;
    localStorage.setItem('nexus_local_cache', JSON.stringify(products));
  } catch (e) {}
}
