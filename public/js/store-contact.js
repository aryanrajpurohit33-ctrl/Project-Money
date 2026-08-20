function renderCustomerDrawerFooter() {
  const footer = document.getElementById('customerSidebarFooter');
  if (!footer) return;

  footer.innerHTML = `
    <div class="space-y-3 font-sans">
      <!-- Minimalist Contact Section -->
      <div class="space-y-1.5 px-1">
        <span class="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold block">
          Contact Us
        </span>

        <a href="https://t.me/RyanRajpurohit" target="_blank" rel="noopener noreferrer" 
           class="w-10 h-10 rounded-xl bg-[#229ED9]/15 hover:bg-[#229ED9]/25 border border-[#229ED9]/30 text-[#229ED9] flex items-center justify-center transition-all duration-200 shadow-md active:scale-95 group">
          <svg class="w-5 h-5 group-hover:scale-110 transition-transform -translate-x-[1px] translate-y-[0.5px]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.56 8.16l-1.97 9.28c-.15.65-.53.81-1.08.5l-3-2.21-1.45 1.4c-.16.16-.3.3-.61.3l.21-3.05 5.56-5.02c.24-.22-.05-.34-.38-.13l-6.87 4.33-2.96-.92c-.64-.2-.66-.64.13-.95l11.57-4.46c.54-.2 1.01.13.85.93z"/>
          </svg>
        </a>
      </div>

      <!-- Separated Version Footer -->
      <div class="pt-2 border-t border-white/5 text-slate-600 text-[10px] font-mono px-1">
        Nexus Digital Vault v2.6
      </div>
    </div>
  `;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderCustomerDrawerFooter);
} else {
  renderCustomerDrawerFooter();
}
