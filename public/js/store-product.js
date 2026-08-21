let productTimerInterval = null;

async function renderStoreProductDetails(container, productId) {
  if (productTimerInterval) clearInterval(productTimerInterval);

  const cached = (state.cachedProducts || []).find(p => p._id === productId) || 
                 window.apiCache?.get(`/api/products/${productId}`);

  if (cached) {
    paintStoreProductHTML(container, cached);
  } else {
    container.innerHTML = getLoadingSpinnerHTML();
  }

  try {
    const p = await fetchJSON(`/api/products/${productId}`);
    paintStoreProductHTML(container, p);
  } catch (err) {
    if (!cached) {
      container.innerHTML = `
        <div class="p-8 text-center text-rose-400 font-mono text-xs">
          Error loading product: ${err.message}
        </div>
      `;
    }
  }
}

function paintStoreProductHTML(container, p) {
  const basePrice = p.sale_price || 149;
  const origBase = p.original_price || (basePrice * 4);

  const allImages = Array.isArray(p.images) && p.images.length > 0 
    ? p.images 
    : [(p.image || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800')];

  const mainHeroImage = allImages[0];
  const showcasePreviews = allImages.length > 1 ? allImages.slice(1) : [];

  window.currentProductSelection = {
    productId: p._id,
    name: p.name,
    image: mainHeroImage,
    basePrice: basePrice,
    baseOrig: origBase,
    subscriptionPricing: p.subscription_pricing || {},
    devices: 1,
    duration: '1_MONTH',
    durationLabel: '1 Month (Standard Plan)',
    durationMultiplier: 1,
    deviceMultiplier: 1,
    discountPercent: Math.round(((origBase - basePrice) / origBase) * 100)
  };

  container.innerHTML = `
    <div class="space-y-5 pb-24 max-w-lg mx-auto font-sans animate-fadeIn text-xs px-2" onclick="closeDurationDropdownOutside(event)">
      
      <!-- Back Navigation & Status -->
      <div class="flex items-center justify-between">
        <button onclick="navigate('home')" class="flex items-center gap-1.5 text-slate-400 hover:text-white font-mono text-xs transition-colors py-1 cursor-pointer">
          <span class="text-sm">←</span> <span>Vault</span>
        </button>
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-medium">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Instant Delivery
        </span>
      </div>

      <!-- Seamless Deep-Fade Hero Image -->
      <div class="-mx-2 relative overflow-hidden bg-transparent aspect-[16/10] select-none">
        <img src="${mainHeroImage}" class="w-full h-full object-cover">
        
        <div class="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/75 to-transparent pointer-events-none" style="background: linear-gradient(to top, rgba(7, 9, 14, 1) 0%, rgba(7, 9, 14, 0.9) 18%, rgba(7, 9, 14, 0.4) 45%, rgba(7, 9, 14, 0) 80%);"></div>

        <div class="absolute bottom-2 left-4 right-4 flex items-end justify-between z-10">
          <div>
            <span class="text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-bold block mb-1">${p.category || 'OTT'}</span>
            <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight">${p.name}</h1>
          </div>
        </div>
      </div>

      <!-- Configuration Controls -->
      <div class="space-y-4 pt-1">
        
        <!-- Access Duration Dropdown -->
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

            <div id="durationDropdownMenu" class="hidden absolute top-full left-0 right-0 mt-2 space-y-1 p-2 rounded-2xl bg-surface-900/95 backdrop-blur-xl border border-white/10 shadow-2xl z-30 transform transition-all duration-300 opacity-0 -translate-y-2">
              <div onclick="selectDurationCustom('1_MONTH', 1, '1 Month (Standard Plan)', 'STANDARD PLAN')" 
                class="p-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                <span class="text-xs font-mono text-white font-bold">1 Month</span>
                <span class="text-[10px] font-mono text-slate-400">Standard Plan</span>
              </div>

              <div onclick="selectDurationCustom('3_MONTHS', 3, '3 Months Plan', 'QUARTERLY PLAN')" 
                class="p-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-mono text-white font-bold">3 Months</span>
                </div>
                <span class="text-[10px] font-mono text-slate-400">Quarterly</span>
              </div>

              <div onclick="selectDurationCustom('6_MONTHS', 6, '6 Months Plan', 'HALF-YEAR PLAN')" 
                class="p-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-mono text-white font-bold">6 Months</span>
                </div>
                <span class="text-[10px] font-mono text-slate-400">Half-Year</span>
              </div>

              <div onclick="selectDurationCustom('1_YEAR', 12, '1 Year / 12 Months', 'ANNUAL PLAN')" 
                class="p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center justify-between cursor-pointer transition-colors">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-mono text-emerald-400 font-bold">1 Year (12 Mo)</span>
                  <span class="px-1.5 py-0.5 bg-emerald-500 text-gray-950 text-[8px] font-mono font-black rounded">POPULAR</span>
                </div>
                <span class="text-[10px] font-mono text-emerald-400 font-bold">Annual</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Total & Stepper -->
        <div class="pt-2 flex items-center justify-between gap-2">
          <div class="space-y-1">
            <span class="text-slate-500 text-[10px] uppercase font-mono block">Order Total</span>
            <div class="flex items-center gap-2 min-h-[36px]">
              <span class="text-2xl sm:text-3xl font-black text-white font-mono leading-none transition-all duration-300 inline-block min-w-[70px]" id="calculatedSalePrice">₹${basePrice}</span>
              <span class="text-xs text-slate-500 line-through font-mono leading-none transition-all duration-300 inline-block" id="calculatedOrigPrice">₹${origBase}</span>
              <span class="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg leading-none transition-all duration-300 whitespace-nowrap" id="savingsBadge">${Math.round(((origBase - basePrice) / origBase) * 100)}% OFF</span>
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

      <!-- Clean Showcase Slider -->
      ${showcasePreviews.length > 0 ? `
        <div class="-mx-2 px-2 flex items-center gap-3 overflow-x-auto py-1" style="scrollbar-width: none; -ms-overflow-style: none; -webkit-overflow-scrolling: touch;">
          ${showcasePreviews.map(img => `
            <div class="flex-shrink-0 w-44 sm:w-48 aspect-[9/16] rounded-3xl overflow-hidden bg-surface-900 border border-white/10 shadow-2xl">
              <img src="${img}" alt="Product Preview" class="w-full h-full object-cover select-none">
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Why Buy From Us Trust Section -->
      <div class="bg-surface-900/70 rounded-3xl p-5 border border-white/5 space-y-4 shadow-xl">
        
        <div class="flex items-center justify-between border-b border-white/5 pb-3">
          <div class="flex items-center gap-2">
            <span class="text-emerald-400 text-base">🛡️</span>
            <h2 class="text-white font-bold text-xs uppercase tracking-wider font-mono">Why Buy From Us?</h2>
          </div>
          <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[9px] font-black uppercase">
            100% Guaranteed
          </span>
        </div>

        <div class="space-y-2.5 font-sans text-[11px]">
          <div class="flex items-start gap-3 p-3 rounded-2xl bg-surface-950/60 border border-white/5">
            <div class="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 text-sm font-mono">
              🎧
            </div>
            <div class="space-y-0.5">
              <strong class="text-white font-bold block text-xs">24/7 Support</strong>
              <p class="text-slate-400 leading-relaxed">Round-the-clock priority customer assistance on Telegram for instant resolution.</p>
            </div>
          </div>

          <div class="flex items-start gap-3 p-3 rounded-2xl bg-surface-950/60 border border-white/5">
            <div class="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 text-sm font-mono">
              🔒
            </div>
            <div class="space-y-0.5">
              <strong class="text-white font-bold block text-xs">Safe Accounts</strong>
              <p class="text-slate-400 leading-relaxed">Legitimately procured, private, and secure subscriptions with zero ban risk.</p>
            </div>
          </div>

          <div class="flex items-start gap-3 p-3 rounded-2xl bg-surface-950/60 border border-white/5">
            <div class="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 text-sm font-mono">
              ⚡
            </div>
            <div class="space-y-0.5">
              <strong class="text-white font-bold block text-xs">100% Replacement</strong>
              <p class="text-slate-400 leading-relaxed">Hassle-free instant replacement guarantee for the complete duration of your plan.</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  `;

  startThreeHourCountdownLoop();
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
  if (newCount > 10) newCount = 10;

  sel.devices = newCount;

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

function selectDurationCustom(key, multiplier, fullLabel, subLabel) {
  const sel = window.currentProductSelection;
  if (!sel) return;

  sel.duration = key;
  sel.durationLabel = fullLabel;
  sel.durationMultiplier = multiplier;

  const textEl = document.getElementById('selectedDurationText');
  const subLabelEl = document.getElementById('durationSubLabel');

  if (textEl) textEl.textContent = fullLabel;
  if (subLabelEl) subLabelEl.textContent = subLabel;

  toggleDurationMenu();
  calculateDynamicPrice();
}

function calculateDynamicPrice() {
  const sel = window.currentProductSelection;
  if (!sel) return;

  const tiers = sel.subscriptionPricing || {};
  let planUnitPrice = sel.basePrice;
  let planOrigPrice = sel.baseOrig;

  if (tiers[sel.duration]) {
    planUnitPrice = tiers[sel.duration].sale;
    planOrigPrice = tiers[sel.duration].orig;
  } else {
    planUnitPrice = Math.round(sel.basePrice * sel.durationMultiplier);
    planOrigPrice = Math.round(sel.baseOrig * sel.durationMultiplier);
  }

  // Exact linear calculation: Unit Plan Price * Number of Devices
  const calculatedSale = planUnitPrice * sel.devices;
  const calculatedOrig = planOrigPrice * sel.devices;

  sel.finalPrice = calculatedSale;

  const saleEl = document.getElementById('calculatedSalePrice');
  const origEl = document.getElementById('calculatedOrigPrice');
  const badgeEl = document.getElementById('savingsBadge');

  if (saleEl) saleEl.textContent = `₹${calculatedSale}`;
  if (origEl) origEl.textContent = `₹${calculatedOrig}`;
  if (badgeEl && calculatedOrig > calculatedSale) {
    const diff = calculatedOrig - calculatedSale;
    badgeEl.textContent = `${Math.round((diff / calculatedOrig) * 100)}% OFF`;
  }
}

function addProductToConfiguredCart() {
  const sel = window.currentProductSelection;
  if (!sel) return;

  const durationNameMap = { '1_MONTH': '1 Month', '3_MONTHS': '3 Months', '6_MONTHS': '6 Months', '1_YEAR': '1 Year' };
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

  const bagBadge = document.getElementById('cartBadgeCount');
  if (bagBadge) {
    bagBadge.textContent = state.cart.length;
    bagBadge.classList.remove('hidden');
  }

  showToast(`✓ Added to cart`);
  navigate('cart');
}
