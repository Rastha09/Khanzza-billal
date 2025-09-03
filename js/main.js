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
const authOverlay = document.getElementById('authOverlay');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const floatingLogoutBtn = document.getElementById('floatingLogoutBtn');
const cartCount = document.getElementById('cartCount');
const loadingOverlay = document.getElementById('loadingOverlay');
const productsContainer = document.getElementById('productsContainer');
const searchInput = document.getElementById('searchInput');
const totalYearlySales = document.getElementById('totalYearlySales');

// Cart Storage
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Lottie Animation for Loading
const lottieLoading = document.getElementById('lottie-loading');
let animation = null;
if (lottieLoading) {
    animation = lottie.loadAnimation({
        container: lottieLoading,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'https://assets.lottiefiles.com/packages/lf20_yr6zz3wv.json' // Verified working animation
    });

    // Ensure animation plays when overlay is shown
    animation.addEventListener('DOMLoaded', () => {
        if (loadingOverlay && loadingOverlay.style.display === 'flex') {
            animation.play();
        }
    });
}

// Authentication State Listener
auth.onAuthStateChanged(user => {
    if (user) {
        floatingLogoutBtn.style.display = 'block';
        if (authOverlay) authOverlay.style.display = 'none';
        updateTotalYearlySales();
    } else {
        floatingLogoutBtn.style.display = 'none';
        showAuthOverlay();
    }
});

// Show Authentication Overlay
function showAuthOverlay() {
    if (authOverlay) authOverlay.style.display = 'flex';
}

// Show Login Form
function showLoginForm() {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    forgotPasswordForm.style.display = 'none';
    document.getElementById('loginError').style.display = 'none';
}

// Show Register Form
function showRegisterForm() {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    forgotPasswordForm.style.display = 'none';
    document.getElementById('registerError').style.display = 'none';
    document.getElementById('registerSuccess').style.display = 'none';
}

// Show Forgot Password Form
function showForgotPasswordForm() {
    loginForm.style.display = 'none';
    registerForm.style.display = 'none'; // Fixed typo from previous version
    forgotPasswordForm.style.display = 'block';
    document.getElementById('forgotError').style.display = 'none';
    document.getElementById('forgotSuccess').style.display = 'none';
}

// Login Form Submission
document.getElementById('loginEmailForm').addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            authOverlay.style.display = 'none';
            Swal.fire('Berhasil!', 'Anda telah login.', 'success');
        })
        .catch(error => {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        });
});

// Register Form Submission
document.getElementById('registerEmailForm').addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const errorDiv = document.getElementById('registerError');
    const successDiv = document.getElementById('registerSuccess');

    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            return database.ref('users/' + userCredential.user.uid).set({
                name: name,
                email: email
            });
        })
        .then(() => {
            errorDiv.style.display = 'none';
            successDiv.textContent = 'Pendaftaran berhasil! Silakan login.';
            successDiv.style.display = 'block';
            showLoginForm();
        })
        .catch(error => {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        });
});

// Forgot Password Form Submission
document.getElementById('forgotPasswordEmailForm').addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value;
    const errorDiv = document.getElementById('forgotError');
    const successDiv = document.getElementById('forgotSuccess');

    auth.sendPasswordResetEmail(email)
        .then(() => {
            errorDiv.style.display = 'none';
            successDiv.textContent = 'Link reset password telah dikirim ke email Anda.';
            successDiv.style.display = 'block';
        })
        .catch(error => {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        });
});

// Logout Functionality
floatingLogoutBtn.addEventListener('click', () => {
    Swal.fire({
        title: 'Apakah Anda yakin ingin logout?',
        showCancelButton: true,
        confirmButtonText: 'Logout',
        cancelButtonText: 'Batal'
    }).then(result => {
        if (result.isConfirmed) {
            auth.signOut().then(() => {
                Swal.fire('Berhasil!', 'Anda telah logout.', 'success');
            });
        }
    });
});

// Update Cart Count
function updateCartCount() {
    cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Add to Cart
function addToCart(productId) {
    if (!auth.currentUser) {
        Swal.fire('Login Diperlukan', 'Silakan login untuk menambahkan produk ke keranjang.', 'warning');
        showAuthOverlay();
        return;
    }

    const productCard = document.getElementById(`product-${productId}`);
    const productName = productCard.querySelector('.card-title').textContent;
    const productPrice = parseInt(productCard.querySelector('.card-text').textContent.replace('Rp', '').replace('.', ''));

    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id: productId, name: productName, price: productPrice, quantity: 1 });
    }

    updateCartCount();
    Swal.fire('Berhasil!', `${productName} telah ditambahkan ke keranjang.`, 'success');
}

// Redirect to Checkout
function redirectToCheckout(productId) {
    if (!auth.currentUser) {
        Swal.fire('Login Diperlukan', 'Silakan login untuk melanjutkan pembelian.', 'warning');
        showAuthOverlay();
        return;
    }

    if (loadingOverlay && animation) {
        loadingOverlay.style.display = 'flex';
        animation.play();
    }

    const productCard = document.getElementById(`product-${productId}`);
    const productName = productCard.querySelector('.card-title').textContent;
    const productPrice = parseInt(productCard.querySelector('.card-text').textContent.replace('Rp', '').replace('.', ''));

    cart = [{ id: productId, name: productName, price: productPrice, quantity: 1 }];
    updateCartCount();

    setTimeout(() => {
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        if (animation) animation.stop();
        window.location.href = 'checkout.html';
    }, 3800);
}

// Sort Products
function sortProducts(criteria) {
    const products = Array.from(productsContainer.children);
    products.sort((a, b) => {
        const cardA = a.querySelector('.card');
        const cardB = b.querySelector('.card');
        if (criteria === 'terbaru') {
            return parseInt(cardB.id.split('-')[1]) - parseInt(cardA.id.split('-')[1]);
        } else if (criteria === 'terlaris') {
            return parseInt(cardB.querySelector('.sold-count').textContent) - parseInt(cardA.querySelector('.sold-count').textContent);
        } else if (criteria === 'termurah') {
            return parseInt(cardA.querySelector('.card-text').textContent.replace('Rp', '').replace('.', '')) - parseInt(cardB.querySelector('.card-text').textContent.replace('Rp', '').replace('.', ''));
        } else if (criteria === 'termahal') {
            return parseInt(cardB.querySelector('.card-text').textContent.replace('Rp', '').replace('.', '')) - parseInt(cardA.querySelector('.card-text').textContent.replace('Rp', '').replace('.', ''));
        }
    });

    productsContainer.innerHTML = '';
    products.forEach(product => productsContainer.appendChild(product));
}

// Search Products
function searchProducts() {
    const query = searchInput.value.toLowerCase();
    const products = document.querySelectorAll('.product-card');
    products.forEach(product => {
        const title = product.querySelector('.card-title').textContent.toLowerCase();
        const description = product.querySelector('.product-description').textContent.toLowerCase();
        if (title.includes(query) || description.includes(query)) {
            product.parentElement.style.display = 'block';
        } else {
            product.parentElement.style.display = 'none';
        }
    });
}

// Update Total Yearly Sales
function updateTotalYearlySales() {
    const salesRef = database.ref('sales/totalYearly');
    salesRef.once('value').then(snapshot => {
        totalYearlySales.textContent = snapshot.val() || 0;
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    searchInput.addEventListener('input', searchProducts);
});