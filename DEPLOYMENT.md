# Deployment Guide

This guide covers how to deploy the Chat App to Render (Backend) and Vercel (Frontend).

## Prerequisites

- GitHub account with the repository pushed
- Render account (https://render.com)
- Vercel account (https://vercel.com)
- Environment variables configured

---

## 🚀 Backend Deployment (Render)

### Step 1: Create a New Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → Select "Web Service"
3. Connect your GitHub repository
4. Choose the backend repository

### Step 2: Configure the Web Service

**Name:** `chat-app-backend` (or your preferred name)

**Environment:** `Node`

**Build Command:**
```bash
cd backend && npm install
```

**Start Command:**
```bash
cd backend && npm start
```

### Step 3: Add Environment Variables

In Render Dashboard, go to **Environment** and add:

```
NODE_ENV=production
PORT=10000
MONGODB_URI=your_mongodb_atlas_uri
JWT_SECRET=your_secure_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM_EMAIL=noreply@yourapp.com
SMTP_FROM_NAME=Chat App
FRONTEND_URL=https://your-frontend-domain.vercel.com
```

### Step 4: Deploy

Click **Deploy**. Render will automatically deploy and restart on push.

**Your backend URL:** `https://your-service-name.onrender.com`

⚠️ **Note:** Free tier services spin down after 15 minutes of inactivity.

---

## 🌐 Frontend Deployment (Vercel)

### Step 1: Connect to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → Select "Project"
3. Import your GitHub repository
4. Select the root directory (where vercel.json is)

### Step 2: Configure Build Settings

Vercel should auto-detect Next.js/React settings. Make sure:

- **Framework Preset:** Vite
- **Build Command:** `cd frontend && npm run build`
- **Output Directory:** `frontend/dist`
- **Install Command:** `npm install --prefix frontend`

### Step 3: Add Environment Variables

In Vercel Dashboard → **Settings** → **Environment Variables**, add:

```
VITE_BACKEND_URL=https://your-backend-url.onrender.com
```

### Step 4: Deploy

Click **Deploy**. Vercel will automatically deploy on every push.

**Your frontend URL:** `https://your-project-name.vercel.app`

---

## 🔗 Connect Backend and Frontend

After both are deployed:

1. **Update Frontend .env on Vercel:**
   ```
   VITE_BACKEND_URL=https://your-backend-name.onrender.com
   ```

2. **Update Backend FRONTEND_URL on Render:**
   ```
   FRONTEND_URL=https://your-frontend-name.vercel.app
   ```

3. Redeploy both services for changes to take effect.

---

## ✅ Testing Deployment

### Backend Health Check
```bash
curl https://your-backend-name.onrender.com/health
```

Expected response:
```json
{"status": "OK", "message": "Server is running"}
```

### Frontend
Visit `https://your-frontend-name.vercel.app` and test login/signup.

---

## 🐛 Troubleshooting

### Backend won't start
- Check MongoDB URI is correct
- Verify JWT_SECRET is set
- Check all required env vars are present
- View logs in Render Dashboard

### Frontend showing blank page
- Check `VITE_BACKEND_URL` is correct
- Verify backend is running
- Check browser console for errors
- Clear cache and rebuild

### CORS errors
- Confirm `FRONTEND_URL` is set correctly in backend
- Confirm `VITE_BACKEND_URL` is set correctly in frontend
- Make sure URLs match exactly (https://, no trailing slash)

### Socket.io not connecting
- Check socket.io configuration in `backend/src/lib/socket.js`
- Verify `FRONTEND_URL` environment variable
- Check transports are enabled: `['websocket', 'polling']`

---

## 📝 Environment Variables Checklist

### Backend (.env)
- [ ] `MONGODB_URI` - MongoDB connection string
- [ ] `JWT_SECRET` - Secure random string
- [ ] `CLOUDINARY_*` - Image upload credentials
- [ ] `SMTP_*` - Email sending credentials
- [ ] `FRONTEND_URL` - Your frontend URL
- [ ] `NODE_ENV=production`

### Frontend (.env)
- [ ] `VITE_BACKEND_URL` - Your backend URL

---

## 🔒 Security Best Practices

1. **Never commit `.env` files** - They're in `.gitignore`
2. **Use strong JWT_SECRET** - At least 32 characters
3. **Regenerate passwords** - Don't reuse local dev passwords
4. **Enable 2FA** - On GitHub and deployment providers
5. **Use HTTPS URLs** - Always use https:// in production
6. **Keep dependencies updated** - Run `npm audit` regularly

---

## 🆘 Getting Help

- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- Socket.io Production: https://socket.io/docs/v4/production-checklist/

---

## 📦 Deployment Commands

### Manual deployment (if needed)

**Backend (Render):**
```bash
npm run build # if you have a build step
npm start
```

**Frontend (Vercel):**
```bash
npm run build
npm run preview
```

---

Last Updated: March 27, 2026
