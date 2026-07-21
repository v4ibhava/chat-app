import React, { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { LogOut, MessageSquare, Settings, User, Menu, X, Search } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import SearchBar from './SearchBar';
import Notifications from './Notifications';
import SearchModal from './SearchModal';

const Navbar = () => {
  const { logout, authUser } = useAuthStore();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      <header className='bg-base-200 border-b border-base-300 fixed w-full top-0 z-40 transition-colors duration-200'>
        <div className='px-4 h-14'>
          <div className='flex items-center justify-between h-full'>
            <div className='flex items-center gap-3'>
              <Link to="/" className='flex items-center gap-2.5 hover:opacity-80 transition-all'>
                <div className='size-8 rounded-xl bg-primary/10 flex items-center justify-center'>
                  <MessageSquare className='w-4 h-4 text-primary' />
                </div>
                <h1 className='text-lg font-bold tracking-tight text-base-content'>Zync</h1>
              </Link>
            </div>
            
            {/* Global SearchBar */}
            {authUser && (
              <div className="hidden md:flex items-center gap-3 flex-1 max-w-md mx-4">
                <div className="w-full">
                  <SearchBar />
                </div>
              </div>
            )}

            <div className='flex items-center gap-1 sm:gap-2'>
              {authUser ? (
                <>
                  <button 
                    onClick={() => setShowSearch(true)}
                    className="md:hidden w-10 h-10 rounded-full bg-base-100 border border-base-300 hover:bg-base-300/50 flex items-center justify-center text-base-content/70 hover:text-base-content transition-all"
                    title="Search Users"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  
                  <Notifications />
                  
                  <div className="hidden sm:flex items-center gap-1.5 ml-1">
                    <Link 
                      to={"/profile"} 
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        location.pathname === "/profile" 
                          ? "bg-primary/20 text-primary border border-primary/40" 
                          : "bg-base-100 border border-base-300 hover:bg-base-300/50 text-base-content/70 hover:text-base-content"
                      }`} 
                      title="Profile"
                    >
                      <User className="w-4 h-4" />
                    </Link>

                    <Link 
                      to={"/settings"} 
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        location.pathname === "/settings" 
                          ? "bg-primary/20 text-primary border border-primary/40" 
                          : "bg-base-100 border border-base-300 hover:bg-base-300/50 text-base-content/70 hover:text-base-content"
                      }`} 
                      title="Settings"
                    >
                      <Settings className="w-4 h-4" />
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-10 h-10 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 flex items-center justify-center transition-all ml-1"
                      title="Log Out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>

                  <button 
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    className="sm:hidden w-10 h-10 rounded-full bg-base-100 border border-base-300 hover:bg-base-300/50 flex items-center justify-center text-base-content/70 hover:text-base-content transition-all"
                  >
                    {showMobileMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                  </button>
                </>
              ) : (
                <Link to="/login" className="px-5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all">
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>

        {showMobileMenu && authUser && (
          <div className="sm:hidden border-t border-base-300 bg-base-200 animate-slide-down">
            <div className="p-3 space-y-2">
              <Link 
                to={"/profile"} 
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-base-100 text-base-content/80 hover:text-base-content transition-all"
                onClick={() => setShowMobileMenu(false)}
              >
                <User className="w-5 h-5" /> Profile
              </Link>
              <Link 
                to={"/settings"} 
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-base-100 text-base-content/80 hover:text-base-content transition-all"
                onClick={() => setShowMobileMenu(false)}
              >
                <Settings className="w-5 h-5" /> Settings
              </Link>
              <button 
                onClick={() => { setShowMobileMenu(false); handleLogout(); }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-red-500/10 text-red-400 transition-all font-medium"
              >
                <LogOut className="w-5 h-5" /> Log Out
              </button>
            </div>
          </div>
        )}
      </header>

      <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </>
  )
}

export default Navbar
