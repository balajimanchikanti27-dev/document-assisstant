import React, { useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  X,
  Home,
  FileText,
  Globe,
  FolderOpen,
  History,
  Settings,
  User,
  LogOut,
  Sparkles,
  Plus,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ isOpen, onClose }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Close when route changes
  useEffect(() => {
    onClose();
  }, [location.pathname]);

  if (!isOpen) return null;

  const navItems = [
    { name: 'Home', path: '/app', icon: Home, end: true },
    { name: 'Ask My Documents', path: '/app/chat/new?mode=document', icon: FileText },
    { name: 'Smart Study Coach', path: '/app/coach', icon: GraduationCap },
    { name: 'AI Web Research', path: '/app/research', icon: Globe },
    { name: 'My Documents', path: '/app/documents', icon: FolderOpen },
    { name: 'Chat History', path: '/app/history', icon: History },
    { name: 'Profile', path: '/app/profile', icon: User },
    { name: 'Settings', path: '/app/settings', icon: Settings },
  ];

  const handleNewChat = () => {
    navigate('/app/chat/new');
    onClose();
  };

  const handleSignOut = async () => {
    onClose();
    await logout();
    navigate('/');
  };

  return (
    <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-72 max-w-[80vw] bg-white dark:bg-neutral-900 h-full flex flex-col justify-between shadow-2xl z-10 p-5">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                AI Assistant
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={handleNewChat}
            className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-medium text-sm bg-brand-600 text-white hover:bg-brand-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>

          {/* Links */}
          <nav className="mt-5 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                    isActive
                      ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-semibold'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
