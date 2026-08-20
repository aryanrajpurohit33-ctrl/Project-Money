function renderStoreTerms(container) {
  container.innerHTML = `
    <div class="space-y-6 max-w-xl mx-auto font-sans text-xs pb-24 animate-fadeIn px-1">
      
      <!-- Back Navigation & Header -->
      <div class="space-y-2">
        <button onclick="navigate('home')" class="flex items-center gap-1.5 text-slate-400 hover:text-white font-mono text-xs transition-colors py-1 cursor-pointer">
          <span class="text-sm">←</span> <span>Back to Store</span>
        </button>
        
        <div class="space-y-1">
          <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider">
            Legal & Policy
          </span>
          <h1 class="text-2xl font-black text-white tracking-tight">Terms & Conditions</h1>
          <p class="text-slate-400 text-xs font-mono">Last Updated: August 20, 2026</p>
        </div>
      </div>

      <!-- Critical Acceptance Notice Card -->
      <div class="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/25 space-y-2 text-slate-200">
        <div class="flex items-center gap-2 text-amber-400 font-bold text-xs">
          <span>⚠️</span> <span>Binding Agreement & Mandatory Acceptance</span>
        </div>
        <p class="text-[11px] leading-relaxed text-slate-300">
          By accessing, browsing, or placing an order on <strong>Nexus Digital</strong>, you explicitly acknowledge, agree, and accept to be bound by all the terms, conditions, policies, and notices stated here. If you do not agree with any part of these terms, you must immediately discontinue using our services.
        </p>
      </div>

      <!-- Policy Content Cards -->
      <div class="space-y-4 text-[11px] text-slate-300 leading-relaxed font-sans">
        
        <!-- Section 1 -->
        <div class="bg-surface-900/80 rounded-3xl p-5 border border-white/5 space-y-2.5 shadow-xl">
          <h2 class="text-white font-bold text-xs flex items-center gap-2">
            <span class="text-emerald-400 font-mono">01.</span> Unilateral Right to Modify Terms
          </h2>
          <p>
            We reserve the exclusive right to alter, edit, add, or replace any portion of these Terms & Conditions at our sole discretion at any time <strong>without prior notice or direct obligation to notify users</strong>. Continued access or use of the website following any posted modifications constitutes unconditional acceptance of those revisions.
          </p>
        </div>

        <!-- Section 2 -->
        <div class="bg-surface-900/80 rounded-3xl p-5 border border-white/5 space-y-2.5 shadow-xl">
          <h2 class="text-white font-bold text-xs flex items-center gap-2">
            <span class="text-emerald-400 font-mono">02.</span> Digital Account Rules & Single-Device Restrictions
          </h2>
          <ul class="space-y-2 list-disc list-inside text-slate-300">
            <li><strong>Strict Profile Limits:</strong> You must log in only to your assigned profile slot. Accessing, browsing, or interfering with other profiles on the shared plan is strictly prohibited.</li>
            <li><strong>Credential Confidentiality:</strong> Account passwords and emails provided in your Digital Vault are strictly personal. Sharing credentials publicly or across unauthorized devices will trigger an automated suspension without replacement.</li>
            <li><strong>No Master Account Changes:</strong> Modifying account master emails, passwords, billing addresses, or payment plans is forbidden and immediately forfeits warranty coverage.</li>
          </ul>
        </div>

        <!-- Section 3 -->
        <div class="bg-surface-900/80 rounded-3xl p-5 border border-white/5 space-y-2.5 shadow-xl">
          <h2 class="text-white font-bold text-xs flex items-center gap-2">
            <span class="text-emerald-400 font-mono">03.</span> UPI Verification & Order Fulfillment
          </h2>
          <p>
            Digital credentials and subscription keys are dispatched only after successful administrative verification of your submitted UPI payment screenshot and transaction reference (UTR). If an invalid or unverified screenshot is submitted, the transaction will be declined with a rejection notice in your vault.
          </p>
        </div>

        <!-- Section 4 -->
        <div class="bg-surface-900/80 rounded-3xl p-5 border border-white/5 space-y-2.5 shadow-xl">
          <h2 class="text-white font-bold text-xs flex items-center gap-2">
            <span class="text-emerald-400 font-mono">04.</span> Warranty & Replacement Policy
          </h2>
          <p>
            We offer full warranty coverage for the exact duration of your active subscription plan. If a purchased slot experiences technical downtime, replacement credentials will be issued upon contacting admin support, provided no usage guidelines were breached.
          </p>
        </div>

      </div>

      <!-- Action -->
      <button onclick="navigate('home')" class="w-full py-3.5 rounded-2xl bg-surface-900 hover:bg-surface-800 border border-white/10 text-white font-mono font-bold text-xs transition-all cursor-pointer">
        Back to Storefront
      </button>

    </div>
  `;
}
