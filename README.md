# Poda Bites Bakery Website

This repository contains a simple modern bakery website for **Poda Bites** with client-side animations, dark mode, WhatsApp ordering and Razorpay integration backed by a minimal Node/Express server.

## Features

- Sticky animated navbar with hamburger menu
- Hero section with tagline and bakery background
- Product cards with hover effects and staggered animations
- WhatsApp order button for each item
- Razorpay "Pay Online" button with server-side order creation & signature verification
- Dark mode toggle (persisted in `localStorage`)
- Smooth scroll-triggered animations via IntersectionObserver
- Responsive layout (mobile-first, grid cards)
- Order history stored in browser and viewable on page

## Project Structure

- `index.html` – main page markup
- `style.css` – complete styling and animations
- `script.js` – client logic (menu, theme, orders, payments)
- `server.js` – Express server for Razorpay operations
- `.env.example` – template for environment variables
- `package.json` – Node project metadata and dependencies
- `README.md` – this file

## Setup & Running

1. **Clone** or copy files into your workspace.
2. Copy `.env.example` to `.env` and fill with your Razorpay keys (test keys for development):
   ```txt
   RAZORPAY_KEY_ID=rzp_test_XXXX      # your Razorpay API key
   RAZORPAY_KEY_SECRET=your_secret    # your Razorpay secret (keep private)
   PORT=3000
   ```
   > 💡 You can get these from the Razorpay dashboard under Settings → API Keys. Use test keys until you're ready to go live.
3. Install Node dependencies:
   ```bash
   npm install
   ```
4. Start the Express server which also serves the frontend:
   ```bash
   node server.js
   ```
   After startup you should see `Server running on port 3000` in the console.
5. Open your browser to [http://localhost:3000](http://localhost:3000).
   - The page will automatically call `/create-order` when you click **Pay Online**.
   - If the server is not running you will see a yellow banner and the buttons become disabled.

### Razorpay flow details

- The client code in `script.js` fetches `/create-order` and passes the returned `order_id` to the Razorpay checkout widget.
- After the customer pays, Razorpay returns a signature which the client posts to `/verify-payment` on the server.
- The server verifies the signature with your **key secret** (stored only in `.env`) and responds with success/failure.

### Testing tips

- Use Razorpay test cards (`4111 1111 1111 1111`, etc.).
- Watch the browser console for log messages (`order created`, errors).
- If you forget to replace the placeholder `WHATSAPP_NUMBER` or `RAZORPAY_KEY_ID`, the script will warn in the console.

## Usage Notes

- The site will display a warning in console if opened via `file://` instead of HTTP.
- Replace placeholder WhatsApp number and product images with your own.
- In production, restrict CORS and serve via HTTPS.
- Order history persists only in the browser; you may extend `server.js` to log to a database.

Enjoy building your bakery storefront! Feel free to customize colors, fonts, images and expand server functionality.
