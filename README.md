# 🛍 ShopHive — Multi-Vendor MERN eCommerce

A full-featured multi-vendor marketplace with real-time capabilities, role-based access control, and modern UI.

---

## ✅ FEATURES

- **3 Roles**: Admin, Seller, Buyer
- **Real-time**: Socket.IO for live order tracking, stock updates, notifications
- **JWT Auth** with bcrypt password hashing
- **Product approval workflow** (Seller → Admin approval → Live)
- **Multi-seller order splitting**
- **Cart, Wishlist, Reviews**
- **Cash on Delivery**
- **Admin analytics dashboard**
- **Responsive UI** with Tailwind-style CSS variables

---

## 🚀 QUICK SETUP (Step by Step)

### Prerequisites
Make sure you have installed:
- **Node.js** v18+ → https://nodejs.org
- **MongoDB** (local) → https://www.mongodb.com/try/download/community
  OR use **MongoDB Atlas** (free cloud) → https://cloud.mongodb.com

---

### Step 1 — Extract & Open
```bash
# Unzip the project folder
# Open terminal/cmd in the project root (where this README is)
cd mern-ecommerce
```

---

### Step 2 — Install Dependencies

**Option A: Install both at once (root)**
```bash
npm install
npm run install-all
```

**Option B: Install separately**
```bash
# Backend
cd backend
npm install

# Frontend (open new terminal)
cd frontend
npm install
```

---

### Step 3 — Configure Environment

**Backend `.env`** (already created at `backend/.env`):
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/mern_ecommerce
JWT_SECRET=change_this_to_a_long_random_string_abc123xyz
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000

# Cloudinary (for product image uploads)
# Sign up free at https://cloudinary.com
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (optional - for password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_app_password

HOST=0.0.0.0
```

> **⚠️ Important**: Replace `CLOUDINARY_*` values with your own.
> Get free Cloudinary account: https://cloudinary.com (free tier is enough)

**Frontend `.env`** (already created at `frontend/.env`):
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

> **For network access** (other devices on same WiFi):
> Replace `localhost` with your PC's local IP (e.g., `192.168.1.5`):
> ```env
> REACT_APP_API_URL=http://192.168.1.5:5000/api
> REACT_APP_SOCKET_URL=http://192.168.1.5:5000
> ```
> And add `HOST=192.168.1.5` to `backend/.env`

---

### Step 4 — Start MongoDB

**Local MongoDB:**
```bash
# Windows: start MongoDB service from Services panel
# OR run:
mongod

# macOS/Linux:
sudo systemctl start mongod
# OR:
mongod --dbpath /data/db
```

**MongoDB Atlas (cloud):**
Replace `MONGO_URI` in `backend/.env` with your Atlas connection string:
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/mern_ecommerce
```

---

### Step 5 — Seed Demo Data

```bash
cd backend
node seed.js
```

This creates:
| Role   | Email              | Password   |
|--------|--------------------|------------|
| Admin  | admin@demo.com     | admin123   |
| Seller | seller@demo.com    | seller123  |
| Buyer  | buyer@demo.com     | buyer123   |

Plus 8 demo products across categories.

---

### Step 6 — Start the Application

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```
> Server starts at http://localhost:5000

**Terminal 2 — Frontend:**
```bash
cd frontend
npm start
```
> App opens at http://localhost:3000

---

### Step 7 — Open & Use

| URL | Description |
|-----|-------------|
| http://localhost:3000 | Buyer storefront |
| http://localhost:3000/login | Login |
| http://localhost:3000/admin/dashboard | Admin panel |
| http://localhost:3000/seller/dashboard | Seller panel |

---

## 📂 PROJECT STRUCTURE

```
mern-ecommerce/
├── backend/
│   ├── config/
│   │   ├── cloudinary.js       # Cloudinary setup
│   │   └── multer.js           # File upload config
│   ├── controllers/
│   │   ├── authController.js   # Login, Register, Profile
│   │   ├── productController.js
│   │   ├── orderController.js
│   │   ├── adminController.js
│   │   └── miscControllers.js  # Cart, Reviews, Wishlist, etc.
│   ├── middleware/
│   │   └── authMiddleware.js   # JWT protect, role authorize
│   ├── models/
│   │   ├── User.js
│   │   ├── Product.js
│   │   ├── Order.js
│   │   └── index.js            # Cart, Review, Wishlist, Notification, Payment
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── productRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── cartRoutes.js
│   │   ├── reviewRoutes.js
│   │   ├── wishlistRoutes.js
│   │   ├── adminRoutes.js
│   │   ├── sellerRoutes.js
│   │   ├── paymentRoutes.js
│   │   └── notificationRoutes.js
│   ├── socket/
│   │   └── socketHandler.js    # Socket.IO events
│   ├── utils/
│   │   └── jwt.js
│   ├── seed.js                 # Demo data seeder
│   ├── server.js               # Entry point
│   └── .env                    # ← EDIT THIS
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── components/
│       │   └── common/
│       │       ├── Navbar.js + .css
│       │       ├── Sidebar.js + .css
│       │       └── ProductCard.js + .css
│       ├── context/
│       │   ├── AuthContext.js
│       │   ├── CartContext.js
│       │   └── SocketContext.js
│       ├── pages/
│       │   ├── auth/       # Login, Register, ForgotPassword, ResetPassword
│       │   ├── buyer/      # Home, Products, ProductDetail, Cart, Checkout, Orders, Wishlist, Profile
│       │   ├── seller/     # Dashboard, Products, AddProduct, EditProduct, Orders
│       │   └── admin/      # Dashboard, Users, Products, Orders, Payments
│       ├── services/
│       │   ├── api.js      # Axios API calls
│       │   └── socket.js   # Socket.IO client
│       ├── App.js          # Routes
│       └── index.css       # Global styles
│
├── package.json            # Root scripts
└── README.md               # This file
```

---

## 🔌 API ENDPOINTS

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
PUT    /api/auth/profile
PUT    /api/auth/change-password
POST   /api/auth/forgot-password
POST   /api/auth/reset-password/:token
POST   /api/auth/address
DELETE /api/auth/address/:id
```

### Products
```
GET    /api/products              (public, with ?search=&category=&sort=&page=)
GET    /api/products/:id          (public)
GET    /api/products/categories   (public)
POST   /api/products              (seller)
PUT    /api/products/:id          (seller/admin)
DELETE /api/products/:id          (seller/admin)
PUT    /api/products/:id/approve  (admin)
```

### Orders
```
POST   /api/orders                (buyer)
GET    /api/orders/my             (buyer)
GET    /api/orders/seller         (seller)
GET    /api/orders                (admin)
GET    /api/orders/:id
PUT    /api/orders/:id/status     (seller)
PUT    /api/orders/:id/admin-status (admin)
```

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
