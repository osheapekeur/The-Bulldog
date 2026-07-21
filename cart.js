// The Bulldog Wellington - Shared Shopping Cart and Checkout Logic
(function() {
  let cart = [];
  let selectedMembership = null;

  // Configuration for Membership Passes
  const membershipOptions = {
    existing: { name: "Existing Active Member", price: 0, desc: "Verification in-store" },
    day: { name: "Day Pass", price: 15, desc: "24-Hour Access" },
    week: { name: "Week Pass", price: 25, desc: "7-Day Access" },
    month: { name: "Month Pass", price: 50, desc: "30-Day Access" }
  };

  // Toast Notification System
  function showToast(message) {
    let container = document.getElementById("cart-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "cart-toast-container";
      container.className = "fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none";
      document.body.appendChild(container);
    }
    
    const toast = document.createElement("div");
    toast.className = "bg-[#121212]/95 border border-zinc-800 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 transition-all duration-300 transform translate-y-10 opacity-0 pointer-events-auto max-w-sm backdrop-blur-md";
    toast.innerHTML = `
      <div class="flex items-center justify-center w-6 h-6 rounded-full bg-[#68bc34]/10 text-[#68bc34] border border-[#68bc34]/20 shrink-0">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
      </div>
      <span class="text-xs font-mono font-bold uppercase tracking-wider">${message}</span>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.remove("translate-y-10", "opacity-0");
    }, 10);
    
    setTimeout(() => {
      toast.classList.add("translate-y-[-10px]", "opacity-0");
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }

  // Load cart state from LocalStorage
  function loadCart() {
    try {
      const stored = localStorage.getItem("bulldog_cart_items");
      cart = stored ? JSON.parse(stored) : [];
      selectedMembership = localStorage.getItem("bulldog_selected_membership") || null;
    } catch (e) {
      cart = [];
      selectedMembership = null;
    }
    updateCartUI();
  }

  // Save cart state to LocalStorage
  function saveCart() {
    localStorage.setItem("bulldog_cart_items", JSON.stringify(cart));
    if (selectedMembership) {
      localStorage.setItem("bulldog_selected_membership", selectedMembership);
    } else {
      localStorage.removeItem("bulldog_selected_membership");
    }
    updateCartUI();
  }

  // Add Item to Cart
  function addToCart(name, rawPriceStr, qty = 1, isGram = false) {
    // Parse numeric price (e.g. "R 150/g" -> 150)
    const numericPrice = parseFloat(rawPriceStr.replace(/[^0-9.]/g, '')) || 0;
    
    const existing = cart.find(item => item.name === name);
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({
        name: name,
        price: numericPrice,
        rawPriceStr: rawPriceStr,
        qty: qty,
        isGram: isGram
      });
    }
    saveCart();
  }

  // Update item quantity in cart
  function updateQuantity(name, delta) {
    const item = cart.find(item => item.name === name);
    if (item) {
      item.qty += delta;
      if (item.qty <= 0) {
        cart = cart.filter(i => i.name !== name);
      }
      saveCart();
    }
  }

  // Remove item completely
  function removeItem(name) {
    cart = cart.filter(i => i.name !== name);
    saveCart();
  }

  // Toggle Cart Drawer
  function openCart() {
    const drawer = document.getElementById("cart-drawer");
    const backdrop = document.getElementById("cart-drawer-backdrop");
    const inner = document.getElementById("cart-drawer-inner");
    
    // Explicitly hide the old membership modal if it is open
    const clubModal = document.getElementById("club-modal");
    if (clubModal) {
      clubModal.classList.add("hidden");
    }
    
    if (drawer && backdrop && inner) {
      drawer.classList.remove("hidden");
      backdrop.classList.remove("hidden");
      
      // Force reflow
      void drawer.offsetWidth;
      
      backdrop.classList.remove("opacity-0");
      backdrop.classList.add("opacity-100");
      inner.classList.remove("translate-x-full");
      inner.classList.add("translate-x-0");
      document.body.classList.add("overflow-hidden");
      
      renderCartDrawerItems();
    }
  }

  function closeCart() {
    const drawer = document.getElementById("cart-drawer");
    const backdrop = document.getElementById("cart-drawer-backdrop");
    const inner = document.getElementById("cart-drawer-inner");
    
    if (drawer && backdrop && inner) {
      backdrop.classList.remove("opacity-100");
      backdrop.classList.add("opacity-0");
      inner.classList.remove("translate-x-0");
      inner.classList.add("translate-x-full");
      document.body.classList.remove("overflow-hidden");
      
      setTimeout(() => {
        drawer.classList.add("hidden");
        backdrop.classList.add("hidden");
      }, 300);
    }
  }

  // Render the items inside the drawer list
  function renderCartDrawerItems() {
    const listContainer = document.getElementById("cart-items-list-container");
    if (!listContainer) return;

    if (cart.length === 0) {
      listContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center text-center py-16 px-4 space-y-3">
          <div class="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 text-zinc-500">
            <i data-lucide="shopping-basket" class="w-6 h-6"></i>
          </div>
          <h3 class="text-sm font-display font-black uppercase text-zinc-300">Your basket is empty</h3>
          <p class="text-xs text-zinc-500 font-light max-w-xs">Browse our catalog and add premium products to your reservation list.</p>
          <button id="btn-browse-catalog" class="mt-2 py-2 px-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition">
            Browse Catalog
          </button>
        </div>
      `;
      
      // Wire up empty state button
      const browseBtn = document.getElementById("btn-browse-catalog");
      if (browseBtn) {
        browseBtn.addEventListener("click", () => {
          closeCart();
          window.location.href = "catalog.html";
        });
      }
    } else {
      listContainer.innerHTML = cart.map(item => `
        <div class="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition hover:border-zinc-700">
          <div class="flex-1 min-w-0">
            <h4 class="text-xs sm:text-sm font-display font-black uppercase text-zinc-100 tracking-tight leading-tight line-clamp-2">${item.name}</h4>
            <span class="text-[10px] text-zinc-500 font-mono mt-1 block">${item.rawPriceStr}</span>
          </div>
          
          <div class="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t border-zinc-800/40 sm:border-t-0 pt-2.5 sm:pt-0">
            <!-- Qty controls -->
            <div class="flex items-center border border-zinc-800 rounded-lg bg-zinc-950 overflow-hidden h-7">
              <button class="btn-qty-minus px-2.5 h-full text-zinc-500 hover:text-white hover:bg-zinc-900 transition flex items-center justify-center cursor-pointer select-none" data-name="${item.name}">
                <i data-lucide="minus" class="w-3 h-3"></i>
              </button>
              <span class="px-2 text-xs font-mono font-bold text-white select-none whitespace-nowrap">${item.qty}${item.isGram ? 'g' : 'x'}</span>
              <button class="btn-qty-plus px-2.5 h-full text-zinc-500 hover:text-white hover:bg-zinc-900 transition flex items-center justify-center cursor-pointer select-none" data-name="${item.name}">
                <i data-lucide="plus" class="w-3 h-3"></i>
              </button>
            </div>

            <!-- Total Price & Remove Button -->
            <div class="flex items-center gap-3">
              <span class="text-xs sm:text-sm font-mono font-black text-[#68bc34] min-w-[65px] text-right">
                R ${(item.price * item.qty).toFixed(2)}
              </span>
              <button class="btn-item-remove p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer" data-name="${item.name}">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        </div>
      `).join('');

      // Wire up controls
      document.querySelectorAll(".btn-qty-minus").forEach(btn => {
        btn.addEventListener("click", function() {
          const name = this.getAttribute("data-name");
          const item = cart.find(i => i.name === name);
          const step = item && item.isGram ? -0.5 : -1;
          updateQuantity(name, step);
        });
      });

      document.querySelectorAll(".btn-qty-plus").forEach(btn => {
        btn.addEventListener("click", function() {
          const name = this.getAttribute("data-name");
          const item = cart.find(i => i.name === name);
          const step = item && item.isGram ? 0.5 : 1;
          updateQuantity(name, step);
        });
      });

      document.querySelectorAll(".btn-item-remove").forEach(btn => {
        btn.addEventListener("click", function() {
          removeItem(this.getAttribute("data-name"));
          showToast("Item removed");
        });
      });
    }

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  // Calculate totals and update headers + drawer totals
  function updateCartUI() {
    let totalPrice = 0;
    let totalCount = 0;
    
    cart.forEach(item => {
      totalPrice += item.price * item.qty;
      totalCount += item.qty;
    });

    // 1. Update Header Desktop Button
    const headerBtn = document.getElementById("btn-unlock-access");
    if (headerBtn) {
      headerBtn.innerHTML = `
        <i data-lucide="shopping-bag" class="w-4 h-4"></i>
        R ${totalPrice.toFixed(2)} 
        <span class="bg-white/20 text-[10px] px-1.5 py-0.5 rounded-full ml-1 font-bold">${totalCount}</span>
      `;
    }

    // 2. Update Header Mobile Button
    const mobileBtn = document.getElementById("mobile-unlock-access");
    if (mobileBtn) {
      mobileBtn.innerHTML = `
        <i data-lucide="shopping-bag" class="w-4 h-4 inline-block mr-1.5"></i>
        Cart: R ${totalPrice.toFixed(2)} (${totalCount})
      `;
    }

    // 3. Update Drawer items count label
    const drawerCountLabel = document.getElementById("cart-items-count");
    if (drawerCountLabel) {
      drawerCountLabel.textContent = `${totalCount} ${totalCount === 1 ? 'Item' : 'Items'} Selected`;
    }

    // 4. Update Subtotal
    const subtotalEl = document.getElementById("cart-summary-subtotal");
    if (subtotalEl) {
      subtotalEl.textContent = `R ${totalPrice.toFixed(2)}`;
    }

    // 5. Update Membership Selection rendering
    let passFee = 0;
    const selectedPassObj = membershipOptions[selectedMembership];
    const passEl = document.getElementById("cart-summary-pass");
    
    if (selectedPassObj) {
      passFee = selectedPassObj.price;
      if (passEl) {
        passEl.textContent = `R ${passFee.toFixed(2)} (${selectedPassObj.name})`;
        passEl.classList.remove("text-zinc-500");
        passEl.classList.add("text-white");
      }
    } else {
      if (passEl) {
        passEl.textContent = "Select membership below";
        passEl.classList.add("text-zinc-500");
        passEl.classList.remove("text-white");
      }
    }

    // 6. Update Grand Total
    const grandTotal = totalPrice + passFee;
    const totalEl = document.getElementById("cart-summary-total");
    if (totalEl) {
      totalEl.textContent = `R ${grandTotal.toFixed(2)}`;
    }

    // 7. Toggle WhatsApp reservation button eligibility
    const reserveBtn = document.getElementById("btn-whatsapp-reserve");
    if (reserveBtn) {
      if (selectedMembership && cart.length > 0) {
        reserveBtn.removeAttribute("disabled");
      } else {
        reserveBtn.setAttribute("disabled", "true");
      }
    }

    // Render membership card selections
    document.querySelectorAll('input[name="membership-pass"]').forEach(radio => {
      const label = radio.closest('label');
      if (radio.value === selectedMembership) {
        radio.checked = true;
        if (label) {
          label.classList.add("border-[#68bc34]", "bg-[#68bc34]/5", "ring-1", "ring-[#68bc34]/30");
          label.classList.remove("border-zinc-800", "bg-zinc-900/50");
        }
      } else {
        radio.checked = false;
        if (label) {
          label.classList.remove("border-[#68bc34]", "bg-[#68bc34]/5", "ring-1", "ring-[#68bc34]/30");
          label.classList.add("border-zinc-800", "bg-zinc-900/50");
        }
      }
    });

    // Refresh Lucide
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
    
    // Also re-render list items if currently open
    const drawer = document.getElementById("cart-drawer");
    if (drawer && !drawer.classList.contains("hidden")) {
      renderCartDrawerItems();
    }
  }

  // Trigger WhatsApp message compilation
  function checkoutAndReserve() {
    if (cart.length === 0) {
      showToast("Your basket is empty!");
      return;
    }
    if (!selectedMembership) {
      showToast("Please select a club membership pass!");
      return;
    }

    const passObj = membershipOptions[selectedMembership];
    let totalPrice = 0;
    
    // Build cart text lines
    const itemLines = cart.map(item => {
      totalPrice += item.price * item.qty;
      const qtySuffix = item.isGram ? 'g' : 'x';
      return `- ${item.qty}${qtySuffix} ${item.name} (${item.rawPriceStr})`;
    }).join('\n');

    const passFee = passObj.price;
    const grandTotal = totalPrice + passFee;

    // Formatting membership display string
    const passDisplay = `${passObj.name} (R ${passObj.price}${selectedMembership === 'existing' ? ' - Verification in-store' : ''})`;

    const messageText = `Hi Bulldog Dispensary, I would like to reserve the following for pickup:

Order Details:
${itemLines}

Membership Status:
- Selected Pass: ${passDisplay}

Total Order Value: R ${grandTotal.toFixed(2)}

Please confirm availability for pickup. Thanks!`;

    const waURL = `https://wa.me/27608345991?text=${encodeURIComponent(messageText)}`;
    window.open(waURL, '_blank');
  }

  // Inject HTML Elements & Wire DOM
  function initCart() {
    // 1. Inject Cart Drawer HTML
    const drawerHTML = `
      <!-- Cart Drawer Backdrop -->
      <div id="cart-drawer-backdrop" class="fixed inset-0 bg-black/75 backdrop-blur-sm z-[90] transition-opacity duration-300 hidden opacity-0"></div>

      <!-- Cart Drawer Container -->
      <div id="cart-drawer" class="fixed inset-y-0 right-0 w-full max-w-md flex z-[100] hidden h-screen max-h-screen">
        <div class="w-full bg-[#121212] border-l border-zinc-800 text-white flex flex-col shadow-2xl h-screen max-h-screen overflow-hidden transform translate-x-full transition-transform duration-300" id="cart-drawer-inner">
          
          <!-- Header -->
          <div class="p-6 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
            <div class="flex items-center gap-3">
              <div class="flex items-center justify-center w-10 h-10 rounded-full bg-[#68bc34]/10 text-[#68bc34] border border-[#68bc34]/20">
                <i data-lucide="shopping-bag" class="w-5 h-5"></i>
              </div>
              <div>
                <h2 class="font-display font-black text-sm sm:text-base uppercase tracking-tight">Your Reserve Basket</h2>
                <span id="cart-items-count" class="text-[10px] font-mono text-[#68bc34] font-bold uppercase tracking-wider block">0 Items Selected</span>
              </div>
            </div>
            <button id="cart-drawer-close" class="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition duration-200 cursor-pointer">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <!-- Scrollable Cart Items List -->
          <div class="flex-1 min-h-[200px] overflow-y-auto p-6 space-y-4" id="cart-items-list-container">
            <!-- Dynamic content -->
          </div>

          <!-- Membership Section -->
          <div class="p-6 border-t border-zinc-800 bg-[#161616] space-y-4 flex-shrink-0">
            <div>
              <h3 class="text-xs font-mono font-bold text-[#68bc34] uppercase tracking-widest flex items-center gap-2">
                <i data-lucide="award" class="w-4 h-4"></i>
                Club Membership Status
              </h3>
              <p class="text-[10px] text-zinc-400 mt-1">Select your pass option below (Required to reserve items)</p>
            </div>

            <!-- Radio options / cards -->
            <div class="grid grid-cols-2 gap-2">
              <!-- Option 1: Existing Member -->
              <label class="membership-card flex flex-col justify-between p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition duration-200 cursor-pointer text-left relative" for="member-option-existing">
                <input type="radio" name="membership-pass" id="member-option-existing" value="existing" class="absolute top-3 right-3 accent-[#68bc34]">
                <div>
                  <span class="block text-[11px] font-display font-black uppercase text-white leading-tight">Active Member</span>
                  <span class="block text-[8px] text-zinc-500 font-sans mt-0.5">Verification in-store</span>
                </div>
                <span class="block text-xs font-mono font-bold text-[#68bc34] mt-2">R 0</span>
              </label>

              <!-- Option 2: Day Pass -->
              <label class="membership-card flex flex-col justify-between p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition duration-200 cursor-pointer text-left relative" for="member-option-day">
                <input type="radio" name="membership-pass" id="member-option-day" value="day" class="absolute top-3 right-3 accent-[#68bc34]">
                <div>
                  <span class="block text-[11px] font-display font-black uppercase text-white leading-tight">Day Pass</span>
                  <span class="block text-[8px] text-zinc-500 font-sans mt-0.5">24-Hour Access</span>
                </div>
                <span class="block text-xs font-mono font-bold text-[#68bc34] mt-2">R 15</span>
              </label>

              <!-- Option 3: Week Pass -->
              <label class="membership-card flex flex-col justify-between p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition duration-200 cursor-pointer text-left relative" for="member-option-week">
                <input type="radio" name="membership-pass" id="member-option-week" value="week" class="absolute top-3 right-3 accent-[#68bc34]">
                <div>
                  <span class="block text-[11px] font-display font-black uppercase text-white leading-tight">Week Pass</span>
                  <span class="block text-[8px] text-zinc-500 font-sans mt-0.5">7-Day Access</span>
                </div>
                <span class="block text-xs font-mono font-bold text-[#68bc34] mt-2">R 25</span>
              </label>

              <!-- Option 4: Month Pass -->
              <label class="membership-card flex flex-col justify-between p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition duration-200 cursor-pointer text-left relative" for="member-option-month">
                <input type="radio" name="membership-pass" id="member-option-month" value="month" class="absolute top-3 right-3 accent-[#68bc34]">
                <div>
                  <span class="block text-[11px] font-display font-black uppercase text-white leading-tight">Month Pass</span>
                  <span class="block text-[8px] text-zinc-500 font-sans mt-0.5">30-Day Access</span>
                </div>
                <span class="block text-xs font-mono font-bold text-[#68bc34] mt-2">R 50</span>
              </label>
            </div>
          </div>

          <!-- Order Summary Footer -->
          <div class="p-6 border-t border-zinc-800 bg-zinc-950 space-y-4 flex-shrink-0">
            <div class="space-y-1.5 text-xs">
              <div class="flex justify-between text-zinc-400">
                <span>Items Subtotal</span>
                <span id="cart-summary-subtotal" class="font-mono">R 0.00</span>
              </div>
              <div class="flex justify-between text-zinc-400">
                <span>Access Pass Fee</span>
                <span id="cart-summary-pass" class="font-mono">--</span>
              </div>
              <div class="flex justify-between text-white font-bold text-sm pt-2 border-t border-zinc-900">
                <span>Grand Total</span>
                <span id="cart-summary-total" class="font-mono text-[#68bc34]">R 0.00</span>
              </div>
            </div>

            <!-- Reserve Button -->
            <button id="btn-whatsapp-reserve" disabled class="w-full py-4 bg-[#68bc34] hover:bg-[#5aa32c] text-white text-xs font-black rounded-xl transition duration-200 flex items-center justify-center gap-2 uppercase tracking-widest cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              <i data-lucide="message-square" class="w-4 h-4"></i>
              Reserve via WhatsApp
            </button>
          </div>

        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', drawerHTML);

    // 2. Attach Click Listeners for opening and closing Cart
    const openBtns = [
      document.getElementById("btn-unlock-access"),
      document.getElementById("mobile-unlock-access"),
      document.getElementById("btn-menu-lounge-pass")
    ];

    openBtns.forEach(btn => {
      if (btn) {
        // Clone and replace button to clear any old events (like the original membership modal opener)
        const clone = btn.cloneNode(true);
        btn.parentNode.replaceChild(clone, btn);
        clone.addEventListener("click", function(e) {
          e.preventDefault();
          openCart();
        });
      }
    });

    const closeBtn = document.getElementById("cart-drawer-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", closeCart);
    }

    const backdrop = document.getElementById("cart-drawer-backdrop");
    if (backdrop) {
      backdrop.addEventListener("click", closeCart);
    }

    // 3. Attach Membership Pass Radio listeners
    document.querySelectorAll('input[name="membership-pass"]').forEach(radio => {
      radio.addEventListener("change", function() {
        if (this.checked) {
          selectedMembership = this.value;
          saveCart();
        }
      });
    });

    // 4. Attach Checkout Button listener
    const checkoutBtn = document.getElementById("btn-whatsapp-reserve");
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", checkoutAndReserve);
    }

    // 5. Enhance all "Quick Add" product card buttons (.btn-order) with interactive selectors
    document.querySelectorAll(".btn-order").forEach(btn => {
      const name = btn.getAttribute("data-name");
      const priceStr = btn.getAttribute("data-price");
      if (!name || !priceStr) return;

      const isGram = priceStr.toLowerCase().includes("/g") || priceStr.toLowerCase().includes("/ g");
      const numericPrice = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
      
      const parent = btn.parentElement;
      if (!parent) return;

      if (isGram) {
        // Gram item layout
        parent.innerHTML = `
          <div class="w-full space-y-3.5 pt-3">
            <div class="flex flex-col gap-1.5 text-left">
              <span class="text-[10px] text-zinc-500 font-mono uppercase tracking-widest font-bold">Select grams</span>
              <div class="flex flex-wrap items-center gap-1.5">
                <div class="flex items-center gap-1 shrink-0">
                  <button type="button" class="gram-pill px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 transition duration-150 cursor-pointer select-none animate-none" data-val="1">1g</button>
                  <button type="button" class="gram-pill px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 transition duration-150 cursor-pointer select-none animate-none" data-val="2">2g</button>
                  <button type="button" class="gram-pill px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 transition duration-150 cursor-pointer select-none animate-none" data-val="3.5">3.5g</button>
                  <button type="button" class="gram-pill px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 transition duration-150 cursor-pointer select-none animate-none" data-val="5">5g</button>
                </div>
                <div class="flex items-center border border-zinc-200 rounded-lg bg-white overflow-hidden flex-1 min-w-[70px] h-[28px]">
                  <button type="button" class="gram-minus px-2 text-zinc-400 hover:text-zinc-900 transition font-mono font-black text-sm cursor-pointer select-none">-</button>
                  <input type="number" class="gram-input w-full text-center text-xs font-mono font-bold text-zinc-800 focus:outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value="1" min="0.5" step="0.5">
                  <button type="button" class="gram-plus px-2 text-zinc-400 hover:text-zinc-900 transition font-mono font-black text-sm cursor-pointer select-none">+</button>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between gap-3 pt-2.5 border-t border-zinc-100 text-left">
              <div class="shrink-0">
                <span class="block text-[9px] text-zinc-400 uppercase font-mono tracking-widest font-bold">Total Price</span>
                <span class="total-price-display block font-display font-black text-sm sm:text-base text-zinc-900 font-mono">R ${numericPrice.toFixed(2)}</span>
              </div>
              <button type="button" class="btn-add-enhanced py-2.5 px-4 bg-[#68bc34] hover:bg-[#5aa32c] text-white text-xs font-extrabold rounded-xl transition duration-200 flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer flex-1 text-center select-none">
                <i data-lucide="shopping-bag" class="w-3.5 h-3.5"></i>
                Quick Add
              </button>
            </div>
          </div>
        `;

        const pills = parent.querySelectorAll(".gram-pill");
        const input = parent.querySelector(".gram-input");
        const btnMinus = parent.querySelector(".gram-minus");
        const btnPlus = parent.querySelector(".gram-plus");
        const priceDisplay = parent.querySelector(".total-price-display");
        const addBtn = parent.querySelector(".btn-add-enhanced");

        function updatePrice(val) {
          const grams = parseFloat(val) || 0;
          priceDisplay.textContent = `R ${(numericPrice * grams).toFixed(2)}`;
          
          pills.forEach(p => {
            const pVal = parseFloat(p.getAttribute("data-val"));
            if (pVal === grams) {
              p.className = "gram-pill px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg bg-[#68bc34] text-white border border-[#68bc34] transition duration-150 cursor-pointer select-none animate-none";
            } else {
              p.className = "gram-pill px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 transition duration-150 cursor-pointer select-none animate-none";
            }
          });
        }

        pills.forEach(p => {
          p.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const val = p.getAttribute("data-val");
            input.value = val;
            updatePrice(val);
          });
        });

        input.addEventListener("input", (e) => {
          updatePrice(input.value);
        });

        btnMinus.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          let current = parseFloat(input.value) || 0;
          current = Math.max(0.5, current - 0.5);
          input.value = current;
          updatePrice(current);
        });

        btnPlus.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          let current = parseFloat(input.value) || 0;
          current = current + 0.5;
          input.value = current;
          updatePrice(current);
        });

        addBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const grams = parseFloat(input.value) || 1;
          addToCart(name, priceStr, grams, true);
          showToast(`Added ${grams}g ${name} to basket`);
        });

        updatePrice(1);
      } else {
        // Unit item layout
        parent.innerHTML = `
          <div class="w-full space-y-3.5 pt-3">
            <div class="flex flex-col gap-1.5 text-left">
              <span class="text-[10px] text-zinc-500 font-mono uppercase tracking-widest font-bold">Select Quantity</span>
              <div class="flex items-center border border-zinc-200 rounded-lg bg-white overflow-hidden max-w-[120px] h-[30px]">
                <button type="button" class="unit-minus px-3 py-1 text-zinc-400 hover:text-zinc-900 transition font-mono font-black text-sm cursor-pointer select-none">-</button>
                <input type="number" class="unit-input w-full text-center text-xs font-mono font-bold text-zinc-800 focus:outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value="1" min="1" step="1">
                <button type="button" class="unit-plus px-3 py-1 text-zinc-400 hover:text-zinc-900 transition font-mono font-black text-sm cursor-pointer select-none">+</button>
              </div>
            </div>
            <div class="flex items-center justify-between gap-3 pt-2.5 border-t border-zinc-100 text-left">
              <div class="shrink-0">
                <span class="block text-[9px] text-zinc-400 uppercase font-mono tracking-widest font-bold">Total Price</span>
                <span class="total-price-display block font-display font-black text-sm sm:text-base text-zinc-900 font-mono">R ${numericPrice.toFixed(2)}</span>
              </div>
              <button type="button" class="btn-add-enhanced py-2.5 px-4 bg-[#68bc34] hover:bg-[#5aa32c] text-white text-xs font-extrabold rounded-xl transition duration-200 flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer flex-1 text-center select-none">
                <i data-lucide="shopping-bag" class="w-3.5 h-3.5"></i>
                Quick Add
              </button>
            </div>
          </div>
        `;

        const input = parent.querySelector(".unit-input");
        const btnMinus = parent.querySelector(".unit-minus");
        const btnPlus = parent.querySelector(".unit-plus");
        const priceDisplay = parent.querySelector(".total-price-display");
        const addBtn = parent.querySelector(".btn-add-enhanced");

        function updatePrice(val) {
          const qty = parseInt(val) || 0;
          priceDisplay.textContent = `R ${(numericPrice * qty).toFixed(2)}`;
        }

        input.addEventListener("input", (e) => {
          updatePrice(input.value);
        });

        btnMinus.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          let current = parseInt(input.value) || 0;
          current = Math.max(1, current - 1);
          input.value = current;
          updatePrice(current);
        });

        btnPlus.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          let current = parseInt(input.value) || 0;
          current = current + 1;
          input.value = current;
          updatePrice(current);
        });

        addBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const qty = parseInt(input.value) || 1;
          addToCart(name, priceStr, qty, false);
          showToast(`Added ${qty}x ${name} to basket`);
        });

        updatePrice(1);
      }
    });

    // Refresh Lucide
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    // Load state
    loadCart();
  }

  // Expose global methods
  window.cartSystem = {
    openCart: openCart,
    closeCart: closeCart,
    selectMembership: function(type) {
      selectedMembership = type;
      saveCart();
    },
    getMembership: function() {
      return selectedMembership;
    }
  };

  // Execute on DOM load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCart);
  } else {
    initCart();
  }
})();
