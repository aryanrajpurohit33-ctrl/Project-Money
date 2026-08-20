async function renderAdminAccountSlots(container) {
  renderAdminSlots(container);
}

async function renderAdminSlots(container) {
  container.innerHTML = `
    <div class="space-y-6 font-mono text-xs animate-pulse max-w-full">
      <div class="h-10 bg-surface-900 rounded-2xl w-1/3"></div>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="h-24 bg-surface-900 rounded-3xl"></div>
        <div class="h-24 bg-surface-900 rounded-3xl"></div>
        <div class="h-24 bg-surface-900 rounded-3xl"></div>
        <div class="h-24 bg-surface-900 rounded-3xl"></div>
      </div>
      <div class="h-64 bg-surface-900 rounded-3xl"></div>
    </div>
  `;

  try {
    const data = await fetchJSON('/api/admin/slots', {
      headers: { 'Authorization': `Bearer ${state.adminToken}` }
    }).catch(() => ({ slots: [] }));

    const products = await fetchJSON('/api/products').catch(() => []);
    const slots = Array.isArray(data.slots) ? data.slots : (Array.isArray(data) ? data : []);

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

        <!-- Search & Filter Bar -->
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
            const prodName = s.product_id?.name || s.product_name || 'Master Account';

            return `
              <div class="admin-card rounded-3xl p-4 sm:p-5 border border-admin-border hover:border-emerald-500/30 transition-all shadow-xl space-y-3.5 slot-card-item" data-search="${(s.email + ' ' + prodName + ' ' + (s.account_label || '')).toLowerCase()}">
                
                <div class="flex items-center justify-between gap-3 border-b border-white/5 pb-3">
                  <div class="flex items-center gap-2.5">
                    <span class="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-mono font-bold text-xs">🔐</span>
                    <div>
                      <h3 class="text-white font-bold text-xs">${prodName}</h3>
                      <span class="text-slate-500 font-mono text-[10px]">${s.account_label || 'Slot Item'}</span>
                    </div>
                  </div>

                  <span class="px-2.5 py-0.5 rounded-full font-mono text-[9px] uppercase font-bold ${isAvail ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : isAssigned ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}">
                    ${s.status}
                  </span>
                </div>

                <!-- Credential Payload Grid -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-surface-950 p-3 rounded-2xl border border-white/5 font-mono text-[11px]">
                  <div>
                    <span class="text-slate-500 text-[9px] uppercase block">Login Email</span>
                    <span class="text-white font-bold truncate block select-all">${s.email}</span>
                  </div>
                  <div>
                    <span class="text-slate-500 text-[9px] uppercase block">Password</span>
                    <span class="text-emerald-400 font-bold truncate block select-all">${s.password || '••••••••'}</span>
                  </div>
                  <div>
                    <span class="text-slate-500 text-[9px] uppercase block">Profile / PIN</span>
                    <span class="text-amber-400 font-bold block select-all">P${s.profile_number || 1} • ${s.pin || 'None'}</span>
                  </div>
                  <div>
                    <span class="text-slate-500 text-[9px] uppercase block">Assigned To</span>
                    <span class="text-slate-300 truncate block">${s.assigned_to || 'None'}</span>
                  </div>
                </div>

                <!-- Actions Bar -->
                <div class="flex items-center justify-between pt-1">
                  <span class="text-[10px] text-slate-500 font-mono">Max Capacity: ${s.max_active_users || 1} Device(s)</span>
                  <button onclick="deleteAccountSlot('${s._id}')" class="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-mono text-[10px] font-bold transition-all cursor-pointer">
                    Delete Slot ✕
                  </button>
                </div>

              </div>
            `;
          }).join('')}
        </div>

      </div>
    `;

    window.availableProductList = products;
  } catch (err) {
    container.innerHTML = `<div class="admin-card p-8 text-center text-rose-400 text-xs font-mono rounded-3xl">Error loading slots: ${err.message}</div>`;
  }
}

function openCreateSlotModal() {
  const modal = document.getElementById('globalModal');
  const content = document.getElementById('globalModalContent');
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  const products = window.availableProductList || [];

  content.innerHTML = `
    <button onclick="document.getElementById('globalModal').classList.add('hidden')" class="absolute top-4 right-4 text-slate-400 hover:text-white p-2">✕</button>
    
    <div class="space-y-5 font-sans text-xs">
      <div class="border-b border-white/10 pb-3">
        <span class="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-mono text-[10px] font-bold uppercase">Vault Inventory</span>
        <h2 class="text-lg font-black text-white mt-1">Add Account Slot</h2>
      </div>

      <form onsubmit="handleCreateSlotSubmit(event)" class="space-y-3.5 font-mono">
        <div>
          <label class="text-slate-400 text-[10px] block mb-1">Target Product</label>
          <select id="slotProductSelect" required class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500">
            ${products.map(p => `<option value="${p._id}">${p.name}</option>`).join('')}
          </select>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-slate-400 text-[10px] block mb-1">Slot Label</label>
            <input type="text" id="slotLabel" value="Slot 1" placeholder="e.g. Slot 1" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500">
          </div>
          <div>
            <label class="text-slate-400 text-[10px] block mb-1">Profile # / Screen</label>
            <input type="number" id="slotProfileNum" value="1" min="1" max="10" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500">
          </div>
        </div>

        <div>
          <label class="text-slate-400 text-[10px] block mb-1">Account Master Email</label>
          <input type="email" id="slotEmail" required placeholder="netflix.slot1@gmail.com" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500">
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-slate-400 text-[10px] block mb-1">Password</label>
            <input type="text" id="slotPassword" required placeholder="Account Password" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500">
          </div>
          <div>
            <label class="text-slate-400 text-[10px] block mb-1">Profile PIN (Optional)</label>
            <input type="text" id="slotPin" placeholder="e.g. 5669" maxlength="6" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500">
          </div>
        </div>

        <div class="flex gap-2 pt-2">
          <button type="submit" class="flex-1 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black uppercase text-xs tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-500/20">
            Save Slot to Vault
          </button>
          <button type="button" onclick="document.getElementById('globalModal').classList.add('hidden')" class="px-4 py-3.5 rounded-xl bg-white/5 text-slate-300 font-bold">
            Cancel
          </button>
        </div>
      </form>
    </div>
  `;
}

async function handleCreateSlotSubmit(e) {
  e.preventDefault();
  const prodSelect = document.getElementById('slotProductSelect');
  const prodId = prodSelect.value;
  const prodName = prodSelect.options[prodSelect.selectedIndex].text;

  const payload = {
    product_id: prodId,
    product_name: prodName,
    account_label: document.getElementById('slotLabel').value.trim() || 'Slot 1',
    profile_number: Number(document.getElementById('slotProfileNum').value) || 1,
    email: document.getElementById('slotEmail').value.trim(),
    password: document.getElementById('slotPassword').value.trim(),
    pin: document.getElementById('slotPin').value.trim(),
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

    showToast('✓ Slot stocked successfully');
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
