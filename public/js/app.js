// Global State
window.state = {
  token: localStorage.getItem('nexus_token') || null,
  user: JSON.parse(localStorage.getItem('nexus_user') || 'null'),
  adminToken: localStorage.getItem('nexus_admin_token') || null,
  adminUsername: localStorage.getItem('nexus_admin_user') || 'Aryan',
  cart: JSON.parse(localStorage.getItem('nexus_cart') || '[]'),
  loadedProducts: [],
  loadedTransactions: []
};

// Global Fetch JSON Helper
async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Server request failed');
  }
  return data;
}

// Global Toast Notifications
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl text-xs font-mono font-bold shadow-2xl flex items-center gap-2 transition-all transform duration-300 animate-fadeIn ${
    type === 'error' ? 'bg-rose-500 text-white shadow-rose-500/30' : 'bg-emerald-500 text-gray-950 shadow-emerald-500/30'
  }`;
  toast.innerHTML = `<span>${type === 'error' ? '✕' : '✓'}</span> <span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

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

// Navigation & Router
function navigate(route, params = {}) {
  const main = document.getElementById('mainStoreContent');
  const adminMain = document.getElementById('adminMainContent');
  const storeLayout = document.getElementById('storeLayout');
  const adminLayout = document.getElementById('adminLayout');

  // Update Cart Badge count across navbar
  const bagBadge = document.getElementById('cartBadgeCount');
  if (bagBadge) {
    const count = Array.isArray(state.cart) ? state.cart.length : 0;
    bagBadge.textContent = count;
    if (count > 0) bagBadge.classList.remove('hidden');
    else bagBadge.classList.add('hidden');
  }

  // Admin routing
  if (route.startsWith('admin')) {
    if (storeLayout) storeLayout.classList.add('hidden');
    if (adminLayout) {
      adminLayout.classList.remove('hidden');
      adminLayout.classList.add('flex');
    }
    
    if (!state.adminToken) {
      renderAdminLogin(adminMain || main);
      return;
    }

    if (route === 'admin-center' || route === 'admin-dashboard') {
      renderAdminDashboard(adminMain);
    } else if (route === 'admin-products') {
      renderAdminProductsStudio(adminMain);
    } else if (route === 'admin-transactions') {
      renderAdminTransactions(adminMain);
    } else if (route === 'admin-customers') {
      renderAdminCustomers(adminMain);
    } else if (route === 'admin-slots') {
      renderAdminSlots(adminMain);
    } else if (route === 'admin-subscriptions') {
      renderAdminSubscriptions(adminMain);
    } else if (route === 'admin-payment-settings') {
      renderAdminPaymentSettings(adminMain);
    } else if (route === 'admin-status') {
      renderAdminSystemMonitor(adminMain);
    }
    return;
  }

  // Storefront routing
  if (adminLayout) adminLayout.classList.add('hidden');
  if (storeLayout) storeLayout.classList.remove('hidden');

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (route === 'home' || !route) {
    renderStoreHome(main);
  } else if (route === 'product-details') {
    renderStoreProductDetails(main, params.id);
  } else if (route === 'cart') {
    renderStoreCart(main); // STRICTLY Cart section only
  } else if (route === 'checkout') {
    renderStoreCheckout(main); // Checkout page
  } else if (route === 'orders') {
    renderStoreOrders(main);
  } else if (route === 'login' || route === 'account') {
    renderCustomerAuthPrompt(main, params.returnView || 'orders', 'login');
  }
}

// Initial Boot
document.addEventListener('DOMContentLoaded', () => {
  navigate('home');
});
