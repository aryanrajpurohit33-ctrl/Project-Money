window.state = {
  sessionId: 'sess_' + Math.random().toString(36).substring(2, 12),
  user: JSON.parse(localStorage.getItem('nexus_user') || 'null'),
  token: localStorage.getItem('nexus_token') || '',
  adminToken: localStorage.getItem('nexus_admin_token') || '',
  adminUsername: localStorage.getItem('nexus_admin_user') || 'Aryan',
  cart: JSON.parse(localStorage.getItem('nexus_cart') || '[]'),
  currentView: 'home',
  adminSection: 'dashboard',
  loadedProducts: [],
  cachedProducts: JSON.parse(localStorage.getItem('nexus_local_cache') || 'null')
};
