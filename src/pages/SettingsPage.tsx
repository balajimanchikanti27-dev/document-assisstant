import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Settings,
  Sun,
  Moon,
  Monitor,
  FileText,
  Globe,
  Sliders,
  Trash2,
  LogOut,
  AlertTriangle,
  Shield,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { getUserSettings, saveUserSettings, deleteUserAccount, exportUserData } from '../services/userService';
import { UserSettings, ResponseLengthPreference, SourcePreference, AssistantMode } from '../types';

export const SettingsPage: React.FC = () => {
  const { user, logout, isFirebaseConfigured, isDemoUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [settings, setSettings] = useState<UserSettings>(() => {
    return user ? getUserSettings(user.uid) : {
      theme: 'system',
      defaultMode: 'document',
      responseLength: 'balanced',
      sourcePreference: 'both',
      enableSearchHistory: true,
    };
  });

  const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (user) {
      setSettings(getUserSettings(user.uid));
    }
  }, [user]);

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    if (user) {
      saveUserSettings(user.uid, updated);
      showToast('Preference updated', 'info');
    }
  };

  const handleClearAllHistory = () => {
    if (!user) return;
    localStorage.removeItem(`ai_chats_${user.uid}`);
    showToast('All local chat sessions cleared', 'success');
    setShowClearHistoryDialog(false);
  };

  const handleExportData = async () => {
    if (!user) return;
    setIsExporting(true);
    try {
      await exportUserData(user.uid);
      showToast('Export downloaded successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to export account archive', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    if (!isFirebaseConfigured && !isDemoUser) {
      showToast('Live account deletion requires active Firebase configuration', 'warning');
      setShowDeleteAccountDialog(false);
      return;
    }

    setIsDeletingAccount(true);
    try {
      if (isDemoUser) {
        await logout();
        showToast('Demo profile session terminated', 'info');
        navigate('/');
      } else {
        await deleteUserAccount();
        showToast('Account permanently deleted', 'success');
        navigate('/');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete account. You may need to re-authenticate first.', 'error');
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteAccountDialog(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-brand-600" />
          <span>Application Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Customize your interface appearance, AI defaults, and data retention.
        </p>
      </div>

      <div className="space-y-6">
        {/* Section 1: Appearance Theme */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Sun className="w-4 h-4 text-brand-500" />
            <span>Appearance Theme</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Choose between daylight brightness, comfortable dark mode, or follow your operating system.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-3.5 rounded-2xl border text-center flex flex-col items-center gap-2 transition-all ${
                theme === 'light'
                  ? 'border-brand-600 bg-brand-50/50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-300 ring-1 ring-brand-500'
                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
              }`}
            >
              <Sun className="w-5 h-5 text-amber-500" />
              <span className="text-xs font-semibold">Light</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-3.5 rounded-2xl border text-center flex flex-col items-center gap-2 transition-all ${
                theme === 'dark'
                  ? 'border-brand-600 bg-brand-50/50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-300 ring-1 ring-brand-500'
                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
              }`}
            >
              <Moon className="w-5 h-5 text-brand-400" />
              <span className="text-xs font-semibold">Dark</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`p-3.5 rounded-2xl border text-center flex flex-col items-center gap-2 transition-all ${
                theme === 'system'
                  ? 'border-brand-600 bg-brand-50/50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-300 ring-1 ring-brand-500'
                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
              }`}
            >
              <Monitor className="w-5 h-5 text-neutral-500" />
              <span className="text-xs font-semibold">System</span>
            </button>
          </div>
        </div>

        {/* Section 2: AI Defaults */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-brand-500" />
            <span>Assistant Defaults</span>
          </h2>

          <div className="space-y-4">
            {/* Default Mode */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block">
                  Default Launch Mode
                </span>
                <span className="text-[11px] text-neutral-400">
                  Select which mode opens when you click New Chat
                </span>
              </div>
              <select
                value={settings.defaultMode}
                onChange={(e) => updateSetting('defaultMode', e.target.value as AssistantMode)}
                className="py-1.5 px-3 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-medium"
              >
                <option value="document">Ask My Documents</option>
                <option value="research">AI Web Research</option>
              </select>
            </div>

            {/* Response Length Preference */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block">
                  Response Synthesis Length
                </span>
                <span className="text-[11px] text-neutral-400">
                  Preferred detail level for generated explanations
                </span>
              </div>
              <select
                value={settings.responseLength}
                onChange={(e) => updateSetting('responseLength', e.target.value as ResponseLengthPreference)}
                className="py-1.5 px-3 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-medium"
              >
                <option value="short">Concise & Short</option>
                <option value="balanced">Balanced & Standard</option>
                <option value="detailed">In-depth & Detailed</option>
              </select>
            </div>

            {/* Source Preference */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block">
                  Default Research Sources
                </span>
                <span className="text-[11px] text-neutral-400">
                  Default domain targets when launching web inquiries
                </span>
              </div>
              <select
                value={settings.sourcePreference}
                onChange={(e) => updateSetting('sourcePreference', e.target.value as SourcePreference)}
                className="py-1.5 px-3 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-medium"
              >
                <option value="both">Wikipedia and General Web</option>
                <option value="wikipedia">Wikipedia Only</option>
                <option value="web">General Web Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Data Management & Privacy */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-500" />
            <span>Data & Privacy</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Control your local session data, read our privacy terms, or remove your account.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
              <div>
                <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  Clear All Conversation History
                </p>
                <p className="text-[11px] text-neutral-400">
                  Wipe all stored sessions from your device
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowClearHistoryDialog(true)}
                className="px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-red-600 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Clear History
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
              <div>
                <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  Export Account & Activity Archive
                </p>
                <p className="text-[11px] text-neutral-400">
                  Download a JSON copy of your profile, document metadata, chats, and preferences
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportData}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-brand-600 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting ? 'Exporting...' : 'Export Data'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
              <div>
                <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  Privacy Policy & Data Security
                </p>
                <p className="text-[11px] text-neutral-400">
                  Read how document grounding and Firebase isolate your files
                </p>
              </div>
              <Link
                to="/privacy"
                className="px-3 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
              >
                View Policy
              </Link>
            </div>
          </div>
        </div>

        {/* Section 4: Account Danger Zone */}
        <div className="bg-red-50/50 dark:bg-red-950/20 rounded-3xl p-6 border border-red-200 dark:border-red-900/60 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="text-base font-bold">Danger Zone</h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div>
              <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                Delete Account
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Permanently delete your profile, documents, and chat records.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteAccountDialog(true)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors self-start sm:self-auto"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Clear History Dialog */}
      <ConfirmationDialog
        isOpen={showClearHistoryDialog}
        title="Clear All Chat History"
        message="Are you sure you want to delete all past conversation records? This action cannot be reversed."
        confirmLabel="Clear History"
        isDestructive={true}
        onConfirm={handleClearAllHistory}
        onCancel={() => setShowClearHistoryDialog(false)}
      />

      {/* Delete Account Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteAccountDialog}
        title="Delete Your Account"
        message="Warning: This action will permanently remove your user authentication record, your uploaded documents, and all stored vectors. Are you absolutely certain you want to proceed?"
        confirmLabel="Permanently Delete Account"
        isDestructive={true}
        isLoading={isDeletingAccount}
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteAccountDialog(false)}
      />
    </div>
  );
};
