async function renderAdminSubscriptions(container) {
  const cached = window.apiCache?.get('/api/admin/subscriptions')?.data;
  if (cached && Array.isArray(cached)) {
    paintSubscriptionsHTML(container, cached);
  } else {
    container.innerHTML = getLoadingSpinnerHTML();
  }

  try {
    const [subs, slotsData] = await Promise.all([
      fetchJSON('/api/admin/subscriptions', { headers: { 'Authorization': `Bearer ${state.adminToken}` } }),
      fetchJSON('/api/admin/slots', { headers: { 'Authorization': `Bearer ${state.adminToken}` } }).catch(() => ({ slots: [] }))
    ]);

    const subList = Array.isArray(subs) ? subs : [];
    window.currentLoadedSubscriptions = subList;
    window.currentAvailableInventorySlots = Array.isArray(slotsData.slots) ? slotsData.slots : (Array.isArray(slotsData) ? slotsData : []);

    paintSubscriptionsHTML(container, subList);
  } catch (err) {
    if (!cached) {
      container.innerHTML = `<div class="admin-card p-8 text-center text-rose-400 text-xs font-mono rounded-3xl">Error loading subscriptions: ${err.message}</div>`;
    }
  }
}

function paintSubscriptionsHTML(container, subList) {
  const totalSubs = subList.length;
  const activeSubs = subList.filter(s => s.status === 'ACTIVE').length;
  const expiredSubs = subList.filter(s => s.status === 'EXPIRED' || s.status === 'REVOKED').length;

  container.innerHTML = `
    <div class="space-y-6 font-sans text-xs pb-24 w-full max-w-full animate-fadeIn">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider">
              Access Governance
            </span>
            <span class="text-slate-500 font-mono text-[10px]">Real-Time Customer Licences</span>
          </div>
          <h1 class="text-2xl font-black text-white tracking-tight mt-1">Subscriptions Suite</h1>
          <p class="text-slate-400 text-xs">Manage active customer subscriptions, renewals, and slot lifecycle.</p>
        </div>

        <button onclick="renderAdminSubscriptions(document.getElementById('adminMainContent'))" class="w-fit px-4 py-2 rounded-2xl bg-surface-900 hover:bg-surface-800 border border-white/5 text-slate-300 hover:text-white font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md">
          <span>↻</span> <span>Sync Live State</span>
        </button>
      </div>

      <!-- KPI Summary Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-3 gap-3 font-mono">
        <div class="admin-card p-4 rounded-2xl space-y-1 border border-admin-border">
          <span class="text-slate-400 text-[10px] uppercase font-bold">Total Subscriptions</span>
          <span class="text-2xl font-black text-white block">${totalSubs}</span>
        </div>
        <div class="admin-card p-4 rounded-2xl space-y-1 border border-admin-border">
          <span class="text-slate-400 text-[10px] uppercase font-bold">Active Access</span>
          <span class="text-2xl font-black text-emerald-400 block">${activeSubs}</span>
        </div>
        <div class="admin-card p-4 rounded-2xl space-y-1 border border-admin-border">
          <span class="text-slate-400 text-[10px] uppercase font-bold">Expired / Revoked</span>
          <span class="text-2xl font-black text-rose-400 block">${expiredSubs}</span>
        </div>
      </div>

      <!-- Search & Status Filters -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono">
        <div class="sm:col-span-2 relative">
          <input type="text" oninput="filterSubscriptionCards(this.value)" placeholder="Search customer or product..." class="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-surface-950 border border-admin-border text-white placeholder-slate-500 text-xs outline-none focus:border-emerald-500 shadow-inner">
          <svg class="w-4 h-4 text-slate-400 absolute left-4 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>

        <select onchange="filterSubscriptionStatus(this.value)" class="w-full px-4 py-3.5 rounded-2xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500 cursor-pointer">
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">ACTIVE Only</option>
          <option value="EXPIRED">EXPIRED Only</option>
          <option value="REVOKED">REVOKED Only</option>
        </select>
      </div>

      <!-- Subscription Feed List -->
      <div class="space-y-3" id="subsFeedList">
        ${subList.length === 0 ? `
          <div class="admin-card rounded-3xl p-16 text-center space-y-2 border border-admin-border">
            <span class="text-3xl block">👥</span>
            <p class="text-slate-400 font-mono">No active or expired subscriptions recorded.</p>
          </div>
        ` : subList.map(s => {
          const isActive = s.status === 'ACTIVE';
          const expDate = s.expires_at ? new Date(s.expires_at) : null;
          const expFormatted = expDate ? expDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No Expiry Set';
          
          let daysRemaining = '—';
          if (expDate) {
            const diffDays = Math.ceil((expDate - new Date()) / (1000 * 60 * 60 * 24));
            daysRemaining = diffDays > 0 ? `${diffDays} days left` : 'Expired';
          }

          const slot = s.assigned_slot_id || {};
          const slotLabel = slot.account_label || slot.email ? `${slot.account_label || 'Slot'} (${slot.email})` : 'Unassigned';

          return `
            <div class="admin-card rounded-3xl p-4 sm:p-5 border border-admin-border hover:border-emerald-500/30 transition-all shadow-xl space-y-3 sub-card-item" data-status="${s.status}" data-search="${(s.customer_name + ' ' + (s.customer_email || '') + ' ' + (s.product_name || '')).toLowerCase()}">
              
              <div class="flex items-center justify-between border-b border-white/5 pb-3">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-xl bg-surface-950 flex items-center justify-center text-sm font-mono border border-white/5">
                    ${isActive ? '⚡' : '🔒'}
                  </div>
                  <div>
                    <h3 class="text-white font-bold text-xs">${s.product_name || 'Digital Subscription'}</h3>
                    <span class="text-slate-500 font-mono text-[10px]">${s.customer_name} • ${s.customer_email || ''}</span>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <span class="px-2.5 py-0.5 rounded-full font-mono text-[9px] uppercase font-bold ${isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}">
                    ${s.status}
                  </span>
                </div>
              </div>

              <!-- Details Grid -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-surface-950 p-3 rounded-2xl border border-white/5 font-mono text-[11px]">
                <div>
                  <span class="text-slate-500 text-[9px] uppercase block">Assigned Slot</span>
                  <span class="text-slate-300 font-bold truncate block select-all">${slotLabel}</span>
                </div>
                <div>
                  <span class="text-slate-500 text-[9px] uppercase block">Profile & PIN</span>
                  <span class="text-amber-400 font-bold block select-all">P${s.credentials?.profile_number || slot.profile_number || 1} • ${s.credentials?.pin || slot.pin || 'None'}</span>
                </div>
                <div>
                  <span class="text-slate-500 text-[9px] uppercase block">Expiry Date</span>
                  <span class="text-white font-bold block">${expFormatted}</span>
                </div>
                <div>
                  <span class="text-slate-500 text-[9px] uppercase block">Validity Time</span>
                  <span class="${isActive ? 'text-emerald-400 font-bold' : 'text-slate-500'} block">${daysRemaining}</span>
                </div>
              </div>

              <!-- Action Bar: Edit & Revoke -->
              <div class="flex items-center justify-end gap-2 pt-1">
                <button onclick="openEditSubscriptionModal('${s._id}')" class="px-3.5 py-1.5 rounded-xl bg-surface-900 hover:bg-surface-800 border border-white/10 text-slate-200 font-mono text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5">
                  <span>✏️</span> <span>Edit / Extend</span>
                </button>

                ${isActive ? `
                  <button onclick="handleRevokeSubscriptionSlot('${s._id}')" class="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-mono text-[10px] font-bold transition-all cursor-pointer">
                    Revoke Slot 🔒
                  </button>
                ` : ''}
              </div>

            </div>
          `;
        }).join('')}
      </div>

    </div>
  `;
}

function openEditSubscriptionModal(subId) {
  const sub = (window.currentLoadedSubscriptions || []).find(s => s._id === subId);
  if (!sub) return;

  const modal = document.getElementById('globalModal');
  const content = document.getElementById('globalModalContent');
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  const allSlots = window.currentAvailableInventorySlots || [];
  const currentExpDate = sub.expires_at ? new Date(sub.expires_at).toISOString().split('T')[0] : '';

  content.innerHTML = `
    <button onclick="document.getElementById('globalModal').classList.add('hidden')" class="absolute top-4 right-4 text-slate-400 hover:text-white p-2">✕</button>
    
    <div class="space-y-4 font-sans text-xs">
      <div class="border-b border-white/10 pb-3">
        <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase">Licence Management</span>
        <h2 class="text-lg font-black text-white mt-1">Manage ${sub.customer_name}'s Subscription</h2>
        <span class="text-slate-400 font-mono text-[11px]">${sub.product_name}</span>
      </div>

      <form onsubmit="handleUpdateSubscriptionSubmit(event, '${sub._id}')" class="space-y-3 font-mono">
        
        <div>
          <label class="text-slate-400 text-[10px] block mb-1">Subscription Status</label>
          <select id="editSubStatus" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500">
            <option value="ACTIVE" ${sub.status === 'ACTIVE' ? 'selected' : ''}>ACTIVE (Full Customer Access)</option>
            <option value="EXPIRED" ${sub.status === 'EXPIRED' ? 'selected' : ''}>EXPIRED (Release Slot Back to Pool)</option>
            <option value="REVOKED" ${sub.status === 'REVOKED' ? 'selected' : ''}>REVOKED (Lock Access)</option>
          </select>
        </div>

        <div>
          <label class="text-slate-400 text-[10px] block mb-1">Assigned Account Slot</label>
          <select id="editSubSlotId" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500">
            <option value="">-- Keep Current Slot / No Change --</option>
            ${allSlots.map(slot => `
              <option value="${slot._id}" ${String(sub.assigned_slot_id?._id || sub.assigned_slot_id) === String(slot._id) ? 'selected' : ''}>
                ${slot.product_name} • ${slot.account_label || 'Slot'} (${slot.email}) [P${slot.profile_number || 1}]
              </option>
            `).join('')}
          </select>
        </div>

        <div>
          <label class="text-slate-400 text-[10px] block mb-1">Custom Expiry Date</label>
          <input type="date" id="editSubExpiry" value="${currentExpDate}" required class="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-admin-border text-white text-xs outline-none focus:border-emerald-500">
        </div>

        <!-- Quick Duration Extend Chips -->
        <div class="space-y-1">
          <label class="text-slate-500 text-[9px] uppercase block">Quick Extend Validity</label>
          <div class="flex gap-2">
            <button type="button" onclick="extendExpiryDays(30)" class="flex-1 py-1.5 rounded-lg bg-surface-950 border border-white/10 hover:border-emerald-500 text-slate-300 text-[10px]">+30 Days</button>
            <button type="button" onclick="extendExpiryDays(90)" class="flex-1 py-1.5 rounded-lg bg-surface-950 border border-white/10 hover:border-emerald-500 text-slate-300 text-[10px]">+3 Months</button>
            <button type="button" onclick="extendExpiryDays(365)" class="flex-1 py-1.5 rounded-lg bg-surface-950 border border-white/10 hover:border-emerald-500 text-slate-300 text-[10px]">+1 Year</button>
          </div>
        </div>

        <div class="flex gap-2 pt-2">
          <button type="submit" class="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black uppercase text-xs tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-500/20">
            Save Changes
          </button>
          <button type="button" onclick="document.getElementById('globalModal').classList.add('hidden')" class="px-4 py-3 rounded-xl bg-white/5 text-slate-300 font-bold">
            Cancel
          </button>
        </div>

      </form>
    </div>
  `;
}

function extendExpiryDays(days) {
  const expInput = document.getElementById('editSubExpiry');
  if (!expInput) return;
  const curr = expInput.value ? new Date(expInput.value) : new Date();
  curr.setDate(curr.getDate() + days);
  expInput.value = curr.toISOString().split('T')[0];
}

async function handleUpdateSubscriptionSubmit(e, subId) {
  e.preventDefault();

  const payload = {
    status: document.getElementById('editSubStatus').value,
    slot_id: document.getElementById('editSubSlotId').value || undefined,
    expires_at: document.getElementById('editSubExpiry').value
  };

  try {
    await fetchJSON(`/api/admin/subscriptions/${subId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.adminToken}`
      },
      body: JSON.stringify(payload)
    });

    showToast('✓ Subscription updated successfully');
    document.getElementById('globalModal').classList.add('hidden');
    renderAdminSubscriptions(document.getElementById('adminMainContent'));
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleRevokeSubscriptionSlot(subId) {
  if (!confirm('Revoking will immediately release the account slot back to available inventory and lock the customer access. Continue?')) return;

  try {
    await fetchJSON(`/api/admin/subscriptions/${subId}/revoke`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${state.adminToken}` }
    });

    showToast('✓ Slot revoked and returned to available inventory');
    renderAdminSubscriptions(document.getElementById('adminMainContent'));
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function filterSubscriptionCards(query) {
  const q = (query || '').toLowerCase().trim();
  document.querySelectorAll('.sub-card-item').forEach(card => {
    const text = card.getAttribute('data-search') || '';
    if (text.includes(q)) card.style.display = '';
    else card.style.display = 'none';
  });
}

function filterSubscriptionStatus(status) {
  document.querySelectorAll('.sub-card-item').forEach(card => {
    const cardStatus = card.getAttribute('data-status') || '';
    if (status === 'ALL' || cardStatus === status) card.style.display = '';
    else card.style.display = 'none';
  });
}
