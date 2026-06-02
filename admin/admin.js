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

const MENU_DESCRIPTIONS = {
  "Perkedel kornet": "Perkedel kentang lembut khas Dapur Lodeh, dipadukan dengan kornet sapi gurih berkualitas dan rempah pilihan, digoreng keemasan dengan balutan telur tipis yang renyah.",
  "Tumis sayur asin": "Sayur asin segar pilihan yang ditumis dengan bawang putih harum, potongan cabai merah, dan bumbu gurih yang meresap sempurna, memberikan sensasi asam-asin-gurih yang menyegarkan.",
  "Bihun goreng": "Bihun jagung lembut yang digoreng dengan kecap manis legendaris, telur orak-arik, sayuran segar, bawang merah goreng, dan racikan bumbu khas Dapur Lodeh yang aromatik.",
  "Pepes ikan kembung": "Ikan kembung segar yang dibalur dengan bumbu kuning kaya rempah (kunyit, kemiri, serai, daun kemangi), dibungkus daun pisang lalu dikukus dan dipanggang hingga harum merebak.",
  "Bakwan jagung": "Jagung manis pipil renyah dalam adonan tepung bumbu ketumbar dan daun bawang segar, digoreng garing hingga berwarna cokelat keemasan yang menggoda selera.",
  "Sayur lodeh": "Kuah santan gurih beraroma ketumbar dan daun salam, berisi aneka sayuran segar (labu siam, kacang panjang, nangka muda, melinjo) yang dimasak perlahan hingga bumbu meresap sempurna.",
  "Nasi kuning": "Nasi aromatik yang dimasak dengan kunyit segar, santan kental, serai, dan daun jeruk, menghasilkan nasi kuning pulen yang wangi, gurih, dan lezat.",
  "Tongkol balado": "Potongan ikan tongkol goreng gurih yang diselimuti sambal balado merah pedas-manis buatan rumah, dimasak dengan perasan jeruk nipis and daun jeruk aromatik.",
  "Telor asin": "Telur bebek pilihan yang diasinkan dengan metode tradisional abu gosok dan garam mineral, menghasilkan kuning telur masir berminyak yang gurih dan tekstur putih telur yang pas.",
  "Terong balado": "Terong ungu lembut yang digoreng cepat dan disajikan dengan siraman sambal balado merah khas Minang yang melimpah, pedas, manis, dan menggugah selera.",
  "Telor balado": "Telur ayam rebus yang digoreng sebentar hingga berkulit, lalu dibalur dengan sambal balado pedas manis yang meresap hingga ke dalam.",
  "Es Jeruk Peras": "Minuman dingin penyegar dahaga dari jeruk peras asli berkualitas tinggi, dipadukan dengan sedikit sirup gula murni dan es batu melimpah.",
  "Cukiok": "Cukiok (kaki babi) yang dimasak perlahan (slow-cooked) dengan kecap asin premium, pekak, kayu manis, dan bumbu rempah tradisional Cina hingga dagingnya empuk, lembut, dan kaya rasa.",
  "Lontong sayur": "Kombinasi lontong pulen berbalut kuah lodeh santan gurih yang sedikit pedas, disajikan dengan sayur labu siam, tahu, dan kerupuk renyah.",
  "Sayur asem": "Sayur sup asam khas Sunda dengan kuah asam-segar dari asam jawa asli, berisi jagung manis, kacang tanah, labu siam, daun melinjo, dan kacang panjang.",
  "Kari ayam": "Potongan ayam lembut dalam kuah kari kuning kental kaya rempah (kapulaga, jintan, kunyit) yang gurih, harum, dan sedikit pedas hangat.",
  "Sop ayam kampung ham maling": "Sup kaldu ayam kampung premium yang hangat dan gurih, dimasak bersama potongan daging ayam empuk, wortel, kentang, dan luncheon meat berkualitas tinggi.",
  "Tahu semur": "Tahu sutra lembut yang menyerap kuah semur manis gurih legendaris dengan aroma rempah tradisional pala dan cengkeh yang khas.",
  "Telor semur": "Telur rebus yang dimasak perlahan dalam kuah semur kecap manis kental yang kaya akan bumbu rempah pala, cengkeh, dan bawang merah goreng.",
  "Sambel godog udang pete": "Udang segar bertekstur kenyal ditumis dengan pete kupas renyah dalam kuah sambal santan merah kental yang pedas, gurih, dan beraroma khas.",
  "Nasi uduk": "Nasi gurih khas Betawi yang ditanak dengan santan melimpah, daun salam, cengkeh, serai, dan jahe, disajikan hangat dengan taburan bawang goreng harum.",
  "Tumis sawi putih": "Sawi putih segar bertekstur renyah ditumis cepat dengan irisan bawang merah, bawang putih, cabai, dan kaldu jamur gurih yang ringan namun lezat.",
  "Sop kembang tahu ayam kampung": "Sup kaldu ayam kampung murni yang hangat dan gurih, dilengkapi dengan lembaran kembang tahu lembut, wortel manis, dan taburan daun seledri segar.",
  "Ikan kembung goreng": "Ikan kembung segar dibumbui ketumbar dan kunyit, digoreng garing di luar namun tetap lembut dan manis dagingnya di dalam.",
  "Tumis toge": "Toge segar renyah ditumis singkat (high heat) bersama irisan tahu kuning, kucai, bawang putih, dan sedikit kecap asin untuk mempertahankan kesegarannya.",
  "Tahu balado": "Tahu putih goreng berkulit lembut disiram dengan sambal balado merah pedas gurih buatan rumah yang harum aroma daun jeruknya.",
  "Ayam goreng": "Ayam ungkep bumbu kuning tradisional yang digoreng garing keemasan dengan taburan serundeng lengkuas gurih yang melimpah."
};


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
        const desc = MENU_DESCRIPTIONS[name] || "Menu lezat Dapur Lodeh";
        await addDoc(collection(db, "menus"), { name, imageUrl: "", cat: "burger", catLabel: "Spesial Kamis", colorClass: "card-c3", price: 15000, desc, isActive: true, addons: [] });
      }

      const jumat = ["Lontong sayur", "Sayur asem", "Kari ayam", "Sop ayam kampung ham maling", "Telor asin", "Telor semur", "Tahu semur", "Sambel godog udang pete", "Perkedel kornet", "Bakwan jagung"];
      for (const name of jumat) {
        const desc = MENU_DESCRIPTIONS[name] || "Menu lezat Dapur Lodeh";
        await addDoc(collection(db, "menus"), { name, imageUrl: "", cat: "rice", catLabel: "Spesial Jumat", colorClass: "card-c4", price: 15000, desc, isActive: true, addons: [] });
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
    // Selasa (noodles / Mie)
    { name: "Perkedel kornet", cat: "noodles", catLabel: "Mie", emoji: "🥔", colorClass: "card-c1", price: 15000, desc: MENU_DESCRIPTIONS["Perkedel kornet"], imageUrl: "", addons: [] },
    { name: "Tumis sayur asin", cat: "noodles", catLabel: "Mie", emoji: "🥬", colorClass: "card-c1", price: 15000, desc: MENU_DESCRIPTIONS["Tumis sayur asin"], imageUrl: "", addons: [] },
    { name: "Bihun goreng", cat: "noodles", catLabel: "Mie", emoji: "🍜", colorClass: "card-c1", price: 15000, desc: MENU_DESCRIPTIONS["Bihun goreng"], imageUrl: "", addons: [] },
    { name: "Pepes ikan kembung", cat: "noodles", catLabel: "Mie", emoji: "🐟", colorClass: "card-c1", price: 15000, desc: MENU_DESCRIPTIONS["Pepes ikan kembung"], imageUrl: "", addons: [] },
    { name: "Bakwan jagung", cat: "noodles", catLabel: "Mie", emoji: "🌽", colorClass: "card-c1", price: 15000, desc: MENU_DESCRIPTIONS["Bakwan jagung"], imageUrl: "", addons: [] },
    { name: "Sayur lodeh", cat: "noodles", catLabel: "Mie", emoji: "🥣", colorClass: "card-c1", price: 15000, desc: MENU_DESCRIPTIONS["Sayur lodeh"], imageUrl: "", addons: [] },
    { name: "Nasi kuning", cat: "noodles", catLabel: "Mie", emoji: "🍚", colorClass: "card-c1", price: 15000, desc: MENU_DESCRIPTIONS["Nasi kuning"], imageUrl: "", addons: [] },
    { name: "Tongkol balado", cat: "noodles", catLabel: "Mie", emoji: "🌶️", colorClass: "card-c1", price: 15000, desc: MENU_DESCRIPTIONS["Tongkol balado"], imageUrl: "", addons: [] },
    { name: "Telor asin", cat: "noodles", catLabel: "Mie", emoji: "🥚", colorClass: "card-c1", price: 15000, desc: MENU_DESCRIPTIONS["Telor asin"], imageUrl: "", addons: [] },
    { name: "Terong balado", cat: "noodles", catLabel: "Mie", emoji: "🍆", colorClass: "card-c1", price: 15000, desc: MENU_DESCRIPTIONS["Terong balado"], imageUrl: "", addons: [] },
    { name: "Telor balado", cat: "noodles", catLabel: "Mie", emoji: "🥚", colorClass: "card-c1", price: 15000, desc: MENU_DESCRIPTIONS["Telor balado"], imageUrl: "", addons: [] },

    // Rabu (salad / Salad)
    { name: "Bakwan jagung", cat: "salad", catLabel: "Salad", emoji: "🌽", colorClass: "card-c2", price: 15000, desc: MENU_DESCRIPTIONS["Bakwan jagung"], imageUrl: "", addons: [] },
    { name: "Tumis toge", cat: "salad", catLabel: "Salad", emoji: "🌱", colorClass: "card-c2", price: 15000, desc: MENU_DESCRIPTIONS["Tumis toge"], imageUrl: "", addons: [] },
    { name: "Telor balado", cat: "salad", catLabel: "Salad", emoji: "🥚", colorClass: "card-c2", price: 15000, desc: MENU_DESCRIPTIONS["Telor balado"], imageUrl: "", addons: [] },
    { name: "Perkedel kornet", cat: "salad", catLabel: "Salad", emoji: "🥔", colorClass: "card-c2", price: 15000, desc: MENU_DESCRIPTIONS["Perkedel kornet"], imageUrl: "", addons: [] },
    { name: "Telor asin", cat: "salad", catLabel: "Salad", emoji: "🥚", colorClass: "card-c2", price: 15000, desc: MENU_DESCRIPTIONS["Telor asin"], imageUrl: "", addons: [] },
    { name: "Tahu balado", cat: "salad", catLabel: "Salad", emoji: "⬜", colorClass: "card-c2", price: 15000, desc: MENU_DESCRIPTIONS["Tahu balado"], imageUrl: "", addons: [] },
    { name: "Sayur asem", cat: "salad", catLabel: "Salad", emoji: "🥣", colorClass: "card-c2", price: 15000, desc: MENU_DESCRIPTIONS["Sayur asem"], imageUrl: "", addons: [] },
    { name: "Ayam goreng", cat: "salad", catLabel: "Salad", emoji: "🍗", colorClass: "card-c2", price: 15000, desc: MENU_DESCRIPTIONS["Ayam goreng"], imageUrl: "", addons: [] },
    { name: "Nasi uduk", cat: "salad", catLabel: "Salad", emoji: "🍚", colorClass: "card-c2", price: 15000, desc: MENU_DESCRIPTIONS["Nasi uduk"], imageUrl: "", addons: [] },

    // Minuman (drinks)
    { name: "Es Jeruk Peras", cat: "drinks", catLabel: "Minuman", emoji: "🍊", colorClass: "card-c3", price: 18000, desc: MENU_DESCRIPTIONS["Es Jeruk Peras"], imageUrl: "", addons: [] }
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

  body.innerHTML = `
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
