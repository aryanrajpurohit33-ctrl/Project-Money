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
      <div class="space-y-5 pb-20 max-w-xl mx-auto font-sans animate-fadeIn text-xs px-1">
        
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

        <!-- Main Product Card & Buy Box -->
        <div class="bg-surface-900/70 border border-white/[0.08] rounded-3xl p-5 sm:p-6 space-y-5 backdrop-blur-xl shadow-2xl">
          
          <!-- Image & Title Banner -->
          <div class="relative rounded-2xl overflow-hidden bg-surface-950 border border-white/5 aspect-[16/9] w-full max-h-52">
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

          <!-- Configuration Controls (Dropdowns) -->
          <div class="space-y-4">
            
            <!-- 1. Device Selection Dropdown -->
            <div class="space-y-1.5">
              <label for="deviceSelectDropdown" class="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                1. Simultaneous Screen / Devices
              </label>
              <div class="relative">
                <select id="deviceSelectDropdown" onchange="handleDeviceDropdownChange(this.value)" 
                  class="w-full py-3.5 px-4 rounded-2xl bg-surface-950 border border-white/10 text-white text-xs font-mono outline-none focus:border-emerald-500 appearance-none cursor-pointer">
                  <option value="1">1 Device (Private Profile)</option>
                  <option value="2">2 Devices (Duo Pass)</option>
                  <option value="3">3 Devices (Multi Access)</option>
                  <option value="4">4 Devices (Family / Full Vault)</option>
                </select>
                <div class="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400 text-xs">
                  ▼
                </div>
              </div>
            </div>

            <!-- 2. Duration Plan Dropdown -->
            <div class="space-y-1.5">
              <label for="durationSelectDropdown" class="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                2. Subscription Duration
              </label>
              <div class="relative">
                <select id="durationSelectDropdown" onchange="handleDurationDropdownChange(this.value)" 
                  class="w-full py-3.5 px-4 rounded-2xl bg-surface-950 border border-white/10 text-white text-xs font-mono outline-none focus:border-emerald-500 appearance-none cursor-pointer">
                  <option value="1_MONTH">1 Month (Standard Plan)</option>
                  <option value="3_MONTHS">3 Months (Save 15% OFF)</option>
                  <option value="6_MONTHS">6 Months (Save 25% OFF)</option>
                  <option value="1_YEAR">1 Year / 12 Months (Best Value — Save 40% OFF)</option>
                </select>
                <div class="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400 text-xs">
                  ▼
                </div>
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

        <!-- Separate Limited Flash Deal Box (Placed Below Buy Box) -->
        <div class="bg-surface-900/60 border border-white/[0.08] rounded-2xl p-4 flex items-center justify-between font-mono shadow-lg">
          <div class="flex items-center gap-2.5">
            <span class="text-sm animate-pulse">🔥</span>
            <div>
              <span class="text-xs text-white font-sans font-bold block">Limited Flash Deal</span>
              <span class="text-[9px] text-slate-400 font-sans">Promotional pricing expires soon</span>
            </div>
          </div>
          <div class="flex items-center gap-1 text-slate-400 text-xs" id="offerCountdownTimer">
            <span class="text-emerald-400 font-bold bg-surface-950 px-2 py-1 rounded border border-white/5 shadow-inner" id="cd-hours">02</span>:
            <span class="text-emerald-400 font-bold bg-surface-950 px-2 py-1 rounded border border-white/5 shadow-inner" id="cd-mins">59</span>:
            <span class="text-emerald-400 font-bold bg-surface-950 px-2 py-1 rounded border border-white/5 shadow-inner" id="cd-secs">59</span>
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

function handleDeviceDropdownChange(val) {
  const sel = window.currentProductSelection;
  if (!sel) return;

  const deviceCount = parseInt(val, 10) || 1;
  const multipliers = { 1: 1, 2: 1.8, 3: 2.6, 4: 3.4 };

  sel.devices = deviceCount;
  sel.deviceMultiplier = multipliers[deviceCount] || 1;

  calculateDynamicPrice();
}

function handleDurationDropdownChange(val) {
  const sel = window.currentProductSelection;
  if (!sel) return;

  const durations = {
    '1_MONTH': { multiplier: 1, discount: 0 },
    '3_MONTHS': { multiplier: 2.55, discount: 15 },
    '6_MONTHS': { multiplier: 4.5, discount: 25 },
    '1_YEAR': { multiplier: 7.2, discount: 40 }
  };

  const target = durations[val] || durations['1_MONTH'];
  sel.duration = val;
  sel.durationMultiplier = target.multiplier;
  sel.discountPercent = target.discount;

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
