import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { firebaseConfig } from "../firebase-config.js";

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let MENU_DATA = [];
let CART = JSON.parse(localStorage.getItem("cart")) || [];
let currentUser = null;
let activePaymentMethod = "qris";

/* ══════════════════════════════════════════════════════
   DISTANCE CALCULATION (ONGKIR)
   ══════════════════════════════════════════════════════ */
const RESTO_LAT = -6.200000;
const RESTO_LNG = 106.816666;

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2-lat1) * (Math.PI/180);
  const dLon = (lon2-lon1) * (Math.PI/180); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; // Distance in km
}

/* ══════════════════════════════════════════════════════
   AUTENTIKASI STATE
   ══════════════════════════════════════════════════════ */
// Helper to toggle user dropdown menu & Tombol Riwayat
function initUserDropdown(user, userData) {
  const nav = document.querySelector("nav");
  const existingArea = document.querySelector(".nav-user-area");
  const navLogin = document.querySelector(".nav-login");
  
  if (existingArea) {
    existingArea.remove();
  }

  if (!user) {
    if (navLogin) {
      navLogin.style.display = "inline-block";
      navLogin.textContent = "Log in";
      navLogin.href = "../Login/login.html";
    }
    return;
  }

  if (navLogin) {
    navLogin.style.display = "none";
  }

  // Prepare display name and initial
  const fullName = userData?.displayName || user.displayName || user.email.split("@")[0];
  const firstName = userData?.firstName || fullName.split(" ")[0];
  const initial = firstName.charAt(0).toUpperCase();
  const email = user.email;

  // Construct user area wrapper
  const userArea = document.createElement("div");
  userArea.className = "nav-user-area";
  userArea.innerHTML = `
    <a href="../profile/history.html" class="nav-history-btn" title="Riwayat Pesanan">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 8v4l3 3"></path>
        <path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"></path>
      </svg>
    </a>
    <div class="nav-user-dropdown-container">
      <button class="nav-user-trigger" id="userDropdownTrigger">
        <div class="nav-user-avatar">${initial}</div>
        <span class="nav-user-name">${firstName}</span>
        <svg class="nav-user-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      <div class="nav-dropdown-menu" id="navDropdownMenu">
        <div class="nav-dropdown-header">
          <div class="nav-dropdown-header-name">${fullName}</div>
          <div class="nav-dropdown-header-email">${email}</div>
        </div>
        <div class="nav-dropdown-divider"></div>
        <a href="../profile/profile.html" class="nav-dropdown-item">
          <span class="nav-dropdown-item-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </span>
          <span>Pengaturan Profil</span>
        </a>
        <div class="nav-dropdown-divider"></div>
        <button class="nav-dropdown-item logout-btn" id="btnLogoutDropdown">
          <span class="nav-dropdown-item-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </span>
          <span>Keluar</span>
        </button>
      </div>
    </div>
  `;

  nav.appendChild(userArea);

  const trigger = userArea.querySelector("#userDropdownTrigger");
  const menu = userArea.querySelector("#navDropdownMenu");
  const logoutBtn = userArea.querySelector("#btnLogoutDropdown");

  // Toggle dropdown
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = menu.classList.contains("show");
    if (isOpen) {
      menu.classList.remove("show");
      trigger.classList.remove("active");
    } else {
      menu.classList.add("show");
      trigger.classList.add("active");
    }
  });

  // Prevent closing dropdown when clicking inside the menu content
  menu.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", () => {
    menu.classList.remove("show");
    trigger.classList.remove("active");
  });

  // Handle logout
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    auth.signOut().then(() => {
      localStorage.removeItem("cart");
      window.location.reload();
    });
  });
}

onAuthStateChanged(auth, async user => {
  currentUser = user;
  
  if (user) {
    // Fetch user data from Firestore
    let userData = null;
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        userData = userDoc.data();
        if (userData.location && userData.location.lat && userData.location.lng) {
          const distance = getDistanceFromLatLonInKm(RESTO_LAT, RESTO_LNG, userData.location.lat, userData.location.lng);
          // Base 10000 + 2500 per km
          ONGKIR = 10000 + Math.ceil(distance) * 2500;
          renderCart();
        }
      } else {
        const admins = ["admindapur@gmail.com", "admin@gmail.com", "onel2@gmail.com"];
        if (!admins.includes(user.email)) {
          await auth.signOut();
          alert("Akun Anda telah dinonaktifkan atau dihapus oleh administrator.");
          window.location.reload();
          return;
        }
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
    }
    initUserDropdown(user, userData);
  } else {
    initUserDropdown(null, null);
  }
});

/* ══════════════════════════════════════════════════════
   STATE (Untuk Kustomisasi Item)
   ══════════════════════════════════════════════════════ */
let selectedItem = null;   // item object yang sedang dipilih untuk kustomisasi
let qty = 1;
let checkedAddons = new Set();
let ONGKIR = 10000;

/* ══════════════════════════════════════════════════════
   UTILS
   ══════════════════════════════════════════════════════ */
function fmt(n) {
  return "Rp " + (n / 1000).toFixed(0) + "k";
}

function toast(msg) {
  const el  = document.getElementById("toast");
  const txt = document.getElementById("toast-msg");
  txt.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2400);
}

/* ══════════════════════════════════════════════════════
   SIDEBAR VIEW SWITCHING
   ══════════════════════════════════════════════════════ */
function showPane(paneId) {
  document.querySelectorAll(".sidebar-pane").forEach(pane => {
    pane.classList.remove("active");
  });
  document.getElementById(paneId).classList.add("active");
}

/* ══════════════════════════════════════════════════════
   CONFIGURING ITEM (Kustomisasi) — update tampilan
   ══════════════════════════════════════════════════════ */
function renderSidebar() {
  if (!selectedItem) return;

  const item = selectedItem;

  // emoji box
  const box = document.getElementById("sel-emoji-box");
  box.className = "selected-item-emoji " + (item.colorClass === "card-c1" ? "c1" : item.colorClass === "card-c2" ? "c2" : "c3");
  box.innerHTML = item.imageUrl ? `<img src="${item.imageUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" alt="${item.name}">` : `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="card-placeholder-svg" style="opacity:0.5;">
      <path d="M3 2v7c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2V2"></path>
      <path d="M7 2v20"></path>
      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path>
    </svg>
  `;
  document.getElementById("sel-name").textContent  = item.name;
  document.getElementById("sel-cat").textContent   = item.catLabel;
  document.getElementById("qty-num").textContent   = qty;

  // add-ons
  const addonList = document.getElementById("addon-list");
  addonList.innerHTML = "";
  const addons = item.addons || [];
  addons.forEach((a, i) => {
    const div = document.createElement("div");
    div.className = "addon-item" + (checkedAddons.has(i) ? " checked" : "");
    div.innerHTML = `
      <div class="addon-left">
        <div class="addon-check">${checkedAddons.has(i) ? "✓" : ""}</div>
        <span class="addon-name">${a.name}</span>
      </div>
      <span class="addon-price">${a.price > 0 ? "+" + fmt(a.price) : "Gratis"}</span>
    `;
    div.addEventListener("click", () => {
      if (checkedAddons.has(i)) checkedAddons.delete(i);
      else checkedAddons.add(i);
      renderSidebar();
    });
    addonList.appendChild(div);
  });

  updateTotal();
}

function updateTotal() {
  if (!selectedItem) return;
  const addons = selectedItem.addons || [];
  const addonTotal = [...checkedAddons].reduce((s, i) => s + (addons[i]?.price || 0), 0);
  const sub  = (selectedItem.price + addonTotal) * qty;

  document.getElementById("item-subtotal").textContent  = fmt(sub);
}

/* ══════════════════════════════════════════════════════
   PERSISTENT CART (Keranjang Pesanan)
   ══════════════════════════════════════════════════════ */
function renderCart() {
  const container = document.getElementById("cart-items-list");
  container.innerHTML = "";

  const btnOrderSubmit = document.getElementById("btn-submit-order");

  if (CART.length === 0) {
    container.innerHTML = `
      <div class="cart-empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--warm-gray); opacity: 0.6; margin-bottom: 0.5rem;">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        <p style="margin: 0; font-weight: 500; color: var(--dark);">Keranjang belanja kosong</p>
        <small style="color: var(--warm-gray); display: block; margin-top: 4px;">Pilih hidangan lezat kami di sebelah kiri untuk memesan.</small>
      </div>
    `;
    btnOrderSubmit.disabled = true;
    btnOrderSubmit.style.opacity = "0.5";
    btnOrderSubmit.style.cursor = "not-allowed";

    document.getElementById("cart-subtotal").textContent = "Rp 0";
    document.getElementById("cart-grand").textContent = "Rp 0";

    // Sync menu grid card states and quantity counters even when empty
    const activeTab = document.querySelector(".cat-tab.active");
    if (activeTab && MENU_DATA && MENU_DATA.length > 0) {
      renderGrid(activeTab.dataset.cat);
    }
    return;
  }

  btnOrderSubmit.disabled = false;
  btnOrderSubmit.style.opacity = "1";
  btnOrderSubmit.style.cursor = "pointer";

  let cartSubtotal = 0;

  CART.forEach((cartItem, index) => {
    const addonsPrice = cartItem.addons.reduce((sum, a) => sum + a.price, 0);
    const itemSub = (cartItem.price + addonsPrice) * cartItem.qty;
    cartSubtotal += itemSub;

    const addonsLabel = cartItem.addons.map(a => `+ ${a.name}`).join(", ");

    const div = document.createElement("div");
    div.className = "cart-item-card";
    div.innerHTML = `
      <div class="cart-item-top">
        <div>
          <h4 class="cart-item-title" style="display: flex; align-items: center; gap: 4px;">
            ${cartItem.imageUrl ? `<img src="${cartItem.imageUrl}" style="width:24px;height:24px;object-fit:cover;border-radius:4px;vertical-align:middle;margin-right:6px;">` : `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:6px; color:var(--warm-gray);">
                <path d="M3 2v7c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2V2"></path>
                <path d="M7 2v20"></path>
                <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path>
              </svg>
            `}
            ${cartItem.name}
          </h4>
          ${addonsLabel ? `<p class="cart-item-addons-text">${addonsLabel}</p>` : ""}
        </div>
        <button class="cart-item-del-btn" data-index="${index}">&times;</button>
      </div>
      <div class="cart-item-bottom">
        <div class="qty-controls" style="scale: 0.85; transform-origin: left center;">
          <button class="qty-btn dec-cart-qty" data-index="${index}">−</button>
          <span class="qty-num">${cartItem.qty}</span>
          <button class="qty-btn inc-cart-qty" data-index="${index}">+</button>
        </div>
        <span class="cart-item-price">${fmt(itemSub)}</span>
      </div>
    `;

    // Handler Hapus Item
    div.querySelector(".cart-item-del-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      CART.splice(index, 1);
      saveCart();
      renderCart();
      toast("Paket dihapus dari keranjang!");
    });

    // Qty Increment
    div.querySelector(".inc-cart-qty").addEventListener("click", (e) => {
      e.stopPropagation();
      CART[index].qty++;
      saveCart();
      renderCart();
    });

    // Qty Decrement
    div.querySelector(".dec-cart-qty").addEventListener("click", (e) => {
      e.stopPropagation();
      if (CART[index].qty > 1) {
        CART[index].qty--;
        toast("Kuantitas keranjang diperbarui!");
      } else {
        CART.splice(index, 1);
        toast("Paket dihapus dari keranjang!");
      }
      saveCart();
      renderCart();
    });


    container.appendChild(div);
  });

  const cartGrand = cartSubtotal + ONGKIR;
  document.getElementById("cart-subtotal").textContent = fmt(cartSubtotal);
  document.getElementById("cart-grand").textContent = fmt(cartGrand);

  // Sync menu grid card states and quantity counters
  const activeTab = document.querySelector(".cat-tab.active");
  if (activeTab && MENU_DATA && MENU_DATA.length > 0) {
    renderGrid(activeTab.dataset.cat);
  }
}


function saveCart() {
  localStorage.setItem("cart", JSON.stringify(CART));
}

/* ══════════════════════════════════════════════════════
   MENU GRID — render berdasarkan kategori aktif
   ══════════════════════════════════════════════════════ */
function renderGrid(cat) {
  const grid = document.getElementById("menu-grid");
  grid.innerHTML = "";

  const list = cat === "all" ? MENU_DATA : MENU_DATA.filter(m => m.cat === cat);

  if (list.length === 0) {
    grid.innerHTML = `<div class="menu-empty">Belum ada paket di kategori ini</div>`;
    return;
  }

  list.forEach(item => {
    const isSelected = selectedItem && selectedItem.id === item.id;
    const card = document.createElement("div");
    card.className = "food-card" + (isSelected ? " selected-menu" : "");

    // Cari apakah item dasar (tanpa addons) dari menuId ini ada di keranjang
    const cartItemIndex = CART.findIndex(c => c.menuId === item.id && (!c.addons || c.addons.length === 0));
    const cartItem = cartItemIndex !== -1 ? CART[cartItemIndex] : null;

    let footerActionHtml = "";
    if (cartItem) {
      footerActionHtml = `
        <div class="card-qty-counter">
          <button class="qty-btn dec-card-shortcut-qty" data-index="${cartItemIndex}">−</button>
          <span class="qty-num">${cartItem.qty}</span>
          <button class="qty-btn inc-card-shortcut-qty" data-index="${cartItemIndex}">+</button>
        </div>
      `;
    } else {
      footerActionHtml = `
        <button class="card-order-btn btn-add-cart-shortcut">+ Tambah</button>
      `;
    }

    card.innerHTML = `
      <div class="card-img ${item.colorClass || 'card-c1'}" style="position:relative; display:flex; align-items:center; justify-content:center;">
        ${isSelected ? '<span class="card-badge" style="background:var(--orange)">Dipilih</span>' : '<span class="card-badge">Hari Ini</span>'}
        ${item.imageUrl ? `<img src="${item.imageUrl}" class="card-image" alt="${item.name}">` : `
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" class="card-placeholder-svg" style="opacity: 0.25;">
            <path d="M3 2v7c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2V2"></path>
            <path d="M7 2v20"></path>
            <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path>
          </svg>
        `}
        <button class="card-hover-customize-btn" style="display: flex; align-items: center; gap: 4px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          Kustomisasi
        </button>
      </div>
      <div class="card-body">
        <p class="card-tag">${item.catLabel}</p>
        <h3 class="card-name">${item.name}</h3>
        <p class="card-desc">${item.desc}</p>
        <div class="card-footer">
          <span class="card-price">${fmt(item.price)}</span>
          ${footerActionHtml}
        </div>
      </div>
    `;

    // Click customize button inside card image opens customization view
    const customizeBtn = card.querySelector(".card-hover-customize-btn");
    customizeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      selectItem(item);
    });

    if (cartItem) {
      // Qty Decrement on Card
      const decBtn = card.querySelector(".dec-card-shortcut-qty");
      decBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (CART[cartItemIndex].qty > 1) {
          CART[cartItemIndex].qty--;
          toast("Kuantitas keranjang diperbarui!");
        } else {
          CART.splice(cartItemIndex, 1);
          toast("Paket dihapus dari keranjang!");
        }
        saveCart();
        renderCart();
      });

      // Qty Increment on Card
      const incBtn = card.querySelector(".inc-card-shortcut-qty");
      incBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        CART[cartItemIndex].qty++;
        saveCart();
        renderCart();
        toast("Kuantitas keranjang diperbarui!");
      });
    } else {
      // Direct add shortcut on "+ Tambah" button click
      const addBtn = card.querySelector(".btn-add-cart-shortcut");
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        
        CART.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          menuId: item.id,
          name: item.name,
          imageUrl: item.imageUrl,
          price: item.price,
          qty: 1,
          addons: []
        });

        saveCart();
        renderCart();
        toast(`${item.name} dimasukkan keranjang!`);
      });
    }

    grid.appendChild(card);
  });
}


/* ══════════════════════════════════════════════════════
   SELECT ITEM — saat klik menu untuk dikustomisasi
   ══════════════════════════════════════════════════════ */
function selectItem(item) {
  selectedItem = item;
  qty = 1;
  checkedAddons.clear();

  // update hero banner
  updateHero();

  // update active tab selection state
  document.querySelectorAll(".cat-tab").forEach(t => t.classList.remove("active"));
  const allTab = document.querySelector('.cat-tab[data-cat="all"]');
  if (allTab) allTab.classList.add("active");
  renderGrid("all");

  // Buka pane Kustomisasi
  renderSidebar();
  showPane("configure-view");
}

/* ══════════════════════════════════════════════════════
   HERO BANNER
   ══════════════════════════════════════════════════════ */
function updateHero() {
  if (selectedItem) {
    document.getElementById("hero-tag").textContent   = selectedItem.catLabel;
    document.getElementById("hero-name").textContent  = selectedItem.name;
    document.getElementById("hero-desc").textContent  = selectedItem.desc;
    const heroBox = document.getElementById("hero-emoji");
    if (selectedItem.imageUrl) {
      heroBox.innerHTML = `<img src="${selectedItem.imageUrl}" class="menu-hero-image" alt="${selectedItem.name}">`;
    } else {
      heroBox.innerHTML = `
        <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="var(--cream)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.3;">
          <path d="M3 2v7c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2V2"></path>
          <path d="M7 2v20"></path>
          <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path>
        </svg>
      `;
    }
  } else {
    document.getElementById("hero-tag").textContent   = "Catering";
    document.getElementById("hero-name").textContent  = "Pilih paketmu";
    document.getElementById("hero-desc").textContent  = "Semua paket catering tersedia dan siap dipesan untuk acara Anda.";
    document.getElementById("hero-emoji").innerHTML = `
      <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="var(--cream)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.3;">
        <path d="M3 2v7c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2V2"></path>
        <path d="M7 2v20"></path>
        <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path>
      </svg>
    `;
  }
}

/* ══════════════════════════════════════════════════════
   ADD TO CART HANDLER (Tombol "Tambah ke Pesanan")
   ══════════════════════════════════════════════════════ */
document.getElementById("btn-add-to-cart").addEventListener("click", () => {
  if (!selectedItem) return;

  const addonsArr = selectedItem.addons || [];
  const selectedAddons = [...checkedAddons].map(i => addonsArr[i]);

  // Tambahkan item ke keranjang belanja
  CART.push({
    id: Date.now().toString(),
    menuId: selectedItem.id,
    name: selectedItem.name,
    imageUrl: selectedItem.imageUrl,
    price: selectedItem.price,
    qty: qty,
    addons: selectedAddons
  });

  saveCart();
  toast(`${selectedItem.name} ditambahkan!`);

  // Reset kustomisasi & kembali ke keranjang
  selectedItem = null;
  updateHero();
  renderCart();
  showPane("cart-view");

  // Re-render grid to clear select border
  const activeTab = document.querySelector(".cat-tab.active");
  renderGrid(activeTab ? activeTab.dataset.cat : "all");
});

// Tombol Kembali/Batal
document.getElementById("btn-back-to-cart").addEventListener("click", () => {
  selectedItem = null;
  updateHero();
  showPane("cart-view");

  const activeTab = document.querySelector(".cat-tab.active");
  renderGrid(activeTab ? activeTab.dataset.cat : "all");
});

/* ══════════════════════════════════════════════════════
   QTY CONTROLS (Kustomisasi)
   ══════════════════════════════════════════════════════ */
document.getElementById("qty-minus").addEventListener("click", () => {
  if (qty > 1) { qty--; renderSidebar(); }
});

document.getElementById("qty-plus").addEventListener("click", () => {
  qty++;
  renderSidebar();
});

/* ══════════════════════════════════════════════════════
   CATEGORY TABS
   ══════════════════════════════════════════════════════ */
document.querySelectorAll(".cat-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".cat-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    renderGrid(tab.dataset.cat);
  });
});

/* ══════════════════════════════════════════════════════
   CHECKOUT LOGIN CHECK & PAYMENT MODAL FLOW
   ══════════════════════════════════════════════════════ */
document.getElementById("btn-submit-order").addEventListener("click", () => {
  if (CART.length === 0) {
    toast("Keranjang belanja kosong!");
    return;
  }

  // 1. CEK STATUS LOGIN PENGGUNA (Menggunakan SDK langsung untuk performa instan dan aman)
  const user = auth.currentUser;
  if (!user) {
    sessionStorage.setItem("authRedirect", "../catering/catering.html");
    toast("Silakan Login terlebih dahulu untuk memesan!");
    setTimeout(() => {
      window.location.href = "../Login/login.html";
    }, 1500);
    return;
  }

  // 2. JIKA SUDAH LOGIN, BUKA MODAL METODE PEMBAYARAN
  openPaymentModal();
});

function openPaymentModal() {
  const payModal = document.getElementById("payment-modal");
  
  // Hitung total harga keranjang
  const cartSubtotal = CART.reduce((sum, item) => {
    const addonsPrice = item.addons.reduce((s, a) => s + a.price, 0);
    return sum + (item.price + addonsPrice) * item.qty;
  }, 0);
  const payTotal = cartSubtotal + ONGKIR;

  document.getElementById("pay-modal-total").textContent = fmt(payTotal);

  // Set default method QRIS
  setPaymentDetails("qris");

  payModal.classList.add("show");
}

function closePaymentModal() {
  document.getElementById("payment-modal").classList.remove("show");
}

document.getElementById("btn-close-payment").addEventListener("click", closePaymentModal);

// Toggling metode pembayaran di dalam modal
document.querySelectorAll(".payment-option-btn").forEach(btn => {
  btn.addEventListener("click", (e) => {
    document.querySelectorAll(".payment-option-btn").forEach(b => b.classList.remove("active"));
    const selectedBtn = e.currentTarget;
    selectedBtn.classList.add("active");
    
    activePaymentMethod = selectedBtn.dataset.method;
    setPaymentDetails(activePaymentMethod);
  });
});

function setPaymentDetails(method) {
  const detailsBox = document.getElementById("payment-details-content");
  detailsBox.innerHTML = "";

  if (method === "qris") {
    detailsBox.innerHTML = `
      <div style="text-align: center;">
        <p style="font-size: 0.85rem; color: rgba(255, 248, 240, 0.75); margin-bottom: 0.5rem;">
          Pindai QRIS di bawah dengan aplikasi E-Wallet Anda (Gopay/OVO/Dana)
        </p>
        <div class="qr-placeholder">
          <img class="qr-img" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=DapurLodehOrderPay" alt="QRIS Dapur Lodeh">
        </div>
        <p style="font-size: 0.75rem; color: var(--orange-light); margin-top: 0.4rem; font-weight: 500;">
          ⚡ Pembayaran akan otomatis terverifikasi instan
        </p>
      </div>
    `;
  } else if (method === "tf") {
    detailsBox.innerHTML = `
      <div style="font-size: 0.85rem; color: rgba(255, 248, 240, 0.85);">
        <p style="margin-bottom: 0.8rem; color: rgba(255, 248, 240, 0.7);">Silakan transfer ke salah satu rekening resmi Dapur Lodeh:</p>
        <div style="background: rgba(255,255,255,0.06); border-radius: 12px; padding: 0.8rem 1rem; margin-bottom: 0.8rem; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <span style="font-weight: 700; color: #fff;">BCA (Dapur Lodeh)</span><br>
            <span style="font-size: 1rem; letter-spacing: 0.05em; font-family: monospace;" id="acc-bca">8012 3456 78</span>
          </div>
          <button class="btn-copy-acc" data-target="acc-bca">Salin</button>
        </div>
        <div style="background: rgba(255,255,255,0.06); border-radius: 12px; padding: 0.8rem 1rem; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <span style="font-weight: 700; color: #fff;">Mandiri (Dapur Lodeh)</span><br>
            <span style="font-size: 1rem; letter-spacing: 0.05em; font-family: monospace;" id="acc-mandiri">13700 12345 678</span>
          </div>
          <button class="btn-copy-acc" data-target="acc-mandiri">Salin</button>
        </div>
      </div>
    `;
  } else if (method === "cod") {
    detailsBox.innerHTML = `
      <div style="text-align: center; padding: 0.6rem 0;">
        <p style="font-size: 0.9rem; line-height: 1.6; color: rgba(255, 248, 240, 0.85); margin: 0;">
          Bayar pesanan secara tunai (Cash) ke kurir Dapur Lodeh begitu makanan sampai di alamat Anda.
        </p>
        <p style="font-size: 0.75rem; color: var(--orange-light); margin-top: 0.6rem; font-weight: 500;">
          💡 Mohon siapkan uang pas untuk kenyamanan transaksi kurir kami.
        </p>
      </div>
    `;
  }
}

// Clipboard copier helper
document.addEventListener("click", e => {
  if (e.target.classList.contains("btn-copy-acc")) {
    const targetId = e.target.dataset.target;
    const txt = document.getElementById(targetId).textContent;
    navigator.clipboard.writeText(txt);
    e.target.textContent = "Salin ✓";
    e.target.style.background = "#4CAF50";
    setTimeout(() => {
      e.target.textContent = "Salin";
      e.target.style.background = "var(--orange)";
    }, 1800);
  }
});

/* ══════════════════════════════════════════════════════
   KONFIRMASI PEMBAYARAN (Saving Order to Firestore)
   ══════════════════════════════════════════════════════ */
document.getElementById("btn-confirm-pay").addEventListener("click", async () => {
  const btn = document.getElementById("btn-confirm-pay");
  btn.disabled = true;
  btn.innerHTML = `<span>Memproses Pesanan...</span> <span class="btn-spinner" style="display:inline-block;"></span>`;

  try {
    const cartSubtotal = CART.reduce((sum, item) => {
      const addonsPrice = item.addons.reduce((s, a) => s + a.price, 0);
      return sum + (item.price + addonsPrice) * item.qty;
    }, 0);
    const payTotal = cartSubtotal + ONGKIR;

    // Persiapkan data order lengkap
    const orderData = {
      userId: currentUser.uid,
      userEmail: currentUser.email,
      items: CART.map(item => ({
        menuId: item.menuId,
        name: item.name,
        imageUrl: item.imageUrl,
        qty: item.qty,
        price: item.price,
        addons: item.addons.map(a => ({ name: a.name, price: a.price }))
      })),
      note: document.getElementById("order-note").value.trim(),
      subtotal: cartSubtotal,
      ongkir: ONGKIR,
      total: payTotal,
      paymentMethod: activePaymentMethod,
      orderType: "Catering", // Penanda order dari catering
      status: "Pending", // Status awal pemesanan
      createdAt: new Date().toISOString()
    };

    // Simpan ke Firestore collection "orders"
    await addDoc(collection(db, "orders"), orderData);

    // KOSONGKAN KERANJANG BELANJA
    CART = [];
    saveCart();
    renderCart();

    // Tampilkan Layar Sukses Pembayaran
    showPaymentSuccess();

  } catch (error) {
    console.error("Error checkout:", error);
    alert("Gagal melakukan pemesanan: " + error.message);
    btn.disabled = false;
    btn.innerHTML = `<span>Konfirmasi & Bayar</span> <span style="font-size:1.1rem">💳</span>`;
  }
});

function showPaymentSuccess() {
  const cardBody = document.getElementById("payment-card-body");
  cardBody.innerHTML = `
    <div class="payment-success-content" style="display: flex; flex-direction: column; align-items: center; text-align: center; padding: 2rem 0;">
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#e8621a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 1.5rem; filter: drop-shadow(0 4px 12px rgba(232, 98, 26, 0.15));">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <h3 class="payment-success-title">Pembayaran Sukses!</h3>
      <p class="payment-success-text">
        <p style="font-size: 0.95rem; color: #cbd5e1; margin-bottom: 2rem; line-height: 1.5;">Pesanan Anda berhasil dikirim dan sedang kami proses. Mohon siapkan pembayaran sesuai metode yang dipilih.</p>
      </p>
      <button class="btn-order" id="btn-success-close">Kembali ke Catering</button>
    </div>
  `;

  document.getElementById("btn-success-close").addEventListener("click", () => {
    // Reload halaman untuk mereset modal dan render paket awal
    window.location.reload();
  });
}

/* ══════════════════════════════════════════════════════
   INIT — Fetch from Firebase & Load Cart
   ══════════════════════════════════════════════════════ */
async function init() {
  document.getElementById("menu-grid").innerHTML = `<div class="menu-empty">Memuat daftar paket...</div>`;
  
  // Render persistent cart first
  renderCart();
  showPane("cart-view");

  try {
    const querySnapshot = await getDocs(collection(db, "catering"));
    MENU_DATA = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      MENU_DATA.push({ id: doc.id, ...data });
    });

    MENU_DATA = MENU_DATA.filter(m => m.isActive !== false);

  } catch (error) {
    console.error("Error loading menus:", error);
    document.getElementById("menu-grid").innerHTML = `<div class="menu-empty" style="color:red;">Gagal memuat paket: ${error.message}</div>`;
    return;
  }

  const params  = new URLSearchParams(window.location.search);
  const itemId  = params.get("item");

  if (itemId) {
    const found = MENU_DATA.find(m => m.id === itemId);
    if (found) {
      selectItem(found);
      return;
    }
  }

  // Default grid render
  updateHero();
  renderGrid("all");

  // Deteksi directCheckoutItem dari sessionStorage pasca-login
  const directItemStr = sessionStorage.getItem("directCheckoutItem");
  if (directItemStr) {
    const directItem = JSON.parse(directItemStr);
    sessionStorage.removeItem("directCheckoutItem");
    
    // Cari apakah item dasar sudah ada di keranjang
    const existingIndex = CART.findIndex(c => c.menuId === directItem.id && (!c.addons || c.addons.length === 0));
    if (existingIndex !== -1) {
      CART[existingIndex].qty++;
    } else {
      CART.push({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        menuId: directItem.id,
        name: directItem.name,
        emoji: directItem.emoji,
        price: directItem.price,
        qty: 1,
        addons: []
      });
    }
    
    saveCart();
    renderCart();
    
    // Jika sudah login, otomatis buka pembayaran
    if (auth.currentUser) {
      setTimeout(() => {
        openPaymentModal();
      }, 300);
    }
  }
}


init();
