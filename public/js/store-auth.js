function renderCustomerAuthPrompt(container, returnView) {
  container.innerHTML = `
    <div class="glass max-w-md mx-auto rounded-3xl p-8 space-y-6 font-sans">
      <div class="text-center space-y-1">
        <h2 class="text-xl font-black text-white">Customer Account Required</h2>
        <p class="text-xs text-slate-400">Please sign in or register to access your vault.</p>
      </div>
      <form onsubmit="handleCustomerLoginSubmit(event)" class="space-y-4 font-mono text-xs">
        <input type="text" id="custLogUser" required placeholder="Username or Email" class="w-full px-4 py-3 rounded-xl bg-surface-950 border border-white/10 text-white outline-none focus:border-emerald-500">
        <input type="password" id="custLogPass" required placeholder="Password" class="w-full px-4 py-3 rounded-xl bg-surface-950 border border-white/10 text-white outline-none focus:border-emerald-500">
        <button type="submit" class="w-full py-3.5 rounded-xl bg-emerald-500 text-gray-950 font-black uppercase shadow-lg font-sans text-xs">Sign In</button>
      </form>
    </div>
  `;
}

async function handleCustomerLoginSubmit(e) {
  e.preventDefault();
  try {
    const data = await fetchJSON('/api/auth/customer/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: document.getElementById('custLogUser').value, password: document.getElementById('custLogPass').value })
    });
    state.token = data.token; state.user = data.user;
    localStorage.setItem('nexus_token', data.token); localStorage.setItem('nexus_user', JSON.stringify(data.user));
    showToast('✓ Welcome back, @' + data.user.username);
    navigate('home');
  } catch (err) { showToast(err.message, 'error'); }
}
