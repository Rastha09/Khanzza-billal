// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDBqkgfTJ5HQEslwnehBIBXN2vrTRKmUro",
  authDomain: "makka-bakerry.firebaseapp.com",
  databaseURL: "https://makka-bakerry-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "makka-bakerry",
  storageBucket: "makka-bakerry.appspot.com",
  messagingSenderId: "425268690607",
  appId: "1:425268690607:web:16a37f551590ae34a11e5a",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// DOM Elements
const cartItemsContainer = document.getElementById('cartItems');
const totalPriceElement = document.getElementById('totalPrice');
const checkoutBtn = document.getElementById('checkoutBtn');
const loadingOverlay = document.getElementById('loadingOverlay');

// Local Cart Storage
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Lottie Animation Initialization
let animation = null;
document.addEventListener('DOMContentLoaded', () => {
  const lottieLoading = document.getElementById('lottie-loading');
  if (lottieLoading) {
    animation = lottie.loadAnimation({
      container: lottieLoading,
      renderer: 'svg',
      loop: true,
      autoplay: false,
      path: 'https://assets.lottiefiles.com/packages/lf20_yr6zz3wv.json',
    });
  }
});

// Authentication Check
auth.onAuthStateChanged(user => {
  if (!user) {
    Swal.fire({
      title: 'Login Diperlukan',
      text: 'Silakan login untuk melihat keranjang Anda.',
      icon: 'warning',
      confirmButtonText: 'Login',
    }).then(() => {
      window.location.href = 'index.html';
    });
  } else {
    renderCartItems();
  }
});

// Render Cart Items
function renderCartItems() {
  cartItemsContainer.innerHTML = '';
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="empty-cart">
        <i class="fas fa-shopping-cart"></i>
        <h4>Keranjang Kosong</h4>
        <p>Tambahkan produk ke keranjang untuk memulai belanja!</p>
        <a href="index.html" class="btn btn-primary">Belanja Sekarang</a>
      </div>`;
    totalPriceElement.textContent = 'Rp0';
    checkoutBtn.disabled = true;
    return;
  }

  // Add Select All Checkbox
  const selectAllContainer = document.createElement('div');
  selectAllContainer.className = 'd-flex align-items-center mb-3';
  selectAllContainer.innerHTML = `
    <div class="item-checkbox">
      <input type="checkbox" class="form-check-input" id="selectAll" checked>
      <label class="form-check-label" for="selectAll">Pilih Semua</label>
    </div>`;
  cartItemsContainer.appendChild(selectAllContainer);

  // Render Cart Items
  cart.forEach(item => {
    const cartItem = document.createElement('div');
    cartItem.className = 'cart-item d-flex align-items-center';
    cartItem.innerHTML = `
      <div class="d-flex align-items-center flex-grow-1">
        <div class="item-checkbox me-3">
          <input type="checkbox" class="form-check-input item-select" data-id="${item.id}" checked>
        </div>
        <img src="images/produk ${item.id}.png" class="product-img me-3" alt="${item.name}"
             onerror="this.src='https://via.placeholder.com/80?text=${item.name}'">
        <div>
          <h6 class="mb-1">${item.name}</h6>
          <p class="text-primary mb-1">Rp${item.price.toLocaleString('id-ID')}</p>
        </div>
      </div>
      <div class="d-flex flex-column align-items-end">
        <button class="btn btn-outline-danger btn-remove-icon mb-2" onclick="removeItem(${item.id})">
          <i class="fas fa-trash"></i>
        </button>
        <div class="input-group input-group-sm quantity-selector">
          <button class="btn btn-outline-secondary quantity-minus" type="button" onclick="updateQuantity(${item.id}, -1)">-</button>
          <input type="number" class="form-control quantity-input" value="${item.quantity}" min="1" onchange="updateQuantity(${item.id}, this.value)">
          <button class="btn btn-outline-secondary quantity-plus" type="button" onclick="updateQuantity(${item.id}, 1)">+</button>
        </div>
      </div>`;
    cartItemsContainer.appendChild(cartItem);
  });

  attachCheckboxListeners();
  updateTotalPrice();
  checkoutBtn.disabled = false;
}

// Update Quantity
function updateQuantity(id, change) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.quantity = typeof change === 'number'
    ? Math.max(1, item.quantity + change)
    : Math.max(1, parseInt(change) || 1);
  updateCartStorage();
  renderCartItems();
}

// Remove Item
function removeItem(id) {
  Swal.fire({
    title: 'Hapus Produk?',
    text: 'Anda yakin ingin menghapus produk ini dari keranjang?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Hapus',
    cancelButtonText: 'Batal',
  }).then(result => {
    if (result.isConfirmed) {
      cart = cart.filter(i => i.id !== id);
      updateCartStorage();
      renderCartItems();
      Swal.fire('Dihapus!', 'Produk berhasil dihapus.', 'success');
    }
  });
}

// Update LocalStorage
function updateCartStorage() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

// Update Total Price
function updateTotalPrice() {
  let total = 0;
  const checkboxes = document.querySelectorAll('.item-select:checked');
  checkboxes.forEach(cb => {
    const item = cart.find(i => i.id === parseInt(cb.dataset.id));
    if (item) total += item.price * item.quantity;
  });
  totalPriceElement.textContent = `Rp${total.toLocaleString('id-ID')}`;
  checkoutBtn.disabled = checkboxes.length === 0;

  const selectAll = document.getElementById('selectAll');
  if (selectAll) {
    const all = document.querySelectorAll('.item-select');
    selectAll.checked = all.length === checkboxes.length;
  }
}

// Attach Checkbox Listeners
function attachCheckboxListeners() {
  const selectAll = document.getElementById('selectAll');
  const items = document.querySelectorAll('.item-select');

  if (selectAll) {
    selectAll.addEventListener('change', () => {
      items.forEach(cb => cb.checked = selectAll.checked);
      updateTotalPrice();
    });
  }

  items.forEach(cb => cb.addEventListener('change', updateTotalPrice));
}

// Checkout Button Event
checkoutBtn.addEventListener('click', () => {
  const selected = Array.from(document.querySelectorAll('.item-select:checked'))
    .map(cb => parseInt(cb.dataset.id));
  if (selected.length === 0) {
    Swal.fire('Pilih Produk', 'Silakan pilih produk untuk checkout.', 'warning');
    return;
  }

  cart = cart.filter(i => selected.includes(i.id));
  updateCartStorage();

  if (loadingOverlay && animation) {
    loadingOverlay.style.display = 'flex';
    animation.goToAndPlay(0, true);
  }

  setTimeout(() => {
    if (loadingOverlay) loadingOverlay.style.display = 'none';
    if (animation) animation.stop();
    window.location.href = 'checkout.html';
  }, 3800);
});