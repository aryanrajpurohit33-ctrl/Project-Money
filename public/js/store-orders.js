async function renderStoreOrders(container) {
  if (!state.user || !state.token) {
    renderCustomerAuthPrompt(container, 'orders', 'login');
    return;
  }

  container.innerHTML = getLoadingSpinnerHTML();

  try {
    const orders = await fetchJSON(`/api/orders?email=${encodeURIComponent(state.user.email)}`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    }, false);

    paintCustomerOrdersHTML(container, orders || []);
  } catch (err) {
    container.innerHTML = `
      <div class="space-y-4 max-w-xl mx-auto font-sans text-xs pb-24 animate-fadeIn px-1">
        <div class="p-8 text-center bg-surface-900/80 rounded-3xl border border-white/5 space-y-2">
          <span class="text-2xl block">📦</span>
          <p class="text-rose-400 font-mono">Error loading purchased items: ${err.message}</p>
          <button onclick="renderStoreOrders(document.getElementById('storeContent'))" class="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white font-mono text-xs cursor-pointer">
            Retry ↻
          </button>
        </div>
      </div>
    `;
  }
}

function paintCustomerOrdersHTML(container, orders) {
  container.innerHTML = `
    <div class="space-y-6 max-w-xl mx-auto font-sans text-xs pb-24 animate-fadeIn px-1">
      
      <!-- Back Navigation & Title -->
      <div class="flex items-center justify-between">
        <button onclick="navigate('home')" class="flex items-center gap-1.5 text-slate-400 hover:text-white font-mono text-xs transition-colors py-1 cursor-pointer">
          <span class="text-sm">←</span> <span>Storefront</span>
        </button>
        
        <span class="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold">
          📦 DIGITAL VAULT
        </span>
      </div>

      <div class="space-y-1">
        <h1 class="text-2xl font-black text-white tracking-tight">Your Purchased Items</h1>
        <p class="text-slate-400 text-xs font-mono">Real-time credentials and active subscription licenses</p>
      </div>

      <!-- Orders Feed -->
      <div class="space-y-4">
        ${orders.length === 0 ? `
          <div class="bg-surface-900/80 rounded-3xl p-12 text-center space-y-3 border border-white/5 shadow-xl">
            <span class="text-3xl block">📦</span>
            <div class="space-y-1">
              <strong class="text-white text-sm block">No Orders Found</strong>
              <p class="text-slate-400 text-xs font-mono">You haven't unlocked any digital subscription goods yet.</p>
            </div>
            <button onclick="navigate('home')" class="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black uppercase text-xs tracking-wider transition-all cursor-pointer font-mono shadow-lg shadow-emerald-500/20">
              Browse Vault Store →
            </button>
          </div>
        ` : orders.map(order => {
          const status = (order.status || 'PROCESSING').toUpperCase();
          const isPending = status === 'PROCESSING' || status === 'PENDING';
          const isRejected = status === 'REJECTED';
          const isSuccess = status === 'SUCCESS' || status === 'PAID' || status === 'DELIVERED';
          const dateStr = new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

          const creds = order.credentials;
          const isExpiredOrRevoked = !creds || order.sub_status === 'EXPIRED' || order.sub_status === 'REVOKED';

          return `
            <div class="bg-surface-900/80 rounded-3xl p-4 sm:p-5 border border-white/5 shadow-2xl space-y-3.5 relative overflow-hidden backdrop-blur-xl">
              
              <!-- Status Header Badge -->
              <div class="flex items-center justify-between border-b border-white/5 pb-3">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full ${isSuccess ? (isExpiredOrRevoked ? 'bg-amber-400' : 'bg-emerald-400') : isRejected ? 'bg-rose-500' : 'bg-amber-400 animate-pulse'}"></span>
                  <strong class="text-white font-mono text-xs">${order.txn_id}</strong>
                </div>

                <span class="px-2.5 py-0.5 rounded-full font-mono text-[9px] uppercase font-bold ${isSuccess ? (isExpiredOrRevoked ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20') : isRejected ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}">
                  ${isSuccess && isExpiredOrRevoked ? 'PLAN EXPIRED' : status}
                </span>
              </div>

              <!-- Rejection Notice Banner -->
              ${isRejected ? `
                <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-2 text-rose-200">
                  <div class="flex items-center justify-between text-rose-400 font-mono text-[10px] font-bold uppercase">
                    <span class="flex items-center gap-1.5">✕ Verification Rejected</span>
                    <span>DECLINED</span>
                  </div>
                  <div class="p-3 bg-surface-950/80 rounded-xl border border-rose-500/30">
                    <span class="text-slate-400 font-mono text-[9px] uppercase block mb-1">Reason Note From Admin</span>
                    <strong class="text-white font-mono text-xs block">${order.rejection_reason || 'Incomplete or unverified payment proof'}</strong>
                  </div>
                  <p class="text-[10px] text-slate-400 font-sans">If this was an error, please re-order with a valid screenshot displaying the UTR reference number.</p>
                </div>
              ` : ''}

              <!-- Product Info -->
              <div class="space-y-1">
                <span class="text-slate-500 text-[10px] font-mono uppercase tracking-wider block font-bold">Product</span>
                <h2 class="text-sm sm:text-base font-black text-white leading-tight">${order.product_name || 'Digital Subscription'}</h2>
              </div>

              <!-- Price & Date Meta -->
              <div class="grid grid-cols-2 gap-2 bg-surface-950 p-3 rounded-2xl border border-white/5 font-mono text-[11px]">
                <div>
                  <span class="text-slate-500 text-[9px] uppercase block">Amount Paid</span>
                  <span class="text-emerald-400 font-black text-sm">₹${order.amount}</span>
                </div>
                <div class="text-right">
                  <span class="text-slate-500 text-[9px] uppercase block">Order Date</span>
                  <span class="text-slate-300 font-bold">${dateStr}</span>
                </div>
              </div>

              <!-- Conditional Credentials or Renewal Action -->
              ${isSuccess ? (
                isExpiredOrRevoked ? `
                  <!-- Expired / Revoked Slot State: Hide Details & Show Renewal -->
                  <div class="p-4 rounded-2xl bg-surface-950 border border-amber-500/25 space-y-3 font-mono">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2 text-amber-400 font-bold text-xs">
                        <span>🔒</span> <span>Access Plan Expired</span>
                      </div>
                      <span class="text-[9px] text-slate-500 uppercase">Slot Released</span>
                    </div>

                    <p class="text-[11px] text-slate-400 font-sans leading-relaxed">
                      Your subscription duration has ended and this account slot was released back to the inventory pool. Re-order now to instantly activate a fresh slot.
                    </p>

                    <button onclick="redirectToRenewProduct('${(order.product_name || '').replace(/'/g, "\\'")}')" class="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:opacity-95 text-gray-950 font-black uppercase text-xs tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center gap-2 font-mono">
                      <span>⚡ RENEWAL PLAN / RE-ORDER</span>
                    </button>
                  </div>
                ` : `
                  <!-- Active Unlocked Credentials Box -->
                  <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2.5 font-mono text-xs">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2 text-emerald-400 font-bold">
                        <span>🔓</span> <span>Credentials Unlocked</span>
                      </div>
                      <span class="text-[9px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full uppercase">Verified</span>
                    </div>

                    <div class="p-3 bg-surface-950/90 rounded-xl border border-emerald-500/20 space-y-1.5 text-[11px]">
                      <div class="flex items-center justify-between">
                        <span class="text-slate-400">Account:</span>
                        <strong class="text-white select-all">${creds.email}</strong>
                      </div>
                      <div class="flex items-center justify-between">
                        <span class="text-slate-400">Password:</span>
                        <strong class="text-emerald-400 select-all">${creds.password}</strong>
                      </div>
                      ${creds.profile_pin || creds.profile_number ? `
                        <div class="flex items-center justify-between border-t border-white/5 pt-1 mt-1">
                          <span class="text-slate-400">Profile / PIN:</span>
                          <strong class="text-amber-400 select-all">Profile ${creds.profile_number || 1} ${creds.profile_pin ? `• PIN: ${creds.profile_pin}` : ''}</strong>
                        </div>
                      ` : ''}
                    </div>
                  </div>
                `
              ) : isPending ? `
                <div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-amber-300 font-mono text-[11px]">
                  <span class="animate-spin">⏳</span>
                  <span>Payment verification in progress. Credentials unlock here once approved.</span>
                </div>
              ` : ''}

            </div>
          `;
        }).join('')}
      </div>

    </div>
  `;
}

// Redirects user straight to the corresponding product page for seamless renewal
function redirectToRenewProduct(productName) {
  const cached = state.cachedProducts || window.apiCache?.get('/api/products')?.data || [];
  const cleanName = (productName || '').toLowerCase().split('(')[0].trim();

  // Find product by keyword match
  const matched = cached.find(p => {
    const pName = (p.name || '').toLowerCase();
    return pName.includes(cleanName) || cleanName.includes(pName);
  });

  if (matched && matched._id) {
    navigate('product-details', { id: matched._id });
  } else {
    navigate('home');
  }
}
