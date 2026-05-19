import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { firebaseConfig } from "../firebase-config.js";

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let MENU_DATA = [];

/* ══════════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════════ */
let selectedItem = null;   // item object yang sedang dipilih
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
   SIDEBAR — update tampilan
══════════════════════════════════════════════════════ */
function renderSidebar() {
  if (!selectedItem) return;

  const item = selectedItem;

  // emoji box
  const box = document.getElementById("sel-emoji-box");
  box.className = "selected-item-emoji " + (item.colorClass === "card-c1" ? "c1" : item.colorClass === "card-c2" ? "c2" : "c3");
  document.getElementById("sel-emoji").textContent = item.emoji || "🍽";
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
  const grand = sub + ONGKIR;

  document.getElementById("item-subtotal").textContent  = fmt(sub);
  document.getElementById("total-subtotal").textContent = fmt(sub);
  document.getElementById("total-grand").textContent    = fmt(grand);
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
    card.innerHTML = `
      <div class="card-img ${item.colorClass || 'card-c1'}" style="position:relative;">
        ${isSelected ? '<span class="card-badge" style="background:var(--orange)">Dipilih ✓</span>' : '<span class="card-badge">Hari Ini</span>'}
        <span class="card-emoji">${item.emoji || "🍽"}</span>
      </div>
      <div class="card-body">
        <p class="card-tag">${item.catLabel}</p>
        <h3 class="card-name">${item.name}</h3>
        <p class="card-desc">${item.desc}</p>
        <div class="card-footer">
          <span class="card-price">${fmt(item.price)}</span>
          <button class="card-order-btn">${isSelected ? "✓" : "Pilih"}</button>
        </div>
      </div>
    `;

    // klik card atau tombol + → pilih item
    card.addEventListener("click", () => selectItem(item));

    grid.appendChild(card);
  });
}

/* ══════════════════════════════════════════════════════
   SELECT ITEM — saat klik menu
══════════════════════════════════════════════════════ */
function selectItem(item) {
  const isAlreadySelected = selectedItem && selectedItem.id === item.id;

  selectedItem = isAlreadySelected ? null : item;
  qty = 1;
  checkedAddons.clear();

  // update hero
  updateHero();

  // re-render grid with current active tab
  const activeTab = document.querySelector(".cat-tab.active");
  renderGrid(activeTab ? activeTab.dataset.cat : "all");

  if (!isAlreadySelected) {
    renderSidebar();
    toast(`${item.name} dipilih!`);
  } else {
    // reset sidebar
    document.getElementById("sel-name").textContent = "—";
    document.getElementById("sel-cat").textContent  = "—";
    document.getElementById("sel-emoji").textContent = "";
    document.getElementById("addon-list").innerHTML  = "";
    document.getElementById("item-subtotal").textContent  = "Rp 0";
    document.getElementById("total-subtotal").textContent = "Rp 0";
    document.getElementById("total-grand").textContent    = fmt(ONGKIR);
  }
}

/* ══════════════════════════════════════════════════════
   HERO BANNER
══════════════════════════════════════════════════════ */
function updateHero() {
  if (selectedItem) {
    document.getElementById("hero-tag").textContent   = selectedItem.catLabel;
    document.getElementById("hero-name").textContent  = selectedItem.name;
    document.getElementById("hero-desc").textContent  = selectedItem.desc;
    document.getElementById("hero-emoji").textContent = selectedItem.emoji || "🍽";
  } else {
    document.getElementById("hero-tag").textContent   = "Menu";
    document.getElementById("hero-name").textContent  = "Pilih makananmu";
    document.getElementById("hero-desc").textContent  = "Semua menu tersedia dan siap dipesan untuk kamu.";
    document.getElementById("hero-emoji").textContent = "🍽";
  }
}

/* ══════════════════════════════════════════════════════
   QTY CONTROLS
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
   ORDER BUTTON
══════════════════════════════════════════════════════ */
document.getElementById("btn-order").addEventListener("click", () => {
  if (!selectedItem) {
    toast("⚠️ Pilih menu dulu ya!");
    return;
  }
  
  const note    = document.getElementById("order-note").value;
  const addonsArr = selectedItem.addons || [];
  const addons  = [...checkedAddons].map(i => addonsArr[i].name);
  const addonTotal = [...checkedAddons].reduce((s, i) => s + addonsArr[i].price, 0);
  const sub     = (selectedItem.price + addonTotal) * qty;

  const order = {
    item:    selectedItem.name,
    qty,
    addons,
    note,
    subtotal: sub,
    ongkir:   ONGKIR,
    total:    sub + ONGKIR,
  };

  console.log("ORDER:", order);
  toast("✅ Pesanan dikirim! (lihat console)");
});

/* ══════════════════════════════════════════════════════
   INIT — Fetch from Firebase
══════════════════════════════════════════════════════ */
async function init() {
  document.getElementById("menu-grid").innerHTML = `<div class="menu-empty">Memuat daftar menu...</div>`;
  document.getElementById("total-grand").textContent = fmt(ONGKIR);
  
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
      // Map kategori ke hari. Jika minuman, akan tersedia tiap hari.
      const artificialDay = catDayMap[data.cat] || 0; 
      MENU_DATA.push({ id: doc.id, day: artificialDay, ...data });
    });
    
    // Filter berdasarkan hari ini (Selasa - Jumat)
    const today = new Date().getDay(); // 0 = Sun, 1 = Mon, 2 = Tue, ..., 6 = Sat
    if (today >= 2 && today <= 5) {
      // Tampilkan makanan untuk hari ini + minuman yang tersedia tiap hari, HANYA jika aktif
      MENU_DATA = MENU_DATA.filter(m => (m.day === today || m.cat === "drinks") && m.isActive !== false);
    } else {
      MENU_DATA = []; // Kosongkan jika bukan selasa - jumat
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
      selectedItem = found;
      renderSidebar();
      updateHero();

      // aktifkan tab kategori yang sesuai
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

  // default: tampilkan semua, tidak ada yang terpilih
  updateHero();
  renderGrid("all");
}

init();
