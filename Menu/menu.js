
let menuData = JSON.parse(localStorage.getItem("menu")) || [];

if (!menuData.length) {
  menuData = [
    { id:1, name:"Nasi Goreng", day:"Tuesday", price:15000, flashSale:true, image:"https://source.unsplash.com/300x200/?fried-rice" },
    { id:2, name:"Mie Ayam", day:"Wednesday", price:12000, flashSale:false, image:"https://source.unsplash.com/300x200/?noodles" },
    { id:3, name:"Ayam Geprek", day:"Thursday", price:18000, flashSale:false, image:"https://source.unsplash.com/300x200/?chicken" },
    { id:4, name:"Bakso", day:"Friday", price:13000, flashSale:false, image:"https://source.unsplash.com/300x200/?meatball" }
  ];
}

const days = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
let currentDayIndex = 0;

const container = document.getElementById("menuContainer");

/* ================= NAV ================= */
const nav = document.createElement("div");
nav.className = "nav";
document.body.insertBefore(nav, container);

function renderNav(){
  nav.innerHTML = `
    <button onclick="prevDay()">⬅ Prev</button>
    <b>${days[currentDayIndex]}</b>
    <button onclick="nextDay()">Next ➡</button>
  `;
}

/* ================= CART ================= */
let cart = [];

const overlay = document.createElement("div");
overlay.id = "overlay";
document.body.appendChild(overlay);

const cartBtn = document.createElement("div");
cartBtn.id = "cartBtn";
cartBtn.innerHTML = "🛒 <div id='cartCount'>0</div>";
document.body.appendChild(cartBtn);

const cartPanel = document.createElement("div");
cartPanel.id = "cartPanel";
document.body.appendChild(cartPanel);

/* OPEN CART */
cartBtn.onclick = () => {
  cartPanel.classList.add("open");
  overlay.classList.add("show");
  renderCart();
};

overlay.onclick = () => {
  cartPanel.classList.remove("open");
  overlay.classList.remove("show");
};

/* ADD CART */
function addToCart(item){
  cart.push(item);
  updateCart();
}

/* REMOVE CART */
function removeCart(i){
  cart.splice(i,1);
  updateCart();
}

/* UPDATE CART */
function updateCart(){
  document.getElementById("cartCount").innerText = cart.length;

  let total = 0;

  cartPanel.innerHTML = `<h2>Keranjang 🛒</h2>`;

  cart.forEach((item,i)=>{
    total += item.price;

    cartPanel.innerHTML += `
      <div class="cart-item">
        <span>${item.name}</span>
        <span>
          Rp${item.price}
          <button onclick="removeCart(${i})">x</button>
        </span>
      </div>
    `;
  });

  cartPanel.innerHTML += `<h3>Total: Rp${total}</h3>`;
}

/* ================= MENU RENDER (FIX FRIDAY BUG) ================= */
function renderMenu(){
  const day = days[currentDayIndex];

  document.getElementById("today").innerText = "Preview: " + day;

  const filtered = menuData.filter(i =>
    (i.day || "").trim().toLowerCase() === day.toLowerCase()
  );

  container.innerHTML = "";

  if(!filtered.length){
    container.innerHTML = `
      <div class="card">
        <h3>Out of Stock</h3>
      </div>
    `;
    return;
  }

  filtered.forEach(item=>{
    container.innerHTML += `
      <div class="card">
        <img src="${item.image}">
        <h3>${item.name}</h3>
        <p class="price">Rp${item.price}</p>

        ${item.flashSale ? `<div class="flash">FLASH SALE 🔥</div>` : ""}

        <button onclick='addToCart(${JSON.stringify(item).replace(/"/g,"&quot;")})'>
          Add to Cart
        </button>
      </div>
    `;
  });
}

/* ================= NAV ================= */
function nextDay(){
  if(currentDayIndex < days.length-1){
    currentDayIndex++;
    renderNav();
    renderMenu();
  }
}

function prevDay(){
  if(currentDayIndex > 0){
    currentDayIndex--;
    renderNav();
    renderMenu();
  }
}

/* INIT */
renderNav();
renderMenu();
updateCart();