import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { firebaseConfig } from "../firebase-config.js";

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;

/* ══════════════════════════════════════════════════════
   MAP STATE & FUNCTIONS
   ══════════════════════════════════════════════════════ */
let map = null;
let marker = null;

function initLeafletMap(lat, lng) {
  if (map) {
    map.setView([lat, lng], 15);
    marker.setLatLng([lat, lng]);
    return;
  }
  
  map = L.map('map').setView([lat, lng], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map);

  marker = L.marker([lat, lng], { draggable: true }).addTo(map);

  marker.on('dragend', async function (e) {
    const position = marker.getLatLng();
    document.getElementById("profile-lat").value = position.lat;
    document.getElementById("profile-lng").value = position.lng;
    
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}`);
      const data = await response.json();
      if (data && data.display_name) {
        document.getElementById("profile-address-auto").value = data.display_name;
      }
    } catch(err) {
      console.error("Geocoding failed", err);
    }
  });
}

/* ══════════════════════════════════════════════════════
   1. PROTEKSI ROUTE & TAMPILAN USER DROPDOWN
   ══════════════════════════════════════════════════════ */

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

  // Tombol riwayat (history.html) diletakkan di samping avatar dropdown
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
        <a href="profile.html" class="nav-dropdown-item" style="background: rgba(232, 98, 26, 0.08); color: var(--orange);">
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
    // Belum login, selamat tinggal! Redirect ke login
    sessionStorage.setItem("authRedirect", "../profile/profile.html");
    alert("⚠️ Silakan login terlebih dahulu untuk mengakses profil Anda!");
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
  
  // Isi data form dengan profil pengguna
  populateProfileData(user, userData);
});

/* ══════════════════════════════════════════════════════
   2. PENGISIAN FORM DATA & AVATAR
   ══════════════════════════════════════════════════════ */
function populateProfileData(user, userData) {
  // Update UI Ringkasan Sidebar Kiri
  const fullName = userData?.displayName || user.displayName || user.email.split("@")[0];
  const firstName = userData?.firstName || fullName.split(" ")[0];
  const initial = firstName.charAt(0).toUpperCase();

  document.getElementById("profile-fullname").textContent = fullName;
  document.getElementById("profile-email").textContent = user.email;
  
  const avatarLarge = document.getElementById("profile-avatar-large");
  avatarLarge.textContent = initial;

  // TABS 1: Data Diri
  document.getElementById("profile-first-name").value = userData?.firstName || fullName.split(" ")[0] || "";
  document.getElementById("profile-last-name").value = userData?.lastName || fullName.split(" ").slice(1).join(" ") || "";
  document.getElementById("profile-phone-input").value = userData?.phone || "";
  document.getElementById("profile-email-input").value = user.email;

  // TABS 2: Lokasi Pengiriman
  const loc = userData?.location || {};
  document.getElementById("profile-address-detail").value = loc.addressDetail || userData?.addressDetail || "";
  document.getElementById("profile-kelurahan").value = loc.kelurahan || userData?.kelurahan || "";
  document.getElementById("profile-kecamatan").value = loc.kecamatan || userData?.kecamatan || "";
  document.getElementById("profile-kota").value = loc.kota || userData?.kota || "";
  document.getElementById("profile-kodepos").value = loc.kodepos || userData?.kodepos || "";
  document.getElementById("profile-address-auto").value = loc.addressAuto || userData?.addressAuto || "";
  
  const lat = loc.lat || -6.200000;
  const lng = loc.lng || 106.816666;
  document.getElementById("profile-lat").value = lat;
  document.getElementById("profile-lng").value = lng;
  initLeafletMap(lat, lng);
}

/* ══════════════════════════════════════════════════════
   3. SISTEM NAVIGASI TAB HALAMAN
   ══════════════════════════════════════════════════════ */
const tabButtons = document.querySelectorAll(".profile-menu-item");
const tabPanes = document.querySelectorAll(".profile-pane");

function activateTab(targetId) {
  tabButtons.forEach(t => t.classList.remove("active"));
  tabPanes.forEach(p => p.classList.remove("active"));

  const btn = Array.from(tabButtons).find(t => t.dataset.tab === targetId);
  if (btn) btn.classList.add("active");
  
  const pane = document.getElementById(targetId);
  if (pane) pane.classList.add("active");
  
  if (targetId === "tab-address" && map) {
    setTimeout(() => {
      map.invalidateSize();
    }, 150);
  }
}

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.dataset.tab) {
      activateTab(btn.dataset.tab);
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  if (tab === "address") {
    activateTab("tab-address");
  } else if (tab === "personal") {
    activateTab("tab-personal");
  }
});

/* ══════════════════════════════════════════════════════
   4. TOAST FEEDBACK HELPER
   ══════════════════════════════════════════════════════ */
function showToast(msg, isSuccess = true) {
  const el = document.getElementById("toast");
  const txt = document.getElementById("toast-msg");
  txt.textContent = msg;
  if (isSuccess) {
    el.style.background = "#047857"; // Hijau sukses
  } else {
    el.style.background = "#C2410C"; // Merah gagal
  }
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3000);
}

/* ══════════════════════════════════════════════════════
   5. UPDATE DATA DIRI (PERSONAL INFO)
   ══════════════════════════════════════════════════════ */
document.getElementById("form-personal").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  if (!currentUser) return;

  const btn = document.getElementById("btn-save-personal");
  const txt = btn.querySelector(".btn-save-text");
  const spinner = btn.querySelector(".btn-save-spinner");

  // Loading state
  btn.disabled = true;
  txt.style.opacity = "0.7";
  spinner.style.display = "inline-block";

  const firstName = document.getElementById("profile-first-name").value.trim();
  const lastName = document.getElementById("profile-last-name").value.trim();
  const phone = document.getElementById("profile-phone-input").value.trim();
  const displayName = `${firstName} ${lastName}`;

  try {
    // 1. Simpan di Firestore
    await setDoc(doc(db, "users", currentUser.uid), {
      firstName,
      lastName,
      displayName,
      phone
    }, { merge: true });

    // 2. Perbarui profil di Firebase Auth
    await updateProfile(currentUser, { displayName });

    // Update UI sidebar kiri
    document.getElementById("profile-fullname").textContent = displayName;
    document.getElementById("profile-avatar-large").textContent = firstName.charAt(0).toUpperCase();

    // Re-render navbar dropdown trigger
    const avatarTrigger = document.querySelector(".nav-user-avatar");
    const nameTrigger = document.querySelector(".nav-user-name");
    const headerName = document.querySelector(".nav-dropdown-header-name");
    
    if (avatarTrigger) avatarTrigger.textContent = firstName.charAt(0).toUpperCase();
    if (nameTrigger) nameTrigger.textContent = firstName;
    if (headerName) headerName.textContent = displayName;

    showToast("Data diri Anda berhasil diperbarui!");
  } catch (err) {
    console.error("Gagal simpan data personal", err);
    showToast("Gagal menyimpan perubahan: " + err.message, false);
  } finally {
    // Reset Loading State
    btn.disabled = false;
    txt.style.opacity = "1";
    spinner.style.display = "none";
  }
});

/* ══════════════════════════════════════════════════════
   6. UPDATE ALAMAT PENGIRIMAN
   ══════════════════════════════════════════════════════ */
document.getElementById("form-address").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentUser) return;

  const btn = document.getElementById("btn-save-address");
  const txt = btn.querySelector(".btn-save-text");
  const spinner = btn.querySelector(".btn-save-spinner");

  // Loading state
  btn.disabled = true;
  txt.style.opacity = "0.7";
  spinner.style.display = "inline-block";

  const addressDetail = document.getElementById("profile-address-detail").value.trim();
  const kelurahan = document.getElementById("profile-kelurahan").value.trim();
  const kecamatan = document.getElementById("profile-kecamatan").value.trim();
  const kota = document.getElementById("profile-kota").value.trim();
  const kodepos = document.getElementById("profile-kodepos").value.trim();

  // Ambil alamat peta lama agar tidak hilang jika tidak diganti
  const addressAuto = document.getElementById("profile-address-auto").value;
  const lat = parseFloat(document.getElementById("profile-lat").value) || -6.200000;
  const lng = parseFloat(document.getElementById("profile-lng").value) || 106.816666;

  const locationObj = {
    addressDetail,
    kelurahan,
    kecamatan,
    kota,
    kodepos,
    addressAuto: addressAuto === "Tidak tersedia" ? "" : addressAuto,
    lat,
    lng
  };

  try {
    // Simpan di root dokumen & map lokasi nested demi kompatibilitas penuh!
    await setDoc(doc(db, "users", currentUser.uid), {
      addressDetail,
      kelurahan,
      kecamatan,
      kota,
      kodepos,
      lat,
      lng,
      addressAuto,
      location: locationObj
    }, { merge: true });

    showToast("Alamat pengiriman berhasil diperbarui!");
  } catch (err) {
    console.error("Gagal simpan alamat", err);
    showToast("Gagal menyimpan alamat: " + err.message, false);
  } finally {
    // Reset Loading State
    btn.disabled = false;
    txt.style.opacity = "1";
    spinner.style.display = "none";
  }
});

