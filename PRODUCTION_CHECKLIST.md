# ✅ Production Deployment Checklist

Use this checklist before deploying to Render and Vercel.

## Backend (Render) Checklist

### Environment Variables
- [ ] `NODE_ENV=production`
- [ ] `MONGODB_URI` - Set to production database
- [ ] `JWT_SECRET` - Strong 32+ character secret
- [ ] `CLOUDINARY_*` - All three variables set
- [ ] `SMTP_*` - All email configuration set
- [ ] `FRONTEND_URL` - Points to your Vercel frontend

### Code Quality
- [ ] No `console.log()` statements left in production code
- [ ] Error handling implemented
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Security middleware active (helmet, mongo-sanitize, xss-clean)

### Testing
- [ ] Test signup flow with email
- [ ] Test login flow
- [ ] Test forgot password OTP
- [ ] Test password reset
- [ ] Test WebSocket connection
- [ ] Test invalid routes return 404

### Performance
- [ ] Check database indexes
- [ ] Enable MongoDB compression
- [ ] Check response times
- [ ] Verify API endpoints are fast

### Security
- [ ] No sensitive data in error messages (production mode)
- [ ] HTTPS enabled on frontend
- [ ] Cookies are secure
- [ ] JWT tokens are strong
- [ ] Passwords hashed with bcrypt
- [ ] MongoDB connection is encrypted

---

## Frontend (Vercel) Checklist

### Environment Variables
- [ ] `VITE_BACKEND_URL` - Points to Render backend

### Build & Performance
- [ ] Build completes without errors
- [ ] No console errors on production build
- [ ] Bundle size is reasonable
- [ ] Images are optimized
- [ ] Code splitting working

### Testing
- [ ] Login functionality works
- [ ] Signup with email verification works
- [ ] Forgot password flow works
- [ ] Chat loads and displays
- [ ] WebSocket connects
- [ ] Responsive on mobile devices
- [ ] Dark/Light theme works

### SEO & Metadata
- [ ] Meta tags updated
- [ ] Favicon configured
- [ ] Page titles correct
- [ ] Descriptions present

### Security
- [ ] No sensitive data in frontend code
- [ ] API keys not exposed
- [ ] XSS protection in place
- [ ] CSRF protection (if needed)

---

## Deployment Process

### 1. Local Testing
```bash
# Build backend
cd backend && npm install

# Build frontend
cd frontend && npm run build

# Test build locally
cd backend && npm start
```

### 2. Push to GitHub
```bash
git add .
git commit -m "production: ready for deployment"
git push origin main
```

### 3. Deploy Backend (Render)
- [ ] Add to Render dashboard
- [ ] Configure all environment variables
- [ ] Test health check: `/health`
- [ ] Test API endpoints

### 4. Deploy Frontend (Vercel)
- [ ] Add to Vercel dashboard
- [ ] Update `VITE_BACKEND_URL` after backend is running
- [ ] Verify build succeeds
- [ ] Test all functionality

### 5. Post-Deployment
- [ ] Monitor error logs
- [ ] Check database connections
- [ ] Verify email sending works
- [ ] Test real-world scenarios
- [ ] Document any issues

---

## Environment Variable Templates

### Backend (.env)
```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-strong-secret-key
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
SMTP_FROM_EMAIL=...
SMTP_FROM_NAME=...
FRONTEND_URL=https://your-frontend.vercel.app
```

### Frontend (.env)
```
VITE_BACKEND_URL=https://your-backend.onrender.com
```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| CORS errors | Verify `FRONTEND_URL` in backend env |
| WebSocket fails | Check Socket.io CORS configuration |
| Email not sending | Verify SMTP credentials and 2FA password |
| Database connection fails | Check MongoDB URI and IP whitelist |
| Frontend blank page | Check build output and console errors |
| 500 errors | Check backend logs in Render dashboard |

---

## Monitoring & Maintenance

- [ ] Set up error logging (Sentry recommended)
- [ ] Monitor database connection limits
- [ ] Check email sending limits
- [ ] Monitor API response times
- [ ] Set up uptime monitoring
- [ ] Establish backup procedures

---

**Last Updated:** March 27, 2026

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)
