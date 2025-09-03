// Initialize Firebase
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

// DOM Elements
const loadingSpinner = document.getElementById('loadingSpinner');
const orderDetailContainer = document.getElementById('orderDetailContainer');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const orderIdElement = document.getElementById('orderId');
const orderDateElement = document.getElementById('orderDate');
const orderStatusElement = document.getElementById('orderStatus');
const customerNameElement = document.getElementById('customerName');
const customerPhoneElement = document.getElementById('customerPhone');
const customerAddressElement = document.getElementById('customerAddress');
const customerNotesElement = document.getElementById('customerNotes');
const productListElement = document.getElementById('productList');
const paymentMethodElement = document.getElementById('paymentMethod');
const deliveryCostElement = document.getElementById('deliveryCost');
const orderTotalElement = document.getElementById('orderTotal');
const ratingContainer = document.getElementById('ratingContainer');
const homeButton = document.getElementById('homeButton'); // Tombol Home dari HTML
const whatsappButton = document.getElementById('whatsappButton');
const ratingModal = new bootstrap.Modal(document.getElementById('ratingModal'));
const previewStars = document.getElementById('previewStars');
const previewComment = document.getElementById('previewComment');
const confirmRating = document.getElementById('confirmRating');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');

  if (!orderId) {
    showError('ID pesanan tidak ditemukan. Pastikan Anda mengakses dari checkout yang valid.');
    return;
  }

  auth.onAuthStateChanged(user => {
    if (!user) {
      showError('Anda harus login untuk melihat detail pesanan.');
      return;
    }
    fetchOrderDetails(orderId, user.uid);
  });
});

// Fetch Order Details from Checkout Data
function fetchOrderDetails(orderId, userId) {
  const orderRef = database.ref(`orders/${orderId}`);
  orderRef.once('value')
    .then(snapshot => {
      const order = snapshot.val();
      console.log('Data lengkap dari Firebase:', JSON.stringify(order, null, 2)); // Log detail untuk debug
      if (!order) {
        showError('Pesanan tidak ditemukan di database. Periksa apakah data disimpan dari checkout.');
        return;
      }
      if (order.userId !== userId) {
        showError('Anda tidak berhak mengakses pesanan ini.');
        return;
      }

      // Hide loading and show container
      loadingSpinner.style.display = 'none';
      orderDetailContainer.classList.remove('d-none');

      // Populate order details from checkout data
      orderIdElement.textContent = orderId.slice(-8);
      orderDateElement.textContent = order.timestamp ? new Date(order.timestamp).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) : 'Tanggal tidak tersedia';
      
      // Update status with new options
      const statusMap = {
        'pending': 'Menunggu Persetujuan',
        'shipping': 'Sedang Dikirim',
        'completed': 'Pesanan Selesai',
        'cancelled': 'Pesanan Dibatalkan'
      };
      const mappedStatus = statusMap[order.status?.toLowerCase()] || 'Status tidak diketahui';
      orderStatusElement.textContent = mappedStatus;
      orderStatusElement.className = `status-badge badge ${getStatusClass(order.status || 'unknown')}`;

      // Ambil dari shippingInfo
      customerNameElement.textContent = order.shippingInfo?.nama || 'Tidak ada nama';
      customerPhoneElement.textContent = order.shippingInfo?.telepon || 'Tidak ada nomor';
      customerAddressElement.textContent = `${order.shippingInfo?.alamat || ''}, ${order.shippingInfo?.kecamatan || ''}, ${order.shippingInfo?.kota || ''}, ${order.shippingInfo?.provinsi || ''}`.trim() || 'Tidak ada alamat';
      if (order.notes) {
        customerNotesElement.style.display = 'block';
        customerNotesElement.textContent = `"${order.notes}"`;
      } else {
        customerNotesElement.style.display = 'none';
      }

      // Render products from checkout cart with image placeholder
      productListElement.innerHTML = ''; // Clear previous content
      if (order.items && Array.isArray(order.items)) {
        if (order.items.length === 0) {
          productListElement.innerHTML = '<p>Tidak ada produk yang ditemukan.</p>';
        } else {
          order.items.forEach(item => {
            const productItem = document.createElement('div');
            productItem.className = 'product-item d-flex align-items-center';
            productItem.innerHTML = `
              <div class="me-3">
                <img src="${item.imageUrl || 'https://via.placeholder.com/50'}" alt="${item.name || 'Produk'}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;">
              </div>
              <div class="product-info flex-grow-1">
                <p class="product-name mb-0">${item.name || 'Produk tidak diketahui'}</p>
                <small class="product-quantity text-muted">x${item.quantity || 1}</small>
              </div>
              <p class="product-price mb-0">Rp${(item.price || 0).toLocaleString()}</p>
            `;
            productListElement.appendChild(productItem);
          });
        }
      } else {
        console.warn('Items bukan array atau tidak ada:', order.items);
        productListElement.innerHTML = '<p>Tidak ada produk yang ditemukan atau data rusak.</p>';
      }

      // Payment details from checkout
      paymentMethodElement.textContent = order.paymentMethod || order.deliveryMethod || 'Tidak diketahui'; // Gunakan deliveryMethod sebagai fallback
      deliveryCostElement.textContent = `Rp${(order.deliveryCost || 0).toLocaleString()}`;
      orderTotalElement.innerHTML = `
        <div class="total-row"><span>Subtotal</span><span>Rp${(order.subtotal || 0).toLocaleString()}</span></div>
        <div class="total-row"><span>Pengiriman</span><span>Rp${(order.deliveryCost || 0).toLocaleString()}</span></div>
        <div class="total-final"><span>Total</span><span>Rp${(order.total || 0).toLocaleString()}</span></div>
      `;

      // Handle actions based on status
      handleOrderActions(order.status || 'unknown', order.shippingInfo?.telepon || '', order);

      // Check and render rating section
      fetchRating(orderId);
    })
    .catch(error => {
      showError(`Gagal memuat detail pesanan: ${error.message}. Periksa koneksi atau data di Firebase.`);
    });
}

// Get Status Class
function getStatusClass(status) {
  switch (status?.toLowerCase()) {
    case 'pending':
      return 'bg-warning text-dark';
    case 'shipping':
      return 'bg-info text-white';
    case 'completed':
      return 'bg-success text-white';
    case 'cancelled':
      return 'bg-danger text-white';
    default:
      return 'bg-secondary text-white';
  }
}

// Show Error
function showError(message) {
  loadingSpinner.style.display = 'none';
  errorMessage.classList.remove('d-none');
  errorText.textContent = message;
}

// Handle Order Actions
function handleOrderActions(status, phone, order) {
  const actionButtons = document.querySelector('.action-buttons');

  if (actionButtons) {
    // Reset visibility
    homeButton.classList.add('d-none');
    whatsappButton.classList.add('d-none');

    console.log('Status:', status, 'Phone:', phone); // Debug log

    // Tombol WhatsApp
    if (phone && status.toLowerCase() !== 'completed') {
      whatsappButton.classList.remove('d-none');
      // Buat pesan WhatsApp dengan tampilan modern dan rapi
      const orderId = orderIdElement.textContent;
      const customerName = order.shippingInfo?.nama || 'Pelanggan';
      const orderDate = order.timestamp ? new Date(order.timestamp).toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Tanggal tidak tersedia';
      const itemsList = order.items?.map(item => `• ${item.name} (x${item.quantity}) - Rp${(item.price || 0).toLocaleString()} 📷 [Lihat](${item.imageUrl || 'https://via.placeholder.com/150'})`).join('\n') || '- Belum ada detail';
      const total = `Rp${(order.total || 0).toLocaleString()}`;
      const paymentMethod = order.paymentMethod || order.deliveryMethod || 'Tidak diketahui';
      const deliveryCost = `Rp${(order.deliveryCost || 0).toLocaleString()}`;
      const subtotal = `Rp${(order.subtotal || 0).toLocaleString()}`;
      const productImageUrl = order.items?.[0]?.imageUrl || 'https://via.placeholder.com/150';
      const message = encodeURIComponent(`
        🎨 *PESANAN MAKKA BAKERRY #${orderId}* 🎨

        👋 Halo Tim Makka Bakerry, saya ${customerName} ingin mengecek pesanan saya!

        📋 *DETAIL PESANAN*
        - No. Pesanan: #${orderId}
        - Tanggal: ${orderDate}
        - Status: ⚡ ${status.charAt(0).toUpperCase() + status.slice(1)}
        - Item: 
        ${itemsList}

        🙋‍♂️ *INFO PELANGGAN*
        - Nama: ${customerName}
        - Telepon: ${order.shippingInfo?.telepon || 'Tidak ada nomor'}
        - Alamat: ${order.shippingInfo?.alamat || ''}, ${order.shippingInfo?.kecamatan || ''}, ${order.shippingInfo?.kota || ''}, ${order.shippingInfo?.provinsi || ''}
        - Catatan: ${order.notes || 'Tidak ada catatan'} ✨

        💸 *PEMBAYARAN*
        - Metode: ${paymentMethod}
        - Subtotal: ${subtotal}
        - Biaya Pengiriman: ${deliveryCost}
        - Total: ${total} 💳

        📸 *PREVIEW PRODUK*  
        Lihat ${order.items?.[0]?.name || 'produk'}: [${productImageUrl}](${productImageUrl})

        🚀 Mohon bantuan update statusnya atau saran spesial untuk order berikutnya. Terima kasih! 🌟
      `);
      whatsappButton.href = `https://wa.me/62${phone.replace(/^0/, '')}?text=${message}`;
    } else {
      console.log('WhatsApp button hidden - Status:', status, 'Phone:', phone); // Debug log
    }

    // Tombol Home
    if (homeButton) {
      homeButton.classList.remove('d-none');
      homeButton.addEventListener('click', (e) => {
        e.preventDefault(); // Mencegah perilaku default link
        window.location.href = 'index.html'; // Navigasi ke index.html
      });
    }
  }
}

// Fetch and Render Rating
function fetchRating(orderId) {
  const ratingRef = database.ref(`ratings/${orderId}`);
  ratingRef.once('value')
    .then(snapshot => {
      const ratingData = snapshot.val();
      if (ratingData) {
        renderRatingDisplay(ratingData.rating, ratingData.comment);
      } else {
        renderRatingForm(orderId);
      }
    })
    .catch(error => {
      console.error('Error fetching rating:', error); // Debug
      renderRatingForm(orderId); // Fallback to rating form if error
    });
}

// Render Rating Form
function renderRatingForm(orderId) {
  const html = `
    <div class="rating-card">
      <h5 class="mb-3">Beri Rating Pesanan</h5>
      <div class="rating-stars" id="ratingStars"></div>
      <form id="ratingForm" class="rating-form">
        <textarea class="form-control" id="ratingComment" placeholder="Tulis ulasan Anda (opsional)"></textarea>
        <button type="submit" class="btn btn-warning mt-3">Kirim Rating</button>
      </form>
    </div>
  `;
  ratingContainer.innerHTML = html;

  const ratingStars = document.getElementById('ratingStars');
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('i');
    star.className = 'fas fa-star';
    star.dataset.value = i;
    star.addEventListener('mouseover', handleStarHover);
    star.addEventListener('click', handleStarClick);
    ratingStars.appendChild(star);
  }

  const ratingForm = document.getElementById('ratingForm');
  ratingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const rating = document.querySelector('.rating-stars .active')?.dataset.value || 0;
    const comment = document.getElementById('ratingComment').value;
    if (rating > 0) {
      showRatingPreview(orderId, rating, comment);
    } else {
      Swal.fire('Error', 'Pilih rating terlebih dahulu.', 'error');
    }
  });
}

// Handle Star Hover
function handleStarHover(e) {
  const stars = document.querySelectorAll('.rating-stars i');
  stars.forEach(star => {
    star.classList.remove('hover');
    if (star.dataset.value <= e.target.dataset.value) {
      star.classList.add('hover');
    }
  });
}

// Handle Star Click
function handleStarClick(e) {
  const stars = document.querySelectorAll('.rating-stars i');
  stars.forEach(star => star.classList.remove('active', 'hover'));
  let found = false;
  stars.forEach(star => {
    if (star.dataset.value <= e.target.dataset.value) {
      star.classList.add('active');
    }
    if (star === e.target) found = true;
    if (!found) star.classList.add('hover');
  });
}

// Show Rating Preview
function showRatingPreview(orderId, rating, comment) {
  previewStars.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('i');
    star.className = `fas fa-star ${i <= rating ? 'active' : ''}`;
    previewStars.appendChild(star);
  }
  previewComment.textContent = comment || 'Tanpa komentar';
  ratingModal.show();
}

// Confirm Rating Submission
confirmRating.addEventListener('click', () => {
  const rating = document.querySelector('.rating-stars .active')?.dataset.value || 0;
  const comment = document.getElementById('ratingComment').value;
  if (rating > 0) {
    const orderId = new URLSearchParams(window.location.search).get('id');
    const ratingRef = database.ref(`ratings/${orderId}`);
    ratingRef.set({
      rating: parseInt(rating),
      comment: comment || '',
      timestamp: Date.now(),
    }).then(() => {
      ratingModal.hide();
      Swal.fire('Sukses', 'Rating berhasil dikirim!', 'success').then(() => {
        fetchRating(orderId); // Refresh rating display
      });
    }).catch(error => {
      Swal.fire('Error', 'Gagal mengirim rating: ' + error.message, 'error');
    });
  }
});

// Render Rating Display
function renderRatingDisplay(rating, comment) {
  const html = `
    <div class="rating-card">
      <h5 class="mb-3">Rating Pesanan</h5>
      <div class="rating-display">
        <div class="stars">
          ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}
        </div>
        ${comment ? `<div class="comment">${comment}</div>` : ''}
      </div>
    </div>
  `;
  ratingContainer.innerHTML = html;
}