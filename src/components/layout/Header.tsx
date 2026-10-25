import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Menu, User, Settings, LogOut, ChevronDown, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from '../common/ThemeToggle';
import { UserAvatar } from '../common/UserAvatar';

interface HeaderProps {
  onOpenMobileNav: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileNav }) => {
  const { user, logout, isDemoUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine current page title and mode indicator
  const getPageInfo = () => {
    const path = location.pathname;
    if (path === '/app') return { title: 'Dashboard', mode: null };
    if (path.startsWith('/app/documents')) return { title: 'My Documents', mode: 'Document Management' };
    if (path.startsWith('/app/research')) return { title: 'AI Web Research', mode: 'Web & Wikipedia' };
    if (path.startsWith('/app/chat')) return { title: 'Conversation', mode: 'Document Only' };
    if (path === '/app/history') return { title: 'Chat History', mode: null };
    if (path === '/app/profile') return { title: 'User Profile', mode: null };
    if (path === '/app/settings') return { title: 'Settings', mode: null };
    return { title: 'AI Assistant', mode: null };
  };

  const { title, mode } = getPageInfo();

  return (
    <header className="h-16 px-4 sm:px-6 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-4 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="md:hidden p-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Open mobile navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <h1 className="font-semibold text-base sm:text-lg text-neutral-900 dark:text-neutral-100 tracking-tight">
            {title}
          </h1>
          {mode && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
              {mode}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            <UserAvatar name={user?.displayName || 'User'} photoURL={user?.photoURL} size="sm" />
            <span className="hidden sm:inline font-medium text-xs text-neutral-800 dark:text-neutral-200 max-w-[120px] truncate">
              {user?.displayName || 'Account'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl py-2 z-50 animate-fade-in text-sm">
              <div className="px-4 py-2 border-b border-neutral-100 dark:border-neutral-800">
                <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                  {user?.displayName || 'Signed In User'}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                  {user?.email || user?.phoneNumber || 'Demo Guest User'}
                </p>
                {isDemoUser && (
                  <span className="inline-block mt-1 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full">
                    Demo Mode Active
                  </span>
                )}
              </div>

              <div className="py-1">
                <Link
                  to="/app/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <User className="w-4 h-4 text-neutral-400" />
                  <span>Profile</span>
                </Link>
                <Link
                  to="/app/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <Settings className="w-4 h-4 text-neutral-400" />
                  <span>Settings</span>
                </Link>
              </div>

              <div className="pt-1 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={async () => {
                    setMenuOpen(false);
                    await logout();
                    navigate('/');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
