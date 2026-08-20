async function renderStoreOrders(container) {
  if (!state.user || !state.token || state.user.isAdmin) {
    container.innerHTML = `
      <div class="max-w-sm mx-auto py-12 px-4 text-center space-y-4 font-sans animate-fadeIn text-xs">
        <div class="w-16 h-16 rounded-3xl bg-surface-900 mx-auto flex items-center justify-center text-2xl border border-white/5 shadow-xl">
          🔒
        </div>
        <div class="space-y-1">
          <h2 class="text-base font-black text-white">Digital Vault Locked</h2>
          <p class="text-slate-400 text-xs font-sans">Please login to your account to view your purchased credentials and order status.</p>
        </div>
        <button onclick="navigate('login', { returnView: 'orders' })" class="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black font-mono text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer">
          Login to Access Vault →
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = getLoadingSpinnerHTML();

  try {
    const userEmail = state.user.email || state.user.username || '';
    const endpoint = `/api/orders?email=${encodeURIComponent(userEmail)}`;
    const orders = await fetchJSON(endpoint);
    const orderList = Array.isArray(orders) ? orders : [];

    container.innerHTML = `
      <div class="space-y-6 max-w-xl mx-auto font-sans text-xs pb-24 animate-fadeIn px-1">
        
        <!-- Header -->
        <div class="space-y-1">
          <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase">
            ⚡ Digital Locker
          </span>
          <h1 class="text-2xl font-black text-white tracking-tight">Purchased Items Vault</h1>
          <p class="text-slate-400 text-xs font-mono">Your unlocked account credentials, subscriptions & order receipts.</p>
        </div>

        <!-- Orders Feed -->
        <div class="space-y-4">
          ${orderList.length === 0 ? `
            <div class="bg-surface-900/60 rounded-3xl p-12 text-center space-y-3 border border-white/5 shadow-xl">
              <span class="text-3xl block">📦</span>
              <p class="text-slate-400 font-mono text-xs">No orders recorded for ${state.user.username} yet.</p>
              <button onclick="navigate('home')" class="px-5 py-2.5 rounded-xl bg-emerald-500 text-gray-950 font-black font-mono text-xs uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer">
                Browse Store →
              </button>
            </div>
          ` : orderList.map(order => {
            const txnId = order.txn_id || order.order_number || order._id || 'TXN-000000';
            const prodName = order.product_name || (order.items && order.items[0]?.name) || 'Digital Goods & Subscription';
            const amt = order.amount ?? order.total_amount ?? 499;
            const status = (order.status || order.payment_status || 'PROCESSING').toUpperCase();
            const dateStr = new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

            const isSuccess = status === 'SUCCESS' || status === 'DELIVERED' || status === 'PAID';
            const isRejected = status === 'REJECTED';

            return `
              <div class="bg-surface-900/70 rounded-3xl p-5 space-y-4 border border-white/5 shadow-2xl backdrop-blur-xl transition-all">
                
                <!-- Card Header -->
                <div class="flex items-center justify-between border-b border-white/5 pb-3">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full ${isSuccess ? 'bg-emerald-400 shadow-md shadow-emerald-500/50' : isRejected ? 'bg-rose-500 shadow-md shadow-rose-500/50' : 'bg-amber-400 animate-pulse'}"></span>
                    <span class="text-white font-mono font-black text-xs">${txnId}</span>
                  </div>
                  
                  <span class="px-2.5 py-0.5 rounded-full uppercase text-[9px] font-mono font-bold ${isSuccess ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : isRejected ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}">
                    ${status}
                  </span>
                </div>

                <!-- Product Details -->
                <div class="space-y-1">
                  <span class="text-[9px] font-mono uppercase text-slate-500 block">Product</span>
                  <h3 class="text-sm font-bold text-white">${prodName}</h3>
                </div>

                <!-- Financials & Date -->
                <div class="flex items-center justify-between bg-surface-950 p-3 rounded-2xl border border-white/5 font-mono">
                  <div>
                    <span class="text-[9px] text-slate-500 uppercase block">Amount Paid</span>
                    <span class="text-emerald-400 font-black text-sm">₹${amt}</span>
                  </div>
                  <div class="text-right">
                    <span class="text-[9px] text-slate-500 uppercase block">Order Date</span>
                    <span class="text-slate-300 text-xs">${dateStr}</span>
                  </div>
                </div>

                <!-- Dynamic Status Outcome -->
                ${isSuccess ? `
                  <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2.5">
                    <div class="flex items-center justify-between">
                      <span class="text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                        <span>🔓</span> <span>Credentials Unlocked</span>
                      </span>
                      <span class="text-[9px] font-mono text-emerald-400/80 uppercase">Verified</span>
                    </div>

                    <div class="bg-surface-950 p-3 rounded-xl border border-emerald-500/20 font-mono space-y-1 text-[11px]">
                      <div class="flex justify-between"><span class="text-slate-400">Account:</span> <span class="text-white font-bold select-all">${order.credentials?.email || order.customer_email || state.user.email}</span></div>
                      <div class="flex justify-between"><span class="text-slate-400">Password:</span> <span class="text-emerald-400 font-bold select-all">${order.credentials?.password || 'NexusPrime#2026'}</span></div>
                      ${order.credentials?.profile_pin ? `<div class="flex justify-between"><span class="text-slate-400">Profile PIN:</span> <span class="text-amber-400 font-bold select-all">${order.credentials.profile_pin}</span></div>` : ''}
                    </div>
                  </div>
                ` : isRejected ? `
                  <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="text-rose-400 font-bold text-xs flex items-center gap-1.5">
                        <span>✕</span> <span>Verification Rejected</span>
                      </span>
                      <span class="text-[9px] font-mono text-rose-400/90 uppercase font-bold">Declined</span>
                    </div>
                    
                    <div class="bg-surface-950 p-3 rounded-xl border border-rose-500/20 font-mono text-[11px] space-y-1 text-rose-300">
                      <span class="text-[9px] text-slate-500 uppercase block font-bold">Reason Note from Admin</span>
                      <p class="text-white font-semibold">${order.rejection_reason || 'Payment screenshot could not be confirmed with merchant bank records.'}</p>
                    </div>

                    <p class="text-[10px] text-slate-400 font-mono">If this was a mistake, please re-order with a clear UTR payment receipt.</p>
                  </div>
                ` : `
                  <div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center justify-between">
                    <div class="space-y-0.5">
                      <span class="font-bold block text-xs">⏳ Verification in Progress</span>
                      <span class="text-[10px] text-amber-400/80 font-mono">Credentials unlock once admin confirms UPI screenshot</span>
                    </div>
                  </div>
                `}

              </div>
            `;
          }).join('')}
        </div>

      </div>
    `;
  } catch (err) {
    container.innerHTML = `
      <div class="bg-surface-900/60 p-8 text-center text-rose-400 font-mono text-xs rounded-3xl">
        Error loading purchases: ${err.message}
      </div>
    `;
  }
}
