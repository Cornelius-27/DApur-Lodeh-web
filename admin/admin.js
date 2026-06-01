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

// Variabel referensi Chart.js
let chartOrdersTrend = null;
let chartRevenueTrend = null;
let chartTopItems = null;

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
    // Hilangkan state active dari semua tab & pane
    tabs.forEach(t => t.classList.remove("active"));
    panes.forEach(p => p.classList.remove("active"));

    // Tambahkan state active ke tab yang diklik
    tab.classList.add("active");
    const targetId = tab.dataset.tab;
    const targetPane = document.getElementById(targetId);
    if (targetPane) {
      targetPane.classList.add("active");
    }
  });
});

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
    
    // Render grafik pertumbuhan
    renderGrowthCharts(ALL_ORDERS);
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
    const currentPaymentStatus = !isActiveSection ? "Paid" : (order.paymentStatus || "Unpaid");
    const currentOrderStatus = order.status || "Pending";

    let actionHtml = "";
    if (isActiveSection) {
      let workflowButton = "";
      if (currentPaymentStatus === "Unpaid") {
        workflowButton = `<button class="btn-confirm-payment" data-id="${order.id}" style="background-color: #f59e0b; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 0.85rem; width: 100%;">Konfirmasi Pembayaran</button>`;
      } else if (currentOrderStatus !== "Delivered") {
        workflowButton = `<button class="btn-ready-deliver" data-id="${order.id}" style="background-color: #3b82f6; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 0.85rem; width: 100%;">Siap Diantar</button>`;
      }

      actionHtml = `
        <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
          ${workflowButton}
          <button class="btn-detail-order" data-id="${order.id}" style="width:100%; margin: 0;">Detail</button>
        </div>
      `;
    } else {
      actionHtml = `
        <div style="display: flex; flex-direction: column; gap: 8px; width: 100%; align-items: flex-start;">
          <span class="badge-delivered">Delivered</span>
          <button class="btn-detail-order" style="width:100%; margin: 0;" data-id="${order.id}">Detail</button>
        </div>
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

    const trDetail = document.createElement("tr");
    trDetail.id = `detail-row-${order.id}`;
    trDetail.style.display = "none";
    trDetail.innerHTML = `<td colspan="5" style="padding:0; border:none;"><div id="detail-content-${order.id}" class="slide-detail-container"></div></td>`;
    tbody.appendChild(trDetail);
  });

  // Event Listener untuk update status
  if (isActiveSection) {
    tbody.querySelectorAll(".btn-confirm-payment").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const orderId = e.target.dataset.id;
        try {
          // Update status pembayaran jadi Paid dan status pesanan jadi Processing
          await updateDoc(doc(db, "orders", orderId), { paymentStatus: "Paid", status: "Processing" });
          showToast("Pembayaran dikonfirmasi!");
          loadOrders(); // Refresh table
        } catch (err) {
          console.error("Gagal konfirmasi pembayaran", err);
          alert("Gagal mengonfirmasi pembayaran.");
        }
      });
    });

    tbody.querySelectorAll(".btn-ready-deliver").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const orderId = e.target.dataset.id;
        try {
          // Update status pesanan jadi Delivered
          await updateDoc(doc(db, "orders", orderId), { status: "Delivered" });
          showToast("Pesanan selesai (Delivered)!");
          loadOrders(); // Refresh table
        } catch (err) {
          console.error("Gagal update order status", err);
          alert("Gagal menyelesaikan pesanan.");
        }
      });
    });
  }
}

// Event Listener global untuk tombol "Detail"
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("btn-detail-order")) {
    const orderId = e.target.dataset.id;
    const detailRow = document.getElementById(`detail-row-${orderId}`);
    const contentContainer = document.getElementById(`detail-content-${orderId}`);

    const isCurrentlyClosed = detailRow.style.display === "none";

    // 1. Tutup semua detail yang sedang terbuka
    document.querySelectorAll(".slide-detail-container.open").forEach(openContainer => {
      openContainer.classList.remove("open");
      const row = openContainer.closest("tr");
      if (row) {
        setTimeout(() => { row.style.display = "none"; }, 300);
      }
    });

    // 2. Kembalikan semua teks tombol menjadi "Detail"
    document.querySelectorAll(".btn-detail-order").forEach(btn => {
      if (btn.textContent === "Tutup Detail") {
        btn.textContent = "Detail";
      }
    });

    // 3. Jika sebelumnya tertutup, maka buka
    if (isCurrentlyClosed) {
      contentContainer.innerHTML = generateOrderDetailHtml(orderId);
      detailRow.style.display = "table-row";
      // Memberi jeda sedikit agar display berubah ke table-row sebelum transisi CSS berjalan
      setTimeout(() => contentContainer.classList.add("open"), 10);
      e.target.textContent = "Tutup Detail";
    }
  }
});

function generateOrderDetailHtml(orderId) {
  const order = ALL_ORDERS.find(o => o.id === orderId);
  if (!order) return "";

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
  if (customer) {
    const { addressDetail, kelurahan, kecamatan, kota, kodepos, addressAuto } = customer;
    let parts = [];
    if (addressDetail) parts.push(addressDetail);
    if (kelurahan) parts.push(`Kel. ${kelurahan}`);
    if (kecamatan) parts.push(`Kec. ${kecamatan}`);
    if (kota) parts.push(kota);
    if (kodepos) parts.push(kodepos);
    
    if (parts.length > 0) {
      addressHtml = parts.join(", ");
    } else if (addressAuto) {
      addressHtml = addressAuto;
    }
  }

  return `
    <div style="padding: 1rem 0;">
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
        <div class="detail-item-title" style="margin-bottom:8px;">Daftar Pesanan</div>
        ${itemsHtml}
      </div>

      ${order.note ? `
      <div style="background:#fff7ed; padding:10px; border-radius:8px; border:1px solid #fed7aa; margin-bottom: 1.5rem;">
        <div class="detail-item-title" style="color:#c2410c;">Catatan Khusus</div>
        <div style="color:#9a3412;">${order.note}</div>
      </div>
      ` : ""}

      <div style="background:white; padding:15px; border-radius:8px; border:1px solid #e2e8f0;">
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
    </div>
  `;
}

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

// ── 9. GROWTH ANALYTICS (CHART.JS) ──
function renderGrowthCharts(orders) {
  // Hanya proses order yang valid (bisa juga difilter hanya yg Delivered/Selesai)
  // Untuk tren, kita gunakan semua riwayat pesanan (termasuk yg aktif)
  const orderCountsPerDay = {};
  const revenuePerDay = {};
  const itemCounts = {};

  // Agregasi Data
  let minDateObj = null;
  let maxDateObj = null;

  orders.forEach(order => {
    if (!order.createdAt) return;
    
    const dateObj = new Date(order.createdAt);
    // Format YYYY-MM-DD
    const dateStr = dateObj.toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD format reliably in local time zone

    // Tentukan rentang tanggal
    if (!minDateObj || dateObj < minDateObj) minDateObj = new Date(dateObj);
    if (!maxDateObj || dateObj > maxDateObj) maxDateObj = new Date(dateObj);

    // 1 & 2. Hitung jumlah pesanan harian & pendapatan
    if (!orderCountsPerDay[dateStr]) orderCountsPerDay[dateStr] = 0;
    if (!revenuePerDay[dateStr]) revenuePerDay[dateStr] = 0;
    
    orderCountsPerDay[dateStr] += 1;
    
    // Hanya tambahkan ke total pendapatan jika sudah "Paid" atau "Delivered" (selesai)
    const isPaid = (order.status === "Delivered") || (order.paymentStatus === "Paid");
    if (isPaid) {
      revenuePerDay[dateStr] += Number(order.total) || 0;
    }

    // 3. Hitung item terlaris
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        const itemName = item.name || "Unknown";
        const qty = Number(item.qty) || 1;
        if (!itemCounts[itemName]) itemCounts[itemName] = 0;
        itemCounts[itemName] += qty;
      });
    }
  });

  // Isi tanggal yang kosong (0 pesanan) di antara min dan max
  if (minDateObj && maxDateObj) {
    let curr = new Date(minDateObj);
    const end = new Date(maxDateObj);
    
    while (curr <= end) {
      const dStr = curr.toLocaleDateString('en-CA');
      if (orderCountsPerDay[dStr] === undefined) {
        orderCountsPerDay[dStr] = 0;
        revenuePerDay[dStr] = 0;
      }
      curr.setDate(curr.getDate() + 1);
    }
  }

  // Hitung Grand Total Pendapatan
  let grandTotal = 0;
  Object.values(revenuePerDay).forEach(val => grandTotal += val);
  
  const totalRevenueEl = document.getElementById("grand-total-revenue");
  if (totalRevenueEl) {
    totalRevenueEl.textContent = 'Rp ' + grandTotal.toLocaleString('id-ID');
  }

  // Siapkan label (urutkan tanggal dari lama ke baru)
  const sortedDates = Object.keys(orderCountsPerDay).sort();
  
  // Data array berdasarkan urutan tanggal
  const ordersData = sortedDates.map(date => orderCountsPerDay[date]);

  // Siapkan data item terlaris (sort descending by qty)
  const sortedItems = Object.keys(itemCounts).sort((a, b) => itemCounts[b] - itemCounts[a]);
  // Ambil top 5 atau top 10 saja
  const topItemsNames = sortedItems.slice(0, 7);
  const topItemsData = topItemsNames.map(name => itemCounts[name]);

  // Warna-warna Chart
  const primaryColor = '#E8621A'; // Orange khas
  const secondaryColor = '#25D366'; // Hijau
  const bgColors = [
    'rgba(232, 98, 26, 0.7)',
    'rgba(34, 197, 94, 0.7)',
    'rgba(59, 130, 246, 0.7)',
    'rgba(234, 179, 8, 0.7)',
    'rgba(168, 85, 247, 0.7)',
    'rgba(236, 72, 153, 0.7)',
    'rgba(14, 165, 233, 0.7)'
  ];

  // Hancurkan chart lama jika ada sebelum render ulang
  if (chartOrdersTrend) chartOrdersTrend.destroy();
  if (chartTopItems) chartTopItems.destroy();

  // 1. Chart Tren Pesanan (Line Chart)
  const ctxOrders = document.getElementById("chart-orders-trend");
  if (ctxOrders) {
    chartOrdersTrend = new Chart(ctxOrders, {
      type: 'line',
      data: {
        labels: sortedDates,
        datasets: [{
          label: 'Jumlah Pesanan',
          data: ordersData,
          borderColor: primaryColor,
          backgroundColor: 'rgba(232, 98, 26, 0.1)',
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: primaryColor
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
  }

  // 2. Daftar Pendapatan Harian (List/Table)
  const tbodyRevenue = document.getElementById("revenue-list-tbody");
  if (tbodyRevenue) {
    tbodyRevenue.innerHTML = "";
    
    // Urutkan dari terbaru ke terlama untuk ditambilkan di list
    const datesDesc = [...sortedDates].reverse();
    
    datesDesc.forEach(dateStr => {
      const dateObj = new Date(dateStr);
      const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'long' });
      const fullDate = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const revVal = revenuePerDay[dateStr] || 0;
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${dayName}</strong>, ${fullDate}</td>
        <td style="text-align: right; color: ${revVal > 0 ? '#25D366' : 'var(--warm-gray)'}; font-weight: 500;">
          Rp ${revVal.toLocaleString('id-ID')}
        </td>
      `;
      tbodyRevenue.appendChild(tr);
    });
  }

  // 3. Chart Menu Terlaris (Doughnut)
  const ctxTopItems = document.getElementById("chart-top-items");
  if (ctxTopItems) {
    chartTopItems = new Chart(ctxTopItems, {
      type: 'doughnut',
      data: {
        labels: topItemsNames,
        datasets: [{
          data: topItemsData,
          backgroundColor: bgColors,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            position: 'right',
            labels: {
              usePointStyle: true,
              padding: 20
            }
          }
        }
      }
    });
  }
}

// ── 10. EXPORT KE EXCEL / CSV ──
const btnExport = document.getElementById("btn-export-revenue");
if (btnExport) {
  btnExport.addEventListener("click", () => {
    const table = document.querySelector("#tab-growth table");
    if (!table) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Hari dan Tanggal,Pendapatan\n"; // Header kolom

    const rows = table.querySelectorAll("tbody tr");
    let hasData = false;
    rows.forEach(row => {
      const cols = row.querySelectorAll("td");
      if (cols.length === 2) {
        hasData = true;
        // Hapus koma pada tanggal agar tidak merusak kolom CSV
        let dateText = cols[0].innerText.replace(/,/g, '');
        // Hapus "Rp" dan tanda titik pada angka pendapatan agar menjadi format numerik asli
        let revText = cols[1].innerText.replace(/Rp/g, '').replace(/\./g, '').trim();
        csvContent += `"${dateText}",${revText}\n`;
      }
    });

    if (!hasData) {
      alert("Belum ada data pendapatan untuk di-ekspor.");
      return;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Laporan_Pendapatan_DapurLodeh.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}
