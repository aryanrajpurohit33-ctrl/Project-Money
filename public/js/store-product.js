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
      subscriptionPricing: p.subscription_pricing || {},
      devices: 1,
      duration: '1_MONTH',
      durationLabel: '1 Month (Standard Plan)',
      durationMultiplier: 1,
      deviceMultiplier: 1,
      discountPercent: 50
    };

    container.innerHTML = `
      <div class="space-y-5 pb-24 max-w-lg mx-auto font-sans animate-fadeIn text-xs px-2" onclick="closeDurationDropdownOutside(event)">
        
        <!-- Back Navigation & Status -->
        <div class="flex items-center justify-between">
          <button onclick="navigate('home')" class="flex items-center gap-1.5 text-slate-400 hover:text-white font-mono text-xs transition-colors py-1">
            <span class="text-sm">←</span> <span>Vault</span>
          </button>
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-medium">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Instant Delivery
          </span>
        </div>

        <!-- Full-Fit Hero Showcase -->
        <div class="relative rounded-3xl overflow-hidden bg-surface-950 w-full aspect-[16/10] shadow-2xl">
          <img src="${(p.images && p.images[0]) || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800'}" 
               class="w-full h-full object-cover">
          <div class="absolute inset-0 bg-gradient-to-t from-surface-950/95 via-surface-950/20 to-transparent"></div>
          
          <div class="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <div>
              <span class="text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-bold block mb-1">${p.category || 'OTT'}</span>
              <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight">${p.name}</h1>
            </div>
            <span class="px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono text-[9px] font-black uppercase flex items-center gap-1">
              ⚡ ${p.category || 'OTT'}
            </span>
          </div>
        </div>

        <!-- Configuration Controls -->
        <div class="space-y-4">
          
          <!-- Access Duration Dropdown (Floating Overlay) -->
          <div class="space-y-1.5 relative">
            <div class="flex justify-between items-center text-[10px] font-mono uppercase tracking-wider text-slate-400">
              <span>Access Duration</span>
              <span class="text-emerald-400 font-bold transition-all duration-300" id="durationSubLabel">STANDARD PLAN</span>
            </div>

            <div class="relative" onclick="event.stopPropagation()">
              <button type="button" onclick="toggleDurationMenu()" id="durationTriggerBtn"
                class="w-full py-3.5 px-4 rounded-2xl bg-surface-900 text-white text-xs font-mono flex items-center justify-between hover:bg-surface-800 transition-all cursor-pointer">
                <span id="selectedDurationText" class="font-bold transition-all duration-200">1 Month (Standard Plan)</span>
                <span id="durationArrowIcon" class="text-slate-400 text-[10px] transition-transform duration-300">▼</span>
              </button>

              <!-- Floating Menu -->
              <div id="durationDropdownMenu" class="hidden absolute top-full left-0 right-0 mt-2 space-y-1 p-2 rounded-2xl bg-surface-900/95 backdrop-blur-xl border border-white/10 shadow-2xl z-30 transform transition-all duration-300 opacity-0 -translate-y-2">
                <div onclick="selectDurationCustom('1_MONTH', 1, 50, '1 Month (Standard Plan)', 'STANDARD PLAN')" 
                  class="p-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                  <span class="text-xs font-mono text-white font-bold">1 Month</span>
                  <span class="text-[10px] font-mono text-slate-400">Standard Plan</span>
                </div>

                <div onclick="selectDurationCustom('3_MONTHS', 2.55, 15, '3 Months (Save 15% OFF)', '15% OFF PLAN')" 
                  class="p-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-mono text-white font-bold">3 Months</span>
                    <span class="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-[8px] font-mono font-bold rounded">15% OFF</span>
                  </div>
                  <span class="text-[10px] font-mono text-slate-400">Quarterly</span>
                </div>

                <div onclick="selectDurationCustom('6_MONTHS', 4.5, 25, '6 Months (Save 25% OFF)', '25% OFF PLAN')" 
                  class="p-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-mono text-white font-bold">6 Months</span>
                    <span class="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-[8px] font-mono font-bold rounded">25% OFF</span>
                  </div>
                  <span class="text-[10px] font-mono text-slate-400">Half-Year</span>
                </div>

                <div onclick="selectDurationCustom('1_YEAR', 7.2, 40, '1 Year / 12 Months (Best Value — Save 40% OFF)', 'BEST VALUE 40% OFF')" 
                  class="p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center justify-between cursor-pointer transition-colors">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-mono text-emerald-400 font-bold">1 Year (12 Mo)</span>
                    <span class="px-1.5 py-0.5 bg-emerald-500 text-gray-950 text-[8px] font-mono font-black rounded">BEST VALUE</span>
                  </div>
                  <span class="text-[10px] font-mono text-emerald-400 font-bold">40% OFF</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Total & Compact Device Stepper Row -->
          <div class="pt-2 flex items-center justify-between gap-2">
            <div class="space-y-1">
              <span class="text-slate-500 text-[10px] uppercase font-mono block">Order Total</span>
              <div class="flex items-center gap-2 min-h-[36px]">
                <span class="text-2xl sm:text-3xl font-black text-white font-mono leading-none transition-all duration-300 inline-block min-w-[70px]" id="calculatedSalePrice">₹${basePrice}</span>
                <span class="text-xs text-slate-500 line-through font-mono leading-none transition-all duration-300 inline-block" id="calculatedOrigPrice">₹${origBase}</span>
                <span class="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg leading-none transition-all duration-300 whitespace-nowrap" id="savingsBadge">50% OFF</span>
              </div>
            </div>

            <!-- Stepper -->
            <div class="flex flex-col items-end gap-1">
              <span class="text-[9px] font-mono uppercase text-slate-400 tracking-wider">Device Quantity</span>
              <div class="flex items-center gap-2 bg-surface-900 p-1.5 rounded-2xl border border-white/5">
                <button type="button" onclick="adjustDeviceQuantity(-1)" 
                  class="w-7 h-7 rounded-xl bg-white/5 hover:bg-white/10 active:scale-90 text-white font-mono font-bold flex items-center justify-center text-sm cursor-pointer transition-all">
                  −
                </button>

                <span class="text-xs font-mono font-bold text-emerald-400 min-w-[65px] text-center transition-all duration-200 inline-block" id="deviceDisplayCount">1 Device</span>

                <button type="button" onclick="adjustDeviceQuantity(1)" 
                  class="w-7 h-7 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-90 text-emerald-400 font-mono font-bold flex items-center justify-center text-sm cursor-pointer transition-all">
                  +
                </button>
              </div>
            </div>
          </div>

          <!-- Add to Cart Action Button -->
          <button onclick="addProductToConfiguredCart()" class="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black tracking-wider uppercase shadow-xl shadow-emerald-500/25 active:scale-[0.98] transition-all text-xs flex items-center justify-center gap-2 cursor-pointer font-mono mt-2">
            <span>+ ADD TO CART</span>
          </button>

        </div>

        <!-- Limited Flash Deal Box -->
        <div class="bg-surface-900/60 rounded-3xl p-4 flex items-center justify-between font-mono shadow-lg">
          <div class="flex items-center gap-2.5">
            <span class="text-base animate-pulse">🔥</span>
            <div>
              <span class="text-xs text-white font-sans font-bold block">Limited Flash Deal</span>
              <span class="text-[10px] text-slate-400 font-sans">Special discount expires in:</span>
            </div>
          </div>
          <div class="flex items-center gap-1.5 text-slate-400 text-xs" id="offerCountdownTimer">
            <span class="text-emerald-400 font-bold bg-surface-950 px-2.5 py-1 rounded-xl" id="cd-hours">02</span>:
            <span class="text-emerald-400 font-bold bg-surface-950 px-2.5 py-1 rounded-xl" id="cd-mins">59</span>:
            <span class="text-emerald-400 font-bold bg-surface-950 px-2.5 py-1 rounded-xl" id="cd-secs">59</span>
          </div>
        </div>

        <!-- Important Usage Instructions & Rules Card -->
        <div class="bg-surface-900/50 rounded-3xl p-4 sm:p-5 space-y-3 shadow-lg">
          <div class="flex items-center justify-between border-b border-white/5 pb-2.5">
            <div class="flex items-center gap-2">
              <span class="text-amber-400 text-sm">⚠️</span>
              <span class="text-white font-bold text-xs">Important Usage Instructions & Rules</span>
            </div>
            <span class="text-[9px] font-mono text-amber-400/90 uppercase font-bold bg-amber-500/10 px-2 py-0.5 rounded-full">Mandatory</span>
          </div>

          <div class="space-y-2.5 text-[11px] text-slate-300 font-sans leading-relaxed">
            ${p.custom_instructions || p.customer_instructions ? `
              <div>${(p.custom_instructions || p.customer_instructions).replace(/\\n/g, '<br>')}</div>
            ` : `
              <div class="flex items-start gap-2">
                <span class="text-rose-400 font-bold text-xs leading-none mt-0.5">•</span>
                <span><strong class="text-white">Do NOT Share Password:</strong> Keep login credentials strictly confidential. Sharing login credentials with others will lead to an immediate ban and warranty cancellation.</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-rose-400 font-bold text-xs leading-none mt-0.5">•</span>
                <span><strong class="text-white">1 Device per Purchase:</strong> You can only log in on <strong class="text-emerald-400">1 device at a time</strong> per purchased slot (unless you choose higher device quantity during checkout).</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-amber-400 font-bold text-xs leading-none mt-0.5">•</span>
                <span><strong class="text-white">Do NOT Change Account Details:</strong> Never change account email, master password, or billing settings. Modifying these permanently voids your warranty.</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-emerald-400 font-bold text-xs leading-none mt-0.5">•</span>
                <span><strong class="text-white">Profile & PIN Lock:</strong> Use only your assigned profile number. You may set your own 4-digit PIN for privacy.</span>
              </div>
            `}
          </div>
        </div>

      </div>
    `;

    startThreeHourCountdownLoop();
  } catch (err) {
    container.innerHTML = `
      <div class="p-8 text-center text-rose-400 font-mono text-xs">
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

function adjustDeviceQuantity(delta) {
  const sel = window.currentProductSelection;
  if (!sel) return;

  let newCount = sel.devices + delta;
  if (newCount < 1) newCount = 1;
  if (newCount > 4) newCount = 4;

  sel.devices = newCount;

  const multipliers = { 1: 1, 2: 1.8, 3: 2.6, 4: 3.4 };
  sel.deviceMultiplier = multipliers[newCount] || 1;

  const countEl = document.getElementById('deviceDisplayCount');
  if (countEl) {
    countEl.style.transform = 'scale(0.85)';
    countEl.style.opacity = '0.5';
    setTimeout(() => {
      countEl.textContent = `${newCount} ${newCount === 1 ? 'Device' : 'Devices'}`;
      countEl.style.transform = 'scale(1)';
      countEl.style.opacity = '1';
    }, 100);
  }

  calculateDynamicPrice();
}

function toggleDurationMenu() {
  const menu = document.getElementById('durationDropdownMenu');
  const arrow = document.getElementById('durationArrowIcon');
  if (!menu) return;

  if (menu.classList.contains('hidden')) {
    menu.classList.remove('hidden');
    setTimeout(() => {
      menu.classList.remove('opacity-0', '-translate-y-2');
      menu.classList.add('opacity-100', 'translate-y-0');
    }, 10);
    if (arrow) arrow.style.transform = 'rotate(180deg)';
  } else {
    menu.classList.remove('opacity-100', 'translate-y-0');
    menu.classList.add('opacity-0', '-translate-y-2');
    setTimeout(() => {
      menu.classList.add('hidden');
    }, 200);
    if (arrow) arrow.style.transform = 'rotate(0deg)';
  }
}

function closeDurationDropdownOutside(e) {
  const menu = document.getElementById('durationDropdownMenu');
  const trigger = document.getElementById('durationTriggerBtn');
  const arrow = document.getElementById('durationArrowIcon');
  if (menu && !menu.classList.contains('hidden') && !trigger.contains(e.target)) {
    menu.classList.remove('opacity-100', 'translate-y-0');
    menu.classList.add('opacity-0', '-translate-y-2');
    setTimeout(() => {
      menu.classList.add('hidden');
    }, 200);
    if (arrow) arrow.style.transform = 'rotate(0deg)';
  }
}

function selectDurationCustom(key, multiplier, discount, fullLabel, subLabel) {
  const sel = window.currentProductSelection;
  if (!sel) return;

  sel.duration = key;
  sel.durationLabel = fullLabel;
  sel.durationMultiplier = multiplier;
  sel.discountPercent = discount;

  const textEl = document.getElementById('selectedDurationText');
  const subLabelEl = document.getElementById('durationSubLabel');

  if (textEl) {
    textEl.style.opacity = '0.5';
    setTimeout(() => {
      textEl.textContent = fullLabel;
      textEl.style.opacity = '1';
    }, 100);
  }
  
  if (subLabelEl) {
    subLabelEl.textContent = subLabel;
  }

  toggleDurationMenu();
  calculateDynamicPrice();
}

function calculateDynamicPrice() {
  const sel = window.currentProductSelection;
  if (!sel) return;

  const tiers = sel.subscriptionPricing || {};
  let baseSale = sel.basePrice;
  let baseOrig = sel.baseOrig;

  if (tiers[sel.duration]) {
    baseSale = tiers[sel.duration].sale;
    baseOrig = tiers[sel.duration].orig;
  } else {
    baseSale = Math.round(sel.basePrice * sel.durationMultiplier);
    baseOrig = Math.round(sel.baseOrig * (sel.duration === '1_YEAR' ? 12 : sel.duration === '6_MONTHS' ? 6 : sel.duration === '3_MONTHS' ? 3 : 1));
  }

  const calculatedSale = Math.round(baseSale * sel.deviceMultiplier);
  const calculatedOrig = Math.round(baseOrig * sel.deviceMultiplier);

  sel.finalPrice = calculatedSale;

  const saleEl = document.getElementById('calculatedSalePrice');
  const origEl = document.getElementById('calculatedOrigPrice');
  const badgeEl = document.getElementById('savingsBadge');

  if (saleEl) {
    saleEl.style.transform = 'scale(0.95)';
    setTimeout(() => {
      saleEl.textContent = `₹${calculatedSale}`;
      saleEl.style.transform = 'scale(1)';
    }, 100);
  }

  if (origEl) {
    origEl.textContent = `₹${calculatedOrig}`;
  }

  if (badgeEl) {
    const diff = calculatedOrig - calculatedSale;
    const pct = Math.round((diff / calculatedOrig) * 100);
    badgeEl.textContent = `${pct}% OFF`;
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

  const finalName = `${sel.name} (${sel.devices} ${sel.devices === 1 ? 'Device' : 'Devices'} - ${durationNameMap[sel.duration] || '1 Month'})`;
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

  // Update header cart bag badge
  const bagBadge = document.getElementById('cartBadgeCount');
  if (bagBadge) {
    bagBadge.textContent = state.cart.length;
    bagBadge.classList.remove('hidden');
  }

  showToast(`✓ Added to cart`);
  
  // Directly open Cart view
  navigate('cart');
}
