function renderCustomerAuthPrompt(container, returnView) {
  renderCustomerLoginForm(container);
}

function renderCustomerLoginForm(container) {
  container.innerHTML = `
    <div class="glass max-w-md mx-auto rounded-3xl p-6 sm:p-8 space-y-6 font-sans">
      <div class="text-center space-y-1">
        <h2 class="text-xl font-black text-white">Customer Sign In</h2>
        <p class="text-xs text-slate-400">Access your digital vault and purchased credentials.</p>
      </div>

      <form onsubmit="handleCustomerLoginSubmit(event)" class="space-y-4 font-mono text-xs">
        <div>
          <label class="text-slate-400 block mb-1">Username or Email</label>
          <input type="text" id="custLogUser" required placeholder="Enter username or email" class="w-full px-4 py-3 rounded-xl bg-surface-950 border border-white/10 text-white outline-none focus:border-emerald-500">
        </div>

        <div>
          <label class="text-slate-400 block mb-1">Password</label>
          <input type="password" id="custLogPass" required placeholder="••••••••" class="w-full px-4 py-3 rounded-xl bg-surface-950 border border-white/10 text-white outline-none focus:border-emerald-500">
        </div>

        <button type="submit" class="w-full py-3.5 rounded-xl bg-emerald-500 text-gray-950 font-black uppercase tracking-wider shadow-lg font-sans text-xs">Sign In</button>
      </form>

      <div class="pt-4 border-t border-white/5 text-center text-xs font-sans text-slate-400">
        New to Nexus Digital? 
        <button onclick="renderCustomerRegisterForm(document.getElementById('storeContent') || document.getElementById('mainViewport'))" class="text-emerald-400 font-bold hover:underline ml-1">Create an account</button>
      </div>
    </div>
  `;
}

function renderCustomerRegisterForm(container) {
  container.innerHTML = `
    <div class="glass max-w-md mx-auto rounded-3xl p-6 sm:p-8 space-y-6 font-sans">
      <div class="text-center space-y-1">
        <h2 class="text-xl font-black text-white">Create Customer Account</h2>
        <p class="text-xs text-slate-400">Set a unique username and password to start shopping.</p>
      </div>

      <form onsubmit="handleCustomerRegisterSubmit(event)" class="space-y-4 font-mono text-xs">
        <div>
          <label class="text-slate-400 block mb-1">Unique Username</label>
          <input type="text" id="custRegUser" required oninput="checkUsernameAvailability(this.value)" placeholder="Choose a username (e.g. alex_99)" class="w-full px-4 py-3 rounded-xl bg-surface-950 border border-white/10 text-white outline-none focus:border-emerald-500">
          <span id="usernameCheckFeedback" class="text-[10px] mt-1 block"></span>
        </div>

        <div>
          <label class="text-slate-400 block mb-1">Email Address</label>
          <input type="email" id="custRegEmail" required placeholder="your@email.com" class="w-full px-4 py-3 rounded-xl bg-surface-950 border border-white/10 text-white outline-none focus:border-emerald-500">
        </div>

        <div>
          <label class="text-slate-400 block mb-1">Password (Min 8 characters)</label>
          <input type="password" id="custRegPass" required minlength="8" placeholder="••••••••" class="w-full px-4 py-3 rounded-xl bg-surface-950 border border-white/10 text-white outline-none focus:border-emerald-500">
        </div>

        <div>
          <label class="text-slate-400 block mb-1">Confirm Password</label>
          <input type="password" id="custRegConfirmPass" required minlength="8" placeholder="••••••••" class="w-full px-4 py-3 rounded-xl bg-surface-950 border border-white/10 text-white outline-none focus:border-emerald-500">
        </div>

        <button type="submit" class="w-full py-3.5 rounded-xl bg-emerald-500 text-gray-950 font-black uppercase tracking-wider shadow-lg font-sans text-xs">Create Account</button>
      </form>

      <div class="pt-4 border-t border-white/5 text-center text-xs font-sans text-slate-400">
        Already a customer? 
        <button onclick="renderCustomerLoginForm(document.getElementById('storeContent') || document.getElementById('mainViewport'))" class="text-emerald-400 font-bold hover:underline ml-1">Login here</button>
      </div>
    </div>
  `;
}

async function checkUsernameAvailability(username) {
  const feedback = document.getElementById('usernameCheckFeedback');
  if (!feedback || !username || username.length < 3) {
    if (feedback) feedback.textContent = '';
    return;
  }
  try {
    const res = await fetchJSON(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
    if (res.available) {
      feedback.className = 'text-[10px] mt-1 block text-emerald-400';
      feedback.textContent = '✓ Username is available';
    } else {
      feedback.className = 'text-[10px] mt-1 block text-rose-400';
      feedback.textContent = '✕ ' + (res.message || 'Username already taken');
    }
  } catch (e) {}
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

async function handleCustomerRegisterSubmit(e) {
  e.preventDefault();
  const pass = document.getElementById('custRegPass').value;
  const confirmPass = document.getElementById('custRegConfirmPass').value;

  if (pass !== confirmPass) {
    return showToast('Passwords do not match.', 'error');
  }

  try {
    const data = await fetchJSON('/api/auth/customer/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: document.getElementById('custRegUser').value.trim(),
        email: document.getElementById('custRegEmail').value.trim(),
        password: pass
      })
    });
    state.token = data.token; state.user = data.user;
    localStorage.setItem('nexus_token', data.token); localStorage.setItem('nexus_user', JSON.stringify(data.user));
    showToast('✓ Account created successfully!');
    navigate('home');
  } catch (err) { showToast(err.message, 'error'); }
}
