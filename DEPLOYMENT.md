# Free Deployment Guide

This project can be deployed for free with Socket.IO using:

- Backend on Render
- Frontend on Vercel
- MongoDB Atlas for the database
- Cloudinary for image uploads

## Recommended Architecture

```text
Vercel (React frontend)
        |
        v
Render Web Service (Express + Socket.IO)
        |
        v
MongoDB Atlas
```

## Why Not Put Socket.IO On Vercel

Vercel is a strong choice for the frontend, but the Socket.IO server should stay on a regular Node server. This project already runs Socket.IO from `backend/server.js`, so the easiest free deployment is to host the backend separately on Render.

## 1. Prepare Accounts

Create or sign in to:

- GitHub
- Render
- Vercel
- MongoDB Atlas
- Cloudinary

## 2. Rotate Any Exposed Secrets First

Before deploying, replace any real credentials that may already exist in local `.env` files:

- `MONGO_URI`
- `JWT_SECRET`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `EMAIL_PASS`

## 3. Push The Project To GitHub

Make sure the repository does not include local `.env` files.

## 4. Create MongoDB Atlas Database

Create a free cluster and copy the connection string.

Example:

```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/e_commerce?retryWrites=true&w=majority
```

## 5. Create Backend On Render

Create a new `Web Service` from your GitHub repo with these settings:

- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`

Set these environment variables in Render:

```env
PORT=10000
MONGO_URI=your_atlas_connection_string
JWT_SECRET=your_new_long_random_secret
JWT_EXPIRE=7d
CLIENT_URL=https://your-frontend-domain.vercel.app
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
HOST=0.0.0.0
```

Optional email variables:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@example.com
```

## Important Render Note About Email

Render free web services can run Socket.IO, but SMTP on port `587` is not a safe assumption for free deploys. If password reset email fails after deploy, use an email API provider instead of SMTP, or temporarily leave forgot-password email disabled.

## 6. Create Frontend On Vercel

Import the same GitHub repo into Vercel with these settings:

- Root Directory: `frontend`
- Framework Preset: `Create React App`
- Build Command: `npm run build`

Set these environment variables in Vercel:

```env
REACT_APP_API_URL=https://your-backend-name.onrender.com/api
REACT_APP_SOCKET_URL=https://your-backend-name.onrender.com
```

Then redeploy the frontend after the backend URL is ready.

## 7. Update Render CORS Origin

After Vercel gives you the real frontend URL, set Render:

```env
CLIENT_URL=https://your-real-vercel-domain.vercel.app
```

Then redeploy the backend.

## 8. Test The Deployment

Check these in order:

1. Open `https://your-backend-name.onrender.com/api/health`
2. Open the frontend Vercel URL
3. Register and log in
4. Open buyer and admin or seller pages in separate browsers
5. Confirm Socket.IO features work:
   - live notifications
   - order tracking
   - stock updates

## 9. Seed Demo Data

If you want demo users, run the seed locally against your Atlas database:

```bash
cd backend
node seed.js
```

Make sure your local `backend/.env` points to the same Atlas cluster first.

## Troubleshooting

### CORS errors

Make sure:

- Render `CLIENT_URL` matches the exact Vercel URL
- Vercel `REACT_APP_API_URL` points to `/api`
- Vercel `REACT_APP_SOCKET_URL` points to the backend root URL without `/api`

### Socket not connecting

Make sure the frontend socket URL is:

```env
REACT_APP_SOCKET_URL=https://your-backend-name.onrender.com
```

Do not include `/api` in the socket URL.

### Backend works but frontend fails to log in

Check the browser console and confirm:

- API requests go to Render
- Socket connects to Render
- `CLIENT_URL` in Render is the frontend domain

### Render backend sleeps on free tier

Free services may spin down after inactivity, so the first request can be slow.
