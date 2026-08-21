window.currentProductSlideIndex = 0;

async function renderStoreProductDetails(container, productId) {
  window.currentProductSlideIndex = 0;

  // Check local cache for instant zero-latency paint
  const cachedProducts = state.cachedProducts || window.apiCache?.get('/api/products')?.data;
  let prod = null;
  if (Array.isArray(cachedProducts)) {
    prod = cachedProducts.find(p => String(p._id) === String(productId));
  }

  if (prod) {
    paintProductDetailsHTML(container, prod);
  } else {
    container.innerHTML = getLoadingSpinnerHTML();
  }

  try {
    const fresh = await fetchJSON(`/api/products/${productId}`);
    paintProductDetailsHTML(container, fresh);
  } catch (err) {
    if (!prod) {
      container.innerHTML = `
        <div class="space-y-4 max-w-lg mx-auto font-sans text-xs pb-24 animate-fadeIn px-1">
          <div class="p-8 text-center bg-surface-900/80 rounded-3xl border border-white/5 space-y-3">
            <span class="text-3xl block">⚠️</span>
            <p class="text-rose-400 font-mono">Product details unavailable: ${err.message}</p>
            <button onclick="navigate('home')" class="px-4 py-2 bg-white/5 rounded-xl text-white font-mono">Back to Store</button>
          </div>
        </div>
      `;
    }
  }
}

function paintProductDetailsHTML(container, p) {
  const images = Array.isArray(p.images) && p.images.length > 0 ? p.images : (p.image ? [p.image] : ['/assets/placeholder.png']);
  const activePlanPrice = p.sale_price || 499;
  const originalPrice = p.original_price || 999;
  const discount = Math.round(((originalPrice - activePlanPrice) / originalPrice) * 100) || 50;

  container.innerHTML = `
    <div class="space-y-5 max-w-lg mx-auto font-sans text-xs pb-28 animate-fadeIn px-1">
      
      <!-- Top Navigation -->
      <div class="flex items-center justify-between">
        <button onclick="navigate('home')" class="flex items-center gap-1.5 text-slate-400 hover:text-white font-mono text-xs transition-colors py-1 cursor-pointer">
          <span class="text-sm">←</span> <span>All Products</span>
        </button>
        <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider">
          Verified Stock
        </span>
      </div>

      <!-- Slideshow Hero Card -->
      <div class="relative bg-surface-900/90 rounded-3xl border border-white/10 overflow-hidden shadow-2xl group">
        
        <!-- Slides Container -->
        <div class="relative w-full aspect-[16/10] sm:aspect-[16/9] overflow-hidden bg-surface-950 flex items-center justify-center">
          <div id="productSlidesTrack" class="flex transition-transform duration-300 ease-out h-full w-full">
            ${images.map((img, idx) => `
              <div class="w-full h-full flex-shrink-0 relative flex items-center justify-center p-4">
                <img src="${img}" alt="${p.name} Slide ${idx + 1}" class="w-full h-full object-contain rounded-2xl select-none pointer-events-none">
                <!-- Subtle Gradient Shadow -->
                <div class="absolute inset-0 bg-gradient-to-t from-surface-950/80 via-transparent to-transparent pointer-events-none"></div>
              </div>
            `).join('')}
          </div>

          <!-- Left/Right Slide Controls (Visible if more than 1 image) -->
          ${images.length > 1 ? `
            <button type="button" onclick="moveProductSlide(-1, ${images.length})" class="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white flex items-center justify-center transition-all cursor-pointer z-10 active:scale-90">
              ‹
            </button>
            <button type="button" onclick="moveProductSlide(1, ${images.length})" class="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white flex items-center justify-center transition-all cursor-pointer z-10 active:scale-90">
              ›
            </button>

            <!-- Bottom Dot Indicators -->
            <div class="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5 z-10">
              ${images.map((_, idx) => `
                <button type="button" onclick="goToProductSlide(${idx}, ${images.length})" id="slideDot-${idx}" class="h-1.5 rounded-full transition-all duration-300 ${idx === 0 ? 'w-5 bg-emerald-400' : 'w-1.5 bg-white/30'}"></button>
              `).join('')}
            </div>
          ` : ''}

          <!-- Floating Category Badge -->
          <div class="absolute top-3.5 right-3.5 z-10">
            <span class="px-2.5 py-1 rounded-xl bg-surface-950/80 backdrop-blur-md border border-white/10 text-emerald-400 font-mono text-[10px] font-bold uppercase flex items-center gap-1">
              <span>⚡</span> <span>${p.category || 'OTT'}</span>
            </span>
          </div>
        </div>

        <!-- Product Title Bar -->
        <div class="p-4 sm:p-5 border-t border-white/5 space-y-1">
          <span class="text-emerald-400 font-mono text-[10px] uppercase font-bold tracking-widest block">${p.brand || 'Nexus Digital'}</span>
          <h1 class="text-lg sm:text-xl font-black text-white leading-tight tracking-tight">${p.name}</h1>
        </div>

      </div>

      <!-- Duration Selector & Pricing Settings -->
      <div class="space-y-3 font-mono">
        <div class="flex items-center justify-between text-[10px] uppercase font-bold">
          <span class="text-slate-400">Access Duration</span>
          <span class="text-emerald-400">Standard Plan</span>
        </div>

        <div class="relative">
          <select id="planDurationSelect" class="w-full px-4 py-3.5 rounded-2xl bg-surface-900 border border-white/10 text-white text-xs outline-none focus:border-emerald-500 font-mono cursor-pointer shadow-lg appearance-none">
            <option value="1 Month (Standard Plan)">1 Month (Standard Plan)</option>
            <option value="3 Months (Saver Plan)">3 Months (Saver Plan)</option>
            <option value="6 Months (Pro Plan)">6 Months (Pro Plan)</option>
            <option value="1 Year (Ultimate VIP)">1 Year (Ultimate VIP)</option>
          </select>
          <span class="absolute right-4 top-4 text-slate-400 pointer-events-none text-xs">▼</span>
        </div>
      </div>

      <!-- Pricing & Device Quantity Row -->
      <div class="grid grid-cols-2 gap-3 items-center pt-1 font-mono">
        <div class="space-y-0.5">
          <span class="text-slate-500 text-[10px] uppercase font-bold block">Order Total</span>
          <div class="flex items-baseline gap-2">
            <span class="text-2xl sm:text-3xl font-black text-white">₹${activePlanPrice}</span>
            <span class="text-slate-500 line-through text-xs">₹${originalPrice}</span>
            <span class="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">${discount}% OFF</span>
          </div>
        </div>

        <div class="space-y-0.5 text-right">
          <span class="text-slate-500 text-[10px] uppercase font-bold block">Device Quantity</span>
          <div class="inline-flex items-center gap-2 p-1.5 rounded-2xl bg-surface-900 border border-white/10">
            <button type="button" onclick="adjustProductQty(-1)" class="w-7 h-7 rounded-xl bg-surface-950 text-white font-bold text-xs flex items-center justify-center hover:bg-white/10 cursor-pointer">-</button>
            <span id="productQtyDisplay" class="text-emerald-400 font-bold text-xs px-1">1 Device</span>
            <button type="button" onclick="adjustProductQty(1)" class="w-7 h-7 rounded-xl bg-surface-950 text-white font-bold text-xs flex items-center justify-center hover:bg-white/10 cursor-pointer">+</button>
          </div>
        </div>
      </div>

      <!-- Add To Cart Primary Button -->
      <button onclick="handleAddCurrentProductToCart('${p._id}', '${p.name.replace(/'/g, "\\'")}', ${activePlanPrice})" class="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-gray-950 font-black uppercase text-xs tracking-wider transition-all cursor-pointer shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 font-mono">
        <span>+ ADD TO CART</span>
      </button>

      <!-- Flash Deal Banner -->
      <div class="p-4 rounded-2xl bg-surface-900/80 border border-white/5 flex items-center justify-between font-mono shadow-md">
        <div class="flex items-center gap-2.5">
          <span class="text-xl">🔥</span>
          <div>
            <span class="text-white font-bold text-xs block">Limited Flash Deal</span>
            <span class="text-slate-400 text-[10px] block">Special discount expires in:</span>
          </div>
        </div>
        <div class="flex items-center gap-1 text-emerald-400 font-bold text-xs bg-surface-950 px-2.5 py-1 rounded-xl border border-white/5">
          <span>00</span>:<span>02</span>:<span>08</span>
        </div>
      </div>

      <!-- Mandatory Usage Instructions -->
      <div class="p-4 rounded-2xl bg-surface-900/80 border border-white/5 space-y-2 text-slate-300">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-amber-400 font-bold text-xs">
            <span>⚠️</span> <span>Important Usage Instructions & Rules</span>
          </div>
          <span class="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-mono text-[9px] font-bold uppercase">Mandatory</span>
        </div>
        <p class="text-[11px] font-sans leading-relaxed text-slate-300">
          ${p.customer_instructions || 'Never share your account password. Log in only to your assigned profile.'}
        </p>
      </div>

    </div>
  `;
}

function moveProductSlide(direction, total) {
  if (total <= 1) return;
  window.currentProductSlideIndex = (window.currentProductSlideIndex + direction + total) % total;
  updateSlideshowView(total);
}

function goToProductSlide(index, total) {
  window.currentProductSlideIndex = index;
  updateSlideshowView(total);
}

function updateSlideshowView(total) {
  const track = document.getElementById('productSlidesTrack');
  if (track) {
    track.style.transform = `translateX(-${window.currentProductSlideIndex * 100}%)`;
  }
  for (let i = 0; i < total; i++) {
    const dot = document.getElementById(`slideDot-${i}`);
    if (dot) {
      if (i === window.currentProductSlideIndex) {
        dot.className = 'h-1.5 w-5 rounded-full bg-emerald-400 transition-all duration-300';
      } else {
        dot.className = 'h-1.5 w-1.5 rounded-full bg-white/30 transition-all duration-300';
      }
    }
  }
}

let selectedDeviceQty = 1;
function adjustProductQty(delta) {
  selectedDeviceQty = Math.max(1, Math.min(5, selectedDeviceQty + delta));
  const el = document.getElementById('productQtyDisplay');
  if (el) el.textContent = `${selectedDeviceQty} Device${selectedDeviceQty > 1 ? 's' : ''}`;
}

function handleAddCurrentProductToCart(prodId, prodName, price) {
  const duration = document.getElementById('planDurationSelect')?.value || '1 Month';
  const item = {
    id: prodId,
    name: `${prodName} (${selectedDeviceQty} Device${selectedDeviceQty > 1 ? 's' : ''} - ${duration.split('(')[0].trim()})`,
    price: price * selectedDeviceQty,
    quantity: 1,
    duration: duration
  };

  state.cart.push(item);
  localStorage.setItem('nexus_cart', JSON.stringify(state.cart));

  const bagBadge = document.getElementById('cartBadgeCount');
  if (bagBadge) {
    bagBadge.textContent = state.cart.length;
    bagBadge.classList.remove('hidden');
  }

  showToast('✓ Added to cart');
  navigate('cart');
}
