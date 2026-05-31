import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { firebaseConfig } from "../firebase-config.js";

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;

// Format Rupiah
function formatIDR(n) {
  return "Rp " + n.toLocaleString('id-ID');
}

// Inisialisasi Dropdown navbar & Tombol Riwayat
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

  const fullName = userData?.displayName || user.displayName || user.email.split("@")[0];
  const firstName = userData?.firstName || fullName.split(" ")[0];
  const initial = firstName.charAt(0).toUpperCase();
  const email = user.email;

  // Render user area wrapper
  const userArea = document.createElement("div");
  userArea.className = "nav-user-area";

  // Tandai tombol riwayat aktif karena kita berada di halaman history.html
  const isHistoryActive = window.location.pathname.includes("history.html");
  const historyActiveStyle = isHistoryActive ? 'style="background: rgba(232, 98, 26, 0.1); border-color: var(--orange); color: var(--orange);"' : '';

  userArea.innerHTML = `
    <a href="history.html" class="nav-history-btn" title="Riwayat Pesanan" ${historyActiveStyle}>
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
        <a href="profile.html" class="nav-dropdown-item">
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

  // Toggle Dropdown Menu
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

  // Prevent closing when clicking inside menu content
  menu.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // Tutup jika klik di luar
  document.addEventListener("click", () => {
    menu.classList.remove("show");
    trigger.classList.remove("active");
  });

  // Logout
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    auth.signOut().then(() => {
      window.location.href = "../homepage/index.html";
    });
  });
}

// Listener status login
onAuthStateChanged(auth, async user => {
  if (!user) {
    // Belum login, redirect ke login
    sessionStorage.setItem("authRedirect", "../profile/history.html");
    alert("⚠️ Silakan login terlebih dahulu untuk mengakses riwayat pesanan Anda!");
    window.location.href = "../Login/login.html";
    return;
  }

  currentUser = user;
  
  // Ambil data detail pengguna dari Firestore
  let userData = null;
  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      userData = userDoc.data();
    } else {
      const admins = ["admindapur@gmail.com", "admin@gmail.com", "onel2@gmail.com"];
      if (!admins.includes(user.email)) {
        await auth.signOut();
        alert("Akun Anda telah dinonaktifkan atau dihapus oleh administrator.");
        window.location.href = "../Login/login.html";
        return;
      }
    }
  } catch (err) {
    console.error("Gagal memuat profil pengguna dari Firestore:", err);
  }

  // Tampilkan navigasi dropdown
  initUserDropdown(user, userData);
  
  // Isi data sidebar
  populateSidebarData(user, userData);
  
  // Muat riwayat transaksi pesanan
  loadUserOrdersHistory(user);
});

// Mengisi data nama dan avatar di sidebar kiri (aman jika elemen ditiadakan)
function populateSidebarData(user, userData) {
  const fullName = userData?.displayName || user.displayName || user.email.split("@")[0];
  const firstName = userData?.firstName || fullName.split(" ")[0];
  const initial = firstName.charAt(0).toUpperCase();

  const fn = document.getElementById("profile-fullname");
  const em = document.getElementById("profile-email");
  const av = document.getElementById("profile-avatar-large");

  if (fn) fn.textContent = fullName;
  if (em) em.textContent = user.email;
  if (av) av.textContent = initial;
}

/* ══════════════════════════════════════════════════════
   RENDER STATISTIK TRANSAKSI BELANJA
   ══════════════════════════════════════════════════════ */
function renderHistoryStats(myOrders) {
  const statsContainer = document.getElementById("history-stats");
  if (!statsContainer) return;

  const totalOrders = myOrders.length;
  let totalSpent = 0;
  let activeOrdersCount = 0;

  myOrders.forEach(order => {
    totalSpent += Number(order.total) || 0;
    if (order.status === "Pending" || order.status === "Processing" || !order.status) {
      activeOrdersCount++;
    }
  });

  statsContainer.innerHTML = `
    <div class="history-stat-card">
      <div class="history-stat-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <path d="M16 10a4 4 0 0 1-8 0"></path>
        </svg>
      </div>
      <div class="history-stat-info">
        <span class="history-stat-value">${totalOrders} Pesanan</span>
        <span class="history-stat-label">Total Transaksi</span>
      </div>
    </div>

    <div class="history-stat-card">
      <div class="history-stat-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
          <line x1="1" y1="10" x2="23" y2="10"></line>
        </svg>
      </div>
      <div class="history-stat-info">
        <span class="history-stat-value">${formatIDR(totalSpent)}</span>
        <span class="history-stat-label">Total Pengeluaran</span>
      </div>
    </div>

    <div class="history-stat-card">
      <div class="history-stat-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      </div>
      <div class="history-stat-info">
        <span class="history-stat-value">${activeOrdersCount} Aktif</span>
        <span class="history-stat-label">Sedang Diproses</span>
      </div>
    </div>
  `;
}

/* ══════════════════════════════════════════════════════
   LOAD RIWAYAT PESANAN DARI FIRESTORE
   ══════════════════════════════════════════════════════ */

async function loadUserOrdersHistory(user) {
  const ongoingContainer = document.getElementById("orders-ongoing-list");
  const finishedContainer = document.getElementById("orders-finished-list");
  
  try {
    const querySnapshot = await getDocs(collection(db, "orders"));
    const myOrders = [];
    
    querySnapshot.forEach(docSnap => {
      const order = docSnap.data();
      if (order.userId === user.uid) {
        myOrders.push({ id: docSnap.id, ...order });
      }
    });

    // Urutkan berdasarkan waktu transaksi terbaru (descending)
    myOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pisahkan menjadi Ongoing dan Finished
    const ongoingOrders = [];
    const finishedOrders = [];
    myOrders.forEach(order => {
      if (order.status === "Delivered") {
        finishedOrders.push(order);
      } else {
        ongoingOrders.push(order);
      }
    });

    // Tampilkan rangkuman statistik belanja
    renderHistoryStats(myOrders);

    renderOrdersList(ongoingOrders, ongoingContainer, "Belum ada pesanan berjalan");
    renderOrdersList(finishedOrders, finishedContainer, "Belum ada riwayat pesanan selesai");

  } catch (err) {
    console.error("Gagal memuat pesanan pelanggan:", err);
    ongoingContainer.innerHTML = getErrorHtml(err.message);
    finishedContainer.innerHTML = getErrorHtml(err.message);
  }
}

function renderOrdersList(orders, container, emptyMsg) {
  if (orders.length === 0) {
    container.innerHTML = `
        <div class="orders-empty-state">
          <div style="color: var(--warm-gray); margin-bottom: 1.2rem; display: flex; justify-content: center;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <p>${emptyMsg}</p>
          <small style="color: var(--warm-gray); display: block; margin-bottom: 1.5rem;">Perut kosong? Jelajahi menu lezat kami dan buat pesanan pertamamu sekarang!</small>
          <a href="../menu/menu.html" class="btn-save-profile" style="display: inline-flex; text-decoration: none; align-self: center;">Jelajahi Menu</a>
        </div>
      `;
      return;
    }

    container.innerHTML = "";

    orders.forEach(order => {
      const card = document.createElement("div");
      card.className = "order-history-card";

      // Format Waktu Transaksi
      const dateObj = new Date(order.createdAt);
      const formattedDate = dateObj.toLocaleDateString("id-ID", {
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric'
      });
      const formattedTime = dateObj.toLocaleTimeString("id-ID", {
        hour: '2-digit', 
        minute: '2-digit'
      });

      // Status Badge
      const status = order.status || "Pending";
      let badgeClass = "pending";
      let statusLabel = "Sedang Dimasak";

      if (status === "Processing") {
        badgeClass = "processing";
        statusLabel = "Sedang Dikirim";
      } else if (status === "Delivered") {
        badgeClass = "delivered";
        statusLabel = "Selesai Diterima";
      }

      // Items list
      let itemsListHtml = "";
      if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
          const addonsText = item.addons && item.addons.length > 0 
            ? `<span class="order-item-addons">+ ${item.addons.map(a => a.name).join(", ")}</span>` 
            : "";
            
          itemsListHtml += `
            <li class="order-item-row">
              <div>
                <span class="order-item-name"><span class="order-item-qty">${item.qty}x</span> ${item.name}</span>
                ${addonsText}
              </div>
              <span class="order-item-price">${formatIDR(item.price * item.qty)}</span>
            </li>
          `;
        });
      }

      // Catatan Khusus jika ada
      const noteHtml = order.note 
        ? `<div class="order-card-note"><b>Catatan:</b> "${order.note}"</div>` 
        : "";

      let stepperHtml = "";
      if (container.id === "orders-ongoing-list") {
        const pStatus = order.paymentStatus || "Unpaid";
        const oStatus = order.status || "Pending";
        const isCod = (order.paymentMethod || "").toLowerCase() === "cod";
        
        let step1Bg = "var(--orange)", step1Border = "var(--orange)", step1Color = "#fff", step1Symbol = "✓", step1TextColor = "var(--dark)";
        let step2Bg = "#fff", step2Border = "#cbd5e1", step2Color = "#94a3b8", step2Symbol = "2", step2TextColor = "#94a3b8";
        let step3Bg = "#fff", step3Border = "#cbd5e1", step3Color = "#94a3b8", step3Symbol = "3", step3TextColor = "#94a3b8";
        let step4Bg = "#fff", step4Border = "#cbd5e1", step4Color = "#94a3b8", step4Symbol = "4", step4TextColor = "#94a3b8";
        let progressPercent = 0;

        // Step 2: Dibayar / Diverifikasi
        const isPaid = pStatus === "Paid" || isCod;
        const isPendingVerification = pStatus === "Pending Verification";
        if (isPaid) {
          step2Bg = "var(--orange)"; step2Border = "var(--orange)"; step2Color = "#fff"; step2Symbol = "✓"; step2TextColor = "var(--dark)";
          progressPercent = 33;
        } else if (isPendingVerification) {
          step2Bg = "#fef3c7"; step2Border = "#f59e0b"; step2Color = "#d97706"; step2Symbol = "⏳"; step2TextColor = "#d97706";
          progressPercent = 16;
        }

        // Step 3: Diproses / Dimasak
        const isProcessing = oStatus === "Processing" || oStatus === "Delivered";
        if (isProcessing) {
          step3Bg = "var(--orange)"; step3Border = "var(--orange)"; step3Color = "#fff"; step3Symbol = "✓"; step3TextColor = "var(--dark)";
          progressPercent = 66;
        } else if (isPaid && oStatus === "Pending") {
          step3Bg = "rgba(232, 98, 26, 0.08)"; step3Border = "var(--orange)"; step3Color = "var(--orange)"; step3Symbol = "🍳"; step3TextColor = "var(--orange)";
          progressPercent = 50;
        }

        // Step 4: Dikirim
        const isDelivered = oStatus === "Delivered";
        if (isDelivered) {
          step4Bg = "var(--orange)"; step4Border = "var(--orange)"; step4Color = "#fff"; step4Symbol = "✓"; step4TextColor = "var(--dark)";
          progressPercent = 100;
        } else if (oStatus === "Processing") {
          step4Bg = "#d1fae5"; step4Border = "#10b981"; step4Color = "#059669"; step4Symbol = "🚚"; step4TextColor = "#059669";
          progressPercent = 83;
        }

        stepperHtml = `
          <div class="order-stepper" style="margin: 1.8rem 0 1.2rem; display: flex; justify-content: space-between; position: relative;">
            <div class="stepper-line" style="position: absolute; top: 14px; left: 10%; right: 10%; height: 4px; background: #e2e8f0; z-index: 1; border-radius: 4px;">
              <div class="stepper-line-progress" style="width: ${progressPercent}%; height: 100%; background: var(--orange); transition: width 0.3s ease; border-radius: 4px;"></div>
            </div>
            
            <div class="step-item" style="display: flex; flex-direction: column; align-items: center; z-index: 2; width: 22%; text-align: center;">
              <div class="step-circle" style="width: 32px; height: 32px; border-radius: 50%; background: ${step1Bg}; border: 2.5px solid ${step1Border}; color: ${step1Color}; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.85rem; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">${step1Symbol}</div>
              <span style="font-size: 0.72rem; font-weight: 600; margin-top: 6px; color: ${step1TextColor};">Dipesan</span>
            </div>

            <div class="step-item" style="display: flex; flex-direction: column; align-items: center; z-index: 2; width: 22%; text-align: center;">
              <div class="step-circle" style="width: 32px; height: 32px; border-radius: 50%; background: ${step2Bg}; border: 2.5px solid ${step2Border}; color: ${step2Color}; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.85rem; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">${step2Symbol}</div>
              <span style="font-size: 0.72rem; font-weight: 600; margin-top: 6px; color: ${step2TextColor};">Dibayar</span>
            </div>

            <div class="step-item" style="display: flex; flex-direction: column; align-items: center; z-index: 2; width: 22%; text-align: center;">
              <div class="step-circle" style="width: 32px; height: 32px; border-radius: 50%; background: ${step3Bg}; border: 2.5px solid ${step3Border}; color: ${step3Color}; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.85rem; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">${step3Symbol}</div>
              <span style="font-size: 0.72rem; font-weight: 600; margin-top: 6px; color: ${step3TextColor};">Diproses</span>
            </div>

            <div class="step-item" style="display: flex; flex-direction: column; align-items: center; z-index: 2; width: 22%; text-align: center;">
              <div class="step-circle" style="width: 32px; height: 32px; border-radius: 50%; background: ${step4Bg}; border: 2.5px solid ${step4Border}; color: ${step4Color}; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.85rem; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">${step4Symbol}</div>
              <span style="font-size: 0.72rem; font-weight: 600; margin-top: 6px; color: ${step4TextColor};">Dikirim</span>
            </div>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="order-card-header">
          <div class="order-date-box">
            <span class="order-date">${formattedDate} — ${formattedTime}</span>
            <span class="order-id">ID Pesanan: ${order.id}</span>
          </div>
          <span class="order-status-badge ${badgeClass}">${statusLabel}</span>
        </div>

        <ul class="order-card-items">
          ${itemsListHtml}
        </ul>

        ${stepperHtml}
        ${noteHtml}

        <div class="order-card-footer">
          <div class="order-payment">
            <span>Metode:</span>
            <span class="order-payment-method">${order.paymentMethod || "COD"}</span>
          </div>
          
          <div class="order-total-box-card">
            <div class="order-total-label">Total Pembayaran</div>
            <div class="order-total-value">${formatIDR(order.total)}</div>
          </div>
        </div>
      `;

      container.appendChild(card);
    });
}

function getErrorHtml(errMsg) {
  return `
      <div class="orders-empty-state" style="border-color: #C2410C;">
        <div style="color: #C2410C; margin-bottom: 1.2rem; display: flex; justify-content: center;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <p style="color: #C2410C;">Gagal memuat data transaksi</p>
        <small style="color: var(--warm-gray);">${errMsg}</small>
      </div>
  `;
}

/* ══════════════════════════════════════════════════════
   TAB SWITCHING LOGIC
   ══════════════════════════════════════════════════════ */
document.querySelectorAll(".history-tab-btn").forEach(btn => {
  btn.addEventListener("click", (e) => {
    document.querySelectorAll(".history-tab-btn").forEach(b => {
      b.classList.remove("btn-primary-profile");
      b.classList.add("btn-secondary-profile");
    });
    const targetBtn = e.currentTarget;
    targetBtn.classList.remove("btn-secondary-profile");
    targetBtn.classList.add("btn-primary-profile");

    const tabType = targetBtn.dataset.tab;
    const ongoingList = document.getElementById("orders-ongoing-list");
    const finishedList = document.getElementById("orders-finished-list");

    if (tabType === "ongoing") {
      ongoingList.style.display = "block";
      finishedList.style.display = "none";
    } else {
      ongoingList.style.display = "none";
      finishedList.style.display = "block";
    }
  });
});

