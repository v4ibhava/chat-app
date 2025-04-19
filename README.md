# Zync - Real-time Chat Application

A modern real-time chat application that keeps you in sync with your connections. Built with React, Socket.IO, and Node.js, Zync features a beautiful UI with DaisyUI themes, real-time messaging, image sharing, and secure user authentication.

## ✨ Features

- 🔐 User authentication (signup/login)
- 💬 Real-time messaging
- 🌈 Multiple themes (29+ themes available)
- 🖼️ Image sharing support
- 👤 User profiles
- 🟢 Online status indicators
- 📱 Responsive design
- 🔒 Enhanced security features

## 🛠️ Tech Stack

### Frontend
- React v19 + Vite v6
- TailwindCSS v4
- DaisyUI v5
- Socket.IO Client v4
- Zustand v5 (State Management)
- React Router DOM v7
- Axios v1.8

### Backend
- Node.js
- Express.js v4.18
- MongoDB with Mongoose v8
- Socket.IO v4.7
- JWT Authentication
- Cloudinary (Image Storage)
- Security Features:
  - Helmet v7
  - Express Rate Limit
  - Express Mongo Sanitize
  - XSS Clean
  - CORS

## 🚀 Getting Started

### Prerequisites
- Node.js (v20 or higher recommended)
- MongoDB
- npm or yarn
- Cloudinary account (free tier works fine)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/zync.git
cd zync
```

2. Install dependencies
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

3. Environment Setup

First, create a `.env` file in the backend directory:
```env
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

#### Generate JWT Secret Key
You can generate a secure JWT secret key using either of these methods:

1. Using OpenSSL (recommended):
```bash
openssl rand -base64 32
```

2. Alternative method using Node.js crypto:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output from either command and paste it as your `JWT_SECRET` in the `.env` file.

#### Get Cloudinary Credentials
1. Go to [Cloudinary](https://cloudinary.com/) and create a free account
2. After logging in, go to your Dashboard
3. You will find your credentials in the dashboard:
   - Copy "Cloud Name" → `CLOUDINARY_CLOUD_NAME`
   - Copy "API Key" → `CLOUDINARY_API_KEY`
   - Copy "API Secret" → `CLOUDINARY_API_SECRET`

#### MongoDB URI
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Click "Connect" and choose "Connect your application"
4. Copy the connection string and replace `<password>` with your database user password
5. Paste it as your `MONGODB_URI` in the `.env` file

4. Start the development servers

```bash
# Start backend (from backend directory)
npm run dev

# Start frontend (from frontend directory)
npm run dev
```

## 🎨 Theme Customization

The app comes with 29+ built-in themes from DaisyUI. Themes can be changed in real-time from the settings page. Available themes include:
- Light
- Dark
- Coffee
- Cupcake
- Cyberpunk
- And many more!

## 🔒 Security Features

- Helmet for secure HTTP headers
- Rate limiting for API endpoints
- MongoDB sanitization against NoSQL injections
- XSS protection
- CORS configuration
- Secure cookie settings
- Input validation

## 👏 Acknowledgments

- [DaisyUI](https://daisyui.com/) for the beautiful UI components
- [Socket.IO](https://socket.io/) for real-time functionality
- [Cloudinary](https://cloudinary.com/) for image hosting





