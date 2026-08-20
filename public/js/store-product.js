let productTimerInterval = null;

async function renderStoreProductDetails(container, productId) {
  // Clear any existing timer
  if (productTimerInterval) clearInterval(productTimerInterval);

  container.innerHTML = getLoadingSpinnerHTML();

  try {
    const p = await fetchJSON(`/api/products/${productId}`);
    
    // Default Plan Configurations
    const basePrice = p.sale_price || 499;
    const origBase = p.original_price || (basePrice * 2);

    window.currentProductSelection = {
      productId: p._id,
      name: p.name,
      image: (p.images && p.images[0]) || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800',
      basePrice: basePrice,
      baseOrig: origBase,
      devices: 1,
      duration: '1_MONTH',
      durationMultiplier: 1,
      deviceMultiplier: 1,
      discountPercent: 0
    };

    container.innerHTML = `
      <div class="space-y-6 pb-20 max-w-4xl mx-auto font-sans animate-fadeIn text-xs">
        
        <!-- Back Navigation & Breadcrumb -->
        <div class="flex items-center justify-between">
          <button onclick="navigate('home')" class="flex items-center gap-2 text-slate-400 hover:text-white font-mono text-xs font-bold transition-colors">
            <span>←</span> <span>Back to Store</span>
          </button>
          <span class="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px] font-bold uppercase">
            ⚡ Instant Access Vault
          </span>
        </div>

        <!-- Hero Showcase Card -->
        <div class="glass rounded-3xl p-4 sm:p-8 border border-white/10 space-y-6 relative overflow-hidden shadow-2xl">
          
          <!-- Product Visual Cover -->
          <div class="relative rounded-2xl overflow-hidden bg-surface-950 border border-white/10 shadow-inner group">
            <img src="${(p.images && p.images[0]) || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800'}" 
                 class="w-full h-56 sm:h-80 object-cover group-hover:scale-105 transition-transform duration-500">
            <div class="absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/20 to-transparent"></div>
            
            <div class="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <div>
                <span class="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold block mb-1">
                  ${p.category || 'Digital Goods & Subscriptions'}
                </span>
                <h1 class="text-xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">${p.name}</h1>
              </div>
              <span class="px-3 py-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white font-mono text-[10px] font-bold uppercase">
                ${p.product_type === 'SUBSCRIPTION' ? '🔄 Subscription' : '⚡ Lifetime / One-Time'}
              </span>
            </div>
          </div>

          <!-- 3-Hour Looping Limited Offer Countdown -->
          <div class="p-4 rounded-2xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-emerald-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            <div class="flex items-center gap-2.5">
              <span class="text-lg animate-bounce">🔥</span>
              <div>
                <span class="text-white font-black text-xs sm:text-sm tracking-wide block">Limited Time Flash Discount</span>
                <span class="text-[10px] text-slate-400 font-mono">Special promotional tier ends in:</span>
              </div>
            </div>
            <div class="flex items-center gap-1.5 font-mono text-center" id="offerCountdownTimer">
              <div class="bg-surface-950/90 border border-white/10 px-2.5 py-1.5 rounded-xl min-w-[42px]">
                <span class="text-emerald-400 font-black text-xs block" id="cd-hours">02</span>
                <span class="text-[8px] text-slate-500 uppercase">Hours</span>
              </div>
              <span class="text-slate-500 font-bold">:</span>
              <div class="bg-surface-950/90 border border-white/10 px-2.5 py-1.5 rounded-xl min-w-[42px]">
                <span class="text-emerald-400 font-black text-xs block" id="cd-mins">45</span>
                <span class="text-[8px] text-slate-500 uppercase">Mins</span>
              </div>
              <span class="text-slate-500 font-bold">:</span>
              <div class="bg-surface-950/90 border border-white/10 px-2.5 py-1.5 rounded-xl min-w-[42px]">
                <span class="text-amber-400 font-black text-xs block" id="cd-secs">18</span>
                <span class="text-[8px] text-slate-500 uppercase">Secs</span>
              </div>
            </div>
          </div>

          <!-- Plan Configurator Section -->
          <div class="space-y-5 pt-2">
            
            <!-- 1. Device Selection -->
            <div class="space-y-2.5">
              <label class="text-slate-300 font-bold font-mono uppercase text-[10px] tracking-wider flex items-center justify-between">
                <span>1. Select Simultaneous Devices</span>
                <span class="text-emerald-400 text-[10px]" id="deviceLabel">1 Device (Private Profile)</span>
              </label>
              <div class="grid grid-cols-3 gap-2.5">
                <button type="button" onclick="selectDeviceOption(1, 1, '1 Device (Private Profile)')" id="devBtn-1" class="p-3.5 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500 text-left transition-all relative overflow-hidden group">
                  <span class="text-[10px] font-mono uppercase font-black text-white block">1 Device</span>
                  <span class="text-[9px] text-slate-400 block mt-0.5">Private Profile</span>
                  <span class="absolute top-1 right-2 text-emerald-400 font-black text-[10px]">✓</span>
                </button>
                <button type="button" onclick="selectDeviceOption(2, 1.8, '2 Devices (Duo Shared)')" id="devBtn-2" class="p-3.5 rounded-2xl bg-surface-950 border border-white/10 text-left hover:border-emerald-500/50 transition-all relative overflow-hidden group">
                  <span class="text-[10px] font-mono uppercase font-black text-white block">2 Devices</span>
                  <span class="text-[9px] text-slate-400 block mt-0.5">Duo Access</span>
                </button>
                <button type="button" onclick="selectDeviceOption(5, 3.8, '5 Devices (Full Account / Family)')" id="devBtn-5" class="p-3.5 rounded-2xl bg-surface-950 border border-white/10 text-left hover:border-emerald-500/50 transition-all relative overflow-hidden group">
                  <span class="text-[10px] font-mono uppercase font-black text-white block">5 Devices</span>
                  <span class="text-[9px] text-slate-400 block mt-0.5">Full Master Account</span>
                </button>
              </div>
            </div>

            <!-- 2. Duration Plan Selection -->
            <div class="space-y-2.5">
              <label class="text-slate-300 font-bold font-mono uppercase text-[10px] tracking-wider flex items-center justify-between">
                <span>2. Select Subscription Duration</span>
                <span class="text-emerald-400 text-[10px]" id="durationLabel">1 Month Plan</span>
              </label>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                
                <!-- 1 Month -->
                <button type="button" onclick="selectDurationOption('1_MONTH', 1, 0, '1 Month Plan')" id="durBtn-1_MONTH" class="p-3.5 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500 text-left transition-all relative">
                  <span class="text-xs font-mono font-black text-white block">1 Month</span>
                  <span class="text-[9px] text-slate-400 block mt-0.5">Standard Billing</span>
                  <span class="absolute top-1 right-2 text-emerald-400 font-black text-[10px]">✓</span>
                </button>

                <!-- 3 Months -->
                <button type="button" onclick="selectDurationOption('3_MONTHS', 2.55, 15, '3 Months Plan (Save 15%)')" id="durBtn-3_MONTHS" class="p-3.5 rounded-2xl bg-surface-950 border border-white/10 text-left hover:border-emerald-500/50 transition-all relative">
                  <span class="absolute -top-2 right-2 px-1.5 py-0.5 bg-amber-500 text-gray-950 font-black text-[8px] rounded-full uppercase font-mono">15% OFF</span>
                  <span class="text-xs font-mono font-black text-white block">3 Months</span>
                  <span class="text-[9px] text-slate-400 block mt-0.5">Quarterly Pass</span>
                </button>

                <!-- 6 Months -->
                <button type="button" onclick="selectDurationOption('6_MONTHS', 4.5, 25, '6 Months Plan (Save 25%)')" id="durBtn-6_MONTHS" class="p-3.5 rounded-2xl bg-surface-950 border border-white/10 text-left hover:border-emerald-500/50 transition-all relative">
                  <span class="absolute -top-2 right-2 px-1.5 py-0.5 bg-indigo-500 text-white font-black text-[8px] rounded-full uppercase font-mono">25% OFF</span>
                  <span class="text-xs font-mono font-black text-white block">6 Months</span>
                  <span class="text-[9px] text-slate-400 block mt-0.5">Half-Year Access</span>
                </button>

                <!-- 1 Year -->
                <button type="button" onclick="selectDurationOption('1_YEAR', 7.2, 40, '1 Year / 12 Months (Best Value — Save 40%)')" id="durBtn-1_YEAR" class="p-3.5 rounded-2xl bg-surface-950 border border-white/10 text-left hover:border-emerald-500/50 transition-all relative">
                  <span class="absolute -top-2 right-2 px-1.5 py-0.5 bg-emerald-500 text-gray-950 font-black text-[8px] rounded-full uppercase font-mono">BEST VALUE</span>
                  <span class="text-xs font-mono font-black text-white block">1 Year (12 Mo)</span>
                  <span class="text-[9px] text-slate-400 block mt-0.5">Save 40% Total</span>
                </button>
              </div>
            </div>

          </div>

          <!-- Dynamic Pricing & Checkout Hub -->
          <div class="p-5 sm:p-6 rounded-2xl bg-surface-950 border border-emerald-500/30 space-y-4 shadow-xl">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-slate-400 text-[10px] uppercase font-mono block">Calculated Total</span>
                <div class="flex items-baseline gap-2 mt-0.5">
                  <span class="text-2xl sm:text-4xl font-black text-white font-mono" id="calculatedSalePrice">₹${basePrice}</span>
                  <span class="text-xs sm:text-sm text-slate-500 line-through font-mono" id="calculatedOrigPrice">₹${origBase}</span>
                  <span class="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-mono text-[9px] font-bold uppercase" id="savingsBadge">Direct Savings</span>
                </div>
              </div>
              <div class="text-right font-mono">
                <span class="flex items-center gap-1.5 text-emerald-400 text-[11px] font-bold">
                  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  In Stock & Verified
                </span>
                <span class="text-[10px] text-slate-500 block mt-0.5">Automated Slot Ready</span>
              </div>
            </div>

            <button onclick="addProductToConfiguredCart()" class="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black uppercase tracking-wider shadow-xl shadow-emerald-500/25 active:scale-95 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer font-sans">
              <span>⚡ ADD TO CART & PROCEED TO CHECKOUT</span>
              <span>→</span>
            </button>
          </div>

        </div>

        <!-- 🛡️ Why Buy From Us? (Trust & Guarantees) -->
        <div class="glass rounded-3xl p-6 sm:p-8 border border-white/10 space-y-4 shadow-xl">
          <div class="space-y-1">
            <span class="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-mono text-[10px] font-bold uppercase">Customer Guarantee</span>
            <h2 class="text-base sm:text-lg font-black text-white">Why Purchase From Nexus Digital Vault?</h2>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 font-sans">
            <div class="p-4 rounded-2xl bg-surface-950 border border-white/5 flex items-start gap-3">
              <div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">⚡</div>
              <div>
                <strong class="text-white text-xs block">Instant Digital Delivery</strong>
                <p class="text-slate-400 text-[11px] mt-0.5 leading-relaxed">Direct credentials access delivered to your account dashboard the moment payment is verified.</p>
              </div>
            </div>

            <div class="p-4 rounded-2xl bg-surface-950 border border-white/5 flex items-start gap-3">
              <div class="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">🛡️</div>
              <div>
                <strong class="text-white text-xs block">Full Duration Warranty</strong>
                <p class="text-slate-400 text-[11px] mt-0.5 leading-relaxed">100% replacement warranty and automatic slot recovery if any login issue occurs during your subscription period.</p>
              </div>
            </div>

            <div class="p-4 rounded-2xl bg-surface-950 border border-white/5 flex items-start gap-3">
              <div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">🔒</div>
              <div>
                <strong class="text-white text-xs block">Private & Dedicated Profiles</strong>
                <p class="text-slate-400 text-[11px] mt-0.5 leading-relaxed">Personal PIN-locked profiles with your own private watchlist and playback history.</p>
              </div>
            </div>

            <div class="p-4 rounded-2xl bg-surface-950 border border-white/5 flex items-start gap-3">
              <div class="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold text-sm shrink-0">💬</div>
              <div>
                <strong class="text-white text-xs block">24/7 Dedicated Support</strong>
                <p class="text-slate-400 text-[11px] mt-0.5 leading-relaxed">Direct assistance for profile setup, device syncing, and fast renewal options.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 📋 Default Instructions & Usage Guidelines -->
        <div class="glass rounded-3xl p-6 sm:p-8 border border-white/10 space-y-4 shadow-xl">
          <div class="space-y-1">
            <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase">Setup Manual</span>
            <h2 class="text-base sm:text-lg font-black text-white">Default Instructions & Account Rules</h2>
          </div>

          <div class="p-4 sm:p-5 rounded-2xl bg-surface-950 border border-white/5 space-y-3 font-sans text-[11px] text-slate-300 leading-relaxed">
            <div class="flex items-start gap-2.5">
              <span class="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">1</span>
              <span><strong>Login Access:</strong> Use the provided email and password exactly as shown in your Orders dashboard.</span>
            </div>
            <div class="flex items-start gap-2.5">
              <span class="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">2</span>
              <span><strong>Profile Rules:</strong> Please use only your assigned profile number. Do not change master account passwords or email to keep the warranty active.</span>
            </div>
            <div class="flex items-start gap-2.5">
              <span class="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">3</span>
              <span><strong>PIN Setup:</strong> You can set your own 4-digit PIN on your personal profile for complete privacy from other slots.</span>
            </div>
          </div>
        </div>

      </div>
    `;

    startThreeHourCountdownLoop();
  } catch (err) {
    container.innerHTML = `
      <div class="glass p-8 text-center text-rose-400 font-mono text-xs rounded-3xl">
        Error loading product: ${err.message}
      </div>
    `;
  }
}

// 3-Hour Looping Timer Algorithm
function startThreeHourCountdownLoop() {
  function updateTimer() {
    const now = new Date().getTime();
    const threeHoursMs = 3 * 60 * 60 * 1000;
    const timeRemaining = threeHoursMs - (now % threeHoursMs);

    const hours = Math.floor((timeRemaining / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((timeRemaining / (1000 * 60)) % 60);
    const seconds = Math.floor((timeRemaining / 1000) % 60);

    const hEl = document.getElementById('cd-hours');
    const mEl = document.getElementById('cd-mins');
    const sEl = document.getElementById('cd-secs');

    if (hEl && mEl && sEl) {
      hEl.textContent = String(hours).padStart(2, '0');
      mEl.textContent = String(minutes).padStart(2, '0');
      sEl.textContent = String(seconds).padStart(2, '0');
    }
  }

  updateTimer();
  productTimerInterval = setInterval(updateTimer, 1000);
}

function selectDeviceOption(deviceCount, multiplier, labelText) {
  const sel = window.currentProductSelection;
  if (!sel) return;
  sel.devices = deviceCount;
  sel.deviceMultiplier = multiplier;

  // Update Buttons Styling
  [1, 2, 5].forEach(d => {
    const btn = document.getElementById(`devBtn-${d}`);
    if (btn) {
      if (d === deviceCount) {
        btn.className = 'p-3.5 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500 text-left transition-all relative overflow-hidden group';
        if (!btn.querySelector('.check-mark')) {
          const check = document.createElement('span');
          check.className = 'check-mark absolute top-1 right-2 text-emerald-400 font-black text-[10px]';
          check.textContent = '✓';
          btn.appendChild(check);
        }
      } else {
        btn.className = 'p-3.5 rounded-2xl bg-surface-950 border border-white/10 text-left hover:border-emerald-500/50 transition-all relative overflow-hidden group';
        const check = btn.querySelector('.check-mark');
        if (check) check.remove();
      }
    }
  });

  const dLbl = document.getElementById('deviceLabel');
  if (dLbl) dLbl.textContent = labelText;

  calculateDynamicPrice();
}

function selectDurationOption(durationKey, multiplier, discountPct, labelText) {
  const sel = window.currentProductSelection;
  if (!sel) return;
  sel.duration = durationKey;
  sel.durationMultiplier = multiplier;
  sel.discountPercent = discountPct;

  // Update Duration Buttons Styling
  ['1_MONTH', '3_MONTHS', '6_MONTHS', '1_YEAR'].forEach(k => {
    const btn = document.getElementById(`durBtn-${k}`);
    if (btn) {
      if (k === durationKey) {
        btn.className = 'p-3.5 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500 text-left transition-all relative';
        if (!btn.querySelector('.dur-check')) {
          const check = document.createElement('span');
          check.className = 'dur-check absolute top-1 right-2 text-emerald-400 font-black text-[10px]';
          check.textContent = '✓';
          btn.appendChild(check);
        }
      } else {
        btn.className = 'p-3.5 rounded-2xl bg-surface-950 border border-white/10 text-left hover:border-emerald-500/50 transition-all relative';
        const check = btn.querySelector('.dur-check');
        if (check) check.remove();
      }
    }
  });

  const durLbl = document.getElementById('durationLabel');
  if (durLbl) durLbl.textContent = labelText;

  calculateDynamicPrice();
}

function calculateDynamicPrice() {
  const sel = window.currentProductSelection;
  if (!sel) return;

  const calculatedSale = Math.round(sel.basePrice * sel.deviceMultiplier * sel.durationMultiplier);
  const calculatedOrig = Math.round(sel.baseOrig * sel.deviceMultiplier * (sel.duration === '1_YEAR' ? 12 : sel.duration === '6_MONTHS' ? 6 : sel.duration === '3_MONTHS' ? 3 : 1));

  sel.finalPrice = calculatedSale;

  const saleEl = document.getElementById('calculatedSalePrice');
  const origEl = document.getElementById('calculatedOrigPrice');
  const badgeEl = document.getElementById('savingsBadge');

  if (saleEl) saleEl.textContent = `₹${calculatedSale}`;
  if (origEl) origEl.textContent = `₹${calculatedOrig}`;
  if (badgeEl) {
    const diff = calculatedOrig - calculatedSale;
    badgeEl.textContent = `Save ₹${diff} (${Math.round((diff / calculatedOrig) * 100)}% OFF)`;
  }
}

function addProductToConfiguredCart() {
  const sel = window.currentProductSelection;
  if (!sel) return;

  const durationNameMap = {
    '1_MONTH': '1 Month',
    '3_MONTHS': '3 Months',
    '6_MONTHS': '6 Months',
    '1_YEAR': '1 Year'
  };

  const finalName = `${sel.name} (${sel.devices} Device - ${durationNameMap[sel.duration] || '1 Month'})`;
  const finalPrice = sel.finalPrice || sel.basePrice;

  // Add to central cart store
  if (!Array.isArray(state.cart)) state.cart = [];
  state.cart.push({
    product_id: sel.productId,
    name: finalName,
    price: finalPrice,
    image: sel.image,
    duration: sel.duration,
    devices: sel.devices
  });

  localStorage.setItem('nexus_cart', JSON.stringify(state.cart));
  showToast(`✓ Added ${finalName} to cart!`);
  navigate('checkout');
}
