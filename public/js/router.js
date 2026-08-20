function closeAllDrawers() {
  const drop = document.getElementById('appBackdrop');
  if (drop) drop.classList.add('hidden');
  const cSide = document.getElementById('customerSidebar');
  if (cSide) cSide.classList.add('-translate-x-full');
  const aSide = document.getElementById('adminSidebar');
  if (aSide) aSide.classList.add('-translate-x-full');
  const modal = document.getElementById('globalModal');
  if (modal) modal.classList.add('hidden');
}

function toggleCustomerDrawer(open) {
  const side = document.getElementById('customerSidebar');
  const drop = document.getElementById('appBackdrop');
  if (open) {
    if (side) side.classList.remove('-translate-x-full');
    if (drop) drop.classList.remove('hidden');
    history.pushState({ drawer: 'customer' }, '');
  } else {
    if (side) side.classList.add('-translate-x-full');
    if (drop) drop.classList.add('hidden');
  }
}

function toggleAdminDrawer(open) {
  const side = document.getElementById('adminSidebar');
  const drop = document.getElementById('appBackdrop');
  if (open) {
    if (side) side.classList.remove('-translate-x-full');
    if (drop) drop.classList.remove('hidden');
    history.pushState({ drawer: 'admin' }, '');
  } else {
    if (side) side.classList.add('-translate-x-full');
    if (drop) drop.classList.add('hidden');
  }
}

function navigate(view, params = {}, addToHistory = true) {
  state.currentView = view;
  closeAllDrawers();
  window.scrollTo({ top: 0, behavior: 'instant' });

  if (addToHistory) {
    history.pushState({ view, params }, '', '#' + view);
  }

  // Update header cart bag badge
  const bagBadge = document.getElementById('cartBadgeCount');
  if (bagBadge) {
    const count = Array.isArray(state.cart) ? state.cart.length : 0;
    bagBadge.textContent = count;
    if (count > 0) bagBadge.classList.remove('hidden');
    else bagBadge.classList.add('hidden');
  }

  const viewport = document.getElementById('mainViewport');
  if (view === 'admin-center') {
    if (!state.adminToken) renderAdminLogin(viewport);
    else renderAdminSaaSLayout(viewport);
    return;
  }

  renderStorefrontLayout(viewport, view, params);
}

window.addEventListener('popstate', (e) => {
  const modal = document.getElementById('globalModal');
  if (modal && !modal.classList.contains('hidden')) {
    modal.classList.add('hidden');
    return;
  }
  const drop = document.getElementById('appBackdrop');
  if (drop && !drop.classList.contains('hidden')) {
    closeAllDrawers();
    return;
  }
  if (e.state && e.state.view) {
    navigate(e.state.view, e.state.params || {}, false);
  } else {
    navigate('home', {}, false);
  }
});

function renderStorefrontLayout(viewport, view, params) {
  viewport.innerHTML = `
    <div class="flex flex-1 min-h-screen relative w-full bg-surface-950 animate-fadeIn flex-col">
      <header class="sticky top-0 z-40 bg-surface-950/80 backdrop-blur-xl border-b border-white/5 px-4 py-3">
        <div class="max-w-xl mx-auto flex items-center justify-between gap-3">
          <button onclick="toggleCustomerDrawer(true)" class="w-10 h-10 rounded-2xl bg-surface-900 border border-white/5 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <div onclick="navigate('home')" class="flex items-center gap-2 cursor-pointer">
            <div class="w-8 h-8 rounded-xl bg-emerald-500 text-gray-950 flex items-center justify-center font-black font-mono text-sm shadow-md shadow-emerald-500/20">N</div>
            <span class="font-black text-sm tracking-tight text-white">NEXUS</span>
          </div>
          <button onclick="navigate('cart')" class="relative w-10 h-10 rounded-2xl bg-surface-900 border border-white/5 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
            <span id="cartBadgeCount" class="hidden absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-gray-950 text-[10px] font-mono font-black flex items-center justify-center shadow-lg shadow-emerald-500/30">0</span>
          </button>
        </div>
      </header>
      <main id="storeContent" class="flex-1 p-3 sm:p-6 max-w-xl w-full mx-auto space-y-6"></main>
    </div>
  `;

  // Update badge count
  const bagBadge = document.getElementById('cartBadgeCount');
  if (bagBadge && state.cart.length > 0) {
    bagBadge.textContent = state.cart.length;
    bagBadge.classList.remove('hidden');
  }

  const storeContent = document.getElementById('storeContent');
  if (view === 'home' || view === 'products') renderStoreHome(storeContent);
  else if (view === 'product-details') renderStoreProductDetails(storeContent, params.id);
  else if (view === 'cart') renderStoreCart(storeContent);
  else if (view === 'checkout') renderStoreCheckout(storeContent);
  else if (view === 'orders') renderStoreOrders(storeContent);
  else if (view === 'account' || view === 'login') renderCustomerAuthPrompt(storeContent, params.returnView || 'orders', 'login');
}

function renderAdminLogin(viewport) {
  viewport.innerHTML = `
    <div class="min-h-screen w-full bg-admin-bg flex items-center justify-center p-4 animate-fadeIn">
      <div class="admin-card max-w-md w-full rounded-3xl p-8 space-y-6 shadow-2xl border border-admin-border">
        <div class="text-center space-y-1">
          <h2 class="text-xl font-black text-white tracking-wider font-sans">NEXUS CONTROL CENTER</h2>
          <p class="text-xs text-slate-400 font-mono">Admin Authorization Portal</p>
        </div>
        <form onsubmit="handleAdminAuth(event)" class="space-y-4 font-mono">
          <input type="text" id="admUser" required placeholder="Admin Username (Aryan)" class="w-full px-4 py-3 rounded-xl bg-surface-950 border border-admin-border text-xs text-white outline-none focus:border-emerald-500">
          <input type="password" id="admPass" required placeholder="Password (5669)" class="w-full px-4 py-3 rounded-xl bg-surface-950 border border-admin-border text-xs text-white outline-none focus:border-emerald-500">
          <button type="submit" class="w-full py-3.5 rounded-xl bg-emerald-500 text-gray-950 font-black text-xs uppercase tracking-wider font-sans shadow-lg cursor-pointer">Authorize Session</button>
        </form>
      </div>
    </div>
  `;
}

async function handleAdminAuth(e) {
  e.preventDefault();
  try {
    const data = await fetchJSON('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: document.getElementById('admUser').value, password: document.getElementById('admPass').value })
    });
    state.adminToken = data.token;
    state.adminUsername = data.username;
    localStorage.setItem('nexus_admin_token', data.token);
    localStorage.setItem('nexus_admin_user', data.username);
    showToast('Admin Authorized');
    navigate('admin-center');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderAdminSaaSLayout(viewport) {
  viewport.innerHTML = `
    <div class="flex flex-1 min-h-screen w-full bg-admin-bg font-sans text-slate-200 relative animate-fadeIn flex-col">
      <header class="h-16 border-b border-admin-border bg-admin-sidebar/50 px-4 sm:px-8 flex items-center justify-between">
        <button onclick="toggleAdminDrawer(true)" class="lg:hidden p-2 rounded-xl bg-white/5 text-slate-300">☰</button>
        <span class="text-xs text-slate-400 font-mono">Admin: ${state.adminUsername}</span>
      </header>
      <main id="adminMainContent" class="flex-1 p-4 sm:p-8 space-y-8 max-w-5xl w-full mx-auto"></main>
    </div>
  `;
  switchAdminSection(state.adminSection || 'dashboard');
}

function switchAdminSection(sec) {
  state.adminSection = sec;
  closeAllDrawers();
  const content = document.getElementById('adminMainContent');
  if (!content) return;
  document.querySelectorAll('[id^="adnav-"]').forEach(b => b.classList.remove('bg-emerald-500/10', 'text-emerald-400'));
  const active = document.getElementById(`adnav-${sec}`);
  if (active) active.classList.add('bg-emerald-500/10', 'text-emerald-400');

  if (sec === 'dashboard') renderAdminDashboard(content);
  else if (sec === 'products') renderAdminProductsStudio(content);
  else if (sec === 'slots') renderAdminSlots(content);
  else if (sec === 'subscriptions') renderAdminSubscriptions(content);
  else if (sec === 'transactions') renderAdminTransactions(content);
  else if (sec === 'customers') renderAdminCustomers(content);
  else if (sec === 'payment-settings') renderAdminPaymentSettings(content);
  else if (sec === 'system-monitor') renderAdminSystemMonitor(content);
}

function adminSignOut() {
  state.adminToken = '';
  state.adminUsername = '';
  localStorage.removeItem('nexus_admin_token');
  localStorage.removeItem('nexus_admin_user');
  navigate('home');
}

document.addEventListener('DOMContentLoaded', () => {
  prefetchGlobalData();
  navigate('home', {}, false);
});
