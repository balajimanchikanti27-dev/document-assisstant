import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  FileText,
  Globe,
  FolderOpen,
  History,
  Settings,
  User,
  LogOut,
  Plus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  HelpCircle,
  MessageSquare,
  BarChart2,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getChatSessions } from '../../services/chatService';
import { ChatSession } from '../../types';
import { ConfirmationDialog } from '../common/ConfirmationDialog';

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed = false,
  onToggleCollapse,
  className = '',
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [recentChats, setRecentChats] = useState<ChatSession[]>([]);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      getChatSessions(user.uid)
        .then((sessions) => setRecentChats(sessions.slice(0, 5)))
        .catch(() => {});
    }
  }, [user?.uid, location.pathname]);

  const handleNewChat = () => {
    navigate('/app/chat/new');
  };

  const handleConfirmLogout = async () => {
    setShowLogoutDialog(false);
    await logout();
    navigate('/');
  };

  const navItems = [
    { name: 'Home', path: '/app', icon: Home, end: true },
    { name: 'Ask My Documents', path: '/app/chat/new?mode=document', icon: FileText },
    { name: 'Smart Study Coach', path: '/app/coach', icon: GraduationCap },
    { name: 'AI Web Research', path: '/app/research', icon: Globe },
    { name: 'Agent Evaluation', path: '/app/evaluation', icon: BarChart2 },
    { name: 'My Documents', path: '/app/documents', icon: FolderOpen },
    { name: 'Chat History', path: '/app/history', icon: History },
  ];

  return (
    <>
      <aside
        className={`h-screen bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col justify-between transition-all duration-300 z-30 select-none ${
          collapsed ? 'w-20' : 'w-64'
        } ${className}`}
      >
        {/* Top Header */}
        <div className="flex flex-col p-4 border-b border-neutral-100 dark:border-neutral-800/80">
          <div className="flex items-center justify-between gap-2 mb-4">
            <NavLink to="/app" className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-brand-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              {!collapsed && (
                <div className="flex flex-col truncate">
                  <span className="font-bold text-sm text-neutral-900 dark:text-neutral-100 tracking-tight leading-none">
                    AI Assistant
                  </span>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Workspace
                  </span>
                </div>
              )}
            </NavLink>

            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* New Chat Button */}
          <button
            type="button"
            onClick={handleNewChat}
            className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-medium text-xs sm:text-sm bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all shadow-sm ${
              collapsed ? 'px-0' : ''
            }`}
            title="Start New Chat"
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!collapsed && <span>New Chat</span>}
          </button>
        </div>

        {/* Main Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl transition-colors ${
                    isActive
                      ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-semibold'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
                  } ${collapsed ? 'justify-center px-0' : ''}`
                }
                title={item.name}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </NavLink>
            ))}
          </nav>

          {/* Recent Conversations */}
          {!collapsed && recentChats.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-3">
                Recent Chats
              </span>
              <div className="mt-1 space-y-0.5">
                {recentChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => navigate(`/app/chat/${chat.id}`)}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 rounded-lg truncate transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                    <span className="truncate">{chat.title || 'Untitled chat'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Nav / Account */}
        <div className="p-3 border-t border-neutral-100 dark:border-neutral-800/80 space-y-1">
          <button
            type="button"
            onClick={() => setShowHelpDialog(true)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors ${
              collapsed ? 'justify-center px-0' : ''
            }`}
            title="Help & Documentation"
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Help & Guide</span>}
          </button>

          <NavLink
            to="/app/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl transition-colors ${
                isActive
                  ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
              } ${collapsed ? 'justify-center px-0' : ''}`
            }
            title="Settings"
          >
            <Settings className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Settings</span>}
          </NavLink>

          <NavLink
            to="/app/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl transition-colors ${
                isActive
                  ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
              } ${collapsed ? 'justify-center px-0' : ''}`
            }
            title="Profile"
          >
            <User className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Profile</span>}
          </NavLink>

          <button
            type="button"
            onClick={() => setShowLogoutDialog(true)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors ${
              collapsed ? 'justify-center px-0' : ''
            }`}
            title="Sign Out"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showLogoutDialog}
        title="Sign Out"
        message="Are you sure you want to sign out of your AI Assistant account?"
        confirmLabel="Sign Out"
        isDestructive={true}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutDialog(false)}
      />

      {/* Help Dialog */}
      <ConfirmationDialog
        isOpen={showHelpDialog}
        title="AI Assistant Help & Modes"
        message="1. 'Ask My Documents' is strictly document-grounded. Answers will only be derived from your indexed files. If unmentioned, the system will output the fallback message. 2. 'AI Web Research' fetches real search snippets from Wikipedia and verified web sources. Source citations include external domains and URLs."
        confirmLabel="Got it"
        cancelLabel="Close"
        onConfirm={() => setShowHelpDialog(false)}
        onCancel={() => setShowHelpDialog(false)}
      />
    </>
  );
};
