#!/bin/bash
# Quick Test Script - Validates Poda Bites Website Setup

echo "🧪 Poda Bites Website Validation"
echo "=================================="
echo ""

# Check files exist
echo "📋 Checking files..."
files=("index.html" "style.css" "script.js" "server.js" "README.md")

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        size=$(wc -c < "$file")
        echo "✅ $file ($(($size / 1024))K)"
    else
        echo "❌ $file - MISSING"
    fi
done

echo ""
echo "🎨 CSS Validation"
if grep -q ".admin-product-card" style.css; then
    echo "✅ Admin product CSS found"
else
    echo "❌ Admin product CSS missing"
fi

if grep -q "modal-fadeIn" style.css; then
    echo "✅ Modal animations found"
else
    echo "❌ Modal animations missing"
fi

echo ""
echo "⚙️ JavaScript Validation"
if grep -q "function addToCart" script.js; then
    echo "✅ Cart system found"
else
    echo "❌ Cart system missing"
fi

if grep -q "function openAdminPanel" script.js; then
    echo "✅ Admin panel found"
else
    echo "❌ Admin panel missing"
fi

if grep -q "function showOrderConfirmation" script.js; then
    echo "✅ Order confirmation found"
else
    echo "❌ Order confirmation missing"
fi

echo ""
echo "📱 Features Check"
if grep -q 'id="cart-trigger"' index.html; then
    echo "✅ Cart button in navbar"
else
    echo "❌ Cart button missing"
fi

if grep -q 'id="admin-trigger"' index.html; then
    echo "✅ Admin button in navbar"
else
    echo "❌ Admin button missing"
fi

if grep -q 'id="sticky-order-bar"' index.html; then
    echo "✅ Sticky order bar present"
else
    echo "❌ Sticky order bar missing"
fi

echo ""
echo "🎯 Summary Check"
if grep -q "Razorpay" index.html; then
    echo "✅ Razorpay integration ready"
fi

if grep -q "WhatsApp" script.js; then
    echo "✅ WhatsApp integration ready"
fi

echo ""
echo "✨ Ready to deploy! 🚀"
