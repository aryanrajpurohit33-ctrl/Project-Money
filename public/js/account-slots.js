async function renderAdminAccountSlots(container) {
  container.innerHTML = `
    <div class="space-y-6 font-mono text-xs animate-pulse">
      <div class="h-10 bg-surface-900 rounded-2xl w-1/3"></div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="h-20 bg-surface-900 rounded-2xl"></div>
        <div class="h-20 bg-surface-900 rounded-2xl"></div>
        <div class="h-20 bg-surface-900 rounded-2xl"></div>
        <div class="h-20 bg-surface-900 rounded-2xl"></div>
      </div>
      <div class="h-64 bg-surface-900 rounded-3xl"></div>
    </div>
  `;

  try {
    const [slotData, prodData] = await Promise.all([
      fetchJSON('/api/admin/slots', { headers: { 'Authorization': `Bearer ${state.adminToken}` } }),
      fetchJSON('/api/admin/products', { headers: { 'Authorization': `Bearer ${state.adminToken}` } }).catch(() => [])
    ]);

    state.loadedSlots = slotData.slots || [];
    state.loadedProducts = Array.isArray(prodData) ? prodData : [];
    const stats = slotData.stats || { total: state.loadedSlots.length, available: 0, assigned: 0, full: 0, disabled: 0 };
    const slots = state.loadedSlots;

    container.innerHTML = `
      <div class="space-y-8 font-mono text-xs pb-12 w-full max-w-full overflow-hidden">
        
        <!-- Page Header & Add Button -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans">
          <div>
            <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight">Account Slots Management</h1>
            <p class="text-slate-400 text-xs mt-0.5">Manage and bind digital account credentials securely.</p>
          </div>
          <button onclick="openSlotFormModal('new')" class="w-full sm:w-auto px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-center">
            + Add New Slot
          </button>
        </div>

        <!-- Summary KPI Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="admin-card p-4 rounded-2xl space-y-1"><span class="text-slate-500 block text-[9px] uppercase font-bold">Total Slots</span><div class="text-xl font-black text-white font-mono">${stats.total}</div></div>
          <div class="admin-card p-4 rounded-2xl space-y-1"><span class="text-emerald-400 block text-[9px] uppercase font-bold">Available</span><div class="text-xl font-black text-emerald-400 font-mono">${stats.available}</div></div>
          <div class="admin-card p-4 rounded-2xl space-y-1"><span class="text-indigo-400 block text-[9px] uppercase font-bold">Assigned</span><div class="text-xl font-black text-indigo-400 font-mono">${stats.assigned}</div></div>
          <div class="admin-card p-4 rounded-2xl space-y-1"><span class="text-rose-400 block text-[9px] uppercase font-bold">Full / Disabled</span><div class="text-xl font-black text-rose-400 font-mono">${stats.full + stats.disabled}</div></div>
        </div>

        <!-- Search & Filter Toolbar -->
        <div class="admin-card rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div class="relative w-full sm:w-72">
            <input type="text" id="slotSearchInput" oninput="filterSlotCards()" placeholder="Search slot label or email..." class="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white placeholder-slate-500 outline-none focus:border-emerald-500 text-xs">
            <svg class="w-4 h-4 text-slate-500 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <select id="slotStatusFilter" onchange="filterSlotCards()" class="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs font-bold">
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="FULL">Full</option>
            <option value="DISABLED">Disabled</option>
          </select>
        </div>

        <!-- 📱 MOBILE RESPONSIVE CARDS VIEW -->
        <div class="space-y-3" id="slotMobileCardsContainer">
          ${slots.length === 0 ? `
            <div class="admin-card rounded-2xl p-8 text-center text-slate-500">No account slots found.</div>
          ` : slots.map(s => `
            <div class="admin-card rounded-2xl p-4 space-y-3 slot-item-card" data-search="${(s.account_label||'').toLowerCase()} ${(s.email||'').toLowerCase()}" data-status="${s.status}">
              <div class="flex justify-between items-start gap-2">
                <div class="min-w-0 flex-1">
                  <span class="text-white font-bold text-sm block truncate">${s.account_label}</span>
                  <span class="text-slate-400 text-xs break-all block mt-0.5">${s.email}</span>
                </div>
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                  s.status === 'AVAILABLE' ? 'bg-emerald-500/10 text-emerald-400' :
                  s.status === 'ASSIGNED' ? 'bg-indigo-500/10 text-indigo-400' :
                  s.status === 'FULL' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-500/10 text-slate-400'
                }">
                  ${s.status}
                </span>
              </div>

              <div class="pt-2 border-t border-admin-border flex justify-between items-center text-xs">
                <span class="text-slate-400 text-[10px]">Product: ${s.product_id?.name || 'Digital Service'}</span>
                <div class="flex items-center gap-1.5">
                  <button onclick="openSlotFormModal('${s._id}')" class="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl font-bold hover:bg-emerald-500/20 active:scale-95 transition-all">Edit</button>
                  <button onclick="deleteSlotRecord('${s._id}')" class="px-3 py-1.5 bg-rose-500/10 text-rose-400 rounded-xl font-bold hover:bg-rose-500/20 active:scale-95 transition-all">Delete</button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>

      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="admin-card p-8 text-center text-rose-400 text-xs font-mono">Error loading Account Slots: ${err.message}</div>`;
  }
}

function filterSlotCards() {
  const q = (document.getElementById('slotSearchInput')?.value || '').toLowerCase();
  const status = document.getElementById('slotStatusFilter')?.value || 'ALL';

  document.querySelectorAll('.slot-item-card').forEach(el => {
    const text = el.getAttribute('data-search') || '';
    const st = el.getAttribute('data-status') || '';
    const matchQ = text.includes(q);
    const matchSt = (status === 'ALL' || st === status);
    if (matchQ && matchSt) el.classList.remove('hidden');
    else el.classList.add('hidden');
  });
}

async function openSlotFormModal(slotId) {
  const isNew = slotId === 'new';
  const modal = document.getElementById('globalModal');
  const content = document.getElementById('globalModalContent');
  modal.classList.remove('hidden'); modal.classList.add('flex');

  let slotData = {
    account_label: 'Slot ' + Math.floor(Math.random() * 100),
    email: '', password: '', status: 'AVAILABLE', max_active_users: 1
  };

  if (!isNew) {
    slotData = state.loadedSlots.find(s => s._id === slotId) || slotData;
  }

  content.innerHTML = `
    <button onclick="closeAllDrawers()" class="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
    <div class="space-y-5 font-sans text-xs">
      <div>
        <h2 class="text-base font-black text-white font-sans">${isNew ? '+ Add New Account Slot' : `Edit Account Slot: ${slotData.account_label}`}</h2>
        <p class="text-slate-400 text-xs">Updating credentials synchronizes dynamically to active customer accounts.</p>
      </div>

      <form onsubmit="handleSlotFormSubmit(event, '${slotId}')" class="space-y-4 font-mono">
        ${isNew ? `
          <div>
            <label class="text-slate-400 block mb-1">Select Associated Product</label>
            <select id="slotFormProduct" required class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs">
              ${(state.loadedProducts || []).map(p => `<option value="${p._id}">${p.name}</option>`).join('')}
            </select>
          </div>
        ` : ''}

        <div>
          <label class="text-slate-400 block mb-1">Slot Label</label>
          <input type="text" id="slotFormLabel" required value="${slotData.account_label || ''}" placeholder="e.g. Slot 1 (Private)" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs">
        </div>

        <div>
          <label class="text-slate-400 block mb-1">Email / Username</label>
          <input type="email" id="slotFormEmail" required value="${slotData.email || ''}" placeholder="account@example.com" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs">
        </div>

        <div>
          <label class="text-slate-400 block mb-1">Password</label>
          <input type="text" id="slotFormPassword" value="${slotData.password || ''}" placeholder="Enter password" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-emerald-400 font-bold text-xs">
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-slate-400 block mb-1">Max Users</label>
            <input type="number" id="slotFormMaxUsers" min="1" max="100" value="${slotData.max_active_users || 1}" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs">
          </div>
          <div>
            <label class="text-slate-400 block mb-1">Status</label>
            <select id="slotFormStatus" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs">
              <option value="AVAILABLE" ${slotData.status === 'AVAILABLE' ? 'selected' : ''}>Available</option>
              <option value="DISABLED" ${slotData.status === 'DISABLED' ? 'selected' : ''}>Disabled</option>
            </select>
          </div>
        </div>

        <button type="submit" class="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black uppercase tracking-wider font-sans shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-xs">
          ${isNew ? 'Create Account Slot' : 'Save Slot Changes'}
        </button>
      </form>
    </div>
  `;
}

async function handleSlotFormSubmit(e, slotId) {
  e.preventDefault();
  const isNew = slotId === 'new';
  const payload = {
    account_label: document.getElementById('slotFormLabel').value.trim(),
    email: document.getElementById('slotFormEmail').value.trim(),
    password: document.getElementById('slotFormPassword').value.trim(),
    max_active_users: Number(document.getElementById('slotFormMaxUsers').value) || 1,
    status: document.getElementById('slotFormStatus').value
  };
  if (isNew) payload.product_id = document.getElementById('slotFormProduct').value;

  try {
    await fetchJSON(isNew ? '/api/admin/slots' : `/api/admin/slots/${slotId}`, {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.adminToken}` },
      body: JSON.stringify(payload)
    });
    showToast(isNew ? '✓ Account Slot created!' : '✓ Slot updated!');
    document.getElementById('globalModal').classList.add('hidden');
    renderAdminAccountSlots(document.getElementById('adminMainContent'));
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteSlotRecord(id) {
  if (!confirm('Permanently remove this account slot?')) return;
  try {
    await fetchJSON(`/api/admin/slots/${id}`, {
      method: 'DELETE', headers: { 'Authorization': `Bearer ${state.adminToken}` }
    });
    showToast('✓ Slot deleted successfully');
    renderAdminAccountSlots(document.getElementById('adminMainContent'));
  } catch (err) { showToast(err.message, 'error'); }
}
