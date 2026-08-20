let productTimerInterval = null;

async function renderStoreProductDetails(container, productId) {
  if (productTimerInterval) clearInterval(productTimerInterval);

  container.innerHTML = getLoadingSpinnerHTML();

  try {
    const p = await fetchJSON(`/api/products/${productId}`);
    
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
      <div class="space-y-6 pb-20 max-w-2xl mx-auto font-sans animate-fadeIn text-xs px-1">
        
        <!-- Back Navigation & Status -->
        <div class="flex items-center justify-between">
          <button onclick="navigate('home')" class="flex items-center gap-1.5 text-slate-400 hover:text-white font-mono text-xs transition-colors py-1">
            <span class="text-sm">←</span> <span>Vault</span>
          </button>
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px] font-medium">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Instant Automated Delivery
          </span>
        </div>

        <!-- Main Product Card -->
        <div class="bg-surface-900/70 border border-white/[0.08] rounded-3xl p-5 sm:p-7 space-y-6 backdrop-blur-xl shadow-2xl">
          
          <!-- Image & Title Banner -->
          <div class="space-y-4">
            <div class="relative rounded-2xl overflow-hidden bg-surface-950 border border-white/5 aspect-[16/9] w-full max-h-56">
              <img src="${(p.images && p.images[0]) || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800'}" 
                   class="w-full h-full object-cover">
              <div class="absolute inset-0 bg-gradient-to-t from-surface-950/90 via-surface-950/20 to-transparent"></div>
              <div class="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                <div>
                  <span class="text-[9px] font-mono tracking-widest text-emerald-400/90 uppercase font-semibold block">${p.category || 'Subscription'}</span>
                  <h1 class="text-xl sm:text-2xl font-extrabold text-white tracking-tight drop-shadow-sm">${p.name}</h1>
                </div>
              </div>
            </div>

            <!-- Minimal Flash Offer Bar -->
            <div class="bg-surface-950/80 border border-white/5 rounded-2xl p-3 flex items-center justify-between font-mono">
              <div class="flex items-center gap-2">
                <span class="text-xs">⚡</span>
                <span class="text-[11px] text-slate-300 font-sans font-medium">Limited Flash Deal</span>
              </div>
              <div class="flex items-center gap-1 text-slate-400 text-[11px]" id="offerCountdownTimer">
                <span class="text-emerald-400 font-bold bg-surface-900 px-1.5 py-0.5 rounded border border-white/5" id="cd-hours">02</span>:
                <span class="text-emerald-400 font-bold bg-surface-900 px-1.5 py-0.5 rounded border border-white/5" id="cd-mins">59</span>:
                <span class="text-emerald-400 font-bold bg-surface-900 px-1.5 py-0.5 rounded border border-white/5" id="cd-secs">59</span>
              </div>
            </div>
          </div>

          <!-- Configuration Controls -->
          <div class="space-y-5">
            
            <!-- 1. Device Option -->
            <div class="space-y-2">
              <div class="flex justify-between items-center text-[10px] font-mono uppercase tracking-wider text-slate-400">
                <span>1. Simultaneous Screen</span>
                <span class="text-emerald-400" id="deviceLabel">1 Device (Private)</span>
              </div>
              <div class="grid grid-cols-3 gap-2">
                <button type="button" onclick="selectDeviceOption(1, 1, '1 Device (Private)')" id="devBtn-1" 
                  class="py-3 px-2 rounded-xl bg-emerald-500/10 border border-emerald-500/60 text-center transition-all">
                  <span class="text-xs font-mono font-bold text-white block">1 Device</span>
                  <span class="text-[9px] text-emerald-400/80 block mt-0.5 font-mono">Private</span>
                </button>
                <button type="button" onclick="selectDeviceOption(2, 1.8, '2 Devices (Duo)')" id="devBtn-2" 
                  class="py-3 px-2 rounded-xl bg-surface-950 border border-white/5 text-center hover:border-white/20 transition-all text-slate-400">
                  <span class="text-xs font-mono font-bold text-white block">2 Devices</span>
                  <span class="text-[9px] text-slate-500 block mt-0.5 font-mono">Duo Pass</span>
                </button>
                <button type="button" onclick="selectDeviceOption(5, 3.8, '5 Devices (Family)')" id="devBtn-5" 
                  class="py-3 px-2 rounded-xl bg-surface-950 border border-white/5 text-center hover:border-white/20 transition-all text-slate-400">
                  <span class="text-xs font-mono font-bold text-white block">5 Devices</span>
                  <span class="text-[9px] text-slate-500 block mt-0.5 font-mono">Full Vault</span>
                </button>
              </div>
            </div>

            <!-- 2. Duration Plan Option -->
            <div class="space-y-2">
              <div class="flex justify-between items-center text-[10px] font-mono uppercase tracking-wider text-slate-400">
                <span>2. Access Duration</span>
                <span class="text-emerald-400" id="durationLabel">1 Month</span>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                
                <button type="button" onclick="selectDurationOption('1_MONTH', 1, 0, '1 Month')" id="durBtn-1_MONTH" 
                  class="py-3 px-2 rounded-xl bg-emerald-500/10 border border-emerald-500/60 text-center transition-all">
                  <span class="text-xs font-mono font-bold text-white block">1 Month</span>
                  <span class="text-[9px] text-emerald-400/80 font-mono block mt-0.5">Standard</span>
                </button>

                <button type="button" onclick="selectDurationOption('3_MONTHS', 2.55, 15, '3 Months (Save 15%)')" id="durBtn-3_MONTHS" 
                  class="py-3 px-2 rounded-xl bg-surface-950 border border-white/5 text-center hover:border-white/20 transition-all relative">
                  <span class="absolute -top-1.5 right-1.5 px-1 py-0.2 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[8px] font-mono font-bold rounded">15% OFF</span>
                  <span class="text-xs font-mono font-bold text-white block">3 Months</span>
                  <span class="text-[9px] text-slate-500 font-mono block mt-0.5">Quarterly</span>
                </button>

                <button type="button" onclick="selectDurationOption('6_MONTHS', 4.5, 25, '6 Months (Save 25%)')" id="durBtn-6_MONTHS" 
                  class="py-3 px-2 rounded-xl bg-surface-950 border border-white/5 text-center hover:border-white/20 transition-all relative">
                  <span class="absolute -top-1.5 right-1.5 px-1 py-0.2 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[8px] font-mono font-bold rounded">25% OFF</span>
                  <span class="text-xs font-mono font-bold text-white block">6 Months</span>
                  <span class="text-[9px] text-slate-500 font-mono block mt-0.5">Half-Year</span>
                </button>

                <button type="button" onclick="selectDurationOption('1_YEAR', 7.2, 40, '1 Year (Save 40%)')" id="durBtn-1_YEAR" 
                  class="py-3 px-2 rounded-xl bg-surface-950 border border-white/5 text-center hover:border-white/20 transition-all relative">
                  <span class="absolute -top-1.5 right-1.5 px-1 py-0.2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[8px] font-mono font-bold rounded">40% OFF</span>
                  <span class="text-xs font-mono font-bold text-white block">1 Year</span>
                  <span class="text-[9px] text-slate-500 font-mono block mt-0.5">Best Deal</span>
                </button>

              </div>
            </div>

          </div>

          <!-- Total & Checkout Bar -->
          <div class="pt-4 border-t border-white/5 space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-slate-500 text-[10px] uppercase font-mono block">Order Total</span>
                <div class="flex items-baseline gap-2 mt-0.5">
                  <span class="text-2xl sm:text-3xl font-black text-white font-mono" id="calculatedSalePrice">₹${basePrice}</span>
                  <span class="text-xs text-slate-600 line-through font-mono" id="calculatedOrigPrice">₹${origBase}</span>
                  <span class="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20" id="savingsBadge">Save 50%</span>
                </div>
              </div>
              <div class="text-right">
                <span class="text-[10px] font-mono text-emerald-400 block font-medium">✓ Slot Allocated</span>
                <span class="text-[9px] text-slate-500 font-mono">Ready to deliver</span>
              </div>
            </div>

            <button onclick="addProductToConfiguredCart()" class="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black tracking-wider uppercase shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all text-xs flex items-center justify-center gap-2 cursor-pointer font-mono">
              <span>Checkout Now</span>
              <span>→</span>
            </button>
          </div>

        </div>

        <!-- Trust & Features -->
        <div class="grid grid-cols-2 gap-2.5">
          <div class="bg-surface-900/50 border border-white/5 p-3.5 rounded-2xl space-y-1">
            <span class="text-xs">🛡️</span>
            <strong class="text-white text-[11px] block">Full Period Warranty</strong>
            <p class="text-slate-500 text-[10px] leading-relaxed">Instant slot replacement if any access disruption occurs.</p>
          </div>
          <div class="bg-surface-900/50 border border-white/5 p-3.5 rounded-2xl space-y-1">
            <span class="text-xs">🔒</span>
            <strong class="text-white text-[11px] block">Private Profile</strong>
            <p class="text-slate-500 text-[10px] leading-relaxed">Set your own 4-digit PIN for an isolated personal watchlist.</p>
          </div>
        </div>

        <!-- Minimal Instructions Accordion -->
        <div class="bg-surface-900/40 border border-white/5 rounded-2xl p-4 space-y-2">
          <span class="text-slate-400 text-[10px] font-mono uppercase tracking-wider block font-semibold">How It Works</span>
          <div class="text-[11px] text-slate-400 space-y-1.5 leading-relaxed font-sans">
            <div>1. Make the payment and upload the confirmation screenshot.</div>
            <div>2. Credentials will be unlocked immediately in your <strong class="text-slate-300">Purchased Items</strong> section.</div>
            <div>3. Log in with the provided details and enjoy uninterrupted premium streaming.</div>
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

  [1, 2, 5].forEach(d => {
    const btn = document.getElementById(`devBtn-${d}`);
    if (btn) {
      if (d === deviceCount) {
        btn.className = 'py-3 px-2 rounded-xl bg-emerald-500/10 border border-emerald-500/60 text-center transition-all';
        btn.querySelector('span:last-child').className = 'text-[9px] text-emerald-400/80 block mt-0.5 font-mono';
      } else {
        btn.className = 'py-3 px-2 rounded-xl bg-surface-950 border border-white/5 text-center hover:border-white/20 transition-all text-slate-400';
        btn.querySelector('span:last-child').className = 'text-[9px] text-slate-500 block mt-0.5 font-mono';
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

  ['1_MONTH', '3_MONTHS', '6_MONTHS', '1_YEAR'].forEach(k => {
    const btn = document.getElementById(`durBtn-${k}`);
    if (btn) {
      if (k === durationKey) {
        btn.className = 'py-3 px-2 rounded-xl bg-emerald-500/10 border border-emerald-500/60 text-center transition-all relative';
        btn.querySelector('span:last-child').className = 'text-[9px] text-emerald-400/80 font-mono block mt-0.5';
      } else {
        btn.className = 'py-3 px-2 rounded-xl bg-surface-950 border border-white/5 text-center hover:border-white/20 transition-all relative';
        btn.querySelector('span:last-child').className = 'text-[9px] text-slate-500 font-mono block mt-0.5';
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
    badgeEl.textContent = `Save ₹${diff}`;
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
  showToast(`✓ Added to cart`);
  navigate('checkout');
}
