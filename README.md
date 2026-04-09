<<<<<<< HEAD
# 🛍 ShopHive — Multi-Vendor MERN eCommerce
=======
# ShopHive
>>>>>>> 57787a7 (updated for deployment)

Multi-vendor MERN eCommerce app with real-time features powered by Socket.IO.

## Stack

- MongoDB
- Express
- React (Create React App)
- Node.js
- Socket.IO

## Local Setup

### 1. Install dependencies

```bash
npm install
npm run install-all
```

### 2. Configure environment files

Copy the example files and fill in your own values:

```bash
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

### 3. Start the app

```bash
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

## Free Deployment With Socket.IO

Use this split setup:

- Backend: Render Web Service
- Frontend: Vercel
- Database: MongoDB Atlas free tier
- Images: Cloudinary free tier

Why this setup:

- Render supports long-running Node servers and Socket.IO.
- Vercel is good for the React frontend.
- Keeping Socket.IO on the backend avoids serverless websocket issues.

Full guide: [DEPLOYMENT.md](C:\Users\hp\Desktop\mern-ecommerce-v6\mern-ecommerce\DEPLOYMENT.md)

## Important Security Note

If you previously pushed real secrets to GitHub, rotate them now:

- MongoDB credentials
- Cloudinary keys
- Gmail or email credentials
- JWT secret

## Health Check

After deployment you can verify the backend at:

<<<<<<< HEAD
### Cart
```
GET    /api/cart                  (buyer)
POST   /api/cart                  (buyer)
PUT    /api/cart/:itemId          (buyer)
DELETE /api/cart/:itemId          (buyer)
DELETE /api/cart                  (buyer - clear)
```

### Admin
```
GET    /api/admin/dashboard
GET    /api/admin/users
PUT    /api/admin/users/:id/approve
PUT    /api/admin/users/:id/block
DELETE /api/admin/users/:id
GET    /api/admin/products
GET    /api/admin/payments
PUT    /api/admin/payments/:id/refund
```

---

## ⚡ REAL-TIME SOCKET EVENTS

| Event | Direction | Description |
|-------|-----------|-------------|
| `stock-update` | Server → All | Product stock changed |
| `new-product` | Server → All | New product approved |
| `order-status-update` | Server → Buyer | Order status changed |
| `new-order` | Server → Seller/Admin | Order placed |
| `product-approved` | Server → Seller | Product approved |
| `product-rejected` | Server → Seller | Product rejected |
| `account-approved` | Server → Seller | Seller approved |
| `payment-refunded` | Server → Buyer | Refund processed |

---

## 🔧 TROUBLESHOOTING

**MongoDB connection error?**
- Make sure MongoDB is running: `sudo systemctl start mongod`
- Check your MONGO_URI in `.env`

**Cloudinary upload not working?**
- Verify your Cloudinary credentials in `.env`
- Make sure your Cloudinary account is active

**Port already in use?**
- Backend: change `PORT=5000` in `backend/.env`
- Frontend: set `PORT=3001` in `frontend/.env`

**CORS errors?**
- Ensure `CLIENT_URL` in `backend/.env` matches your frontend URL exactly

**Images not showing after seed?**
- Seed uses Unsplash URLs which require internet connection

---

## 🌐 NETWORK ACCESS (Same WiFi)

1. Find your local IP: `ipconfig` (Windows) or `ifconfig`/`ip addr` (Linux/Mac)
2. Update `backend/.env`: `HOST=0.0.0.0` and `CLIENT_URL=http://YOUR_IP:3000`
3. Update `frontend/.env`: Replace `localhost` with your IP
4. Allow firewall ports 3000 and 5000
5. Other devices open `http://YOUR_IP:3000`

---

Built with ❤️ using MongoDB, Express.js, React.js, Node.js + Socket.IO
=======
- `/`
- `/api/health`
>>>>>>> 57787a7 (updated for deployment)
