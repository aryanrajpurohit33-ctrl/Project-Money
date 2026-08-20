function renderCustomerAuthPrompt(container, returnView = 'account', mode = 'register') {
  container.innerHTML = `
    <div class="max-w-sm mx-auto py-2 sm:py-6 px-1 space-y-3 font-sans animate-fadeIn text-xs">
      
      <!-- Compact Glass Container -->
      <div class="relative rounded-3xl p-4 sm:p-5 bg-surface-900/80 border border-white/5 shadow-2xl backdrop-blur-2xl space-y-4">
        
        <!-- Header & Toggle Pill in Single Row / Clean Flow -->
        <div class="flex items-center justify-between gap-2">
          <div>
            <h2 class="text-base font-black text-white tracking-tight leading-none" id="authTitle">
              ${mode === 'register' ? 'Create Account' : 'Sign In'}
            </h2>
            <span class="text-[10px] text-slate-400 font-mono block mt-0.5" id="authSubtitle">
              ${mode === 'register' ? 'Instant delivery & vault access' : 'Enter credentials to open vault'}
            </span>
          </div>

          <!-- Mode Toggle Switch -->
          <div class="flex p-0.5 bg-surface-950 rounded-xl border border-white/5 shrink-0">
            <button type="button" onclick="switchAuthTab('register')" id="tabRegisterBtn" class="px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold transition-all ${mode === 'register' ? 'bg-emerald-500 text-gray-950' : 'text-slate-400'}">
              Register
            </button>
            <button type="button" onclick="switchAuthTab('login')" id="tabLoginBtn" class="px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold transition-all ${mode === 'login' ? 'bg-emerald-500 text-gray-950' : 'text-slate-400'}">
              Sign In
            </button>
          </div>
        </div>

        <!-- Compact Form -->
        <form onsubmit="handleCustomerAuthSubmit(event, '${returnView}')" class="space-y-2.5" id="authMainForm">
          
          <!-- Username -->
          <div class="relative">
            <input type="text" id="authUsername" required placeholder="Username (e.g. alex_99)" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-white/10 text-white text-xs outline-none focus:border-emerald-500 font-sans transition-all placeholder:text-slate-600">
          </div>

          <!-- Email -->
          <div class="relative">
            <input type="email" id="authEmail" required placeholder="Email (your@email.com)" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-white/10 text-white text-xs outline-none focus:border-emerald-500 font-sans transition-all placeholder:text-slate-600">
          </div>

          <!-- Mobile Phone (Active in Register Mode) -->
          <div class="relative flex items-center ${mode === 'login' ? 'hidden' : ''}" id="mobileFieldGroup">
            <span class="absolute left-3 text-slate-500 font-mono text-[11px]">+91</span>
            <input type="tel" id="authMobile" placeholder="WhatsApp / Mobile Number" maxlength="10" class="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-surface-950 border border-white/10 text-white text-xs outline-none focus:border-emerald-500 font-mono tracking-wider transition-all placeholder:text-slate-600">
          </div>

          <!-- Password & Confirm Password in 2 Columns on Mobile -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2" id="passwordFieldsGrid">
            <input type="password" id="authPassword" required minlength="4" placeholder="Password" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-white/10 text-white text-xs outline-none focus:border-emerald-500 font-sans transition-all placeholder:text-slate-600">
            <input type="password" id="authConfirmPassword" placeholder="Confirm Password" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-white/10 text-white text-xs outline-none focus:border-emerald-500 font-sans transition-all placeholder:text-slate-600 ${mode === 'login' ? 'hidden' : ''}">
          </div>

          <!-- Compact Action Button -->
          <button type="submit" id="authSubmitBtn" class="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-gray-950 font-black uppercase font-mono tracking-wider shadow-lg shadow-emerald-500/20 transition-all text-xs cursor-pointer flex items-center justify-center gap-1.5 mt-1">
            <span>${mode === 'register' ? 'CREATE ACCOUNT' : 'SIGN IN'}</span>
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
  const mobileGroup = document.getElementById('mobileFieldGroup');
  const confirmInput = document.getElementById('authConfirmPassword');
  const passGrid = document.getElementById('passwordFieldsGrid');
  const submitBtn = document.getElementById('authSubmitBtn');

  if (mode === 'register') {
    regBtn.className = 'px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold transition-all bg-emerald-500 text-gray-950';
    logBtn.className = 'px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold transition-all text-slate-400';
    title.textContent = 'Create Account';
    subtitle.textContent = 'Instant delivery & vault access';
    mobileGroup.classList.remove('hidden');
    confirmInput.classList.remove('hidden');
    passGrid.className = 'grid grid-cols-1 sm:grid-cols-2 gap-2';
    submitBtn.innerHTML = '<span>CREATE ACCOUNT</span> <span>→</span>';
  } else {
    logBtn.className = 'px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold transition-all bg-emerald-500 text-gray-950';
    regBtn.className = 'px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold transition-all text-slate-400';
    title.textContent = 'Sign In';
    subtitle.textContent = 'Enter credentials to open vault';
    mobileGroup.classList.add('hidden');
    confirmInput.classList.add('hidden');
    passGrid.className = 'grid grid-cols-1 gap-2';
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
