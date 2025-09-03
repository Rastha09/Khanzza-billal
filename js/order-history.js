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
const loadingContainer = document.getElementById('loadingContainer');
const ordersContainer = document.getElementById('ordersContainer');
const emptyState = document.getElementById('emptyState');

// Authentication Check
auth.onAuthStateChanged(user => {
  if (!user) {
    Swal.fire({
      title: 'Login Diperlukan',
      text: 'Silakan login untuk melihat riwayat pesanan.',
      icon: 'warning',
      confirmButtonText: 'Login',
    }).then(() => {
      window.location.href = 'index.html';
    });
  } else {
    fetchOrders(user.uid);
  }
});

// Fetch and Render Orders
function fetchOrders(userId) {
  const ordersRef = database.ref('orders').orderByChild('userId').equalTo(userId);
  ordersRef.once('value')
    .then(snapshot => {
      loadingContainer.style.display = 'none';
      const orders = [];
      snapshot.forEach(childSnapshot => {
        orders.push({
          id: childSnapshot.key,
          ...childSnapshot.val(),
        });
      });

      // Check and update overdue shipping orders
      checkOverdueOrders(orders);

      if (orders.length === 0) {
        emptyState.classList.remove('d-none');
      } else {
        renderOrders(orders.reverse()); // Reverse to show newest first
      }
    })
    .catch(error => {
      loadingContainer.style.display = 'none';
      Swal.fire('Error', 'Gagal memuat riwayat pesanan: ' + error.message, 'error');
    });
}

// Check and Update Overdue Orders
function checkOverdueOrders(orders) {
  const now = Date.now();
  const threeDaysInMs = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds

  orders.forEach(order => {
    if (order.status?.toLowerCase() === 'shipping' && order.timestamp) {
      const timeElapsed = now - order.timestamp;
      if (timeElapsed > threeDaysInMs) {
        updateOrderStatus(order.id, 'completed');
      }
    }
  });
}

// Render Orders
function renderOrders(orders) {
  ordersContainer.innerHTML = '';
  orders.forEach(order => {
    const orderCard = document.createElement('div');
    orderCard.className = 'card order-card shadow-sm transition-all';

    // Format timestamp
    const date = new Date(order.timestamp);
    const formattedDate = date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Status mapping and badge color
    const statusMap = {
      'pending': 'Menunggu Persetujuan',
      'shipping': 'Sedang Dikirim',
      'completed': 'Pesanan Selesai',
      'cancelled': 'Pesanan Dibatalkan'
    };
    const mappedStatus = statusMap[order.status?.toLowerCase()] || 'Status tidak diketahui';
    let statusClass = '';
    switch (order.status?.toLowerCase()) {
      case 'pending':
        statusClass = 'bg-warning text-dark';
        break;
      case 'shipping':
        statusClass = 'bg-info text-white';
        break;
      case 'completed':
        statusClass = 'bg-success text-white';
        break;
      case 'cancelled':
        statusClass = 'bg-danger text-white';
        break;
      default:
        statusClass = 'bg-secondary text-white';
    }

    // Order items
    let itemsHtml = '';
    order.items.forEach(item => {
      itemsHtml += `
        <div class="d-flex align-items-center mb-2">
          <img src="images/produk ${item.id}.png" class="order-product-img me-3" alt="${item.name}" 
               onerror="this.src='https://via.placeholder.com/40?text=${item.name}'">
          <div>
            <p class="mb-0">${item.name}</p>
            <small class="text-muted">Rp${item.price.toLocaleString()} x ${item.quantity}</small>
          </div>
        </div>
      `;
    });

    // Add "Pesanan Diterima" button if status is "Sedang Dikirim"
    let acceptButtonHtml = '';
    if (order.status?.toLowerCase() === 'shipping') {
      acceptButtonHtml = `
        <button class="btn btn-success mt-2 w-100" onclick="confirmOrderReceived('${order.id}', event)">Pesanan Diterima</button>
      `;
    }

    orderCard.innerHTML = `
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h6 class="mb-0">Pesanan #${order.id.slice(-8)}</h6>
          <span class="status-badge ${statusClass}">${mappedStatus}</span>
        </div>
        <div class="mb-3">
          ${itemsHtml}
        </div>
        <div class="d-flex justify-content-between align-items-center">
          <small class="text-muted">${formattedDate}</small>
          <p class="mb-0 fw-bold">Total: Rp${order.total.toLocaleString()}</p>
        </div>
        <small class="text-muted mt-2 d-block">Klik pesanan ini untuk melihat detail pesanan Anda.</small>
        ${acceptButtonHtml}
      </div>
    `;

    // Add click event to redirect to order detail page
    orderCard.addEventListener('click', () => {
      window.location.href = `order-detail.html?id=${order.id}`;
    });

    ordersContainer.appendChild(orderCard);
  });
}

// Confirm Order Received
function confirmOrderReceived(orderId, event) {
  event.stopPropagation(); // Prevent the click from bubbling to the orderCard
  Swal.fire({
    title: 'Konfirmasi',
    text: 'Apakah Anda yakin pesanan telah diterima?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Ya',
    cancelButtonText: 'Batal',
  }).then((result) => {
    if (result.isConfirmed) {
      updateOrderStatus(orderId, 'completed', true); // Pass flag to show rating
    }
  });
}

// Update Order Status
function updateOrderStatus(orderId, newStatus, showRating) {
  const orderRef = database.ref(`orders/${orderId}`);
  orderRef.update({ status: newStatus })
    .then(() => {
      if (showRating) {
        showRatingOverlay(orderId); // Show rating overlay after status update
      } else {
        Swal.fire('Sukses', 'Status pesanan telah diubah ke Pesanan Selesai!', 'success').then(() => {
          fetchOrders(auth.currentUser.uid); // Refresh the order list
        });
      }
    })
    .catch(error => {
      Swal.fire('Error', 'Gagal mengubah status: ' + error.message, 'error');
    });
}

// Show Rating Overlay
function showRatingOverlay(orderId) {
  let rating = 0;
  let comment = '';

  Swal.fire({
    title: 'Beri Rating Pesanan',
    html: `
      <div class="rating-stars" id="ratingStars" style="text-align: center; margin-bottom: 15px;">
        ${[1, 2, 3, 4, 5].map(i => `<i class="fas fa-star" data-value="${i}" style="cursor: pointer; font-size: 24px; margin: 0 5px; color: #ccc;"></i>`).join('')}
      </div>
      <textarea id="ratingComment" class="swal2-input" placeholder="Tulis ulasan Anda (opsional)" style="width: 100%; margin-bottom: 15px;"></textarea>
    `,
    showCancelButton: true,
    confirmButtonText: 'Kirim Rating',
    cancelButtonText: 'Lewati',
    didOpen: () => {
      const stars = document.querySelectorAll('#ratingStars .fa-star');
      stars.forEach(star => {
        star.addEventListener('click', () => {
          rating = parseInt(star.dataset.value);
          stars.forEach(s => s.style.color = s.dataset.value <= rating ? '#ffd700' : '#ccc');
        });
        star.addEventListener('mouseover', () => {
          const hoverValue = parseInt(star.dataset.value);
          stars.forEach(s => s.style.color = s.dataset.value <= hoverValue ? '#ffd700' : '#ccc');
        });
        star.addEventListener('mouseout', () => {
          stars.forEach(s => s.style.color = s.dataset.value <= rating ? '#ffd700' : '#ccc');
        });
      });

      const commentInput = document.getElementById('ratingComment');
      commentInput.addEventListener('input', () => {
        comment = commentInput.value;
      });
    },
    preConfirm: () => {
      if (rating === 0) {
        Swal.showValidationMessage('Pilih rating terlebih dahulu.');
        return false;
      }
      return { rating, comment };
    }
  }).then((result) => {
    if (result.isConfirmed) {
      const { rating, comment } = result.value;
      submitRating(orderId, rating, comment);
    } else if (result.dismiss === Swal.DismissReason.cancel) {
      fetchOrders(auth.currentUser.uid); // Refresh on skip
    }
  });
}

// Submit Rating to Firebase
function submitRating(orderId, rating, comment) {
  const ratingRef = database.ref(`ratings/${orderId}`);
  ratingRef.set({
    rating: parseInt(rating),
    comment: comment || '',
    timestamp: Date.now(),
  }).then(() => {
    Swal.fire('Sukses', 'Rating berhasil dikirim!', 'success').then(() => {
      fetchOrders(auth.currentUser.uid); // Refresh the order list
    });
  }).catch(error => {
    Swal.fire('Error', 'Gagal mengirim rating: ' + error.message, 'error');
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadingContainer.style.display = 'flex';
});