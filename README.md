<p align="center">
  <img src="showcase.png" alt="Zync Chat App" width="100%"/>
</p>

## Zync - Real-time Chat Application

A modern chat app with real-time messaging, friends system, and 29+ themes. Built with React, Socket.IO, and Node.js.

### Features

| Feature | Description |
|---------|-------------|
| **Real-time Chat** | Instant messaging with Socket.IO |
| **Friend System** | Search, add friends, chat with them |
| **Notifications** | Sound alerts for new messages & requests |
| **Online Status** | Live status indicators |
| **Themes** | 29+ DaisyUI themes |
| **Responsive** | Works on all screen sizes |
| **Security** | JWT auth, rate limiting, XSS protection |

### Tech Stack

**Frontend:** React 19 + Vite 6 + TailwindCSS 4 + DaisyUI 5 + Socket.IO Client + Zustand

**Backend:** Node.js + Express + MongoDB + Socket.IO + JWT + Cloudinary

### Quick Start

```bash
# Clone
git clone https://github.com/v4ibhava/chat-app.git
cd chat-app

# Install
cd frontend && npm install
cd ../backend && npm install

# Setup .env (copy from .env.example)
# MONGODB_URI, JWT_SECRET, CLOUDINARY_*

# Run
# Terminal 1: cd backend && npm run dev
# Terminal 2: cd frontend && npm run dev
```

Open `http://localhost:5173`

### Deployment

**Frontend:** Connect GitHub repo to Vercel  
**Backend:** Connect GitHub repo to Render  
Required env vars: `MONGODB_URI`, `JWT_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

### License

MIT