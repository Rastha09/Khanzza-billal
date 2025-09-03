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
const shippingForm = document.getElementById('shippingForm');
const deliveryOptionsContainer = document.querySelector('.delivery-options-container');
const orderSummary = document.getElementById('order-summary');
const customerNotes = document.getElementById('customerNotes');
const loadingOverlay = document.getElementById('loadingOverlay');

// Cart Storage
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let selectedDeliveryOption = null;
let selectedPaymentMethod = 'COD'; // Default to COD

// Lottie Animation for Loading
const lottieLoading = document.getElementById('lottie-loading');
let animation = null;
if (lottieLoading) {
    animation = lottie.loadAnimation({
        container: lottieLoading,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'https://assets.lottiefiles.com/packages/lf20_yr6zz3wv.json'
    });

    animation.addEventListener('DOMLoaded', () => {
        if (loadingOverlay && loadingOverlay.style.display === 'flex') {
            animation.play();
        }
    });
}

// Authentication Check
auth.onAuthStateChanged(user => {
    if (!user) {
        Swal.fire({
            title: 'Login Diperlukan',
            text: 'Silakan login untuk melanjutkan checkout.',
            icon: 'warning',
            confirmButtonText: 'Login'
        }).then(() => {
            window.location.href = 'index.html';
        });
    } else {
        renderCheckout();
        loadUserProfile(user.uid);
    }
});

// Load User Profile
function loadUserProfile(userId) {
    database.ref('users/' + userId).once('value')
        .then(snapshot => {
            const userData = snapshot.val();
            if (userData) {
                document.getElementById('nama').value = userData.name || '';
                document.getElementById('telepon').value = userData.phone || '';
                document.getElementById('alamat').value = userData.address || '';
            }
        })
        .catch(error => {
            console.error('Failed to load user profile:', error);
        });
}

// Render Checkout Page
function renderCheckout() {
    if (cart.length === 0) {
        Swal.fire({
            title: 'Keranjang Kosong',
            text: 'Silakan tambahkan produk ke keranjang sebelum checkout.',
            icon: 'warning',
            confirmButtonText: 'Ke Keranjang'
        }).then(() => {
            window.location.href = 'cart.html';
        });
        return;
    }

    renderDeliveryOptions();
    renderPaymentOptions(); // Add payment options
    renderOrderSummary();
}

// Render Delivery Options
function renderDeliveryOptions() {
    const deliveryOptions = [
        { id: 'kurir-toko', name: 'Kurir Toko', cost: 5000, estimated: '1-2 hari' },
        { id: 'ambil-di-tempat', name: 'Ambil di Tempat', cost: 0, estimated: 'Hari yang sama' }
    ];

    deliveryOptionsContainer.innerHTML = '';
    deliveryOptions.forEach(option => {
        const optionDiv = document.createElement('div');
        optionDiv.className = `delivery-option ${selectedDeliveryOption === option.id ? 'selected' : ''}`;
        optionDiv.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-1">${option.name}</h6>
                    <p class="mb-0 text-muted">Estimasi: ${option.estimated}</p>
                </div>
                <p class="mb-0 fw-bold">Rp${option.cost.toLocaleString()}</p>
            </div>
        `;
        optionDiv.addEventListener('click', () => {
            selectedDeliveryOption = option.id;
            document.querySelectorAll('.delivery-option').forEach(opt => opt.classList.remove('selected'));
            optionDiv.classList.add('selected');
            renderOrderSummary();
        });
        deliveryOptionsContainer.appendChild(optionDiv);
    });

    if (!selectedDeliveryOption && deliveryOptions.length > 0) {
        selectedDeliveryOption = deliveryOptions[0].id;
        deliveryOptionsContainer.firstChild.classList.add('selected');
        renderOrderSummary();
    }
}

// Render Payment Options
function renderPaymentOptions() {
    const paymentOptionsContainer = document.getElementById('paymentOptionsContainer'); // Add this ID to your HTML
    if (!paymentOptionsContainer) return;

    const paymentOptions = [
        { id: 'COD', name: 'Bayar di Tempat' },
        { id: 'Transfer', name: 'Transfer Bank' }
    ];

    paymentOptionsContainer.innerHTML = '';
    paymentOptions.forEach(option => {
        const optionDiv = document.createElement('div');
        optionDiv.className = `payment-option ${selectedPaymentMethod === option.id ? 'selected' : ''}`;
        optionDiv.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-1">${option.name}</h6>
                </div>
            </div>
        `;
        optionDiv.addEventListener('click', () => {
            selectedPaymentMethod = option.id;
            document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('selected'));
            optionDiv.classList.add('selected');
            renderOrderSummary();
        });
        paymentOptionsContainer.appendChild(optionDiv);
    });

    if (!selectedPaymentMethod && paymentOptions.length > 0) {
        selectedPaymentMethod = paymentOptions[0].id;
        paymentOptionsContainer.firstChild.classList.add('selected');
    }
}

// Render Order Summary
function renderOrderSummary() {
    let subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryCost = getDeliveryCost();
    const total = subtotal + deliveryCost;

    orderSummary.innerHTML = `
        <h5 class="card-title mb-4">
            <i class="fas fa-shopping-basket me-2 text-primary"></i>Ringkasan Pesanan
        </h5>
        ${cart.map(item => `
            <div class="d-flex align-items-center mb-3">
                <img src="images/produk ${item.id}.png" class="product-img me-3" alt="${item.name}" 
                     onerror="this.src='https://via.placeholder.com/60?text=${item.name}'; this.classList.add('loaded')">
                <div class="flex-grow-1">
                    <p class="mb-0">${item.name}</p>
                    <small class="text-muted">Rp${item.price.toLocaleString()} x ${item.quantity}</small>
                </div>
                <p class="mb-0 fw-bold">Rp${(item.price * item.quantity).toLocaleString()}</p>
            </div>
        `).join('')}
        <hr>
        <div class="d-flex justify-content-between mb-2">
            <span>Subtotal</span>
            <span>Rp${subtotal.toLocaleString()}</span>
        </div>
        <div class="d-flex justify-content-between mb-2">
            <span>Biaya Pengiriman</span>
            <span>Rp${deliveryCost.toLocaleString()}</span>
        </div>
        <hr>
        <div class="d-flex justify-content-between fw-bold">
            <span>Total</span>
            <span>Rp${total.toLocaleString()}</span>
        </div>
        <button id="placeOrderBtn" class="btn btn-primary w-100 mt-4">
            <i class="fas fa-check me-2"></i>Buat Pesanan
        </button>
    `;

    // Add loaded class to images after they load
    orderSummary.querySelectorAll('.product-img').forEach(img => {
        img.addEventListener('load', () => img.classList.add('loaded'));
    });

    // Attach event listener to place order button
    document.getElementById('placeOrderBtn').addEventListener('click', placeOrder);
}

// Get Delivery Cost
function getDeliveryCost() {
    const deliveryOptions = {
        'kurir-toko': 5000,
        'ambil-di-tempat': 0
    };
    return deliveryOptions[selectedDeliveryOption] || 0;
}

// Validate Shipping Form
function validateShippingForm() {
    const nama = document.getElementById('nama').value.trim();
    const telepon = document.getElementById('telepon').value.trim();
    const alamat = document.getElementById('alamat').value.trim();
    const provinsi = document.getElementById('provinsi').value;
    const kota = document.getElementById('kota').value;
    const kecamatan = document.getElementById('kecamatan').value;

    if (selectedDeliveryOption === 'ambil-di-tempat') {
        if (!nama || !telepon) {
            Swal.fire('Error', 'Harap lengkapi nama dan nomor telepon.', 'error');
            return false;
        }
    } else {
        if (!nama || !telepon || !alamat || !provinsi || !kota || !kecamatan) {
            Swal.fire('Error', 'Harap lengkapi semua informasi pengiriman.', 'error');
            return false;
        }
    }

    if (!/^(08)[0-9]{9,12}$/.test(telepon)) {
        Swal.fire('Error', 'Nomor telepon tidak valid. Gunakan format 08xxxxxxxxx.', 'error');
        return false;
    }

    return { nama, telepon, alamat, provinsi, kota, kecamatan };
}

// Place Order
async function placeOrder() {
  const shippingInfo = validateShippingForm();
  if (!shippingInfo) return;

  if (!selectedDeliveryOption) {
    Swal.fire('Error', 'Harap pilih metode pengiriman.', 'error');
    return;
  }

  const user = auth.currentUser;
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryCost = getDeliveryCost();
  const total = subtotal + deliveryCost;
  const notes = customerNotes.value.trim();

  // Data pesanan
  const orderData = {
    userId: user.uid,
    items: cart,
    total,
    subtotal,
    deliveryCost,
    shippingInfo,
    deliveryMethod: selectedDeliveryOption,
    paymentMethod: selectedPaymentMethod,
    notes,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    status: 'pending'
  };

  // 🔹 Jika user pilih Bayar Online → arahkan ke Mayar
  if (selectedPaymentMethod === "Transfer") {
    try {
      if (loadingOverlay && animation) {
        loadingOverlay.style.display = 'flex';
        animation.play();
      }

      // Request ke backend untuk buat transaksi Mayar
      const response = await fetch("https://khanzza-billal.vercel.app/api/create-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: total,
          description: "Pembelian di Khanzza Billal",
          customer: {
            name: shippingInfo.nama,
            email: user.email || "customer@example.com",
            phone: shippingInfo.telepon,
            address: shippingInfo.alamat
          },
          notes
        })
      });

      const data = await response.json();

      if (data.payment_url) {
        // Simpan order ke Firebase dengan status "waiting_payment"
        const orderRef = await database.ref('orders').push({
          ...orderData,
          status: "waiting_payment",
          mayarTransactionId: data.transaction_id || null
        });

        // Redirect ke halaman pembayaran Mayar
        window.location.href = data.payment_url;
      } else {
        Swal.fire("Error", "Gagal membuat transaksi Mayar.", "error");
      }

    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Terjadi kesalahan saat membuat pembayaran.", "error");
    } finally {
      if (loadingOverlay) loadingOverlay.style.display = 'none';
      if (animation) animation.stop();
    }
  } else {
    // 🔹 Kalau COD → simpan langsung ke Firebase
    if (loadingOverlay && animation) {
      loadingOverlay.style.display = 'flex';
      animation.play();
    }

    database.ref('orders').push(orderData)
      .then(() => {
        cart = [];
        localStorage.setItem('cart', JSON.stringify(cart));

        if (loadingOverlay) loadingOverlay.style.display = 'none';
        if (animation) animation.stop();

        Swal.fire({
          title: 'Pesanan Dibuat!',
          text: 'Pesanan Anda berhasil disimpan.',
          icon: 'success',
          confirmButtonText: 'Lihat Riwayat Pesanan'
        }).then(() => {
          window.location.href = 'order-history.html';
        });
      })
      .catch(error => {
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        if (animation) animation.stop();
        Swal.fire('Error', 'Gagal membuat pesanan: ' + error.message, 'error');
      });
  }
}