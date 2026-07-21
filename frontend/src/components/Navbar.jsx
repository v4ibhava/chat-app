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

  // SearchBar only displays when user is on Profile or Settings page
  const showSearchBarInHeader = ["/profile", "/settings"].includes(location.pathname);

  return (
    <>
      <header className='bg-[#121215] border-b border-[#1e1e24] fixed w-full top-0 z-40'>
        <div className='px-4 h-14'>
          <div className='flex items-center justify-between h-full'>
            <div className='flex items-center gap-3'>
              <Link to="/" className='flex items-center gap-2.5 hover:opacity-80 transition-all'>
                <div className='size-8 rounded-xl bg-primary/10 flex items-center justify-center'>
                  <MessageSquare className='w-4 h-4 text-primary' />
                </div>
                <h1 className='text-lg font-bold tracking-tight text-white'>Zync</h1>
              </Link>
            </div>
            
            {/* SearchBar conditionally shown ONLY when on /profile or /settings page */}
            {authUser && showSearchBarInHeader && (
              <div className="hidden md:flex items-center gap-3 flex-1 max-w-md mx-4">
                <div className="w-full">
                  <SearchBar />
                </div>
              </div>
            )}

            <div className='flex items-center gap-1 sm:gap-2'>
              {authUser ? (
                <>
                  {showSearchBarInHeader && (
                    <button 
                      onClick={() => setShowSearch(true)}
                      className="md:hidden w-10 h-10 rounded-full bg-[#1f1f26] hover:bg-[#2a2a34] flex items-center justify-center text-zinc-400 hover:text-white transition-all"
                      title="Search Settings"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  )}
                  
                  <Notifications />
                  
                  <div className="hidden sm:flex items-center gap-1.5 ml-1">
                    <Link 
                      to={"/profile"} 
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        location.pathname === "/profile" 
                          ? "bg-primary/20 text-primary border border-primary/40" 
                          : "bg-[#1f1f26] hover:bg-[#2a2a34] text-zinc-400 hover:text-white"
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
                          : "bg-[#1f1f26] hover:bg-[#2a2a34] text-zinc-400 hover:text-white"
                      }`} 
                      title="Settings"
                    >
                      <Settings className="w-4 h-4" />
                    </Link>
                  </div>

                  <button 
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    className="sm:hidden w-10 h-10 rounded-full bg-[#1f1f26] hover:bg-[#2a2a34] flex items-center justify-center text-zinc-400 hover:text-white transition-all"
                  >
                    {showMobileMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                  </button>
                </>
              ) : (
                <Link to="/login" className="px-5 py-1.5 rounded-xl bg-primary/80 hover:bg-primary text-white text-sm font-semibold transition-all">
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>

        {showMobileMenu && authUser && (
          <div className="sm:hidden border-t border-[#1e1e24] bg-[#121215] animate-slide-down">
            <div className="p-3 space-y-2">
              <Link 
                to={"/profile"} 
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#1a1a20] text-zinc-300 hover:text-white transition-all"
                onClick={() => setShowMobileMenu(false)}
              >
                <User className="w-5 h-5" /> Profile
              </Link>
              <Link 
                to={"/settings"} 
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#1a1a20] text-zinc-300 hover:text-white transition-all"
                onClick={() => setShowMobileMenu(false)}
              >
                <Settings className="w-5 h-5" /> Settings
              </Link>
            </div>
          </div>
        )}
      </header>

      <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </>
  )
}

export default Navbar
