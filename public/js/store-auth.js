function renderCustomerAuthPrompt(container, returnView = 'account', mode = 'register') {
  container.innerHTML = `
    <div class="max-w-md mx-auto py-8 px-2 space-y-5 font-sans animate-fadeIn text-xs">
      
      <!-- Card Container with Glassmorphism -->
      <div class="relative rounded-3xl p-6 sm:p-8 bg-surface-900/80 border border-white/5 shadow-2xl backdrop-blur-2xl space-y-6 overflow-hidden">
        <div class="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none"></div>

        <!-- Mode Toggle Pill -->
        <div class="flex p-1 bg-surface-950 rounded-2xl border border-white/5">
          <button type="button" onclick="switchAuthTab('register')" id="tabRegisterBtn" class="flex-1 py-2.5 rounded-xl font-mono text-xs font-bold transition-all ${mode === 'register' ? 'bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white'}">
            Create Account
          </button>
          <button type="button" onclick="switchAuthTab('login')" id="tabLoginBtn" class="flex-1 py-2.5 rounded-xl font-mono text-xs font-bold transition-all ${mode === 'login' ? 'bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white'}">
            Sign In
          </button>
        </div>

        <!-- Header -->
        <div class="text-left space-y-1">
          <h2 class="text-2xl font-black text-white tracking-tight" id="authTitle">
            ${mode === 'register' ? 'Create Customer Account' : 'Welcome Back'}
          </h2>
          <p class="text-slate-400 text-xs font-sans" id="authSubtitle">
            ${mode === 'register' ? 'Register your account to unlock instant vault access & orders.' : 'Sign in to access your digital vault and credentials.'}
          </p>
        </div>

        <!-- Form Elements -->
        <form onsubmit="handleCustomerAuthSubmit(event, '${returnView}')" class="space-y-4" id="authMainForm">
          
          <!-- Username Input -->
          <div class="space-y-1">
            <label class="text-slate-400 text-[10px] uppercase font-mono tracking-wider block font-bold">Unique Username</label>
            <div class="relative">
              <input type="text" id="authUsername" required placeholder="e.g. alex_99" class="w-full px-4 py-3.5 rounded-2xl bg-surface-950 border border-white/10 text-white text-xs outline-none focus:border-emerald-500 font-sans transition-all">
            </div>
          </div>

          <!-- Email Input -->
          <div class="space-y-1">
            <label class="text-slate-400 text-[10px] uppercase font-mono tracking-wider block font-bold">Email Address</label>
            <input type="email" id="authEmail" required placeholder="your@email.com" class="w-full px-4 py-3.5 rounded-2xl bg-surface-950 border border-white/10 text-white text-xs outline-none focus:border-emerald-500 font-sans transition-all">
          </div>

          <!-- Mobile Phone Input (Active in Register Mode) -->
          <div class="space-y-1 ${mode === 'login' ? 'hidden' : ''}" id="mobileFieldGroup">
            <label class="text-slate-400 text-[10px] uppercase font-mono tracking-wider block font-bold">Mobile Number</label>
            <div class="relative flex items-center">
              <span class="absolute left-4 text-slate-400 font-mono text-xs">+91</span>
              <input type="tel" id="authMobile" placeholder="9876543210" maxlength="10" class="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-surface-950 border border-white/10 text-white text-xs outline-none focus:border-emerald-500 font-mono tracking-wider transition-all">
            </div>
          </div>

          <!-- Password Input -->
          <div class="space-y-1">
            <label class="text-slate-400 text-[10px] uppercase font-mono tracking-wider block font-bold">Password (Min 8 characters)</label>
            <input type="password" id="authPassword" required minlength="4" placeholder="••••••••" class="w-full px-4 py-3.5 rounded-2xl bg-surface-950 border border-white/10 text-white text-xs outline-none focus:border-emerald-500 font-sans transition-all">
          </div>

          <!-- Confirm Password (Register Only) -->
          <div class="space-y-1 ${mode === 'login' ? 'hidden' : ''}" id="confirmPassGroup">
            <label class="text-slate-400 text-[10px] uppercase font-mono tracking-wider block font-bold">Confirm Password</label>
            <input type="password" id="authConfirmPassword" placeholder="••••••••" class="w-full px-4 py-3.5 rounded-2xl bg-surface-950 border border-white/10 text-white text-xs outline-none focus:border-emerald-500 font-sans transition-all">
          </div>

          <!-- Action Button with Micro-Animation -->
          <button type="submit" id="authSubmitBtn" class="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-gray-950 font-black uppercase font-mono tracking-wider shadow-xl shadow-emerald-500/25 transition-all text-xs cursor-pointer flex items-center justify-center gap-2 mt-2">
            <span>${mode === 'register' ? 'CREATE ACCOUNT' : 'SIGN IN'}</span>
            <span>→</span>
          </button>

        </form>

        <!-- Admin Shortcut -->
        <div class="text-center pt-2 border-t border-white/5">
          <a href="#admin-center" onclick="navigate('admin-center')" class="text-slate-500 hover:text-emerald-400 font-mono text-[10px] transition-colors">
            Switch to Admin Center Access 🔒
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
  const mobileGroup = document.getElementById('mobileFieldGroup');
  const confirmGroup = document.getElementById('confirmPassGroup');
  const submitBtn = document.getElementById('authSubmitBtn');

  if (mode === 'register') {
    regBtn.className = 'flex-1 py-2.5 rounded-xl font-mono text-xs font-bold transition-all bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/20';
    logBtn.className = 'flex-1 py-2.5 rounded-xl font-mono text-xs font-bold transition-all text-slate-400 hover:text-white';
    title.textContent = 'Create Customer Account';
    subtitle.textContent = 'Register your account to unlock instant vault access & orders.';
    mobileGroup.classList.remove('hidden');
    confirmGroup.classList.remove('hidden');
    submitBtn.innerHTML = '<span>CREATE ACCOUNT</span> <span>→</span>';
  } else {
    logBtn.className = 'flex-1 py-2.5 rounded-xl font-mono text-xs font-bold transition-all bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/20';
    regBtn.className = 'flex-1 py-2.5 rounded-xl font-mono text-xs font-bold transition-all text-slate-400 hover:text-white';
    title.textContent = 'Welcome Back';
    subtitle.textContent = 'Sign in to access your digital vault and credentials.';
    mobileGroup.classList.add('hidden');
    confirmGroup.classList.add('hidden');
    submitBtn.innerHTML = '<span>SIGN IN</span> <span>→</span>';
  }
}

async function handleCustomerAuthSubmit(e, returnView) {
  e.preventDefault();
  const mode = window.currentAuthMode || 'register';

  const username = document.getElementById('authUsername').value.trim();
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value.trim();
  const mobile = document.getElementById('authMobile') ? document.getElementById('authMobile').value.trim() : '';
  const confirm = document.getElementById('authConfirmPassword') ? document.getElementById('authConfirmPassword').value.trim() : '';

  if (mode === 'register' && confirm && password !== confirm) {
    showToast('Passwords do not match.', 'error');
    return;
  }

  try {
    const url = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
    const payload = mode === 'register' ? { username, email, password, mobile: mobile ? `+91 ${mobile}` : '' } : { username: email || username, password };

    const res = await fetchJSON(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.isAdmin) {
      state.adminToken = res.token;
      state.adminUsername = res.username;
      localStorage.setItem('nexus_admin_token', res.token);
      localStorage.setItem('nexus_admin_user', res.username);
      showToast('✓ Admin session authenticated');
      navigate('admin-center');
      return;
    }

    state.token = res.token;
    state.user = res.user;
    localStorage.setItem('nexus_token', res.token);
    localStorage.setItem('nexus_user', JSON.stringify(res.user));

    showToast(`✓ Welcome, ${res.user.username}!`);
    navigate(returnView || 'orders');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
