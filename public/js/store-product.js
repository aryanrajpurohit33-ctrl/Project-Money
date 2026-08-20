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
      durationLabel: '1 Month (Standard Plan)',
      durationMultiplier: 1,
      deviceMultiplier: 1,
      discountPercent: 0
    };

    container.innerHTML = `
      <div class="space-y-4 pb-20 max-w-lg mx-auto font-sans animate-fadeIn text-xs px-1">
        
        <!-- Back Navigation & Status -->
        <div class="flex items-center justify-between">
          <button onclick="navigate('home')" class="flex items-center gap-1.5 text-slate-400 hover:text-white font-mono text-xs transition-colors py-1">
            <span class="text-sm">←</span> <span>Vault</span>
          </button>
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-medium">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Instant Delivery
          </span>
        </div>

        <!-- Main Product Card (Borderless Minimalist Layout) -->
        <div class="bg-surface-900/60 rounded-3xl p-3 sm:p-5 space-y-4 shadow-2xl">
          
          <!-- Full-Fit Hero Showcase -->
          <div class="relative rounded-2xl overflow-hidden bg-surface-950 w-full aspect-[16/10]">
            <img src="${(p.images && p.images[0]) || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800'}" 
                 class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-gradient-to-t from-surface-950/95 via-transparent to-transparent"></div>
            
            <div class="absolute bottom-3 left-4 right-4 flex items-end justify-between">
              <div>
                <span class="text-[9px] font-mono tracking-widest text-emerald-400 uppercase font-semibold block mb-0.5">OTT</span>
                <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight">${p.name}</h1>
              </div>
              <span class="px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white font-mono text-[9px] font-bold uppercase">
                ⚡ OTT
              </span>
            </div>
          </div>

          <!-- Configuration Controls -->
          <div class="space-y-3 pt-1">
            
            <!-- Access Duration Dropdown -->
            <div class="space-y-1.5">
              <div class="flex justify-between items-center text-[10px] font-mono uppercase tracking-wider text-slate-400">
                <span>Access Duration</span>
                <span class="text-emerald-400 font-bold" id="durationSubLabel">Standard Plan</span>
              </div>

              <div class="relative">
                <button type="button" onclick="toggleDurationMenu()" id="durationTriggerBtn"
                  class="w-full py-3 px-4 rounded-xl bg-surface-950 text-white text-xs font-mono flex items-center justify-between hover:bg-surface-950/80 transition-all cursor-pointer">
                  <span id="selectedDurationText" class="font-bold">1 Month (Standard Plan)</span>
                  <span id="durationArrowIcon" class="text-slate-400 text-[10px] transition-transform duration-200">▼</span>
                </button>

                <!-- Custom In-App Slide Menu -->
                <div id="durationDropdownMenu" class="hidden mt-2 space-y-1 p-2 rounded-2xl bg-surface-950 shadow-2xl animate-fadeIn">
                  <div onclick="selectDurationCustom('1_MONTH', 1, 0, '1 Month (Standard Plan)', 'Standard Plan')" 
                    class="p-2.5 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                    <span class="text-xs font-mono text-white font-bold">1 Month</span>
                    <span class="text-[10px] font-mono text-slate-400">Standard Plan</span>
                  </div>

                  <div onclick="selectDurationCustom('3_MONTHS', 2.55, 15, '3 Months (Save 15% OFF)', '15% OFF Plan')" 
                    class="p-2.5 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-mono text-white font-bold">3 Months</span>
                      <span class="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-[8px] font-mono font-bold rounded">15% OFF</span>
                    </div>
                    <span class="text-[10px] font-mono text-slate-400">Quarterly</span>
                  </div>

                  <div onclick="selectDurationCustom('6_MONTHS', 4.5, 25, '6 Months (Save 25% OFF)', '25% OFF Plan')" 
                    class="p-2.5 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-mono text-white font-bold">6 Months</span>
                      <span class="px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 text-[8px] font-mono font-bold rounded">25% OFF</span>
                    </div>
                    <span class="text-[10px] font-mono text-slate-400">Half-Year</span>
                  </div>

                  <div onclick="selectDurationCustom('1_YEAR', 7.2, 40, '1 Year / 12 Months (Best Value — Save 40% OFF)', 'Best Value 40% OFF')" 
                    class="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center justify-between cursor-pointer transition-colors">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-mono text-emerald-400 font-bold">1 Year (12 Mo)</span>
                      <span class="px-1.5 py-0.2 bg-emerald-500 text-gray-950 text-[8px] font-mono font-black rounded">BEST VALUE</span>
                    </div>
                    <span class="text-[10px] font-mono text-emerald-400 font-bold">40% OFF</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Mini Corner Device Stepper + Price Row -->
            <div class="pt-2 flex items-end justify-between gap-2">
              <div>
                <span class="text-slate-500 text-[10px] uppercase font-mono block">Order Total</span>
                <div class="flex items-baseline gap-2 mt-0.5">
                  <span class="text-2xl font-black text-white font-mono" id="calculatedSalePrice">₹${basePrice}</span>
                  <span class="text-xs text-slate-600 line-through font-mono" id="calculatedOrigPrice">₹${origBase}</span>
                  <span class="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded" id="savingsBadge">Save 50%</span>
                </div>
              </div>

              <!-- Compact Corner Device Stepper -->
              <div class="flex flex-col items-end gap-1">
                <span class="text-[9px] font-mono uppercase text-slate-400 tracking-wider">Device Quantity</span>
                <div class="flex items-center gap-1.5 bg-surface-950 px-2 py-1 rounded-xl">
                  <button type="button" onclick="adjustDeviceQuantity(-1)" 
                    class="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 active:scale-90 text-white font-mono font-bold flex items-center justify-center text-xs cursor-pointer">
                    −
                  </button>

                  <span class="text-xs font-mono font-bold text-emerald-400 min-w-[50px] text-center" id="deviceDisplayCount">1 Device</span>

                  <button type="button" onclick="adjustDeviceQuantity(1)" 
                    class="w-6 h-6 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-90 text-emerald-400 font-mono font-bold flex items-center justify-center text-xs cursor-pointer">
                    +
                  </button>
                </div>
              </div>
            </div>

            <!-- Checkout Action Button -->
            <button onclick="addProductToConfiguredCart()" class="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black tracking-wider uppercase shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all text-xs flex items-center justify-center gap-2 cursor-pointer font-mono mt-2">
              <span>Checkout Now</span>
              <span>→</span>
            </button>

          </div>

        </div>

        <!-- Separate Limited Flash Deal Box -->
        <div class="bg-surface-900/60 rounded-2xl p-3.5 flex items-center justify-between font-mono shadow-lg">
          <div class="flex items-center gap-2">
            <span class="text-sm animate-pulse">🔥</span>
            <div>
              <span class="text-xs text-white font-sans font-bold block">Limited Flash Deal</span>
              <span class="text-[9px] text-slate-400 font-sans">Special discount expires in:</span>
            </div>
          </div>
          <div class="flex items-center gap-1 text-slate-400 text-xs" id="offerCountdownTimer">
            <span class="text-emerald-400 font-bold bg-surface-950 px-2 py-1 rounded shadow-inner" id="cd-hours">02</span>:
            <span class="text-emerald-400 font-bold bg-surface-950 px-2 py-1 rounded shadow-inner" id="cd-mins">59</span>:
            <span class="text-emerald-400 font-bold bg-surface-950 px-2 py-1 rounded shadow-inner" id="cd-secs">59</span>
          </div>
        </div>

        <!-- Trust & Features -->
        <div class="grid grid-cols-2 gap-2.5">
          <div class="bg-surface-900/50 p-3.5 rounded-2xl space-y-1">
            <span class="text-xs">🛡️</span>
            <strong class="text-white text-[11px] block">Full Period Warranty</strong>
            <p class="text-slate-500 text-[10px] leading-relaxed">Instant slot replacement if any access disruption occurs.</p>
          </div>
          <div class="bg-surface-900/50 p-3.5 rounded-2xl space-y-1">
            <span class="text-xs">🔒</span>
            <strong class="text-white text-[11px] block">Private Profile</strong>
            <p class="text-slate-500 text-[10px] leading-relaxed">Set your own 4-digit PIN for an isolated personal watchlist.</p>
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
  if (countEl) countEl.textContent = `${newCount} ${newCount === 1 ? 'Device' : 'Devices'}`;

  calculateDynamicPrice();
}

function toggleDurationMenu() {
  const menu = document.getElementById('durationDropdownMenu');
  const arrow = document.getElementById('durationArrowIcon');
  if (!menu) return;

  if (menu.classList.contains('hidden')) {
    menu.classList.remove('hidden');
    if (arrow) arrow.style.transform = 'rotate(180deg)';
  } else {
    menu.classList.add('hidden');
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

  if (textEl) textEl.textContent = fullLabel;
  if (subLabelEl) subLabelEl.textContent = subLabel;

  toggleDurationMenu();
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
  showToast(`✓ Added to cart`);
  navigate('checkout');
}
