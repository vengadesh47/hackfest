import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User as UserIcon, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navLinks = user
    ? [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/upload', label: 'New Claim' },
      ]
    : [];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-[#0F3D3E] text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#D9C27A] rounded-lg flex items-center justify-center text-[#0F3D3E] font-extrabold text-sm">CP</div>
            <span className="text-xl font-bold text-[#D9C27A]">ClaimPilot India</span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-all duration-200 px-3 py-2 rounded-lg ${
                  isActive(link.to) ? 'bg-white/10 text-[#D9C27A]' : 'text-gray-200 hover:text-[#D9C27A]'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <div className="flex items-center space-x-4 ml-4 pl-4 border-l border-white/20">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-[#D9C27A] rounded-full flex items-center justify-center text-[#0F3D3E] font-bold text-xs">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-gray-300 text-xs capitalize">{user.role}</p>
                  </div>
                </div>
                <button onClick={logout} className="flex items-center space-x-1 text-gray-300 hover:text-red-300 transition text-sm">
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/login" className="text-gray-200 hover:text-[#D9C27A] px-3 py-2 rounded-lg text-sm font-medium transition">
                  Login
                </Link>
                <Link to="/register" className="bg-[#D9C27A] text-[#0F3D3E] px-4 py-2 rounded-lg font-bold text-sm hover:brightness-110 transition">
                  Register
                </Link>
              </div>
            )}
          </div>

          <button className="md:hidden text-white" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-[#0c3233] border-t border-white/10 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive(link.to) ? 'bg-white/10 text-[#D9C27A]' : 'text-gray-200'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {user ? (
                <button
                  onClick={() => { logout(); setMobileOpen(false); }}
                  className="w-full text-left px-3 py-2 text-red-300 text-sm font-medium"
                >
                  Logout
                </button>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-gray-200 text-sm font-medium">
                    Login
                  </Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-[#D9C27A] text-sm font-bold">
                    Register
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
