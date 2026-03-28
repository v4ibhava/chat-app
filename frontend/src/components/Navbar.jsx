import React, { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { LogOut, MessageSquare, Settings, User, Menu, X, Search, Palette } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import SearchBar from './SearchBar';
import Notifications from './Notifications';
import SearchModal from './SearchModal';

const Navbar = () => {
  const { logout, authUser } = useAuthStore();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <header className='bg-base-100/95 backdrop-blur-sm border-b border-base-300 fixed w-full top-0 z-40 shadow-sm'>
        <div className='container mx-auto px-3 h-14'>
          <div className='flex items-center justify-between h-full'>
            <div className='flex items-center gap-3'>
              <Link to="/" className='flex items-center gap-2 hover:opacity-80 transition-all'>
                <div className='size-8 rounded-lg bg-primary/10 flex items-center justify-center'>
                  <MessageSquare className='w-4 h-4 text-primary' />
                </div>
                <h1 className='text-lg font-bold tracking-tight'>Zync</h1>
              </Link>
            </div>
            
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
                    className="md:hidden btn btn-sm btn-ghost btn-circle"
                    title="Search"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                  
                  <Notifications />
                  
                  <div className="hidden sm:flex items-center gap-1 ml-1">
                    <Link to={"/profile"} className="btn btn-sm btn-ghost gap-1">
                      <User className="w-4 h-4" />
                      <span className="hidden lg:inline">Profile</span>
                    </Link>
                    <Link to={"/settings"} className="btn btn-sm btn-ghost gap-1">
                      <Palette className='w-4 h-4' />
                      <span className="hidden lg:inline">Theme</span>
                    </Link>
                    <button className='btn btn-sm btn-ghost btn-circle' onClick={logout} title="Logout">
                      <LogOut className='w-4 h-4' />
                    </button>
                  </div>

                  <button 
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    className="sm:hidden btn btn-sm btn-ghost btn-circle"
                  >
                    {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </button>
                </>
              ) : (
                <Link to="/login" className="btn btn-sm btn-primary">
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>

        {showMobileMenu && authUser && (
          <div className="sm:hidden border-t border-base-300 bg-base-100 animate-slide-down">
            <div className="p-3 space-y-2">
              <Link 
                to={"/profile"} 
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-200"
                onClick={() => setShowMobileMenu(false)}
              >
                <User className="w-5 h-5" /> Profile
              </Link>
              <Link 
                to={"/settings"} 
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-200"
                onClick={() => setShowMobileMenu(false)}
              >
                <Settings className="w-5 h-5" /> Settings
              </Link>
              <button 
                onClick={() => { logout(); setShowMobileMenu(false); }}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-200 w-full text-left"
              >
                <LogOut className="w-5 h-5" /> Logout
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