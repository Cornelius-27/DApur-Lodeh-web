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

  // --- TEMPORARY AUTO SEED SCRIPT ---
  if (localStorage.getItem("seeded_menus") !== "true") {
    try {
      console.log("Seeding menus...");
      const snapshot = await getDocs(collection(db, "menus"));
      // Delete old Selasa & Rabu
      for (const d of snapshot.docs) {
        const cat = d.data().cat;
        if (cat === "noodles" || cat === "salad") {
          await deleteDoc(doc(db, "menus", d.id));
        }
      }
      
      const selasa = ["Nasi kuning", "Perkedel kornet", "Pepes ikan kembung", "Telor balado", "Telor asin", "Bihun goreng", "Tongkol balado", "Terong balado", "Sayur lodeh", "Tumis sayur asin", "Bakwan jagung"];
      for (const name of selasa) {
        await addDoc(collection(db, "menus"), { name, imageUrl: "", cat: "noodles", catLabel: "Spesial Selasa", colorClass: "card-c1", price: 15000, desc: "Menu lezat Dapur Lodeh", isActive: true, addons: [] });
      }

      const rabu = ["Nasi uduk", "Sayur asem", "Tumis toge", "Perkedel kornet", "Bakwan jagung", "Telor balado", "Tahu balado", "Telor asin", "Ayam goreng"];
      for (const name of rabu) {
        await addDoc(collection(db, "menus"), { name, imageUrl: "", cat: "salad", catLabel: "Spesial Rabu", colorClass: "card-c2", price: 15000, desc: "Menu lezat Dapur Lodeh", isActive: true, addons: [] });
      }
      
      localStorage.setItem("seeded_menus", "true");
      alert("Menu Selasa & Rabu berhasil diperbarui! Halaman akan dimuat ulang.");
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
  try {
    const querySnapshot = await getDocs(collection(db, "menus"));
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
        <div style="margin-top: 6px; font-size: 0.8rem; color: var(--admin-primary); font-weight: 500;">
          📅 ${dayLabel}
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
      try {
        await updateDoc(doc(db, "menus", id), { isActive });
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
  
  const cat = document.getElementById("menu-cat").value;
  const catLabels = {
    "noodles": "Spesial Selasa",
    "salad": "Spesial Rabu",
    "burger": "Spesial Kamis",
    "rice": "Spesial Jumat",
    "drinks": "Minuman"
  };

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
      await updateDoc(doc(db, "menus", id), menuData);
      showToast("Menu berhasil diperbarui!");
    } else {
      // Create
      await addDoc(collection(db, "menus"), menuData);
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

  try {
    await deleteDoc(doc(db, "menus", id));
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
