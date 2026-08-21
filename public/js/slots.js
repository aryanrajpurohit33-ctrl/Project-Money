window.currentSlotAuthType = 'PASSWORD';
window.currentEditSlotAuthType = 'PASSWORD';

async function renderAdminAccountSlots(container) {
  renderAdminSlots(container);
}

async function renderAdminSlots(container) {
  const cached = window.apiCache?.get('/api/admin/slots')?.data;
  if (cached) {
    paintSlotsHTML(container, cached.slots || []);
  } else {
    container.innerHTML = getLoadingSpinnerHTML();
  }

  try {
    const [data, products] = await Promise.all([
      fetchJSON('/api/admin/slots', { headers: { 'Authorization': `Bearer ${state.adminToken}` } }),
      fetchJSON('/api/products').catch(() => [])
    ]);

    window.availableProductList = Array.isArray(products) ? products : (products.products || []);
    const slots = Array.isArray(data.slots) ? data.slots : (Array.isArray(data) ? data : []);
    window.currentLoadedSlots = slots;
    paintSlotsHTML(container, slots);
  } catch (err) {
    if (!cached) {
      container.innerHTML = `<div class="admin-card p-8 text-center text-rose-400 text-xs font-mono rounded-3xl">Error loading slots: ${err.message}</div>`;
    }
  }
}

function paintSlotsHTML(container, slots) {
  const totalSlots = slots.length;
  const availableSlots = slots.filter(s => s.status === 'AVAILABLE').length;
  const assignedSlots = slots.filter(s => s.status === 'ASSIGNED').length;
  const disabledSlots = slots.filter(s => s.status === 'DISABLED' || s.status === 'FULL').length;

  container.innerHTML = `
    <div class="space-y-6 font-sans text-xs pb-24 w-full max-w-full animate-fadeIn">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-mono text-[10px] font-bold uppercase tracking-wider">
              Vault Inventory
            </span>
            <span class="text-slate-500 font-mono text-[10px]">Automated Account Pool</span>
          </div>
          <h1 class="text-2xl font-black text-white tracking-tight mt-1">Account Slots & Inventory</h1>
        </div>

        <button onclick="openCreateSlotModal()" class="w-fit px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-mono text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95">
          <span>+ Add New Slot</span>
        </button>
      </div>

      <!-- Metric KPI Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
        <div class="admin-card p-4 rounded-2xl space-y-1 border border-admin-border">
          <span class="text-slate-400 text-[10px] uppercase font-bold">Total Inventory</span>
          <span class="text-xl font-black text-white block">${totalSlots}</span>
        </div>
        <div class="admin-card p-4 rounded-2xl space-y-1 border border-admin-border">
          <span class="text-slate-400 text-[10px] uppercase font-bold">Available Ready</span>
          <span class="text-xl font-black text-emerald-400 block">${availableSlots}</span>
        </div>
        <div class="admin-card p-4 rounded-2xl space-y-1 border border-admin-border">
          <span class="text-slate-400 text-[10px] uppercase font-bold">Assigned Active</span>
          <span class="text-xl font-black text-indigo-400 block">${assignedSlots}</span>
        </div>
        <div class="admin-card p-4 rounded-2xl space-y-1 border border-admin-border">
          <span class="text-slate-400 text-[10px] uppercase font-bold">Disabled / Full</span>
          <span class="text-xl font-black text-rose-400 block">${disabledSlots}</span>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="relative">
        <input type="text" oninput="filterSlotCards(this.value)" placeholder="Search slot by email, product, or profile..." class="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-surface-950 border border-admin-border text-white placeholder-slate-500 text-xs outline-none focus:border-emerald-500 font-mono shadow-inner">
        <svg class="w-4 h-4 text-slate-400 absolute left-4 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      </div>

      <!-- Slot Cards Feed -->
      <div class="space-y-3" id="slotCardsContainer">
        ${slots.length === 0 ? `
          <div class="admin-card rounded-3xl p-16 text-center space-y-3 border border-admin-border">
            <span class="text-3xl block">🔐</span>
            <p class="text-slate-400 font-mono">No inventory slots stocked yet.</p>
            <button onclick="openCreateSlotModal()" class="px-4 py-2 bg-emerald-500 text-gray-950 font-mono text-xs font-black rounded-xl cursor-pointer">
              Stock First Account Slot →
            </button>
          </div>
        ` : slots.map(s => {
          const isAvail = s.status === 'AVAILABLE';
          const isAssigned = s.status === 'ASSIGNED';
          const isOtp = s.auth_type === 'OTP' || s.password === 'LOGIN_VIA_OTP';
          const prodName = s.product_name || 'Master Account';

          return `
            <div class="admin-card rounded-3xl p-4 sm:p-5 border border-admin-border hover:border-emerald-500/30 transition-all shadow-xl space-y-3.5 slot-card-item" data-search="${(s.email + ' ' + prodName + ' ' + (s.account_label || '')).toLowerCase()}">
              
              <div class="flex items-center justify-between gap-3 border-b border-white/5 pb-3">
                <div class="flex items-center gap-2.5">
                  <span class="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-mono font-bold text-xs">🔐</span>
                  <div>
                    <h3 class="text-white font-bold text-xs">${prodName}</h3>
                    <span class="text-slate-500 font-mono text-[10px]">${s.account_label || 'Slot 1'}</span>
                  </div>
                </div>

                <div class="flex items-center gap-1.5">
                  <span class="px-2 py-0.5 rounded-md font-mono text-[9px] font-bold ${isOtp ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}">
                    ${isOtp ? '📲 OTP' : '🔑 PASS'}
                  </span>
                  <span class="px-2.5 py-0.5 rounded-full font-mono text-[9px] uppercase font-bold ${isAvail ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : isAssigned ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}">
                    ${s.status}
                  </span>
                </div>
              </div>

              <!-- Credential Grid -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-surface-950 p-3 rounded-2xl border border-white/5 font-mono text-[11px]">
                <div>
                  <span class="text-slate-500 text-[9px] uppercase block">${isOtp ? 'Login Account / Phone' : 'Login Email'}</span>
                  <span class="text-white font-bold truncate block select-all">${s.email}</span>
                </div>
                <div>
                  <span class="text-slate-500 text-[9px] uppercase block">Password</span>
                  <span class="${isOtp ? 'text-sky-400' : 'text-emerald-400'} font-bold truncate block select-all">${isOtp ? 'Login via OTP' : (s.password || '••••••••')}</span>
                </div>
                <div>
                  <span class="text-slate-500 text-[9px] uppercase block">Profile / PIN</span>
                  <span class="text-amber-400 font-bold block select-all">P${s.profile_number || 1} • ${s.pin || s.profile_pin || 'None'}</span>
                </div>
                <div>
                  <span class="text-slate-500 text-[9px] uppercase block">Assigned To</span>
                  <span class="text-slate-300 truncate block">${s.assigned_to || 'None'}</span>
                </div>
              </div>

              <!-- Action Bar with Edit & Delete -->
              <div class="flex items-center justify-between pt-1">
                <span class="text-[10px] text-slate-500 font-mono">Capacity: ${s.max_active_users || 1} Screen</span>
                
                <div class="flex items-center gap-2">
                  <button onclick="openEditSlotModal('${s._id}')" class="px-3 py-1.5 rounded-xl bg-surface-900 hover:bg-surface-800 border border-white/10 text-slate-200 font-mono text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1">
                    <span>✏️</span> <span>Edit Details</span>
                  </button>
                  <button onclick="deleteAccountSlot('${s._id}')" class="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-mono text-[10px] font-bold transition-all cursor-pointer">
                    Delete ✕
                  </button>
                </div>
              </div>

            </div>
          `;
        }).join('')}
      </div>

    </div>
  `;
}

function openCreateSlotModal() {
  window.currentSlotAuthType = 'PASSWORD';
  const modal = document.getElementById('globalModal');
  const content = document.getElementById('globalModalContent');
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  const products = window.availableProductList || [];

  content.innerHTML = `
    <button onclick="document.getElementById('globalModal').classList.add('hidden')" class="absolute top-4 right-4 text-slate-400 hover:text-white p-2 cursor-pointer">✕</button>
    
    <div class="space-y-4 font-sans text-xs">
      <div class="border-b border-white/10 pb-3">
        <span class="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-mono text-[10px] font-bold uppercase">Vault Inventory</span>
        <h2 class="text-xl font-black text-white mt-1">Add Account Slot</h2>
      </div>

      <form onsubmit="handleCreateSlotSubmit(event)" class="space-y-3.5 font-mono">
        
        <!-- Target Product -->
        <div>
          <label class="text-slate-400 text-[10px] block mb-1">Target Product</label>
          <select id="slotProductSelect" required class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500">
            ${products.map(p => `<option value="${p._id || p.name}">${p.name}</option>`).join('')}
          </select>
        </div>

        <!-- Auth Method Selector -->
        <div class="p-3 rounded-2xl bg-surface-950 border border-white/5 space-y-2">
          <label class="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">Authentication Method</label>
          <div class="grid grid-cols-2 gap-2">
            <button type="button" id="createAuthPassBtn" onclick="switchCreateSlotAuthMethod('PASSWORD')" class="py-2.5 px-3 rounded-xl bg-emerald-500/20 border border-emerald-500 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer">
              <span>🔑</span> <span>Password Login</span>
            </button>
            <button type="button" id="createAuthOtpBtn" onclick="switchCreateSlotAuthMethod('OTP')" class="py-2.5 px-3 rounded-xl bg-surface-900 border border-white/5 text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer">
              <span>📲</span> <span>Login via OTP</span>
            </button>
          </div>
          <input type="hidden" id="slotAuthType" value="PASSWORD">
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-slate-400 text-[10px] block mb-1">Slot Label</label>
            <input type="text" id="slotLabel" value="Slot 1" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500">
          </div>
          <div>
            <label class="text-slate-400 text-[10px] block mb-1">Profile # / Screen</label>
            <input type="number" id="slotProfileNum" value="1" min="1" max="10" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500">
          </div>
        </div>

        <div>
          <label class="text-slate-400 text-[10px] block mb-1" id="slotAccountIdentifierLabel">Account Master Email</label>
          <input type="text" id="slotEmail" required placeholder="netflix.slot1@gmail.com" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500 font-mono">
        </div>

        <div class="grid grid-cols-2 gap-3" id="createSlotCredsRow">
          <div id="createSlotPassCol">
            <label class="text-slate-400 text-[10px] block mb-1">Password</label>
            <input type="text" id="slotPassword" placeholder="Account Password" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-emerald-400 text-xs outline-none focus:border-emerald-500">
          </div>
          <div id="createSlotPinCol">
            <label class="text-slate-400 text-[10px] block mb-1">Profile PIN (Optional)</label>
            <input type="text" id="slotPin" placeholder="e.g. 5669" maxlength="6" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-amber-400 text-xs outline-none focus:border-emerald-500">
          </div>
        </div>

        <!-- Telegram Contact Input for OTP Option -->
        <div id="createSlotTelegramRow" class="hidden space-y-1">
          <label class="text-sky-400 text-[10px] block font-bold">Admin Telegram Handle (for user OTP dispatch button)</label>
          <input type="text" id="slotTelegram" placeholder="@AryanAdmin or https://t.me/aryan" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-sky-500/40 text-sky-300 text-xs outline-none focus:border-sky-400">
          <span class="text-[9px] text-slate-500 block">Customer will see a direct button on their order page linking to this Telegram to request login OTP.</span>
        </div>

        <div class="flex items-center gap-3 pt-2">
          <button type="submit" id="saveSlotBtn" class="flex-1 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black uppercase text-xs tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-500/20">
            Save Slot to Vault
          </button>
          <button type="button" onclick="document.getElementById('globalModal').classList.add('hidden')" class="px-5 py-3.5 rounded-2xl bg-surface-950 text-slate-400 hover:text-white text-xs cursor-pointer">
            Cancel
          </button>
        </div>
      </form>
    </div>
  `;
}

function switchCreateSlotAuthMethod(type) {
  window.currentSlotAuthType = type;
  document.getElementById('slotAuthType').value = type;

  const btnPass = document.getElementById('createAuthPassBtn');
  const btnOtp = document.getElementById('createAuthOtpBtn');
  const passCol = document.getElementById('createSlotPassCol');
  const tgRow = document.getElementById('createSlotTelegramRow');
  const idLabel = document.getElementById('slotAccountIdentifierLabel');
  const idInput = document.getElementById('slotEmail');

  if (type === 'OTP') {
    btnOtp.className = 'py-2.5 px-3 rounded-xl bg-sky-500/20 border border-sky-500 text-sky-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer';
    btnPass.className = 'py-2.5 px-3 rounded-xl bg-surface-900 border border-white/5 text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer';
    
    passCol.classList.add('hidden');
    tgRow.classList.remove('hidden');
    idLabel.textContent = 'Account Email / Registered Mobile Number';
    idInput.placeholder = 'e.g. 9876543210 or user@gmail.com';
    document.getElementById('slotPassword').value = '';
  } else {
    btnPass.className = 'py-2.5 px-3 rounded-xl bg-emerald-500/20 border border-emerald-500 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer';
    btnOtp.className = 'py-2.5 px-3 rounded-xl bg-surface-900 border border-white/5 text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer';
    
    passCol.classList.remove('hidden');
    tgRow.classList.add('hidden');
    idLabel.textContent = 'Account Master Email';
    idInput.placeholder = 'netflix.slot1@gmail.com';
  }
}

async function handleCreateSlotSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('saveSlotBtn');
  btn.disabled = true;
  btn.innerHTML = 'Saving...';

  const prodSelect = document.getElementById('slotProductSelect');
  const prodId = prodSelect.value;
  const prodName = prodSelect.options[prodSelect.selectedIndex].text;
  const authType = window.currentSlotAuthType || 'PASSWORD';

  const payload = {
    product_id: prodId,
    product_name: prodName,
    account_label: document.getElementById('slotLabel').value.trim() || 'Slot 1',
    profile_number: Number(document.getElementById('slotProfileNum').value) || 1,
    email: document.getElementById('slotEmail').value.trim(),
    password: authType === 'OTP' ? 'LOGIN_VIA_OTP' : (document.getElementById('slotPassword')?.value.trim() || ''),
    pin: document.getElementById('slotPin')?.value.trim() || '',
    profile_pin: document.getElementById('slotPin')?.value.trim() || '',
    auth_type: authType,
    telegram_contact: document.getElementById('slotTelegram')?.value.trim() || '',
    status: 'AVAILABLE'
  };

  try {
    await fetchJSON('/api/admin/slots', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.adminToken}`
      },
      body: JSON.stringify(payload)
    });

    window.apiCache?.clear();
    showToast('✓ Slot stocked successfully');
    document.getElementById('globalModal').classList.add('hidden');
    renderAdminSlots(document.getElementById('adminMainContent'));
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = 'Save Slot to Vault';
    showToast(err.message, 'error');
  }
}

function openEditSlotModal(slotId) {
  const slot = (window.currentLoadedSlots || []).find(s => s._id === slotId);
  if (!slot) return;

  window.currentEditSlotAuthType = slot.auth_type || (slot.password === 'LOGIN_VIA_OTP' ? 'OTP' : 'PASSWORD');

  const modal = document.getElementById('globalModal');
  const content = document.getElementById('globalModalContent');
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  content.innerHTML = `
    <button onclick="document.getElementById('globalModal').classList.add('hidden')" class="absolute top-4 right-4 text-slate-400 hover:text-white p-2 cursor-pointer">✕</button>
    
    <div class="space-y-4 font-sans text-xs">
      <div class="border-b border-white/10 pb-3">
        <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase">Live Sync</span>
        <h2 class="text-lg font-black text-white mt-1">Edit Slot: ${slot.product_name}</h2>
        <p class="text-[11px] text-slate-400 font-mono">Changes sync automatically to all assigned customer vaults.</p>
      </div>

      <form onsubmit="handleEditSlotSubmit(event, '${slot._id}')" class="space-y-3.5 font-mono">
        
        <!-- Auth Method Selector -->
        <div class="p-3 rounded-2xl bg-surface-950 border border-white/5 space-y-2">
          <label class="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">Authentication Method</label>
          <div class="grid grid-cols-2 gap-2">
            <button type="button" id="editAuthPassBtn" onclick="switchEditSlotAuthMethod('PASSWORD')" class="py-2.5 px-3 rounded-xl ${window.currentEditSlotAuthType === 'PASSWORD' ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400' : 'bg-surface-900 border border-white/5 text-slate-400'} font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer">
              <span>🔑</span> <span>Password Login</span>
            </button>
            <button type="button" id="editAuthOtpBtn" onclick="switchEditSlotAuthMethod('OTP')" class="py-2.5 px-3 rounded-xl ${window.currentEditSlotAuthType === 'OTP' ? 'bg-sky-500/20 border border-sky-500 text-sky-400' : 'bg-surface-900 border border-white/5 text-slate-400'} font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer">
              <span>📲</span> <span>Login via OTP</span>
            </button>
          </div>
          <input type="hidden" id="editSlotAuthType" value="${window.currentEditSlotAuthType}">
        </div>

        <div>
          <label class="text-slate-400 text-[10px] block mb-1" id="editSlotAccountIdentifierLabel">Login Email / Mobile</label>
          <input type="text" id="editSlotEmail" value="${slot.email || ''}" required class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500 font-mono">
        </div>

        <div id="editSlotPassRow" class="${window.currentEditSlotAuthType === 'OTP' ? 'hidden' : ''}">
          <label class="text-slate-400 text-[10px] block mb-1">Password</label>
          <input type="text" id="editSlotPassword" value="${slot.password === 'LOGIN_VIA_OTP' ? '' : (slot.password || '')}" placeholder="Account Password" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-emerald-400 text-xs outline-none focus:border-emerald-500">
        </div>

        <div id="editSlotTelegramRow" class="${window.currentEditSlotAuthType === 'OTP' ? '' : 'hidden'} space-y-1">
          <label class="text-sky-400 text-[10px] block font-bold">Admin Telegram Handle</label>
          <input type="text" id="editSlotTelegram" value="${slot.telegram_contact || ''}" placeholder="@AryanAdmin" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-sky-500/40 text-sky-300 text-xs outline-none focus:border-sky-400 font-mono">
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-slate-400 text-[10px] block mb-1">Profile # / Screen</label>
            <input type="number" id="editSlotProfileNum" value="${slot.profile_number || 1}" min="1" max="10" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500">
          </div>
          <div>
            <label class="text-slate-400 text-[10px] block mb-1">Profile PIN</label>
            <input type="text" id="editSlotPin" value="${slot.pin || slot.profile_pin || ''}" placeholder="None" maxlength="6" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500 font-mono">
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-slate-400 text-[10px] block mb-1">Slot Label</label>
            <input type="text" id="editSlotLabel" value="${slot.account_label || 'Slot 1'}" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500">
          </div>
          <div>
            <label class="text-slate-400 text-[10px] block mb-1">Status</label>
            <select id="editSlotStatus" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500">
              <option value="AVAILABLE" ${slot.status === 'AVAILABLE' ? 'selected' : ''}>AVAILABLE</option>
              <option value="ASSIGNED" ${slot.status === 'ASSIGNED' ? 'selected' : ''}>ASSIGNED</option>
              <option value="FULL" ${slot.status === 'FULL' ? 'selected' : ''}>FULL</option>
              <option value="DISABLED" ${slot.status === 'DISABLED' ? 'selected' : ''}>DISABLED</option>
            </select>
          </div>
        </div>

        <div class="flex gap-2 pt-2">
          <button type="submit" class="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black uppercase text-xs tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-500/20">
            Save & Sync to Customers
          </button>
          <button type="button" onclick="document.getElementById('globalModal').classList.add('hidden')" class="px-4 py-3 rounded-xl bg-white/5 text-slate-300 font-bold cursor-pointer">
            Cancel
          </button>
        </div>

      </form>
    </div>
  `;
}

function switchEditSlotAuthMethod(type) {
  window.currentEditSlotAuthType = type;
  document.getElementById('editSlotAuthType').value = type;

  const btnPass = document.getElementById('editAuthPassBtn');
  const btnOtp = document.getElementById('editAuthOtpBtn');
  const passRow = document.getElementById('editSlotPassRow');
  const tgRow = document.getElementById('editSlotTelegramRow');

  if (type === 'OTP') {
    btnOtp.className = 'py-2.5 px-3 rounded-xl bg-sky-500/20 border border-sky-500 text-sky-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer';
    btnPass.className = 'py-2.5 px-3 rounded-xl bg-surface-900 border border-white/5 text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer';
    passRow.classList.add('hidden');
    tgRow.classList.remove('hidden');
  } else {
    btnPass.className = 'py-2.5 px-3 rounded-xl bg-emerald-500/20 border border-emerald-500 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer';
    btnOtp.className = 'py-2.5 px-3 rounded-xl bg-surface-900 border border-white/5 text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer';
    passRow.classList.remove('hidden');
    tgRow.classList.add('hidden');
  }
}

async function handleEditSlotSubmit(e, slotId) {
  e.preventDefault();
  const authType = window.currentEditSlotAuthType || 'PASSWORD';

  const payload = {
    email: document.getElementById('editSlotEmail').value.trim(),
    password: authType === 'OTP' ? 'LOGIN_VIA_OTP' : document.getElementById('editSlotPassword').value.trim(),
    auth_type: authType,
    telegram_contact: document.getElementById('editSlotTelegram')?.value.trim() || '',
    profile_number: Number(document.getElementById('editSlotProfileNum').value) || 1,
    pin: document.getElementById('editSlotPin').value.trim(),
    profile_pin: document.getElementById('editSlotPin').value.trim(),
    account_label: document.getElementById('editSlotLabel').value.trim(),
    status: document.getElementById('editSlotStatus').value
  };

  try {
    await fetchJSON(`/api/admin/slots/${slotId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.adminToken}`
      },
      body: JSON.stringify(payload)
    });

    window.apiCache?.clear();
    showToast('✓ Slot updated & synced with customer vault');
    document.getElementById('globalModal').classList.add('hidden');
    renderAdminSlots(document.getElementById('adminMainContent'));
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteAccountSlot(id) {
  if (!confirm('Are you sure you want to delete this inventory slot?')) return;
  try {
    await fetchJSON(`/api/admin/slots/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.adminToken}` }
    });
    window.apiCache?.clear();
    showToast('✓ Slot deleted');
    renderAdminSlots(document.getElementById('adminMainContent'));
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function filterSlotCards(query) {
  const q = (query || '').toLowerCase().trim();
  document.querySelectorAll('.slot-card-item').forEach(card => {
    const text = card.getAttribute('data-search') || '';
    if (text.includes(q)) card.style.display = '';
    else card.style.display = 'none';
  });
}
