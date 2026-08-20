function renderCustomerAuthPrompt(container, returnView = 'orders', mode = 'login') {
  // If already authenticated, redirect straight to orders or profile
  if (state.token && state.user && !state.user.isAdmin) {
    renderCustomerAccount(container);
    return;
  }

  container.innerHTML = `
    <div class="max-w-sm mx-auto py-2 sm:py-6 px-1 space-y-3 font-sans animate-fadeIn text-xs">
      
      <!-- Compact Glass Container -->
      <div class="relative rounded-3xl p-4 sm:p-5 bg-surface-900/80 border border-white/5 shadow-2xl backdrop-blur-2xl space-y-4">
        
        <!-- Header & Toggle Pill in Single Row -->
        <div class="flex items-center justify-between gap-2">
          <div>
            <h2 class="text-base font-black text-white tracking-tight leading-none" id="authTitle">
              ${mode === 'register' ? 'Create Account' : 'Login'}
            </h2>
            <span class="text-[10px] text-slate-400 font-mono block mt-0.5" id="authSubtitle">
              ${mode === 'register' ? 'Set username & password' : 'Enter credentials to continue'}
            </span>
          </div>

          <!-- Mode Toggle Switch -->
          <div class="flex p-0.5 bg-surface-950 rounded-xl border border-white/5 shrink-0">
            <button type="button" onclick="switchAuthTab('login')" id="tabLoginBtn" class="px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold transition-all ${mode === 'login' ? 'bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/20' : 'text-slate-400'}">
              Login
            </button>
            <button type="button" onclick="switchAuthTab('register')" id="tabRegisterBtn" class="px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold transition-all ${mode === 'register' ? 'bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/20' : 'text-slate-400'}">
              Register
            </button>
          </div>
        </div>

        <!-- Compact Form -->
        <form onsubmit="handleCustomerAuthSubmit(event, '${returnView}')" class="space-y-2.5" id="authMainForm">
          
          <!-- Username (Always Visible) -->
          <div class="relative">
            <input type="text" id="authUsername" required placeholder="Username (e.g. alex_99)" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-white/10 text-white text-xs outline-none focus:border-emerald-500 font-sans transition-all placeholder:text-slate-600">
          </div>

          <!-- Email (Register Mode Only) -->
          <div class="relative ${mode === 'login' ? 'hidden' : ''}" id="emailFieldGroup">
            <input type="email" id="authEmail" placeholder="Email (your@email.com)" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-white/10 text-white text-xs outline-none focus:border-emerald-500 font-sans transition-all placeholder:text-slate-600">
          </div>

          <!-- Mobile Phone (Register Mode Only) -->
          <div class="relative flex items-center ${mode === 'login' ? 'hidden' : ''}" id="mobileFieldGroup">
            <span class="absolute left-3 text-slate-500 font-mono text-[11px]">+91</span>
            <input type="tel" id="authMobile" placeholder="WhatsApp / Mobile Number" maxlength="10" class="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-surface-950 border border-white/10 text-white text-xs outline-none focus:border-emerald-500 font-mono tracking-wider transition-all placeholder:text-slate-600">
          </div>

          <!-- Password & Confirm Password -->
          <div class="${mode === 'register' ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' : 'space-y-2'}" id="passwordFieldsGrid">
            <input type="password" id="authPassword" required minlength="4" placeholder="Password" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-white/10 text-white text-xs outline-none focus:border-emerald-500 font-sans transition-all placeholder:text-slate-600">
            <input type="password" id="authConfirmPassword" placeholder="Confirm Password" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-white/10 text-white text-xs outline-none focus:border-emerald-500 font-sans transition-all placeholder:text-slate-600 ${mode === 'login' ? 'hidden' : ''}">
          </div>

          <!-- Action Button -->
          <button type="submit" id="authSubmitBtn" class="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-gray-950 font-black uppercase font-mono tracking-wider shadow-lg shadow-emerald-500/20 transition-all text-xs cursor-pointer flex items-center justify-center gap-1.5 mt-1">
            <span>${mode === 'register' ? 'CREATE ACCOUNT' : 'LOGIN'}</span>
            <span>→</span>
          </button>

        </form>

        <!-- Admin Access Link -->
        <div class="text-center pt-1 border-t border-white/5">
          <a href="#admin-center" onclick="navigate('admin-center')" class="text-slate-500 hover:text-emerald-400 font-mono text-[9px] transition-colors">
            Admin Portal Access 🔒
          </a>
        </div>

      </div>

    </div>
  `;

  window.currentAuthMode = mode;
}

function switchAuthTab(mode) {
  window.currentAuthMode = mode;
  const regBtn = document.getElementById('tabRegisterBtn');
  const logBtn = document.getElementById('tabLoginBtn');
  const title = document.getElementById('authTitle');
  const subtitle = document.getElementById('authSubtitle');
  const emailGroup = document.getElementById('emailFieldGroup');
  const emailInput = document.getElementById('authEmail');
  const mobileGroup = document.getElementById('mobileFieldGroup');
  const confirmInput = document.getElementById('authConfirmPassword');
  const passGrid = document.getElementById('passwordFieldsGrid');
  const submitBtn = document.getElementById('authSubmitBtn');

  if (mode === 'register') {
    regBtn.className = 'px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold transition-all bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/20';
    logBtn.className = 'px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold transition-all text-slate-400';
    title.textContent = 'Create Account';
    subtitle.textContent = 'Set username & password';
    emailGroup.classList.remove('hidden');
    if (emailInput) emailInput.required = true;
    mobileGroup.classList.remove('hidden');
    confirmInput.classList.remove('hidden');
    passGrid.className = 'grid grid-cols-1 sm:grid-cols-2 gap-2';
    submitBtn.innerHTML = '<span>CREATE ACCOUNT</span> <span>→</span>';
  } else {
    logBtn.className = 'px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold transition-all bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/20';
    regBtn.className = 'px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold transition-all text-slate-400';
    title.textContent = 'Login';
    subtitle.textContent = 'Enter credentials to continue';
    emailGroup.classList.add('hidden');
    if (emailInput) emailInput.required = false;
    mobileGroup.classList.add('hidden');
    confirmInput.classList.add('hidden');
    passGrid.className = 'space-y-2';
    submitBtn.innerHTML = '<span>LOGIN</span> <span>→</span>';
  }
}

async function handleCustomerAuthSubmit(e, returnView) {
  e.preventDefault();
  const mode = window.currentAuthMode || 'login';

  const username = document.getElementById('authUsername').value.trim();
  const password = document.getElementById('authPassword').value.trim();
  const email = document.getElementById('authEmail') ? document.getElementById('authEmail').value.trim() : '';
  const mobile = document.getElementById('authMobile') ? document.getElementById('authMobile').value.trim() : '';
  const confirm = document.getElementById('authConfirmPassword') ? document.getElementById('authConfirmPassword').value.trim() : '';

  if (mode === 'register' && confirm && password !== confirm) {
    showToast('Passwords do not match.', 'error');
    return;
  }

  try {
    const url = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
    const payload = mode === 'register' 
      ? { username, email, password, mobile: mobile ? `+91 ${mobile}` : '' } 
      : { username, password };

    const res = await fetchJSON(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.isAdmin || res.is_admin) {
      state.adminToken = res.token;
      state.adminUsername = res.username || 'Aryan';
      localStorage.setItem('nexus_admin_token', res.token);
      localStorage.setItem('nexus_admin_user', state.adminUsername);
      showToast('✓ Admin session authenticated');
      navigate('admin-center');
      return;
    }

    // Save Customer Session
    state.token = res.token;
    state.user = res.user;
    localStorage.setItem('nexus_token', res.token);
    localStorage.setItem('nexus_user', JSON.stringify(res.user));

    showToast(`✓ Welcome, ${res.user.username}!`);

    // Determine destination: if on account or login page, redirect to orders vault
    const destination = (returnView === 'account' || returnView === 'login' || !returnView) ? 'orders' : returnView;
    navigate(destination);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderCustomerAccount(container) {
  if (!state.user || !state.token) {
    renderCustomerAuthPrompt(container, 'account', 'login');
    return;
  }

  const u = state.user;
  container.innerHTML = `
    <div class="max-w-md mx-auto py-4 px-2 space-y-4 font-sans animate-fadeIn text-xs">
      
      <!-- Account Profile Card -->
      <div class="bg-surface-900/80 rounded-3xl p-5 border border-white/5 shadow-2xl space-y-4">
        
        <div class="flex items-center justify-between border-b border-white/5 pb-3">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-black text-base flex items-center justify-center">
              ${(u.username || 'U')[0].toUpperCase()}
            </div>
            <div>
              <h2 class="text-base font-bold text-white">${u.username}</h2>
              <span class="text-slate-400 font-mono text-[10px] block">${u.email || 'Verified Customer'}</span>
            </div>
          </div>

          <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[9px] font-bold uppercase">
            Active
          </span>
        </div>

        <!-- Details Grid -->
        <div class="grid grid-cols-2 gap-2 bg-surface-950 p-3 rounded-2xl border border-white/5 font-mono text-[11px]">
          <div>
            <span class="text-slate-500 text-[9px] uppercase block">Mobile Phone</span>
            <span class="text-emerald-400 font-bold block">${u.mobile || 'Not Set'}</span>
          </div>
          <div>
            <span class="text-slate-500 text-[9px] uppercase block">Vault Access</span>
            <span class="text-white font-bold block">Unlocked</span>
          </div>
        </div>

        <!-- Navigation Buttons -->
        <div class="space-y-2 pt-1">
          <button onclick="navigate('orders')" class="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black font-mono text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer">
            <span>📦 Open Purchased Vault</span>
            <span>→</span>
          </button>

          <button onclick="handleCustomerLogout()" class="w-full py-3 rounded-xl bg-surface-950 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/20 text-rose-400 font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer">
            <span>Sign Out</span>
          </button>
        </div>

      </div>

    </div>
  `;
}

function handleCustomerLogout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('nexus_token');
  localStorage.removeItem('nexus_user');
  showToast('Logged out successfully');
  navigate('home');
}
