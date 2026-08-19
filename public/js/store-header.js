function renderStoreHeader(container) {
  container.innerHTML = `
    <header class="sticky top-0 z-30 glass border-b border-white/5 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-3 backdrop-blur-xl transition-all duration-300">
      <div class="flex items-center gap-3">
        <button onclick="toggleCustomerDrawer(true)" class="p-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 active:scale-95 transition-all">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <div class="flex items-center gap-2.5 cursor-pointer group" onclick="navigate('home')">
          <div class="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-gray-950 text-xs shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">N</div>
          <div class="hidden sm:block">
            <span class="font-black text-xs tracking-wider text-white block leading-none">NEXUS</span>
            <span class="text-[9px] font-bold text-emerald-400 tracking-widest uppercase block mt-0.5">VAULT</span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3 flex-1 max-w-md justify-end">
        <div class="relative w-full max-w-xs">
          <input type="text" oninput="handleStoreSearch(this.value)" placeholder="Search digital goods..." class="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-surface-900/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:bg-surface-900 outline-none transition-all shadow-inner">
          <svg class="w-4 h-4 text-slate-500 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>

        <button onclick="navigate('cart')" class="relative p-2.5 rounded-2xl bg-surface-900/80 border border-white/10 text-slate-200 hover:text-white hover:border-emerald-500/40 active:scale-95 transition-all shrink-0">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
          <span id="storeCartBadge" class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-gray-950 text-[10px] font-black flex items-center justify-center shadow-md animate-bounce">${(state.cart || []).length}</span>
        </button>
      </div>
    </header>
  `;
}
