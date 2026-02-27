function toggleMenu() {
    const nav = document.getElementById("navLinks");
    const btn = document.querySelector('.menu-toggle');
    if(nav) nav.classList.toggle("active");
    if(btn) {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        btn.classList.toggle('open');
        // Keep menu toggle consistent - don't change text
    }
}

// Quick environment checks to help debugging common misconfigurations
if (window.location.protocol === 'file:') {
    console.warn('Warning: page loaded from file:// — Razorpay and server endpoints require HTTP. Run the Node server and open http://localhost:3000');
    // disable pay buttons to avoid confusing errors
    document.addEventListener('DOMContentLoaded', ()=>{
        document.querySelectorAll('.pay-btn').forEach(b=>{ b.disabled = true; b.title = 'Start the server and open via http://localhost:3000 to enable payments'; });
    });
}

// theme switch with persistence
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const mode = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        localStorage.setItem('theme', mode);
        themeToggle.textContent = mode === 'dark' ? '☀️' : '🌙';
    });
    // apply saved mode on load
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = '☀️';
    }
}

// helper to show a banner message at top of page
function showBanner(msg){
    let banner = document.querySelector('.banner');
    if(!banner){
        banner = document.createElement('div');
        banner.className = 'banner';
        document.body.prepend(banner);
    }
    banner.textContent = msg;
}

// Newsletter signup handler
function handleNewsletterSignup(e){
    e.preventDefault();
    const form = e.target;
    const email = form.querySelector('input[type="email"]').value;
    if(email){
        alert('✅ Thanks for subscribing! Check your email for exclusive offers.');
        form.reset();
    }
}

// reveal elements using IntersectionObserver for smoother animations
function initRevealObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });
    document.querySelectorAll('.animate').forEach(el => observer.observe(el));
}
window.addEventListener('load', initRevealObserver);

// WhatsApp Business Number (Replace with your actual WhatsApp number, country code + number, no + sign)
const WHATSAPP_NUMBER = "919876543210"; // Example format: 919876543210
if(!/^[0-9]+$/.test(WHATSAPP_NUMBER)){
    console.warn('WhatsApp number is not a plain digits string - orders may fail');
}

// Razorpay Key ID (Replace with your actual Razorpay Key ID)
const RAZORPAY_KEY_ID = "rzp_test_1sDmuznctgIgPt"; // Replace with your live/test key

/* Order History Modal */
function openOrdersModal(){
  const modal = document.getElementById('orders-modal');
  if(modal){
    modal.style.display='flex';
    document.body.style.overflow='hidden';
  }
}
function closeOrdersModal(){
  const modal = document.getElementById('orders-modal');
  if(modal){
    modal.style.display='none';
    document.body.style.overflow='auto';
  }
}

/**
 * Handle Order - Shows 2 options: WhatsApp or Razorpay Payment
 */
function handleOrder(productName, price) {
    const message = `
    Choose your preferred payment method:
    
    1. Order via WhatsApp
    2. Pay with Razorpay
    `;
    
    if (confirm(message + "\n\n✓ Click OK for WhatsApp\n✗ Click Cancel for Razorpay")) {
        sendWhatsAppMessage(productName, price);
    } else {
        initRazorpayPayment(productName, price);
    }
}

/**
 * Send WhatsApp Message
 */
function sendWhatsAppMessage(productName, price) {
    const message = `Hello! 👋 I would like to order *${productName}* for ₹${price}. Please confirm availability and delivery details. Thank you! 🙏`;
    const whatsappURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(whatsappURL, "_blank");
}

/**
 * Razorpay Payment Integration
 */
function initRazorpayPayment(productName, price) {
    // sanity checks
    if (!productName || !price) {
        console.warn('invalid product/price', productName, price);
        showBanner('Cannot start payment: missing product or price');
        return;
    }
    const amountInPaise = Number(price) * 100;
    if (isNaN(amountInPaise) || amountInPaise <= 0) {
        console.warn('bad amount', price);
        showBanner('Cannot start payment: invalid amount');
        return;
    }

    // Create an order on the server and then open Razorpay checkout with returned order_id
    fetch('/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountInPaise, currency: 'INR', receipt: `rcpt_${Date.now()}` })
    }).then(r => {
        if (!r.ok) throw new Error('network response ' + r.status);
        return r.json();
    }).then(order => {
        console.log('order created', order);
        if (!order || order.error) {
            console.error('Create-order response error', order);
            alert('Unable to create order on server. Check server logs and ensure server is running.');
            return;
        }
        if (!order.id || !order.amount) {
            console.error('Order missing fields', order);
            showBanner('Invalid order data from server');
            return;
        }
        const options = {
            key: order.key_id || RAZORPAY_KEY_ID,
            amount: order.amount,
            currency: order.currency,
            name: 'Poda Bites',
            description: `Order: ${productName}`,
            image: 'https://via.placeholder.com/150',
            order_id: order.id,
            handler: function(response) {
                // response contains razorpay_payment_id, razorpay_order_id, razorpay_signature
                // verify on server before confirming to user
                fetch('/verify-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(response)
                }).then(res => res.json()).then(data => {
                    if (data && data.success) {
                        saveOrderToHistory({ product: productName, price, method: 'Online', paymentId: response.razorpay_payment_id });
                        alert('✅ Payment successful and verified!');
                        sendPaymentConfirmationWhatsApp(productName, price, response.razorpay_payment_id);
                        renderOrders();
                    } else {
                        alert('❌ Payment verification failed. Please contact support.');
                    }
                }).catch(err=>{
                    console.error('Verify error',err);
                    alert('❌ Verification error');
                });
            },
            prefill: { name: '', email: '', contact: '' },
            notes: { product: productName, amount: price },
            theme: { color: '#d2691e' }
        };
        try{
            if (typeof Razorpay === 'undefined') throw new Error('Razorpay script not loaded');
            const rzp = new Razorpay(options);
            rzp.open();
        }catch(err){
            console.error('Razorpay init error', err);
            alert('Payment library not available. Ensure https://checkout.razorpay.com/v1/checkout.js is loaded and you are online.');
        }
    }).catch(err=>{
        console.error('Create order error', err);
        showBanner('Failed to contact server for payment');
        alert('Unable to create order. Please try again later.');
    });
}

/**
 * Handle Payment Success
 */
function handlePaymentSuccess(response, productName, price) {
    // Legacy handler kept for compatibility; prefer server-side verification in initRazorpayPayment
    saveOrderToHistory({ product: productName, price, method: 'Online', paymentId: response.razorpay_payment_id });
    alert(`✅ Payment Successful!\nProduct: ${productName}\nAmount: ₹${price}\nPayment ID: ${response.razorpay_payment_id}`);
    sendPaymentConfirmationWhatsApp(productName, price, response.razorpay_payment_id);
}

/**
 * Send Payment Confirmation via WhatsApp
 */
function sendPaymentConfirmationWhatsApp(productName, price, paymentId) {
    const confirmationMessage = `🛒 *Order Confirmation*\n\nProduct: ${productName}\nAmount: ₹${price}\nPayment ID: ${paymentId}\n\nOrder placed successfully!`;
    const whatsappURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(confirmationMessage)}`;
    
    // Optional: Open WhatsApp for business confirmation
    // window.open(whatsappURL, "_blank");
}

/* Order history helpers (localStorage) */
function getOrdersFromStorage(){
    try{ return JSON.parse(localStorage.getItem('poda_orders')||'[]') }catch(e){return []}
}
function saveOrderToHistory(order){
    const list = getOrdersFromStorage();
    list.push(Object.assign({time:Date.now()}, order));
    try{ localStorage.setItem('poda_orders', JSON.stringify(list)); }catch(e){}
}
function renderOrders(){
    const listEl = document.getElementById('orders-list');
    const empty = document.getElementById('orders-empty');
    if(!listEl) return;
    const items = getOrdersFromStorage();
    listEl.innerHTML = '';
    if(items.length===0){ if(empty) empty.style.display='block'; return }
    if(empty) empty.style.display='none';
    items.slice().reverse().forEach(o=>{
        const li = document.createElement('li');
        li.innerHTML = `<strong>${o.product}</strong> — ₹${o.price} <span style="float:right;opacity:.75">${o.method} • ${new Date(o.time).toLocaleString()}</span>`;
        listEl.appendChild(li);
    });
}

// Wire buttons after DOM ready
document.addEventListener('DOMContentLoaded', ()=>{
    renderOrders();
    
    // Wire order history modal trigger
    const ordersTrigger = document.getElementById('orders-trigger');
    if(ordersTrigger) {
        ordersTrigger.addEventListener('click', openOrdersModal);
        // Close menu when modal is opened on mobile
        ordersTrigger.addEventListener('click', ()=>{
            const links = document.getElementById('navLinks');
            if(links?.classList.contains('active')){
                links.classList.remove('active');
                document.querySelector('.menu-toggle')?.classList.remove('open');
            }
        });
    }
    
    // Wire modal close button and overlay
    const modal = document.getElementById('orders-modal');
    if(modal) {
        // Allow escape key to close
        document.addEventListener('keydown',(e)=>{
            if(e.key==='Escape' && modal.style.display!=='none'){
                closeOrdersModal();
            }
        });
    }
    
    const clearBtn = document.getElementById('clear-orders');
    if(clearBtn) {
        clearBtn.addEventListener('click', ()=>{
            if(!confirm('Clear order history?')) return;
            try {
                localStorage.removeItem('poda_orders');
            } catch(e){
                console.warn('error clearing storage',e);
                localStorage.setItem('poda_orders','[]');
            }
            renderOrders();
            alert('Order history cleared');
        });
    }

    // verify server health for payment availability
    fetch('/health').then(r=>r.json()).then(j=>{
        console.log('backend healthy', j);
    }).catch(err=>{
        console.warn('backend unreachable, payments will be disabled', err);
        document.querySelectorAll('.pay-btn').forEach(b=>{
            b.disabled = true;
            b.title = 'Payment service unavailable';
        });
    });
    if(window.location.protocol==='file:'){
        // Site opened from file:// - payments already disabled by health check
    }

    // wire whatsapp and pay buttons
    document.querySelectorAll('.whatsapp-btn').forEach(btn=>{
        btn.addEventListener('click', ()=>{
            const card = btn.closest('.product-card'); if(!card) return;
            const product = card.dataset.product || card.querySelector('h3')?.innerText || 'Product';
            const price = card.dataset.price || card.querySelector('.price')?.innerText.replace(/[^0-9]/g,'') || 0;
            // save locally and open whatsapp
            saveOrderToHistory({ product, price, method: 'WhatsApp' });
            renderOrders();
            const text = `Hi, I would like to order *${product}* for ₹${price}. Please confirm.`;
            const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
            const win = window.open(url,'_blank');
            if (!win) {
                alert('Popup blocked. Please copy and open this link manually:\n' + url);
            }
        });
    });

    document.querySelectorAll('.pay-btn').forEach(btn=>{
        btn.addEventListener('click', ()=>{
            const card = btn.closest('.product-card'); if(!card) return;
            const product = card.dataset.product || card.querySelector('h3')?.innerText || 'Product';
            const price = card.dataset.price || card.querySelector('.price')?.innerText.replace(/[^0-9]/g,'') || 0;
            initRazorpayPayment(product, price);
        });
    });
});

/* =========================
   CART SYSTEM 
   ========================= */
let cart = JSON.parse(localStorage.getItem('poda-cart')) || [];

// Add to Cart Function
function addToCart(button) {
    const card = button.closest('.product-card');
    const qtyInput = card.querySelector('.qty-input');
    const product = {
        id: Date.now(),
        name: card.querySelector('h3')?.innerText || 'Product',
        price: parseInt(card.dataset.price) || 0,
        quantity: parseInt(qtyInput.value) || 1,
        image: card.querySelector('.product-img')?.src || ''
    };
    
    cart.push(product);
    localStorage.setItem('poda-cart', JSON.stringify(cart));
    updateCartCount();
    
    // Show confirmation
    showCartNotification(`✅ Added ${product.name} to cart!`);
    qtyInput.value = 1; // Reset quantity
}

// Remove from Cart
function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    localStorage.setItem('poda-cart', JSON.stringify(cart));
    updateCartCount();
    renderCart();
}

// Update Cart Count Badge
function updateCartCount() {
    const countBadge = document.getElementById('cart-count');
    if (countBadge) {
        countBadge.textContent = cart.length;
        if (cart.length > 0) {
            countBadge.style.animation = 'pulse-glow .6s ease';
        }
    }
}

// Cart Notification
function showCartNotification(msg) {
    let notif = document.querySelector('.cart-notif');
    if (!notif) {
        notif = document.createElement('div');
        notif.className = 'cart-notif';
        notif.style.cssText = 'position:fixed;top:100px;right:20px;background:linear-gradient(135deg,#4caf50,#45a049);color:#fff;padding:16px 24px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.2);z-index:500;animation:slideInDown .5s ease;font-weight:800;alert-type:success;';
        document.body.appendChild(notif);
    }
    notif.textContent = msg;
    notif.style.animation = 'slideInDown .5s ease';
    setTimeout(() => notif.remove(), 3000);
}

// Open/Close Cart Modal
function openCartModal() {
    const modal = document.getElementById('cart-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        renderCart();
    }
}

function closeCartModal() {
    const modal = document.getElementById('cart-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Render Cart
function renderCart() {
    const emptyDiv = document.getElementById('cart-empty');
    const itemsDiv = document.getElementById('cart-items');
    const summaryDiv = document.getElementById('cart-summary');
    
    if (cart.length === 0) {
        if (emptyDiv) emptyDiv.style.display = 'flex';
        if (itemsDiv) itemsDiv.style.display = 'none';
        if (summaryDiv) summaryDiv.style.display = 'none';
        return;
    }
    
    if (emptyDiv) emptyDiv.style.display = 'none';
    if (itemsDiv) itemsDiv.style.display = 'flex';
    if (summaryDiv) summaryDiv.style.display = 'block';
    
    // Render items
    if (itemsDiv) {
        itemsDiv.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">₹${item.price}</div>
                    <div class="cart-item-qty">Qty: ${item.quantity}</div>
                </div>
                <div style="text-align:right;font-weight:800;color:var(--accent);min-width:80px;">₹${item.price * item.quantity}</div>
                <button class="cart-item-remove" onclick="removeFromCart(${item.id})">Remove</button>
            </div>
        `).join('');
    }
    
    // Update summary
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = subtotal >= 500 ? 0 : 50;
    const total = subtotal + shipping;
    
    if (document.getElementById('cart-subtotal')) {
        document.getElementById('cart-subtotal').textContent = '₹' + subtotal;
        document.getElementById('cart-shipping').textContent = shipping === 0 ? 'FREE' : '₹' + shipping;
        document.getElementById('cart-total').textContent = '₹' + total;
    }
}

// Quantity Update
function updateQty(btn, change) {
    const input = btn.closest('.quantity-selector').querySelector('.qty-input');
    let val = parseInt(input.value) || 1;
    val = Math.max(1, val + change);
    input.value = val;
}

// Proceed to Checkout
function proceedToCheckout() {
    if (cart.length === 0) {
        alert('Cart is empty');
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = total >= 500 ? 0 : 50;
    const finalTotal = total + shipping;
    const items = cart.map(i => `${i.name} (${i.quantity}x₹${i.price})`).join('\n');
    
    // Create order ID
    const orderId = 'ORD' + Date.now().toString().slice(-8);
    
    // Save order to history
    const orderData = {
        orderId,
        items: cart.length,
        total: finalTotal,
        subtotal: total,
        shipping,
        timestamp: Date.now(),
        status: 'pending',
        method: 'WhatsApp'
    };
    
    const orders = JSON.parse(localStorage.getItem('poda-orders')) || [];
    orders.push(orderData);
    localStorage.setItem('poda-orders', JSON.stringify(orders));
    
    const message = `🛒 *New Order - ${orderId}*\n\nItems:\n${items}\n\n💰 Subtotal: ₹${total}\n🚚 Shipping: ${shipping === 0 ? 'FREE' : '₹' + shipping}\n💳 **Total: ₹${finalTotal}**\n\nPlease confirm delivery address & timing.`;
    const url = `https://wa.me/919876543210?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    
    // Show confirmation modal
    showOrderConfirmation(orderId, finalTotal);
    
    // Clear cart after checkout
    setTimeout(() => {
        cart = [];
        localStorage.removeItem('poda-cart');
        updateCartCount();
        closeCartModal();
    }, 500);
}

// Show order confirmation with order ID
function showOrderConfirmation(orderId, total) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
        <div class="modal-content" style="max-width:400px;">
            <div class="success-checkmark">✓</div>
            <h2 style="text-align:center;margin-bottom:16px;">Order Placed!</h2>
            <div style="background:linear-gradient(135deg,rgba(196,99,47,0.1),rgba(196,99,47,0.05));padding:20px;border-radius:12px;margin-bottom:20px;text-align:center;">
                <p style="font-size:0.85rem;color:var(--muted);margin-bottom:8px;">Order ID</p>
                <p style="font-size:1.5rem;font-weight:900;color:var(--accent);">${orderId}</p>
                <p style="font-size:1.1rem;margin-top:12px;color:var(--dark);">₹${total}</p>
            </div>
            <p style="text-align:center;color:var(--muted);margin-bottom:20px;font-size:0.9rem;">
                Check your WhatsApp for order confirmation!
            </p>
            <button class="btn btn-lg" style="width:100%;" onclick="this.closest('.modal').remove();">Done</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

/* =========================
   ADMIN PANEL 
   ========================= */
let adminProducts = JSON.parse(localStorage.getItem('poda-admin-products')) || [];
let adminSettings = JSON.parse(localStorage.getItem('poda-admin-settings')) || {
    whatsapp: '919876543210',
    email: 'info@poda-bites.com',
    shippingThreshold: 500
};

// Admin Authentication
function isAdminLoggedIn() {
    return localStorage.getItem('admin-auth') === 'true';
}

function loginAdmin() {
    const password = prompt('Enter admin password:');
    if (password === 'admin123') {
        localStorage.setItem('admin-auth', 'true');
        document.getElementById('admin-trigger').style.display = 'inline-block';
        return true;
    }
    alert('Invalid password');
    return false;
}

// Open/Close Admin Panel
function openAdminPanel() {
    if (!isAdminLoggedIn()) {
        if (!loginAdmin()) return;
    }
    const modal = document.getElementById('admin-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        switchAdminTab('dashboard');
        loadAdminData();
    }
}

function closeAdminPanel() {
    const modal = document.getElementById('admin-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Switch Admin Tabs
function switchAdminTab(tab) {
    // Hide all tabs
    document.querySelectorAll('.admin-tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.admin-tab').forEach(el => el.classList.remove('active'));
    
    // Show selected tab
    const tabEl = document.getElementById('admin-' + tab);
    const tabBtn = document.querySelector(`[onclick="switchAdminTab('${tab}')"]`);
    
    if (tabEl) {
        tabEl.style.display = 'block';
        tabEl.style.animation = 'fadeInUp .5s cubic-bezier(.34,.1,.68,.55)';
    }
    if (tabBtn) tabBtn.classList.add('active');
    
    // Load data if needed
    if (tab === 'products') loadProducts();
    if (tab === 'orders') loadOrders();
    if (tab === 'settings') loadSettings();
}

// Load Admin Data
function loadAdminData() {
    updateAdminStats();
}

// Update Admin Stats
function updateAdminStats() {
    const orders = JSON.parse(localStorage.getItem('poda-orders')) || [];
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || order.amount || 0), 0);
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    
    document.getElementById('stat-orders').textContent = orders.length;
    document.getElementById('stat-revenue').textContent = '₹' + totalRevenue;
    document.getElementById('stat-customers').textContent = orders.length;
    document.getElementById('stat-pending').textContent = pendingOrders;
}

// Product Management
function addNewProduct() {
    const name = document.getElementById('prod-name').value;
    const price = parseInt(document.getElementById('prod-price').value);
    const desc = document.getElementById('prod-desc').value;
    
    if (!name || !price) {
        alert('Fill all fields');
        return;
    }
    
    const product = { id: Date.now(), name, price, desc };
    adminProducts.push(product);
    localStorage.setItem('poda-admin-products', JSON.stringify(adminProducts));
    
    // Clear inputs
    document.getElementById('prod-name').value = '';
    document.getElementById('prod-price').value = '';
    document.getElementById('prod-desc').value = '';
    
    loadProducts();
    showBanner('✅ Product added successfully!');
}

function loadProducts() {
    const list = document.getElementById('admin-products-list');
    if (!list) return;
    
    list.innerHTML = adminProducts.map(prod => `
        <div class="admin-product-card">
            <div class="admin-product-info">
                <div class="admin-product-name">${prod.name}</div>
                <div class="admin-product-price">₹${prod.price}</div>
                <p style="font-size:0.85rem;color:var(--muted);margin:8px 0;">${prod.desc}</p>
            </div>
            <div class="admin-product-actions">
                <button class="product-action-btn edit-btn" onclick="editProduct(${prod.id})">✏️ Edit</button>
                <button class="product-action-btn delete-btn" onclick="deleteProduct(${prod.id})">🗑️ Delete</button>
            </div>
        </div>
    `).join('');
}

function deleteProduct(id) {
    if (confirm('Delete this product?')) {
        adminProducts = adminProducts.filter(p => p.id !== id);
        localStorage.setItem('poda-admin-products', JSON.stringify(adminProducts));
        loadProducts();
        showBanner('✅ Product deleted');
    }
}

// Edit Product - Simple inline edit
function editProduct(id) {
    const product = adminProducts.find(p => p.id === id);
    if (!product) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
        <div class="modal-content" style="max-width:500px;">
            <div class="modal-header">
                <h2>Edit Product</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="admin-form">
                    <input type="text" id="edit-name" placeholder="Product Name" value="${product.name}" style="margin-bottom:12px;padding:12px;border:1.5px solid rgba(0,0,0,0.1);border-radius:10px;width:100%;font-size:1rem;">
                    <input type="number" id="edit-price" placeholder="Price" value="${product.price}" style="margin-bottom:12px;padding:12px;border:1.5px solid rgba(0,0,0,0.1);border-radius:10px;width:100%;font-size:1rem;">
                    <textarea id="edit-desc" placeholder="Description" style="margin-bottom:12px;padding:12px;border:1.5px solid rgba(0,0,0,0.1);border-radius:10px;width:100%;font-size:1rem;min-height:80px;resize:vertical;">${product.desc}</textarea>
                    <button class="btn btn-lg" style="width:100%;background:var(--accent);color:#fff;margin-bottom:8px;" onclick="saveProductEdit(${id}, this.closest('.modal'))">Save Changes</button>
                    <button class="btn btn-ghost" style="width:100%;" onclick="this.closest('.modal').remove()">Cancel</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

// Save Product Edit
function saveProductEdit(id, modal) {
    const product = adminProducts.find(p => p.id === id);
    if (!product) return;
    
    product.name = document.getElementById('edit-name').value;
    product.price = parseInt(document.getElementById('edit-price').value);
    product.desc = document.getElementById('edit-desc').value;
    
    if (!product.name || !product.price) {
        alert('Fill all fields');
        return;
    }
    
    localStorage.setItem('poda-admin-products', JSON.stringify(adminProducts));
    modal.remove();
    loadProducts();
    showBanner('✅ Product updated successfully!');
    document.body.style.overflow = 'auto';
}

function loadOrders() {
    const list = document.getElementById('admin-orders-list');
    if (!list) return;
    
    const orders = JSON.parse(localStorage.getItem('poda-orders')) || [];
    
    if (orders.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:var(--muted);padding:40px 20px;">No orders yet</p>';
        return;
    }
    
    list.innerHTML = orders.reverse().map(order => `
        <div class="admin-order-item" style="display:grid;grid-template-columns:1fr auto auto;gap:16px;padding:16px;border:1.5px solid rgba(196,99,47,0.1);border-radius:10px;margin-bottom:12px;align-items:center;">
            <div>
                <div style="font-weight:900;color:var(--dark);margin-bottom:4px;">${order.orderId || 'Order'}</div>
                <div style="font-size:0.85rem;color:var(--muted);">${order.items} items • ${new Date(order.timestamp).toLocaleString()}</div>
            </div>
            <div style="text-align:right;">
                <div style="font-weight:900;color:var(--accent);font-size:1.1rem;">₹${order.total || order.amount || 0}</div>
                <div style="font-size:0.75rem;color:var(--muted);">Subtotal: ₹${order.subtotal || 0}</div>
            </div>
            <span style="padding:8px 12px;border-radius:20px;font-size:0.75rem;font-weight:900;background:${order.status === 'completed' ? '#4caf50' : '#ff9800'};color:#fff;">${(order.status || 'pending').toUpperCase()}</span>
        </div>
    `).join('');
}

function loadSettings() {
    document.getElementById('setting-whatsapp').value = adminSettings.whatsapp;
    document.getElementById('setting-email').value = adminSettings.email;
    document.getElementById('setting-shipping').value = adminSettings.shippingThreshold;
}

function saveSettings() {
    adminSettings.whatsapp = document.getElementById('setting-whatsapp').value;
    adminSettings.email = document.getElementById('setting-email').value;
    adminSettings.shippingThreshold = parseInt(document.getElementById('setting-shipping').value);
    
    localStorage.setItem('poda-admin-settings', JSON.stringify(adminSettings));
    showBanner('✅ Settings saved successfully!');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    initProductPerformance();
    
    // Cart button listeners
    const cartTrigger = document.getElementById('cart-trigger');
    if (cartTrigger) cartTrigger.addEventListener('click', openCartModal);
    
    // Admin button listeners
    const adminTrigger = document.getElementById('admin-trigger');
    if (adminTrigger) adminTrigger.addEventListener('click', openAdminPanel);
    
    // Check if admin key pressed (Ctrl+Shift+A)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'A') {
            if (isAdminLoggedIn()) {
                openAdminPanel();
            } else {
                loginAdmin();
                if (isAdminLoggedIn()) openAdminPanel();
            }
        }
    });
});

// Track product performance
function initProductPerformance() {
    let performance = JSON.parse(localStorage.getItem('product-performance')) || {};
    
    // Log when product card is viewed
    document.querySelectorAll('.product-card').forEach(card => {
        const productName = card.querySelector('h3')?.innerText || 'Product';
        if (!performance[productName]) performance[productName] = { views: 0, addToCart: 0, sales: 0 };
        performance[productName].views++;
        localStorage.setItem('product-performance', JSON.stringify(performance));
    });
}
function initReviewCounter() {
    const reviewCounter = document.getElementById('review-count');
    if (!reviewCounter) return;
    
    const targetCount = 1050;
    let currentCount = 0;
    const speed = 30;
    
    const incrementCounter = () => {
        if (currentCount < targetCount) {
            currentCount += Math.ceil(targetCount / 50);
            if (currentCount > targetCount) currentCount = targetCount;
            reviewCounter.textContent = currentCount;
            setTimeout(incrementCounter, speed);
        }
    };
    
    // Start animation when testimonials section is visible
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && currentCount === 0) {
                incrementCounter();
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    const testimonialsSection = document.getElementById('testimonials');
    if (testimonialsSection) observer.observe(testimonialsSection);
}
window.addEventListener('load', initReviewCounter);

// Sticky Order Bar - Show when user scrolls past hero
function initStickyOrderBar() {
    const stickyBar = document.getElementById('sticky-order-bar');
    const heroSection = document.querySelector('.hero');
    
    if (!stickyBar || !heroSection) return;
    
    window.addEventListener('scroll', () => {
        const heroBottom = heroSection.offsetHeight + heroSection.offsetTop;
        const scrollPos = window.scrollY;
        
        if (scrollPos > heroBottom) {
            stickyBar.classList.add('show');
        } else {
            stickyBar.classList.remove('show');
        }
    });
}
window.addEventListener('load', initStickyOrderBar);

// Contact Form Handler
function handleContactForm(e){
    e.preventDefault();
    const form = e.target;
    const name = form.querySelector('input[type="text"]').value;
    const email = form.querySelector('input[type="email"]').value;
    const message = form.querySelector('textarea').value;
    
    if(name && email && message){
        // Send message via WhatsApp
        const whatsappMessage = `Hello! I'm ${name}. Email: ${email}\n\nMessage: ${message}`;
        const whatsappLink = `https://wa.me/919876543210?text=${encodeURIComponent(whatsappMessage)}`;
        window.open(whatsappLink, '_blank');
        
        // Also show confirmation
        showBanner('✅ Opening WhatsApp to send your message!');
        form.reset();
    }
}