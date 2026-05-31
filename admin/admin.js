import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, updateDoc, addDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { firebaseConfig } from "../firebase-config.js";

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DAFTAR EMAIL ADMIN DEFAULT
const DEFAULT_ADMIN_EMAILS = ["admin@gmail.com", "admindapur@gmail.com", "onel2@gmail.com"];
let ADMIN_EMAILS = [];
let ALL_ORDERS = [];
let ALL_CUSTOMERS = [];

// Referensi Elemen DOM
const adminEmailEl = document.getElementById("admin-email");
const btnLogout = document.getElementById("btn-logout");
const menuTbody = document.getElementById("menu-tbody");
const btnInitDb = document.getElementById("btn-init-db");
const btnAddMenu = document.getElementById("btn-add-menu");
const menuModal = document.getElementById("menu-modal");
const btnCancel = document.getElementById("btn-cancel");
const menuForm = document.getElementById("menu-form");
const modalTitle = document.getElementById("modal-title");

let menuList = [];

// ── 1. AUTENTIKASI & PROTEKSI HALAMAN ──
onAuthStateChanged(auth, async user => {
  if (!user) {
    // Belum login, tendang ke login page
    window.location.href = "../Login/login.html";
    return;
  }

  // Ambil daftar admin dari Firestore
  try {
    const adminDocSnap = await getDocs(collection(db, "settings"));
    let adminData = null;
    adminDocSnap.forEach(d => { if (d.id === "admins") adminData = d.data(); });
    
    if (adminData && adminData.emails) {
      ADMIN_EMAILS = adminData.emails;
    } else {
      // Jika belum ada di Firestore, buat dengan default
      await setDoc(doc(db, "settings", "admins"), { emails: DEFAULT_ADMIN_EMAILS });
      ADMIN_EMAILS = DEFAULT_ADMIN_EMAILS;
    }
  } catch (err) {
    ADMIN_EMAILS = DEFAULT_ADMIN_EMAILS;
  }

  // Cek apakah user adalah admin
  if (!ADMIN_EMAILS.includes(user.email)) {
    alert("Akses Ditolak! Anda bukan admin.");
    window.location.href = "../homepage/index.html";
    return;
  }

  // Jika admin, tampilkan email dan muat data
  adminEmailEl.textContent = user.email;
  loadMenus();
  renderAdmins();
  loadOrders();
  loadCustomers();

  // --- TEMPORARY AUTO SEED SCRIPT KAMIS JUMAT ---
  if (localStorage.getItem("seeded_menus_kamis_jumat") !== "true") {
    try {
      console.log("Seeding menus for Kamis & Jumat...");
      const snapshot = await getDocs(collection(db, "menus"));
      // Delete old Kamis & Jumat
      for (const d of snapshot.docs) {
        const cat = d.data().cat;
        if (cat === "burger" || cat === "rice") {
          await deleteDoc(doc(db, "menus", d.id));
        }
      }
      
      const kamis = ["Nasi kuning", "Sayur lodeh", "Bihun goreng", "Telor balado", "Telor asin", "Perkedel kornet", "Tumis sawi putih", "Sop kembang tahu ayam kampung", "Ikan kembung goreng", "Cukiok"];
      for (const name of kamis) {
        await addDoc(collection(db, "menus"), { name, imageUrl: "", cat: "burger", catLabel: "Spesial Kamis", colorClass: "card-c3", price: 15000, desc: "Menu lezat Dapur Lodeh", isActive: true, addons: [] });
      }

      const jumat = ["Lontong sayur", "Sayur asem", "Kari ayam", "Sop ayam kampung ham maling", "Telor asin", "Telor semur", "Tahu semur", "Sambel godog udang pete", "Perkedel kornet", "Bakwan jagung"];
      for (const name of jumat) {
        await addDoc(collection(db, "menus"), { name, imageUrl: "", cat: "rice", catLabel: "Spesial Jumat", colorClass: "card-c4", price: 15000, desc: "Menu lezat Dapur Lodeh", isActive: true, addons: [] });
      }
      
      localStorage.setItem("seeded_menus_kamis_jumat", "true");
      alert("Menu Kamis & Jumat berhasil diperbarui! Halaman akan dimuat ulang.");
      window.location.reload();
    } catch(e) { console.error("Seeding failed", e); }
  }
  // --- END TEMPORARY SCRIPT ---
});

// Logout
btnLogout.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "../Login/login.html";
});

// ── 2. FUNGSI LOAD DATA DARI FIRESTORE ──
async function loadMenus() {
  menuTbody.innerHTML = `<tr><td colspan="5" class="text-center">Memuat menu...</td></tr>`;
  const filterColEl = document.getElementById("filter-collection");
  const colName = filterColEl ? filterColEl.value : "menus";
  try {
    const querySnapshot = await getDocs(collection(db, colName));
    menuList = [];
    querySnapshot.forEach((doc) => {
      menuList.push({ id: doc.id, ...doc.data() });
    });

    renderTable();

    // Tampilkan tombol Init DB jika data masih kosong
    if (menuList.length === 0) {
      btnInitDb.style.display = "inline-block";
    } else {
      btnInitDb.style.display = "none";
    }
  } catch (error) {
    console.error("Error mengambil data:", error);
    menuTbody.innerHTML = `<tr><td colspan="5" class="text-center" style="color:red;">Gagal memuat data: ${error.message}</td></tr>`;
  }
}

function renderTable() {
  const filterDayEl = document.getElementById("filter-day");
  const selectedDay = filterDayEl ? filterDayEl.value : "all";

  const dayMap = {
    "noodles": "Selasa",
    "salad": "Rabu",
    "burger": "Kamis",
    "rice": "Jumat",
    "drinks": "Semua Hari"
  };

  let filteredList = menuList;
  if (selectedDay !== "all") {
    filteredList = menuList.filter(item => {
      const dayLabel = dayMap[item.cat] || "-";
      return dayLabel === selectedDay || dayLabel === "Semua Hari";
    });
  }

  if (filteredList.length === 0) {
    menuTbody.innerHTML = `<tr><td colspan="6" class="text-center">Belum ada menu untuk hari ini.</td></tr>`;
    return;
  }

  menuTbody.innerHTML = "";
  filteredList.forEach(item => {
    const dayLabel = dayMap[item.cat] || "-";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="td-image"><img src="${item.imageUrl || 'https://via.placeholder.com/40'}" alt="${item.name}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 8px;"></td>
      <td class="td-name">
        ${item.name}
        <br>
        <small style="color: #64748b; font-weight: normal;">${item.desc.substring(0, 30)}...</small>
      </td>
      <td>
        <span class="cat-badge">${item.catLabel || item.cat}</span>
        <div style="margin-top: 6px; font-size: 0.8rem; color: var(--admin-primary); font-weight: 500; display: flex; align-items: center; gap: 4px;">
          <svg class="day-calendar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          ${dayLabel}
        </div>
      </td>
      <td style="font-weight: 500;">Rp ${(item.price || 0).toLocaleString('id-ID')}</td>
      <td>
        <label class="switch">
          <input type="checkbox" class="toggle-status" data-id="${item.id}" ${item.isActive !== false ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </td>
      <td class="td-actions">
        <button class="btn-edit" data-id="${item.id}">Edit</button>
        <button class="btn-delete" data-id="${item.id}">Hapus</button>
      </td>
    `;
    menuTbody.appendChild(tr);
  });

  // Pasang event listener untuk tombol Edit & Hapus
  document.querySelectorAll(".btn-edit").forEach(btn => {
    btn.addEventListener("click", (e) => openModal(e.target.dataset.id));
  });
  
  // Pasang event listener untuk Toggle Status
  document.querySelectorAll(".toggle-status").forEach(toggle => {
    toggle.addEventListener("change", async (e) => {
      const id = e.target.dataset.id;
      const isActive = e.target.checked;
      const filterColEl = document.getElementById("filter-collection");
      const colName = filterColEl ? filterColEl.value : "menus";
      try {
        await updateDoc(doc(db, colName, id), { isActive });
        const itemIdx = menuList.findIndex(m => m.id === id);
        if (itemIdx > -1) menuList[itemIdx].isActive = isActive;
        showToast("Status menu berhasil diubah!");
      } catch (err) {
        console.error(err);
        alert("Gagal mengubah status.");
        e.target.checked = !isActive; // kembalikan ke awal
      }
    });
  });
  document.querySelectorAll(".btn-delete").forEach(btn => {
    btn.addEventListener("click", (e) => deleteMenu(e.target.dataset.id));
  });
}

// ── 3. MODAL & CRUD OPERATIONS ──
function openModal(id = null) {
  const colName = document.getElementById("filter-collection") ? document.getElementById("filter-collection").value : "menus";
  const catSelect = document.getElementById("menu-cat");
  if (colName === "catering") {
    catSelect.innerHTML = `
      <option value="prasmanan">Prasmanan</option>
      <option value="box">Nasi Box</option>
      <option value="snack">Snack Box</option>
    `;
  } else {
    catSelect.innerHTML = `
      <option value="noodles">Spesial Selasa</option>
      <option value="salad">Spesial Rabu</option>
      <option value="burger">Spesial Kamis</option>
      <option value="rice">Spesial Jumat</option>
      <option value="drinks">Menu Bebas (Semua Hari)</option>
    `;
  }

  if (id) {
    modalTitle.textContent = "Edit Menu";
    const item = menuList.find(m => m.id === id);
    if (item) {
      document.getElementById("menu-id").value = item.id;
      document.getElementById("menu-name").value = item.name;
      document.getElementById("menu-image-url").value = item.imageUrl || "";
      document.getElementById("menu-cat").value = item.cat;
      document.getElementById("menu-color").value = item.colorClass;
      document.getElementById("menu-price").value = item.price;
      document.getElementById("menu-desc").value = item.desc;
      document.getElementById("menu-active").checked = item.isActive !== false;
    }
  } else {
    modalTitle.textContent = "Tambah Menu";
    menuForm.reset();
    document.getElementById("menu-id").value = "";
    document.getElementById("menu-active").checked = true;
  }
  menuModal.classList.add("show");
}

function closeModal() {
  menuModal.classList.remove("show");
  menuForm.reset();
}

btnCancel.addEventListener("click", closeModal);
btnAddMenu.addEventListener("click", () => openModal());

menuForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("menu-id").value;
  const colName = document.getElementById("filter-collection") ? document.getElementById("filter-collection").value : "menus";
  
  const cat = document.getElementById("menu-cat").value;
  let catLabels = {
    "noodles": "Spesial Selasa",
    "salad": "Spesial Rabu",
    "burger": "Spesial Kamis",
    "rice": "Spesial Jumat",
    "drinks": "Minuman"
  };
  if (colName === "catering") {
    catLabels = {
      "prasmanan": "Prasmanan",
      "box": "Nasi Box",
      "snack": "Snack Box"
    };
  }

  const menuData = {
    name: document.getElementById("menu-name").value,
    imageUrl: document.getElementById("menu-image-url").value,
    cat: cat,
    catLabel: catLabels[cat] || cat,
    colorClass: document.getElementById("menu-color").value,
    price: parseInt(document.getElementById("menu-price").value),
    desc: document.getElementById("menu-desc").value,
    isActive: document.getElementById("menu-active").checked,
    addons: [] // Biarkan kosong dulu untuk simplisitas
  };

  const btnSave = document.getElementById("btn-save");
  btnSave.disabled = true;
  btnSave.textContent = "Menyimpan...";

  try {
    if (id) {
      // Update
      await updateDoc(doc(db, colName, id), menuData);
      showToast("Menu berhasil diperbarui!");
    } else {
      // Create
      await addDoc(collection(db, colName), menuData);
      showToast("Menu baru berhasil ditambahkan!");
    }
    closeModal();
    loadMenus();
  } catch (error) {
    console.error("Error saving doc: ", error);
    alert("Gagal menyimpan data: " + error.message);
  } finally {
    btnSave.disabled = false;
    btnSave.textContent = "Simpan Menu";
  }
});

async function deleteMenu(id) {
  const item = menuList.find(m => m.id === id);
  if (!confirm(`Apakah Anda yakin ingin menghapus menu "${item.name}"?`)) return;

  const colName = document.getElementById("filter-collection") ? document.getElementById("filter-collection").value : "menus";

  try {
    await deleteDoc(doc(db, colName, id));
    showToast("Menu berhasil dihapus!");
    loadMenus();
  } catch (error) {
    console.error("Error deleting doc: ", error);
    alert("Gagal menghapus data: " + error.message);
  }
}

function showToast(msg) {
  const el = document.getElementById("toast");
  document.getElementById("toast-msg").textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3000);
}

// ── 4. MIGRASI AWAL DATA ──
btnInitDb.addEventListener("click", async () => {
  const confirmInit = confirm("Aksi ini akan menyalin data hardcoded ke Firestore. Lanjutkan?");
  if (!confirmInit) return;

  btnInitDb.textContent = "Menyalin...";
  btnInitDb.disabled = true;

  const MENU_DATA = [
    {
      name: "Spicy Ramen Bowl",
      cat: "noodles",
      catLabel: "Mie",
      emoji: "🍜",
      colorClass: "card-c1",
      price: 65000,
      desc: "Tonkotsu kental, chashu pork, telur lembut, mie hand-pulled.",
      addons: [{ name: "Telur tambahan", price: 5000 }, { name: "Extra chashu", price: 12000 }]
    },
    {
      name: "Mie Goreng Spesial",
      cat: "noodles",
      catLabel: "Mie",
      emoji: "🍝",
      colorClass: "card-c1",
      price: 45000,
      desc: "Mie goreng bumbu khas dengan telur mata sapi dan kerupuk.",
      addons: [{ name: "Ayam suwir", price: 8000 }, { name: "Seafood mix", price: 15000 }]
    },
    {
      name: "Garden Harvest Bowl",
      cat: "salad",
      catLabel: "Salad",
      emoji: "🥗",
      colorClass: "card-c2",
      price: 52000,
      desc: "Romaine crispy, chickpeas panggang, alpukat, tahini dressing.",
      addons: [{ name: "Tambah protein ayam", price: 10000 }]
    },
    {
      name: "Double Smash Burger",
      cat: "burger",
      catLabel: "Burger",
      emoji: "🍔",
      colorClass: "card-c3",
      price: 78000,
      desc: "Dua smashed patty, keju american, acar, house sauce, brioche.",
      addons: [{ name: "Tambah patty", price: 20000 }, { name: "Keju extra", price: 6000 }]
    },
    {
      name: "Nasi Goreng Kampung",
      cat: "rice",
      catLabel: "Nasi",
      emoji: "🍳",
      colorClass: "card-c1",
      price: 42000,
      desc: "Nasi goreng bumbu tradisional, telur dadar, acar, kerupuk.",
      addons: [{ name: "Ayam goreng", price: 12000 }]
    },
    {
      name: "Es Jeruk Peras",
      cat: "drinks",
      catLabel: "Minuman",
      emoji: "🍊",
      colorClass: "card-c3",
      price: 18000,
      desc: "Jeruk segar diperas langsung, gula aren, es batu banyak.",
      addons: [{ name: "Ukuran besar", price: 5000 }]
    }
  ];

  try {
    for (const item of MENU_DATA) {
      await addDoc(collection(db, "menus"), item);
    }
    showToast("Migrasi data sukses!");
    loadMenus();
  } catch (err) {
    console.error("Migrasi gagal", err);
    alert("Gagal memigrasi data: " + err.message);
  } finally {
    btnInitDb.textContent = "Init DB (Sekali saja)";
    btnInitDb.disabled = false;
  }
});

// ── 5. MANAJEMEN ADMIN ──
function renderAdmins() {
  const adminTbody = document.getElementById("admin-tbody");
  if (!adminTbody) return;

  adminTbody.innerHTML = "";
  if (ADMIN_EMAILS.length === 0) {
    adminTbody.innerHTML = `<tr><td colspan="2" class="text-center">Belum ada data admin.</td></tr>`;
    return;
  }

  ADMIN_EMAILS.forEach(email => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-weight: 500;">${email}</td>
      <td class="td-actions">
        <button class="btn-delete" data-email="${email}">Hapus</button>
      </td>
    `;
    adminTbody.appendChild(tr);
  });

  // Event handler untuk tombol hapus
  document.querySelectorAll("#admin-tbody .btn-delete").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const targetEmail = e.target.dataset.email;
      if (confirm(`Yakin ingin menghapus ${targetEmail} dari daftar admin?`)) {
        if (targetEmail === adminEmailEl.textContent) {
          alert("Anda tidak bisa menghapus akun Anda sendiri yang sedang aktif!");
          return;
        }
        try {
          const newAdmins = ADMIN_EMAILS.filter(email => email !== targetEmail);
          await setDoc(doc(db, "settings", "admins"), { emails: newAdmins });
          ADMIN_EMAILS = newAdmins;
          renderAdmins();
          showToast(`Admin ${targetEmail} dihapus!`);
        } catch (error) {
          console.error(error);
          alert("Gagal menghapus admin.");
        }
      }
    });
  });
}

const btnAddAdmin = document.getElementById("btn-add-admin");
if (btnAddAdmin) {
  btnAddAdmin.addEventListener("click", async () => {
    const newEmail = prompt("Masukkan alamat email yang diizinkan untuk mengakses halaman admin:");
    if (!newEmail || !newEmail.includes("@")) {
      if (newEmail !== null) alert("Email tidak valid.");
      return;
    }
    
    if (ADMIN_EMAILS.includes(newEmail)) {
      alert("Email tersebut sudah terdaftar sebagai admin!");
      return;
    }

    try {
      const newAdmins = [...ADMIN_EMAILS, newEmail];
      await setDoc(doc(db, "settings", "admins"), { emails: newAdmins });
      ADMIN_EMAILS = newAdmins;
      renderAdmins();
      showToast(`Admin ${newEmail} ditambahkan!`);
    } catch (error) {
      console.error("Gagal menambah admin:", error);
      alert("Terjadi kesalahan saat menambahkan admin ke database.");
    }
  });
}

// Event Listener Filter Hari
const filterDayEl = document.getElementById("filter-day");
if (filterDayEl) {
  filterDayEl.addEventListener("change", () => {
    renderTable();
  });
}

// Event Listener Filter Collection (Catering / Menus)
const filterColEl = document.getElementById("filter-collection");
if (filterColEl) {
  filterColEl.addEventListener("change", () => {
    // Reset day filter back to 'all'
    if (filterDayEl) filterDayEl.value = "all";
    loadMenus();
  });
}

// ── 6. TAB NAVIGATION SYSTEM ──
const tabs = document.querySelectorAll(".nav-item");
const panes = document.querySelectorAll(".tab-pane");

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    panes.forEach(p => p.classList.remove("active"));

    tab.classList.add("active");
    const targetId = tab.dataset.tab;
    const targetPane = document.getElementById(targetId);
    if (targetPane) {
      targetPane.classList.add("active");
    }
    
    if (targetId === "tab-reports") {
      generateBusinessReports();
    }
  });
});

function formatIDR(n) {
  return "Rp " + n.toLocaleString('id-ID');
}

function generateBusinessReports() {
  const totalRevenueEl = document.getElementById("rep-total-revenue");
  const cateringRevenueEl = document.getElementById("rep-catering-revenue");
  const totalOrdersEl = document.getElementById("rep-total-orders");
  const avgOrderEl = document.getElementById("rep-avg-order");
  const bestsellersListEl = document.getElementById("rep-bestsellers-list");
  const recommendationsListEl = document.getElementById("rep-recommendations-list");

  if (!totalRevenueEl) return;

  let totalRevenue = 0;
  let cateringRevenue = 0;
  let totalOrdersCount = ALL_ORDERS.length;
  let itemSalesMap = {}; 

  ALL_ORDERS.forEach(order => {
    const totalVal = Number(order.total) || 0;
    totalRevenue += totalVal;

    if (order.orderType === "Catering") {
      cateringRevenue += totalVal;
    }

    if (order.items && order.items.length > 0) {
      order.items.forEach(item => {
        const qty = Number(item.qty) || 0;
        const price = Number(item.price) || 0;
        const total = price * qty;
        
        if (itemSalesMap[item.name]) {
          itemSalesMap[item.name].qty += qty;
          itemSalesMap[item.name].total += total;
        } else {
          itemSalesMap[item.name] = {
            qty: qty,
            total: total,
            name: item.name
          };
        }
      });
    }
  });

  const avgOrder = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;

  totalRevenueEl.textContent = formatIDR(totalRevenue);
  cateringRevenueEl.textContent = formatIDR(cateringRevenue);
  totalOrdersEl.textContent = totalOrdersCount + " Pesanan";
  avgOrderEl.textContent = formatIDR(avgOrder);

  const bestsellers = Object.values(itemSalesMap).sort((a, b) => b.qty - a.qty);
  
  if (bestsellers.length === 0) {
    bestsellersListEl.innerHTML = `<div style="text-align:center; color:#64748b; padding:2rem 0;">Belum ada data penjualan hidangan.</div>`;
  } else {
    bestsellersListEl.innerHTML = "";
    bestsellers.slice(0, 5).forEach((item, index) => {
      const percentage = Math.round((item.total / (totalRevenue || 1)) * 100);
      const row = document.createElement("div");
      row.style.background = "#f8fafc";
      row.style.borderRadius = "12px";
      row.style.padding = "10px 14px";
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.justifyContent = "space-between";
      row.style.border = "1px solid #e2e8f0";
      
      row.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:28px; height:28px; border-radius:50%; background:var(--orange-light); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:0.85rem;">${index + 1}</div>
          <div>
            <span style="font-weight:600; color:var(--dark); font-size:0.95rem;">${item.name}</span><br>
            <small style="color:#64748b; font-weight:500;">Terjual: ${item.qty} porsi</small>
          </div>
        </div>
        <div style="text-align:right;">
          <span style="font-weight:700; color:var(--orange); font-size:1.05rem;">${formatIDR(item.total)}</span><br>
          <small style="color:#10b981; font-weight:600;">${percentage}% Kontribusi</small>
        </div>
      `;
      bestsellersListEl.appendChild(row);
    });
  }

  const recommendations = [];

  if (totalOrdersCount === 0) {
    recommendations.push({
      title: "Mulai Pemasaran Awal",
      desc: "Belum ada pesanan yang tercatat di sistem. Rekomendasi: Tawarkan diskon pembukaan 15% pada menu utama di media sosial WhatsApp/Instagram.",
      color: "#6366f1",
      icon: "📣"
    });
  } else {
    if (bestsellers.length > 0) {
      const topProduct = bestsellers[0];
      recommendations.push({
        title: `Optimalkan Stok Bahan ${topProduct.name}`,
        desc: `Menu <b>${topProduct.name}</b> merupakan produk paling laris Anda dengan total ${topProduct.qty} porsi terjual. Rekomendasi: Naikkan ketersediaan bahan baku sebesar 20-30% pada hari operasionalnya untuk menghindari kehabisan stok.`,
        color: "#e8621a",
        icon: "📈"
      });
    }

    const cateringPercentage = Math.round((cateringRevenue / (totalRevenue || 1)) * 100);
    if (cateringPercentage > 30) {
      recommendations.push({
        title: "Perluas Paket Catering Event",
        desc: `Catering memberikan kontribusi tinggi sebesar <b>${cateringPercentage}%</b> dari omzet Anda. Rekomendasi: Susun paket prasmanan baru bertema 'Pernikahan' atau 'Ulang Tahun' dan berikan bundling gratis es jeruk peras untuk minimal pemesanan 50 porsi.`,
        color: "#10b981",
        icon: "🍱"
      });
    } else {
      recommendations.push({
        title: "Dorong Promosi Paket Catering",
        desc: `Kontribusi catering saat ini baru <b>${cateringPercentage}%</b> dari total omzet. Rekomendasi: Berikan potongan harga 5% untuk pemesanan Nasi Box perkantoran/syukuran dengan MOQ 20 kotak.`,
        color: "#f59e0b",
        icon: "💡"
      });
    }

    recommendations.push({
      title: "Promo 'Lodeh Mid-Week' Hari Rabu",
      desc: "Penjualan pertengahan minggu cenderung stabil namun bisa dimaksimalkan. Rekomendasi: Buat kupon promo diskon Rp 5.000 khusus pemesanan hari Rabu via WhatsApp Dapur Lodeh.",
      color: "#3b82f6",
      icon: "🎉"
    });
  }

  recommendationsListEl.innerHTML = "";
  recommendations.forEach(rec => {
    const card = document.createElement("div");
    card.style.background = "#fff";
    card.style.borderLeft = `5px solid ${rec.color}`;
    card.style.borderRadius = "12px";
    card.style.padding = "14px 18px";
    card.style.boxShadow = "0 2px 8px rgba(0,0,0,0.02)";
    card.style.borderTop = "1px solid #f1f5f9";
    card.style.borderRight = "1px solid #f1f5f9";
    card.style.borderBottom = "1px solid #f1f5f9";
    card.style.display = "flex";
    card.style.gap = "14px";
    card.style.alignItems = "start";

    card.innerHTML = `
      <div style="font-size:1.8rem; line-height:1; user-select:none;">${rec.icon}</div>
      <div>
        <h4 style="margin:0 0 6px 0; font-size:1rem; font-weight:700; color:var(--dark);">${rec.title}</h4>
        <p style="margin:0; font-size:0.85rem; color:#64748b; line-height:1.5;">${rec.desc}</p>
      </div>
    `;
    recommendationsListEl.appendChild(card);
  });
}

// ── 6. MANAJEMEN PESANAN ──
async function loadOrders() {
  const activeTbody = document.getElementById("orders-active-tbody");
  const historyTbody = document.getElementById("orders-history-tbody");
  if (!activeTbody || !historyTbody) return;

  activeTbody.innerHTML = `<tr><td colspan="5" class="text-center">Memuat pesanan aktif...</td></tr>`;
  historyTbody.innerHTML = `<tr><td colspan="5" class="text-center">Memuat histori pesanan...</td></tr>`;

  try {
    const querySnapshot = await getDocs(collection(db, "orders"));
    ALL_ORDERS = [];
    querySnapshot.forEach(d => {
      ALL_ORDERS.push({ id: d.id, ...d.data() });
    });

    // Sort by createdAt descending (newest first)
    ALL_ORDERS.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const activeOrders = ALL_ORDERS.filter(o => o.status !== "Delivered");
    const historyOrders = ALL_ORDERS.filter(o => o.status === "Delivered");

    renderOrdersTable(activeOrders, activeTbody, true);
    renderOrdersTable(historyOrders, historyTbody, false);
  } catch (error) {
    console.error("Error loading orders:", error);
    activeTbody.innerHTML = `<tr><td colspan="5" class="text-center" style="color:red;">Gagal memuat pesanan</td></tr>`;
    historyTbody.innerHTML = `<tr><td colspan="5" class="text-center" style="color:red;">Gagal memuat histori</td></tr>`;
  }
}

function renderOrdersTable(ordersList, tbody, isActiveSection) {
  tbody.innerHTML = "";
  if (ordersList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center">Belum ada pesanan di kategori ini.</td></tr>`;
    return;
  }

  ordersList.forEach(order => {
    const tr = document.createElement("tr");

    // Format waktu
    const dateObj = new Date(order.createdAt);
    const dateStr = dateObj.toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });

    // Format Items (HTML list)
    let itemsHtml = "<ul class='order-items-list'>";
    if (order.items && order.items.length > 0) {
      order.items.forEach(item => {
        const addonText = item.addons && item.addons.length > 0 ? `<br><small style="color:#64748b;">+ ${item.addons.map(a => a.name).join(", ")}</small>` : "";
        itemsHtml += `<li><b>${item.qty}x</b> ${item.name} ${addonText}</li>`;
      });
    }
    itemsHtml += "</ul>";
    if (order.note) {
      itemsHtml += `<div style="margin-top:8px; font-size:0.8rem; color:#f97316;"><b>Catatan:</b> ${order.note}</div>`;
    }

    // Status Badge di bawah total
    const currentPaymentStatus = order.paymentStatus || "Unpaid";
    const currentOrderStatus = order.status || "Pending";

    let actionHtml = "";
    if (isActiveSection) {
      actionHtml = `
        <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:8px;">
          <select class="select-payment-status" data-id="${order.id}" style="padding:4px; border-radius:4px; border:1px solid #ccc;">
            <option value="Unpaid" ${currentPaymentStatus === "Unpaid" ? "selected" : ""}>Belum Bayar</option>
            <option value="Paid" ${currentPaymentStatus === "Paid" ? "selected" : ""}>Sudah Bayar</option>
          </select>
          <select class="select-order-status" data-id="${order.id}" style="padding:4px; border-radius:4px; border:1px solid #ccc;">
            <option value="Pending" ${currentOrderStatus === "Pending" ? "selected" : ""}>Pending (Dimasak)</option>
            <option value="Processing" ${currentOrderStatus === "Processing" ? "selected" : ""}>Processing (Dikirim)</option>
            <option value="Delivered" ${currentOrderStatus === "Delivered" ? "selected" : ""}>Delivered (Selesai)</option>
          </select>
        </div>
        <button class="btn-detail-order" data-id="${order.id}" style="width:100%;">Detail</button>
      `;
    } else {
      actionHtml = `
        <span class="badge-delivered">Delivered</span>
        <button class="btn-detail-order" style="margin-top:8px; width:100%;" data-id="${order.id}">Detail</button>
      `;
    }

    const statusBadge = isActiveSection 
      ? `<span class="badge-pending" style="display:inline-block; margin-top:6px;">${currentOrderStatus}</span>` 
      : "";

    tr.innerHTML = `
      <td>
        <div style="font-weight:600;">${dateStr}</div>
        <div style="color:#64748b; font-size:0.85rem;">${timeStr}</div>
        <div style="color:#94a3b8; font-size:0.75rem; margin-top:4px;">ID: ${order.id.substring(0,6)}...</div>
        <div style="font-size:0.75rem; margin-top:4px; color:${currentPaymentStatus === 'Paid' ? '#047857' : '#C2410C'}; font-weight:bold;">${currentPaymentStatus}</div>
      </td>
      <td>
        <div style="font-weight:500;">${order.userEmail || order.userId || "Tamu"}</div>
      </td>
      <td>${itemsHtml}</td>
      <td>
        <div style="font-weight:600; font-size:1.05rem;">Rp ${(order.total || 0).toLocaleString('id-ID')}</div>
        ${statusBadge}
      </td>
      <td class="td-actions" style="vertical-align:top;">${actionHtml}</td>
    `;
    tbody.appendChild(tr);
  });

  // Event Listener untuk update status
  if (isActiveSection) {
    tbody.querySelectorAll(".select-payment-status").forEach(sel => {
      sel.addEventListener("change", async (e) => {
        const orderId = e.target.dataset.id;
        const newStatus = e.target.value;
        try {
          await updateDoc(doc(db, "orders", orderId), { paymentStatus: newStatus });
          showToast("Status pembayaran diperbarui!");
          loadOrders(); // Refresh table
        } catch (err) {
          console.error("Gagal update payment status", err);
          alert("Gagal update status pembayaran.");
        }
      });
    });

    tbody.querySelectorAll(".select-order-status").forEach(sel => {
      sel.addEventListener("change", async (e) => {
        const orderId = e.target.dataset.id;
        const newStatus = e.target.value;
        try {
          await updateDoc(doc(db, "orders", orderId), { status: newStatus });
          showToast("Status pesanan diperbarui!");
          loadOrders(); // Refresh table
        } catch (err) {
          console.error("Gagal update order status", err);
          alert("Gagal update status pesanan.");
        }
      });
    });
  }
}

// Event Listener global untuk tombol "Detail"
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("btn-detail-order")) {
    openOrderDetail(e.target.dataset.id);
  }
});

function openOrderDetail(orderId) {
  const order = ALL_ORDERS.find(o => o.id === orderId);
  if (!order) return;

  const modal = document.getElementById("order-detail-modal");
  const body = document.getElementById("order-detail-body");
  
  const dateObj = new Date(order.createdAt);
  const fullDate = dateObj.toLocaleDateString("id-ID", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fullTime = dateObj.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });

  let itemsHtml = "<ul class='order-items-list' style='list-style:none; padding:0;'>";
  if (order.items) {
    order.items.forEach(item => {
      const addons = item.addons && item.addons.length > 0 ? `<div style="font-size:0.8rem; color:var(--admin-subtext);">+ ${item.addons.map(a => a.name).join(", ")}</div>` : "";
      itemsHtml += `
        <li style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
          <div>
            <b>${item.qty}x</b> ${item.name}
            ${addons}
          </div>
          <div style="font-weight:500;">Rp ${(item.price * item.qty).toLocaleString('id-ID')}</div>
        </li>
      `;
    });
  }
  itemsHtml += "</ul>";

  const customer = ALL_CUSTOMERS.find(c => c.id === order.userId);
  let addressHtml = "-";
  const { addressDetail, addressAuto } = order;
  let parts = [];
  if (addressDetail) parts.push(addressDetail);
  if (addressAuto) parts.push(addressAuto);
  
  if (parts.length > 0) {
    addressHtml = parts.join(", ");
  } else if (customer) {
    const { addressDetail: cDetail, kelurahan, kecamatan, kota, kodepos, addressAuto: cAuto } = customer;
    let cParts = [];
    if (cDetail) cParts.push(cDetail);
    if (kelurahan) cParts.push(`Kel. ${kelurahan}`);
    if (kecamatan) cParts.push(`Kec. ${kecamatan}`);
    if (kota) cParts.push(kota);
    if (kodepos) cParts.push(kodepos);
    if (cParts.length > 0) {
      addressHtml = cParts.join(", ");
    } else if (cAuto) {
      addressHtml = cAuto;
    }
  }

  let receiptHtml = "";
  if (order.paymentReceipt) {
    receiptHtml = `
      <div style="margin-bottom: 1.5rem; border-top: 1.5px dashed #e2e8f0; padding-top: 1.2rem;">
        <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--admin-subtext); margin-bottom: 8px; font-weight:600;">Bukti Pembayaran</div>
        <div style="border-radius:12px; overflow:hidden; border: 1.5px solid #e2e8f0; max-width:220px; cursor:pointer; position:relative; background:#f8fafc;" id="btn-zoom-receipt" title="Klik untuk perbesar">
          <img src="${order.paymentReceipt}" style="width:100%; max-height:160px; object-fit:cover;" alt="Bukti Transfer" />
        </div>
        <small style="color:#64748b; display:block; margin-top:6px;">💡 Klik gambar untuk melihat ukuran penuh</small>
      </div>
    `;
  }

  let quickVerifyHtml = "";
  if (order.paymentStatus === "Pending Verification") {
    quickVerifyHtml = `
      <button class="btn-primary" id="btn-quick-verify-payment" style="width:100%; margin-bottom:1.5rem; background:#10b981; border:none; padding:12px; border-radius:8px; color:#fff; font-weight:700; cursor:pointer; font-family:'DM Sans',sans-serif;">
        ✓ Konfirmasi Pembayaran Lunas
      </button>
    `;
  }

  body.innerHTML = `
    ${quickVerifyHtml}
    
    <div class="detail-grid">
      <div>
        <div class="detail-item-title">ID Pesanan</div>
        <div class="detail-item-value">${order.id}</div>
      </div>
      <div>
        <div class="detail-item-title">Waktu Transaksi</div>
        <div class="detail-item-value">${fullDate} - ${fullTime}</div>
      </div>
      <div>
        <div class="detail-item-title">Email Pemesan</div>
        <div class="detail-item-value">${order.userEmail || "Tamu"}</div>
      </div>
      <div>
        <div class="detail-item-title">Metode Pembayaran</div>
        <div class="detail-item-value" style="text-transform: capitalize;">${order.paymentMethod || "-"}</div>
      </div>
    </div>

    <div style="margin-bottom: 1.5rem;">
      <div class="detail-item-title" style="margin-bottom:4px;">Alamat Pengiriman</div>
      <div class="detail-item-value" style="line-height:1.4;">${addressHtml}</div>
    </div>
    
    <div style="margin-bottom: 1.5rem;">
      <div class="detail-item-title" style="margin-bottom:6px;">Peta Rute Pengiriman</div>
      <div id="admin-order-map" style="height: 200px; border-radius: 12px; border:1px solid #cbd5e1; z-index:1; background:#f8fafc;"></div>
    </div>

    ${receiptHtml}
    
    <div style="margin-bottom: 1.5rem;">
      <div class="detail-item-title" style="margin-bottom:8px;">Daftar Pesanan</div>
      ${itemsHtml}
    </div>

    ${order.note ? `
    <div style="background:#fff7ed; padding:10px; border-radius:8px; border:1px solid #fed7aa; margin-bottom: 1.5rem;">
      <div class="detail-item-title" style="color:#c2410c;">Catatan Khusus</div>
      <div style="color:#9a3412;">${order.note}</div>
    </div>
    ` : ""}

    <div style="background:#f8fafc; padding:15px; border-radius:8px;">
      <div class="detail-summary">
        <span>Subtotal</span>
        <span>Rp ${(order.subtotal || 0).toLocaleString('id-ID')}</span>
      </div>
      <div class="detail-summary">
        <span>Ongkos Kirim</span>
        <span>Rp ${(order.ongkir || 0).toLocaleString('id-ID')}</span>
      </div>
      <div class="detail-summary total">
        <span>Total Bayar</span>
        <span style="color:var(--admin-primary);">Rp ${(order.total || 0).toLocaleString('id-ID')}</span>
      </div>
    </div>
  `;

  modal.classList.add("show");

  const RESTO_LAT = -6.200000;
  const RESTO_LNG = 106.816666;
  
  setTimeout(() => {
    const lat = parseFloat(order.lat);
    const lng = parseFloat(order.lng);
    const mapContainer = document.getElementById("admin-order-map");
    
    if (mapContainer && !isNaN(lat) && !isNaN(lng)) {
      const orderMap = L.map('admin-order-map').setView([lat, lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(orderMap);
      
      L.marker([lat, lng]).addTo(orderMap)
        .bindPopup(`<b>Lokasi Pengiriman</b><br>${order.addressDetail || "Customer"}`)
        .openPopup();
        
      L.marker([RESTO_LAT, RESTO_LNG], {
        icon: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        })
      }).addTo(orderMap).bindPopup("<b>Dapur Lodeh Resto</b>");
      
      const polyline = L.polyline([
        [RESTO_LAT, RESTO_LNG],
        [lat, lng]
      ], { color: '#E8621A', weight: 3, dashArray: '6, 12' }).addTo(orderMap);
      
      orderMap.fitBounds(polyline.getBounds(), { padding: [30, 30] });
    } else if (mapContainer) {
      mapContainer.innerHTML = `<div style="text-align:center; padding:3rem 0; color:#94a3b8; font-size:0.85rem; background:#f8fafc; border-radius:12px;">Customer tidak mem-pinpoint alamat kiriman di peta.</div>`;
    }

    const verifyBtn = document.getElementById("btn-quick-verify-payment");
    if (verifyBtn) {
      verifyBtn.addEventListener("click", async () => {
        verifyBtn.disabled = true;
        verifyBtn.textContent = "Memverifikasi...";
        try {
          await updateDoc(doc(db, "orders", order.id), { 
            paymentStatus: "Paid",
            status: "Processing"
          });
          showToast("Pembayaran berhasil dikonfirmasi!");
          document.getElementById("order-detail-modal").classList.remove("show");
          loadOrders(); 
        } catch (err) {
          console.error(err);
          alert("Gagal mengonfirmasi pembayaran.");
          verifyBtn.disabled = false;
          verifyBtn.textContent = "✓ Konfirmasi Pembayaran Lunas";
        }
      });
    }

    const zoomReceiptBtn = document.getElementById("btn-zoom-receipt");
    if (zoomReceiptBtn) {
      zoomReceiptBtn.addEventListener("click", () => {
        const zoomWin = window.open();
        zoomWin.document.write(`<img src="${order.paymentReceipt}" style="max-width:100%; height:auto;" alt="Bukti Pembayaran" />`);
      });
    }
  }, 300);
}

document.getElementById("btn-close-order-detail").addEventListener("click", () => {
  document.getElementById("order-detail-modal").classList.remove("show");
});

// ── 7. MANAJEMEN AKUN PELANGGAN ──
async function loadCustomers() {
  const tbody = document.getElementById("customers-tbody");
  if (!tbody) return;

  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    ALL_CUSTOMERS = [];
    querySnapshot.forEach(d => {
      ALL_CUSTOMERS.push({ id: d.id, ...d.data() });
    });

    // Sort by createdAt descending
    ALL_CUSTOMERS.sort((a, b) => {
      let timeA = 0;
      if (a.createdAt) {
        timeA = typeof a.createdAt.toMillis === 'function' ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
      }
      let timeB = 0;
      if (b.createdAt) {
        timeB = typeof b.createdAt.toMillis === 'function' ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
      }
      return (timeB || 0) - (timeA || 0);
    });

    renderCustomersTable(ALL_CUSTOMERS);

  } catch (error) {
    console.error("Error loading customers:", error);
    tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="color:red;">Gagal memuat data pelanggan: ${error.message}</td></tr>`;
  }
}

function renderCustomersTable(customersList) {
  const tbody = document.getElementById("customers-tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  if (customersList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center">Tidak ada data pelanggan yang cocok.</td></tr>`;
    return;
  }

  customersList.forEach(cust => {
    const tr = document.createElement("tr");

    // Format Join Date
    let joinDate = "-";
    if (cust.createdAt) {
      const d = typeof cust.createdAt.toDate === 'function' ? cust.createdAt.toDate() : new Date(cust.createdAt);
      joinDate = d.toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' });
    }

    const fullName = `${cust.firstName || ""} ${cust.lastName || ""}`.trim() || "Tanpa Nama";

    tr.innerHTML = `
      <td>
        <div style="font-weight:600; color:var(--admin-primary); font-size:1.05rem;">
          ${fullName}
        </div>
        <div style="font-size:0.8rem; color:var(--admin-subtext); margin-top:4px;">
          Bergabung: ${joinDate}
        </div>
      </td>
      <td>
        <div style="font-weight:500;">${cust.email || "-"}</div>
        <div style="color:var(--admin-subtext); font-size:0.85rem; margin-top:4px;">${cust.phone || "-"}</div>
      </td>
      <td>
        <div style="font-weight:500;">${cust.kota || "-"}</div>
        <div style="color:var(--admin-subtext); font-size:0.85rem; margin-top:4px;">
          Kec: ${cust.kecamatan || "-"}<br>Kel: ${cust.kelurahan || "-"}
        </div>
      </td>
      <td>
        <div style="font-size:0.9rem; line-height:1.4;">
          ${cust.addressDetail || "-"}<br>
          <span style="color:var(--admin-subtext); font-size:0.8rem;">
            Auto: ${cust.addressAuto || "-"} | Pos: ${cust.kodepos || "-"}
          </span>
        </div>
      </td>
      <td class="td-actions">
        <button class="btn-edit btn-edit-customer" data-id="${cust.id}">Edit</button>
        <button class="btn-delete btn-delete-customer" data-id="${cust.id}" data-name="${fullName}">Hapus</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Attach event listener to edit buttons
  tbody.querySelectorAll(".btn-edit-customer").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const custId = e.target.dataset.id;
      openCustomerModal(custId);
    });
  });

  // Attach event listener to delete buttons
  tbody.querySelectorAll(".btn-delete-customer").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const custId = e.target.dataset.id;
      const custName = e.target.dataset.name;
      if (confirm(`Apakah Anda yakin ingin menghapus akun pelanggan "${custName}"? \nSemua data profil pelanggan ini akan dihapus permanen dari database.`)) {
        e.target.textContent = "Menghapus...";
        e.target.disabled = true;
        try {
          await deleteDoc(doc(db, "users", custId));
          showToast(`Akun ${custName} berhasil dihapus!`);
          loadCustomers(); // reload
        } catch (err) {
          console.error("Gagal menghapus pelanggan", err);
          alert("Gagal menghapus data pelanggan: " + err.message);
          e.target.textContent = "Hapus";
          e.target.disabled = false;
        }
      }
    });
  });
}

// ── CUSTOMER MODAL HANDLERS ──
const customerModal = document.getElementById("customer-modal");
const customerForm = document.getElementById("customer-form");
const btnCancelCustomer = document.getElementById("btn-cancel-customer");

function openCustomerModal(id) {
  const cust = ALL_CUSTOMERS.find(c => c.id === id);
  if (!cust) return;

  document.getElementById("customer-id").value = cust.id;
  document.getElementById("cust-first-name").value = cust.firstName || "";
  document.getElementById("cust-last-name").value = cust.lastName || "";
  document.getElementById("cust-email").value = cust.email || "";
  document.getElementById("cust-phone").value = cust.phone || "";
  document.getElementById("cust-kota").value = cust.kota || "";
  document.getElementById("cust-kecamatan").value = cust.kecamatan || "";
  document.getElementById("cust-kelurahan").value = cust.kelurahan || "";
  document.getElementById("cust-kodepos").value = cust.kodepos || "";
  document.getElementById("cust-address-auto").value = cust.addressAuto || "";
  document.getElementById("cust-address-detail").value = cust.addressDetail || "";

  customerModal.classList.add("show");
}

if (btnCancelCustomer) {
  btnCancelCustomer.addEventListener("click", () => {
    customerModal.classList.remove("show");
    customerForm.reset();
  });
}

if (customerForm) {
  customerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("customer-id").value;
    const firstName = document.getElementById("cust-first-name").value.trim();
    const lastName = document.getElementById("cust-last-name").value.trim();
    const phone = document.getElementById("cust-phone").value.trim();
    const kota = document.getElementById("cust-kota").value.trim();
    const kecamatan = document.getElementById("cust-kecamatan").value.trim();
    const kelurahan = document.getElementById("cust-kelurahan").value.trim();
    const kodepos = document.getElementById("cust-kodepos").value.trim();
    const addressAuto = document.getElementById("cust-address-auto").value.trim();
    const addressDetail = document.getElementById("cust-address-detail").value.trim();

    const btnSave = document.getElementById("btn-save-customer");
    btnSave.textContent = "Menyimpan...";
    btnSave.disabled = true;

    const updateData = {
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`.trim(),
      phone,
      kota,
      kecamatan,
      kelurahan,
      kodepos,
      addressAuto,
      addressDetail,
      location: {
        kota,
        kecamatan,
        kelurahan,
        kodepos,
        addressAuto,
        addressDetail
      }
    };

    try {
      await updateDoc(doc(db, "users", id), updateData);
      showToast("Profil pelanggan berhasil diperbarui!");
      customerModal.classList.remove("show");
      customerForm.reset();
      loadCustomers(); // refresh table
    } catch (err) {
      console.error("Gagal mengupdate pelanggan:", err);
      alert("Gagal menyimpan perubahan: " + err.message);
    } finally {
      btnSave.textContent = "Simpan Perubahan";
      btnSave.disabled = false;
    }
  });
}

// Event Listener Pencarian Pelanggan
const searchCustomerEl = document.getElementById("search-customer");
if (searchCustomerEl) {
  searchCustomerEl.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      renderCustomersTable(ALL_CUSTOMERS);
      return;
    }

    const filtered = ALL_CUSTOMERS.filter(cust => {
      const fullName = `${cust.firstName || ""} ${cust.lastName || ""}`.toLowerCase();
      const email = (cust.email || "").toLowerCase();
      const phone = (cust.phone || "").toLowerCase();
      return fullName.includes(query) || email.includes(query) || phone.includes(query);
    });

    renderCustomersTable(filtered);
  });
}
