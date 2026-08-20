function renderCustomerAuthPrompt(container, returnView = 'account') {
  container.innerHTML = `
    <div class="max-w-md mx-auto py-12 px-4 space-y-6 font-sans animate-fadeIn text-xs">
      <div class="bg-surface-900/80 rounded-3xl p-6 sm:p-8 space-y-6 border border-white/5 shadow-2xl backdrop-blur-xl">
        <div class="text-center space-y-1">
          <h2 class="text-2xl font-black text-white tracking-tight">Sign In</h2>
          <p class="text-slate-400 text-xs font-mono">Access your digital vault & credentials</p>
        </div>

        <form onsubmit="handleCustomerLogin(event, '${returnView}')" class="space-y-4 font-mono">
          <div>
            <label class="text-slate-400 text-[10px] uppercase block mb-1">Username or Email</label>
            <input type="text" id="authIdent" required placeholder="Aryan" class="w-full px-4 py-3.5 rounded-2xl bg-surface-950 border border-white/10 text-white text-xs outline-none focus:border-emerald-500 font-sans">
          </div>

          <div>
            <label class="text-slate-400 text-[10px] uppercase block mb-1">Password</label>
            <input type="password" id="authPass" required placeholder="••••" class="w-full px-4 py-3.5 rounded-2xl bg-surface-950 border border-white/10 text-white text-xs outline-none focus:border-emerald-500 font-sans">
          </div>

          <button type="submit" class="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 active:scale-95 transition-all text-xs cursor-pointer">
            SIGN IN
          </button>
        </form>

        <div class="text-center pt-2">
          <a href="#admin-center" onclick="navigate('admin-center')" class="text-emerald-400 font-mono text-[11px] hover:underline">
            Admin Portal Access →
          </a>
        </div>
      </div>
    </div>
  `;
}

async function handleCustomerLogin(e, returnView) {
  e.preventDefault();
  const username = document.getElementById('authIdent').value.trim();
  const password = document.getElementById('authPass').value.trim();

  try {
    const res = await fetchJSON('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (res.isAdmin) {
      state.adminToken = res.token;
      state.adminUsername = res.username;
      localStorage.setItem('nexus_admin_token', res.token);
      localStorage.setItem('nexus_admin_user', res.username);
      showToast('Admin access granted');
      navigate('admin-center');
      return;
    }

    state.token = res.token;
    state.user = res.user;
    localStorage.setItem('nexus_token', res.token);
    localStorage.setItem('nexus_user', JSON.stringify(res.user));
    showToast(`Welcome back, ${res.user.username}!`);
    navigate(returnView || 'orders');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
