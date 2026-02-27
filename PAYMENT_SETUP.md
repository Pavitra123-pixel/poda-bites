# 🎯 Payment Service Setup Guide

## Quick Start (3 steps)

### Step 1: Install Node.js
Download and install from: **https://nodejs.org** (LTS version recommended)
- Choose "Recommended for most users"
- Run the installer and follow the prompts
- Restart PowerShell/Terminal after installation

### Step 2: Install Dependencies
Open PowerShell in your project folder and run:
```powershell
npm install
```

This installs:
- ✅ Express.js (web server)
- ✅ Razorpay SDK (payment processing)
- ✅ dotenv (environment configuration)

### Step 3: Start Payment Server
```powershell
node server.js
```

You should see:
```
✅ Payment server running on http://localhost:3000
```

---

## 🔗 Access Your Website
Once the server is running:
1. Open: **http://localhost:3000** in your browser
2. Click any **"Pay Online"** button on a product
3. Test payment with Razorpay test card:
   - Card Number: `4111 1111 1111 1111`
   - Expiry: Any future date
   - CVV: Any 3 digits

---

## ✅ Configuration Status
✓ `.env` file created with test Razorpay credentials  
✓ `server.js` configured and ready  
✓ `package.json` dependencies listed

---

## 🚨 Troubleshooting

**"npm: not found"** → Node.js not installed → Go to Step 1

**Port 3000 already in use** → Change PORT in `.env` file

**Payment button still disabled** → Refresh browser after server starts

---

## 📝 For Production
Replace test keys in `.env` with real Razorpay live keys from:
https://dashboard.razorpay.com/settings/api-keys
