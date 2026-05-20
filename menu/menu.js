import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
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
   AUTENTIKASI STATE
   ══════════════════════════════════════════════════════ */
onAuthStateChanged(auth, user => {
  currentUser = user;
  
  // Dynamic navigation login button
  const navLogin = document.querySelector(".nav-login");
  if (navLogin) {
    if (user) {
      navLogin.textContent = "Log out";
      navLogin.href = "#";
      const newNavLogin = navLogin.cloneNode(true);
      navLogin.parentNode.replaceChild(newNavLogin, navLogin);
      newNavLogin.addEventListener("click", (e) => {
        e.preventDefault();
        auth.signOut().then(() => {
          localStorage.removeItem("cart");
          window.location.reload();
        });
      });
    } else {
      navLogin.textContent = "Log in";
      navLogin.href = "../Login/login.html";
    }
  }
});

/* ══════════════════════════════════════════════════════
   STATE (Untuk Kustomisasi Item)
   ══════════════════════════════════════════════════════ */
let selectedItem = null;   // item object yang sedang dipilih untuk kustomisasi
let qty = 1;
let checkedAddons = new Set();
const ONGKIR = 10000;

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
  box.innerHTML = item.imageUrl ? `<img src="${item.imageUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" alt="${item.name}">` : "🍽";
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
        <span style="font-size: 2.5rem;">🛒</span>
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
          <h4 class="cart-item-title">
            ${cartItem.imageUrl ? `<img src="${cartItem.imageUrl}" style="width:24px;height:24px;object-fit:cover;border-radius:4px;vertical-align:middle;margin-right:6px;">` : "🍽 "}
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
    grid.innerHTML = `<div class="menu-empty">Belum ada menu di kategori ini 😢</div>`;
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
      <div class="card-img ${item.colorClass || 'card-c1'}" style="position:relative;">
        ${isSelected ? '<span class="card-badge" style="background:var(--orange)">Dipilih ✓</span>' : '<span class="card-badge">Hari Ini</span>'}
        ${item.imageUrl ? `<img src="${item.imageUrl}" class="card-image" alt="${item.name}">` : `<span class="card-emoji">🍽</span>`}
        <button class="card-hover-customize-btn">⚙️ Kustomisasi</button>
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
          toast("Menu dihapus dari keranjang!");
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
        toast(`✅ ${item.name} dimasukkan keranjang!`);
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
  const activeTab = document.querySelector(".cat-tab.active");
  renderGrid(activeTab ? activeTab.dataset.cat : "all");

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
      heroBox.innerHTML = `<span style="font-size:8rem;">🍽</span>`;
    }
  } else {
    document.getElementById("hero-tag").textContent   = "Menu";
    document.getElementById("hero-name").textContent  = "Pilih makananmu";
    document.getElementById("hero-desc").textContent  = "Semua menu tersedia dan siap dipesan untuk kamu.";
    document.getElementById("hero-emoji").innerHTML = `<span style="font-size:8rem;">🍽</span>`;
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
  toast(`✅ ${selectedItem.name} ditambahkan!`);

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
    toast("⚠️ Keranjang belanja kosong!");
    return;
  }

  // 1. CEK STATUS LOGIN PENGGUNA (Menggunakan SDK langsung untuk performa instan dan aman)
  const user = auth.currentUser;
  if (!user) {
    sessionStorage.setItem("authRedirect", "../menu/menu.html");
    toast("⚠️ Silakan Login terlebih dahulu untuk memesan!");
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
    <div class="payment-success-content">
      <span class="payment-success-icon">🎉</span>
      <h3 class="payment-success-title">Pembayaran Sukses!</h3>
      <p class="payment-success-text">
        Hore! Pesanan Anda telah resmi diterima dan sekarang sedang diproses secepatnya oleh chef handal Dapur Lodeh. Terima kasih telah mempercayakan rasa pada kami! 🛵✨
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
      
      // Aktifkan tab kategori yang sesuai
      const matchTab = document.querySelector(`.cat-tab[data-cat="${found.cat}"]`);
      if (matchTab) {
        document.querySelectorAll(".cat-tab").forEach(t => t.classList.remove("active"));
        matchTab.classList.add("active");
        renderGrid(found.cat);
      } else {
        renderGrid("all");
      }
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
