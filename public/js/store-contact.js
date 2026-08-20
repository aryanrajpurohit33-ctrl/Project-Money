function openTelegramSupport() {
  window.open('https://t.me/RyanRajpurohit', '_blank', 'noopener,noreferrer');
}

function renderCustomerDrawerFooter() {
  const footer = document.getElementById('customerSidebarFooter');
  if (!footer) return;

  footer.innerHTML = `
    <div class="space-y-3 font-sans text-xs">
      
      <!-- Contact Support Telegram Action Button -->
      <button onclick="openTelegramSupport()" class="w-full py-3 px-4 rounded-2xl bg-[#229ED9]/15 hover:bg-[#229ED9]/25 border border-[#229ED9]/30 text-white font-mono text-xs font-bold transition-all flex items-center justify-between group cursor-pointer shadow-lg shadow-[#229ED9]/10 active:scale-95">
        <div class="flex items-center gap-2.5">
          <!-- Official Telegram SVG Icon -->
          <div class="w-7 h-7 rounded-xl bg-[#229ED9] text-white flex items-center justify-center shadow-md">
            <svg class="w-4 h-4 translate-x-[-1px] translate-y-[0.5px]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.56 8.16l-1.97 9.28c-.15.65-.53.81-1.08.5l-3-2.21-1.45 1.4c-.16.16-.3.3-.61.3l.21-3.05 5.56-5.02c.24-.22-.05-.34-.38-.13l-6.87 4.33-2.96-.92c-.64-.2-.66-.64.13-.95l11.57-4.46c.54-.2 1.01.13.85.93z"/>
            </svg>
          </div>
          <div class="text-left">
            <span class="text-white font-bold block leading-tight">Contact Support</span>
            <span class="text-[#229ED9] text-[10px] font-mono leading-none block">@RyanRajpurohit</span>
          </div>
        </div>
        <span class="text-[#229ED9] group-hover:translate-x-1 transition-transform font-mono text-xs font-bold">→</span>
      </button>

      <div class="text-slate-500 text-[10px] font-mono text-center">
        Nexus Digital Vault v2.6
      </div>

    </div>
  `;
}

document.addEventListener('DOMContentLoaded', renderCustomerDrawerFooter);
