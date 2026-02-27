// server.js
// Simple Express server for Razorpay order creation and payment verification

const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

// serve frontend static files from workspace root
app.use(express.static(path.join(__dirname)));

// allow simple CORS for development
app.use((req,res,next)=>{
    res.header('Access-Control-Allow-Origin','*');
    res.header('Access-Control-Allow-Methods','GET,POST,OPTIONS');
    res.header('Access-Control-Allow-Headers','Content-Type');
    if(req.method==='OPTIONS') return res.sendStatus(200);
    next();
});

// initialize Razorpay instance with keys from .env
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// create order endpoint
app.post('/create-order', async (req, res) => {
    const { amount, currency, receipt } = req.body;
    try {
        const options = {
            amount, // amount in paise
            currency,
            receipt,
            payment_capture: 1
        };
        const order = await razorpay.orders.create(options);
        // send back order details along with key id for convenience
        res.json({ ...order, key_id: process.env.RAZORPAY_KEY_ID });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Unable to create order' });
    }
});

// verify payment signature
app.post('/verify-payment', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Missing parameters' });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

    if (expectedSignature === razorpay_signature) {
        return res.json({ success: true, message: 'Payment verified successfully' });
    }
    return res.status(400).json({ success: false, message: 'Invalid signature' });
});

// simple health endpoint
app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
