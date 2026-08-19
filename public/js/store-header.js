function renderStoreHeader(container) {
  container.innerHTML = `
    <header class="sticky top-0 z-30 glass border-b border-white/5 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <button onclick="toggleCustomerDrawer(true)" class="lg:hidden p-2 rounded-xl bg-white/5 text-slate-300">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <div class="flex items-center gap-2 cursor-pointer" onclick="navigate('home')">
          <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-black text-gray-950 text-xs shadow-lg shadow-emerald-500/20">N</div>
          <span class="font-extrabold text-sm tracking-wider text-white hidden sm:inline">NEXUS DIGITAL</span>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div class="relative w-40 sm:w-72">
          <input type="text" oninput="handleStoreSearch(this.value)" placeholder="Search digital goods..." class="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none">
          <svg class="w-4 h-4 text-slate-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
        <button onclick="navigate('cart')" class="relative p-2.5 rounded-xl bg-surface-900 border border-white/5 text-slate-300 hover:text-white">
          🛒 <span id="storeCartBadge" class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-gray-950 text-[10px] font-black flex items-center justify-center">${(state.cart || []).length}</span>
        </button>
      </div>
    </header>
  `;
}
