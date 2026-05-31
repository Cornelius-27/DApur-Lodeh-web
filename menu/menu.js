import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
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

let USER_FAVORITES = [];

onAuthStateChanged(auth, async user => {
  currentUser = user;
  
  if (user) {
    let userData = null;
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        userData = userDoc.data();
        USER_FAVORITES = userData.favorites || [];
        if (userData.location && userData.location.lat && userData.location.lng) {
          const distance = getDistanceFromLatLonInKm(RESTO_LAT, RESTO_LNG, userData.location.lat, userData.location.lng);
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
    USER_FAVORITES = [];
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

function toast(msg, type = "success") {
  const el = document.getElementById("toast");
  if (!el) return;
  
  // Set type classes
  el.className = ""; // clear all
  el.classList.add("show", type);
  
  // Icons mapping
  let iconHtml = "";
  if (type === "success") {
    iconHtml = `
      <svg class="toast-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    `;
  } else if (type === "warning") {
    iconHtml = `
      <svg class="toast-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></svg>
      </svg>
    `;
  } else if (type === "error") {
    iconHtml = `
      <svg class="toast-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--error)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
    `;
  }
  
  el.innerHTML = `
    ${iconHtml}
    <div class="toast-content-wrapper">${msg}</div>
  `;
  
  setTimeout(() => el.classList.remove("show"), 3200);
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
      toast("Menu dihapus dari keranjang!");
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
        toast("Menu dihapus dari keranjang!");
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
    renderFavoritesSection();
  }
}


function saveCart() {
  localStorage.setItem("cart", JSON.stringify(CART));
}

/* ══════════════════════════════════════════════════════
   MENU GRID & FAVORITE SECTION — render berdasarkan kategori aktif
   ══════════════════════════════════════════════════════ */
async function toggleFavorite(menuId) {
  if (!currentUser) {
    toast("Silakan Login terlebih dahulu untuk menandai menu favorit!", "warning");
    return;
  }
  
  const idx = USER_FAVORITES.indexOf(menuId);
  if (idx > -1) {
    USER_FAVORITES.splice(idx, 1);
    toast("Dihapus dari favorit", "success");
  } else {
    USER_FAVORITES.push(menuId);
    toast("Ditambahkan ke favorit!", "success");
  }
  
  try {
    await updateDoc(doc(db, "users", currentUser.uid), {
      favorites: USER_FAVORITES
    });
  } catch (err) {
    console.error("Gagal memperbarui favorit:", err);
  }
  
  const activeTab = document.querySelector(".cat-tab.active");
  renderGrid(activeTab ? activeTab.dataset.cat : "all");
  renderFavoritesSection();
}

function createFoodCard(item) {
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

  const isFav = USER_FAVORITES.includes(item.id);

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
      <button class="card-fav-btn" data-id="${item.id}" style="position: absolute; top: 14px; right: 14px; background: rgba(255,255,255,0.85); border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; z-index: 2; box-shadow: 0 2px 8px rgba(0,0,0,0.12);" title="Tandai Favorit">
        <svg class="heart-icon" width="14" height="14" viewBox="0 0 24 24" fill="${isFav ? '#EF4444' : 'none'}" stroke="${isFav ? '#EF4444' : '#64748b'}" stroke-width="2.5" style="transition: all 0.2s;">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path>
        </svg>
      </button>
      <button class="card-hover-customize-btn" style="display: flex; align-items: center; gap: 4px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l-.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
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

  const favBtn = card.querySelector(".card-fav-btn");
  favBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFavorite(item.id);
  });

  const customizeBtn = card.querySelector(".card-hover-customize-btn");
  customizeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    selectItem(item);
  });

  if (cartItem) {
    const decBtn = card.querySelector(".dec-card-shortcut-qty");
    decBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (CART[cartItemIndex].qty > 1) {
        CART[cartItemIndex].qty--;
        toast("Kuantitas keranjang diperbarui!");
      } else {
        CART.splice(cartItemIndex, 1);
        toast("Menu dihapus dari keranjang!");
      }
      saveCart();
      renderCart();
    });

    const incBtn = card.querySelector(".inc-card-shortcut-qty");
    incBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      CART[cartItemIndex].qty++;
      saveCart();
      renderCart();
      toast("Kuantitas keranjang diperbarui!");
    });
  } else {
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

  return card;
}

function renderGrid(cat) {
  const grid = document.getElementById("menu-grid");
  grid.innerHTML = "";

  let list = [];
  if (cat === "all") {
    list = MENU_DATA;
  } else {
    list = MENU_DATA.filter(m => m.cat === cat);
  }

  if (list.length === 0) {
    grid.innerHTML = `<div class="menu-empty" style="grid-column: 1/-1;">Belum ada menu di kategori ini</div>`;
    return;
  }

  list.forEach(item => {
    const card = createFoodCard(item);
    grid.appendChild(card);
  });
}

function renderFavoritesSection() {
  const favSection = document.getElementById("fav-section");
  const favGrid = document.getElementById("fav-grid");
  if (!favSection || !favGrid) return;

  if (!currentUser || USER_FAVORITES.length === 0) {
    favSection.style.display = "none";
    favGrid.innerHTML = "";
    return;
  }

  // Filter ONLY active/available menu items that are inside the favorites array
  const favItems = MENU_DATA.filter(m => USER_FAVORITES.includes(m.id));

  if (favItems.length === 0) {
    favSection.style.display = "none";
    favGrid.innerHTML = "";
    return;
  }

  favSection.style.display = "block";
  favGrid.innerHTML = "";

  favItems.forEach(item => {
    const card = createFoodCard(item);
    favGrid.appendChild(card);
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
    document.getElementById("hero-tag").textContent   = "Menu";
    document.getElementById("hero-name").textContent  = "Pilih makananmu";
    document.getElementById("hero-desc").textContent  = "Semua menu tersedia dan siap dipesan untuk kamu.";
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
    sessionStorage.setItem("authRedirect", "../menu/menu.html");
    toast("Silakan Login terlebih dahulu untuk memesan!");
    setTimeout(() => {
      window.location.href = "../Login/login.html";
    }, 1500);
    return;
  }

  // 2. JIKA SUDAH LOGIN, BUKA MODAL METODE PEMBAYARAN
  openPaymentModal();
});

let checkoutMap = null;
let checkoutMarker = null;
let uploadedReceiptBase64 = "";

function initCheckoutMap(lat, lng) {
  setTimeout(() => {
    const mapContainer = document.getElementById("checkout-map");
    if (!mapContainer) return;
    
    if (checkoutMap) {
      checkoutMap.setView([lat, lng], 15);
      checkoutMarker.setLatLng([lat, lng]);
      checkoutMap.invalidateSize();
      return;
    }
    
    checkoutMap = L.map('checkout-map').setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(checkoutMap);
    
    checkoutMarker = L.marker([lat, lng], { draggable: true }).addTo(checkoutMap);
    
    updateShippingFromCoords(lat, lng);
    
    checkoutMarker.on('dragend', async function () {
      const position = checkoutMarker.getLatLng();
      document.getElementById("checkout-lat").value = position.lat;
      document.getElementById("checkout-lng").value = position.lng;
      
      updateShippingFromCoords(position.lat, position.lng);
      
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}`);
        const data = await response.json();
        if (data && data.display_name) {
          document.getElementById("checkout-address-auto").value = data.display_name;
        }
      } catch(err) {
        console.error("Geocoding failed", err);
      }
    });
  }, 300);
}

function updateShippingFromCoords(lat, lng) {
  const distance = getDistanceFromLatLonInKm(RESTO_LAT, RESTO_LNG, lat, lng);
  ONGKIR = 10000 + Math.ceil(distance) * 2500;
  
  const cartSubtotal = CART.reduce((sum, item) => {
    const addonsPrice = item.addons.reduce((s, a) => s + a.price, 0);
    return sum + (item.price + addonsPrice) * item.qty;
  }, 0);
  const payTotal = cartSubtotal + ONGKIR;
  
  document.getElementById("pay-modal-total").textContent = fmt(payTotal);
  document.getElementById("cart-grand").textContent = fmt(payTotal);
}

async function openPaymentModal() {
  const payModal = document.getElementById("payment-modal");
  
  const cartSubtotal = CART.reduce((sum, item) => {
    const addonsPrice = item.addons.reduce((s, a) => s + a.price, 0);
    return sum + (item.price + addonsPrice) * item.qty;
  }, 0);
  const payTotal = cartSubtotal + ONGKIR;

  document.getElementById("pay-modal-total").textContent = fmt(payTotal);
  setPaymentDetails("qris");
  payModal.classList.add("show");

  let lat = -6.200000;
  let lng = 106.816666;
  
  if (currentUser) {
    try {
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.location && userData.location.lat && userData.location.lng) {
          lat = userData.location.lat;
          lng = userData.location.lng;
        } else if (userData.lat && userData.lng) {
          lat = userData.lat;
          lng = userData.lng;
        }
        
        const addressAutoEl = document.getElementById("checkout-address-auto");
        const addressDetailEl = document.getElementById("checkout-address-detail");
        if (addressAutoEl) addressAutoEl.value = userData.addressAuto || userData.location?.addressAuto || "";
        if (addressDetailEl) addressDetailEl.value = userData.addressDetail || userData.location?.addressDetail || "";
      }
    } catch (err) {
      console.error("Error pre-filling location:", err);
    }
  }
  
  document.getElementById("checkout-lat").value = lat;
  document.getElementById("checkout-lng").value = lng;
  
  initCheckoutMap(lat, lng);
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
  uploadedReceiptBase64 = ""; 

  if (method === "qris") {
    detailsBox.innerHTML = `
      <div style="text-align: center;">
        <p style="font-size: 0.85rem; color: rgba(255, 248, 240, 0.75); margin-bottom: 0.5rem;">
          Pindai QRIS di bawah dengan aplikasi E-Wallet Anda (Gopay/OVO/Dana)
        </p>
        <div class="qr-placeholder">
          <img class="qr-img" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=DapurLodehOrderPay" alt="QRIS Dapur Lodeh">
        </div>
        <div style="margin-top: 1rem; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 0.8rem; text-align: left;">
          <label style="display:block; font-size:0.8rem; color:#fff; font-weight:600; margin-bottom:6px;">Unggah Bukti Pembayaran:</label>
          <input type="file" id="receipt-upload" accept="image/*" style="font-size:0.75rem; color:var(--cream);" required />
          <div id="receipt-preview-box" style="margin-top:8px; display:none; max-height:100px; border-radius:8px; overflow:hidden;">
            <img id="receipt-preview" style="max-height:100px; max-width:100%; object-fit:contain;" />
          </div>
        </div>
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
        <div style="margin-top: 1rem; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 0.8rem; text-align: left;">
          <label style="display:block; font-size:0.8rem; color:#fff; font-weight:600; margin-bottom:6px;">Unggah Bukti Pembayaran:</label>
          <input type="file" id="receipt-upload" accept="image/*" style="font-size:0.75rem; color:var(--cream);" required />
          <div id="receipt-preview-box" style="margin-top:8px; display:none; max-height:100px; border-radius:8px; overflow:hidden;">
            <img id="receipt-preview" style="max-height:100px; max-width:100%; object-fit:contain;" />
          </div>
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

  const fileInput = document.getElementById("receipt-upload");
  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(evt) {
        uploadedReceiptBase64 = evt.target.result;
        
        const previewBox = document.getElementById("receipt-preview-box");
        const previewImg = document.getElementById("receipt-preview");
        if (previewBox && previewImg) {
          previewImg.src = evt.target.result;
          previewBox.style.display = "block";
        }
      };
      reader.readAsDataURL(file);
    });
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
  
  const addressDetail = document.getElementById("checkout-address-detail").value.trim();
  const addressAuto = document.getElementById("checkout-address-auto").value.trim();
  const lat = parseFloat(document.getElementById("checkout-lat").value);
  const lng = parseFloat(document.getElementById("checkout-lng").value);

  if (!addressDetail) {
    toast("Silakan isi detail alamat lengkap pengiriman kurir!", "warning");
    return;
  }

  if (activePaymentMethod !== "cod" && !uploadedReceiptBase64) {
    toast("Silakan unggah foto bukti transfer/pembayaran QRIS Anda!", "warning");
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<span>Memproses Pesanan...</span> <span class="btn-spinner" style="display:inline-block;"></span>`;

  try {
    const cartSubtotal = CART.reduce((sum, item) => {
      const addonsPrice = item.addons.reduce((s, a) => s + a.price, 0);
      return sum + (item.price + addonsPrice) * item.qty;
    }, 0);
    const payTotal = cartSubtotal + ONGKIR;

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
      addressDetail: addressDetail,
      addressAuto: addressAuto,
      lat: lat,
      lng: lng,
      paymentReceipt: uploadedReceiptBase64 || "",
      paymentStatus: activePaymentMethod === "cod" ? "Unpaid" : "Pending Verification",
      status: "Pending", 
      createdAt: new Date().toISOString()
    };

    await addDoc(collection(db, "orders"), orderData);

    CART = [];
    saveCart();
    renderCart();
    showPaymentSuccess();

  } catch (error) {
    console.error("Error checkout:", error);
    toast("Gagal melakukan pemesanan: " + error.message, "error");
    btn.disabled = false;
    btn.innerHTML = `<span>Konfirmasi & Bayar</span>`;
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
        Hore! Pesanan Anda telah resmi diterima dan sekarang sedang diproses secepatnya oleh chef handal Dapur Lodeh. Terima kasih telah mempercayakan rasa pada kami!
      </p>
      <button class="btn-order" id="btn-success-close">Kembali ke Menu</button>
    </div>
  `;

  document.getElementById("btn-success-close").addEventListener("click", () => {
    // Reload halaman untuk mereset modal dan render menu awal
    window.location.reload();
  });
}

/* ══════════════════════════════════════════════════════
   INIT — Fetch from Firebase & Load Cart
   ══════════════════════════════════════════════════════ */
async function init() {
  document.getElementById("menu-grid").innerHTML = `<div class="menu-empty">Memuat daftar menu...</div>`;
  
  // Render persistent cart first
  renderCart();
  showPane("cart-view");

  try {
    const querySnapshot = await getDocs(collection(db, "menus"));
    MENU_DATA = [];
    
    const catDayMap = {
      "noodles": 2, // Selasa
      "salad": 3,   // Rabu
      "burger": 4,  // Kamis
      "rice": 5     // Jumat
    };

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const artificialDay = catDayMap[data.cat] || 0; 
      MENU_DATA.push({ id: doc.id, day: artificialDay, ...data });
    });
    
    // Filter berdasarkan hari ini (Selasa - Jumat)
    const today = new Date().getDay(); // 0 = Sun, 1 = Mon, 2 = Tue, ..., 6 = Sat
    if (today >= 2 && today <= 5) {
      MENU_DATA = MENU_DATA.filter(m => (m.day === today || m.cat === "drinks") && m.isActive !== false);
    } else {
      MENU_DATA = []; // Kosongkan jika akhir pekan / Senin
      document.getElementById("menu-grid").innerHTML = `<div class="menu-empty">Menu makanan tidak tersedia di akhir pekan / Senin. Kami buka dari Selasa hingga Jumat!</div>`;
      return;
    }

  } catch (error) {
    console.error("Error loading menus:", error);
    document.getElementById("menu-grid").innerHTML = `<div class="menu-empty" style="color:red;">Gagal memuat menu: ${error.message}</div>`;
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
