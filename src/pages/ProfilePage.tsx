import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { UserAvatar } from '../components/common/UserAvatar';
import { updateUserProfileData } from '../services/userService';
import { formatRelativeTime } from '../utils/formatters';

export const ProfilePage: React.FC = () => {
  const { user, isFirebaseConfigured, isDemoUser } = useAuth();
  const { showToast } = useToast();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setStatusMessage(null);

    if (!isFirebaseConfigured && !isDemoUser) {
      setStatusMessage({
        type: 'error',
        text: 'Live profile updates require Firebase credentials configured in .env.',
      });
      showToast('Firebase not configured', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      if (isDemoUser) {
        // In demo mode update local object
        user.displayName = displayName;
        showToast('Demo profile updated successfully', 'success');
        setIsEditing(false);
      } else {
        await updateUserProfileData(user.uid, { displayName });
        user.displayName = displayName;
        showToast('Profile updated successfully', 'success');
        setIsEditing(false);
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to update profile.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(user?.displayName || '');
    setIsEditing(false);
    setStatusMessage(null);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight flex items-center gap-2.5">
          <User className="w-7 h-7 text-brand-600" />
          <span>User Profile</span>
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Manage your personal account details and authentication provider.
        </p>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-8">
        {/* Header with Avatar and Names */}
        <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6 text-center sm:text-left pb-6 border-b border-neutral-100 dark:border-neutral-800">
          <div className="relative group">
            <UserAvatar
              name={user?.displayName || 'User'}
              photoURL={user?.photoURL}
              size="xl"
              className="ring-4 ring-brand-50 dark:ring-brand-950"
            />
            <button
              type="button"
              onClick={() => showToast('Profile image uploads are managed via Firebase Storage.', 'info')}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-brand-600 text-white shadow-md hover:bg-brand-700 transition-colors"
              title="Update profile photo"
              aria-label="Update photo"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
              {user?.displayName || 'Anonymous User'}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
              {user?.email || user?.phoneNumber || 'No email attached'}
            </p>
            <div className="pt-2 flex flex-wrap justify-center sm:justify-start gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                <Shield className="w-3.5 h-3.5 text-brand-500" />
                <span className="capitalize">{user?.authProvider || 'Firebase'} Provider</span>
              </span>
              {isDemoUser && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                  Demo Preview Session
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status Alerts */}
        {statusMessage && (
          <div
            role="alert"
            className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
              statusMessage.type === 'error'
                ? 'border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                : 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
            }`}
          >
            {statusMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Profile Info Details / Form */}
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Display Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                Full Display Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
              ) : (
                <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 text-sm font-medium">
                  <span>{user?.displayName || 'Not specified'}</span>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                Email Address
              </label>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-700 dark:text-neutral-300">
                <Mail className="w-4 h-4 text-neutral-400" />
                <span className="truncate">{user?.email || 'No email attached'}</span>
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                Phone Number
              </label>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-700 dark:text-neutral-300">
                <Phone className="w-4 h-4 text-neutral-400" />
                <span>{user?.phoneNumber || 'Not provided'}</span>
              </div>
            </div>

            {/* Created Timestamp */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                Account Created
              </label>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-700 dark:text-neutral-300">
                <Calendar className="w-4 h-4 text-neutral-400" />
                <span>
                  {user?.createdAt ? formatRelativeTime(user.createdAt) : 'Session Active'}
                </span>
              </div>
            </div>
          </div>

          {/* Edit Actions */}
          {isEditing && (
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white transition-colors shadow-sm disabled:opacity-50"
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
