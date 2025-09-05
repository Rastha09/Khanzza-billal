// ======================
// 🔹 Firebase Config
// ======================
const firebaseConfig = {
  apiKey: "AIzaSyDBqkgfTJ5HQEslwnehBIBXN2vrTRKmUro",
  authDomain: "makka-bakerry.firebaseapp.com",
  databaseURL: "https://makka-bakerry-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "makka-bakerry",
  storageBucket: "makka-bakerry.appspot.com",
  messagingSenderId: "425268690607",
  appId: "1:425268690607:web:16a37f551590ae34a11e5a",
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// ======================
// 🔹 DOM Elements
// ======================
const orderSummary = document.getElementById("order-summary");
const customerNotes = document.getElementById("customerNotes");
const loadingOverlay = document.getElementById("loadingOverlay");
const deliveryOptionsContainer = document.querySelector(".delivery-options-container");

// ======================
// 🔹 State
// ======================
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let selectedDeliveryOption = null;
let selectedPaymentMethod = "COD"; 
let selectedPaymentType = "qris"; // default untuk Mayar

// ======================
// 🔹 Auth Check
// ======================
auth.onAuthStateChanged((user) => {
  if (!user) {
    Swal.fire({
      title: "Login Diperlukan",
      text: "Silakan login untuk melanjutkan checkout.",
      icon: "warning",
      confirmButtonText: "Login",
    }).then(() => (window.location.href = "index.html"));
  } else {
    renderCheckout();
    loadUserProfile(user.uid);
  }
});

// ======================
// 🔹 Load Profile
// ======================
function loadUserProfile(userId) {
  database.ref("users/" + userId).once("value").then((snapshot) => {
    const userData = snapshot.val();
    if (userData) {
      document.getElementById("nama").value = userData.name || "";
      document.getElementById("telepon").value = userData.phone || "";
      document.getElementById("alamat").value = userData.address || "";
    }
  });
}

// ======================
// 🔹 Render Checkout
// ======================
function renderCheckout() {
  if (cart.length === 0) {
    Swal.fire({
      title: "Keranjang Kosong",
      text: "Silakan tambahkan produk ke keranjang sebelum checkout.",
      icon: "warning",
      confirmButtonText: "Ke Keranjang",
    }).then(() => (window.location.href = "cart.html"));
    return;
  }
  renderDeliveryOptions();
  renderPaymentOptions();
  renderOrderSummary();
}

// ======================
// 🔹 Delivery Options
// ======================
function renderDeliveryOptions() {
  const options = [
    { id: "kurir-toko", name: "Kurir Toko", cost: 5000, estimated: "1-2 hari" },
    { id: "ambil-di-tempat", name: "Ambil di Tempat", cost: 0, estimated: "Hari yang sama" },
  ];

  deliveryOptionsContainer.innerHTML = "";
  options.forEach((opt) => {
    const div = document.createElement("div");
    div.className = `delivery-option ${selectedDeliveryOption === opt.id ? "selected" : ""}`;
    div.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div><h6>${opt.name}</h6><small>${opt.estimated}</small></div>
        <span>Rp${opt.cost.toLocaleString()}</span>
      </div>`;
    div.addEventListener("click", () => {
      selectedDeliveryOption = opt.id;
      document.querySelectorAll(".delivery-option").forEach((d) => d.classList.remove("selected"));
      div.classList.add("selected");
      renderOrderSummary();
    });
    deliveryOptionsContainer.appendChild(div);
  });

  if (!selectedDeliveryOption) {
    selectedDeliveryOption = options[0].id;
    deliveryOptionsContainer.firstChild.classList.add("selected");
  }
}

// ======================
// 🔹 Payment Options
// ======================
function renderPaymentOptions() {
  const container = document.getElementById("paymentOptionsContainer");
  if (!container) return;

  const options = [
    { id: "COD", name: "Bayar di Tempat" },
    { id: "Transfer", name: "Transfer (Online Mayar)" },
  ];
  container.innerHTML = "";
  options.forEach((opt) => {
    const div = document.createElement("div");
    div.className = `payment-option ${selectedPaymentMethod === opt.id ? "selected" : ""}`;
    div.innerHTML = `<h6>${opt.name}</h6>`;
    div.addEventListener("click", () => {
      selectedPaymentMethod = opt.id;
      document.querySelectorAll(".payment-option").forEach((d) => d.classList.remove("selected"));
      div.classList.add("selected");

      const mayarContainer = document.getElementById("mayarPaymentTypeContainer");
      if (mayarContainer) {
        mayarContainer.style.display = opt.id === "Transfer" ? "block" : "none";
      }
      renderOrderSummary();
    });
    container.appendChild(div);
  });
}

// ======================
// 🔹 Order Summary
// ======================
function renderOrderSummary() {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryCost = getDeliveryCost();
  const total = subtotal + deliveryCost;

  orderSummary.innerHTML = `
    <h5>Ringkasan Pesanan</h5>
    ${cart.map((item) => `
      <div class="d-flex justify-content-between mb-2">
        <span>${item.name} x${item.quantity}</span>
        <strong>Rp${(item.price * item.quantity).toLocaleString()}</strong>
      </div>`).join("")}
    <hr>
    <div class="d-flex justify-content-between"><span>Subtotal</span><span>Rp${subtotal.toLocaleString()}</span></div>
    <div class="d-flex justify-content-between"><span>Ongkir</span><span>Rp${deliveryCost.toLocaleString()}</span></div>
    <hr>
    <div class="d-flex justify-content-between fw-bold"><span>Total</span><span>Rp${total.toLocaleString()}</span></div>
    <button id="placeOrderBtn" class="btn btn-primary w-100 mt-3">Buat Pesanan</button>
  `;
  document.getElementById("placeOrderBtn").addEventListener("click", placeOrder);
}

// ======================
// 🔹 Ongkir
// ======================
function getDeliveryCost() {
  return selectedDeliveryOption === "kurir-toko" ? 5000 : 0;
}

// ======================
// 🔹 Validasi Form
// ======================
function validateShippingForm() {
  const nama = document.getElementById("nama").value.trim();
  const telepon = document.getElementById("telepon").value.trim();
  const alamat = document.getElementById("alamat").value.trim();
  const provinsi = document.getElementById("provinsi").value;
  const kota = document.getElementById("kota").value;
  const kecamatan = document.getElementById("kecamatan").value;

  if (!nama || !telepon) {
    Swal.fire("Error", "Harap lengkapi data penerima", "error");
    return false;
  }
  return { nama, telepon, alamat, provinsi, kota, kecamatan };
}

// ======================
// 🔹 Place Order
// ======================
async function placeOrder() {
  const shippingInfo = validateShippingForm();
  if (!shippingInfo) return;

  const user = auth.currentUser;
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const total = subtotal + getDeliveryCost();
  const notes = customerNotes.value.trim();

  const orderData = {
    userId: user.uid,
    items: cart,
    total,
    subtotal,
    shippingInfo,
    deliveryMethod: selectedDeliveryOption,
    paymentMethod: selectedPaymentMethod,
    notes,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    status: "pending",
  };

  if (selectedPaymentMethod === "Transfer") {
    try {
      loadingOverlay.style.display = "flex";
      const paymentType = document.getElementById("mayarPaymentType")?.value || "qris";

      const response = await fetch("https://khanzza-billal.vercel.app/api/create-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: total,
          description: "Pembelian di Makka Bakerry",
          name: shippingInfo.nama,
          email: user.email || "customer@example.com",
          mobile: shippingInfo.telepon,
          paymentType,
          notes,
        }),
      });

      const data = await response.json();
      console.log("📩 Mayar Response:", data);

      if (data.data?.checkoutUrl) {
        await database.ref("orders").push({
          ...orderData,
          status: "waiting_payment",
          mayarTransactionId: data.data.id || null,
          paymentType: data.data.paymentType,
          checkoutUrl: data.data.checkoutUrl,
          vaNumber: data.data.va?.vaNumber || null,
          qrisString: data.data.qris?.qrString || null,
          expiryDate: data.data.va?.expiryDate || data.data.qris?.expiryDate || null,
        });

        window.location.href = data.data.checkoutUrl;
      } else {
        Swal.fire("Error", data.messages || "Gagal membuat transaksi Mayar", "error");
      }
    } catch (err) {
      Swal.fire("Error", err.message, "error");
    } finally {
      loadingOverlay.style.display = "none";
    }
  } else {
    // COD
    await database.ref("orders").push(orderData);
    Swal.fire("Pesanan Dibuat!", "Pesanan berhasil disimpan", "success").then(() => {
      cart = [];
      localStorage.setItem("cart", JSON.stringify(cart));
      window.location.href = "order-history.html";
    });
  }
}