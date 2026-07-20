import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import HomePage from './pages/HomePage';
import SignUpPage from './pages/SignUpPage';
import LoginPage from './pages/LoginPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import FriendsPage from './pages/FriendsPage';
import GroupInvitePage from './pages/GroupInvitePage';
import Navbar from './components/Navbar';
import CallModal from './components/CallModal';
import { useAuthStore } from './store/useAuthStore.js';
import { useThemeStore } from './store/useThemeStore.js';
import {Loader} from "lucide-react";
import { Toaster } from "react-hot-toast";

const App = () => {
  const{authUser, checkAuth ,isCheckingAuth ,onlineUsers } = useAuthStore();
  const { theme } = useThemeStore();
  const location = useLocation();

  console.log({ onlineUsers })

  useEffect(()=>{
    checkAuth()
  }, [checkAuth])
  console.log({ authUser })

  if(isCheckingAuth && !authUser) 
    return (
    <div className="flex items-center justify-center h-screen bg-base-100">
      <Loader className="size-10 animate-spin text-primary"/>
    </div>
  )

  const resolvedTheme = theme === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme;

  const showNavbar = !["/login", "/signup", "/forgot-password"].includes(location.pathname) && !location.pathname.startsWith("/invite/");

  return (
    <div data-theme={resolvedTheme} className="min-h-screen">
      {showNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={authUser ? <HomePage /> : <Navigate to = "/login" />} />
        <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/"/>} />
        <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/"/>} />
        <Route path="/forgot-password" element={!authUser ? <ForgotPasswordPage /> : <Navigate to="/"/>} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login"/>} />
        <Route path="/friends" element={authUser ? <FriendsPage /> : <Navigate to="/login"/>} />
        <Route path="/invite/:inviteCode" element={authUser ? <GroupInvitePage /> : <Navigate to="/login"/>} />
      </Routes>
      <CallModal />
      <Toaster />
    </div>
  );
};



export default App
