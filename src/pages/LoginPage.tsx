import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, Mail, Phone } from 'lucide-react';
import { LoginForm } from '../components/auth/LoginForm';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { PhoneNumberForm } from '../components/auth/PhoneNumberForm';
import { ThemeToggle } from '../components/common/ThemeToggle';

type AuthTab = 'email' | 'phone';

export const LoginPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AuthTab>('email');
  const navigate = useNavigate();
  const location = useLocation();

  const handlePhoneOtpSent = (formattedPhone: string) => {
    // Navigate to verify phone page with destination phone in state
    navigate('/verify-phone', { state: { phoneNumber: formattedPhone } });
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col justify-between py-8 px-4 sm:px-6">
      <div className="flex items-center justify-between max-w-md w-full mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-bold text-base text-neutral-900 dark:text-neutral-100">
            AI Assistant
          </span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full mx-auto my-8">
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-neutral-200 dark:border-neutral-800 shadow-xl">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight mb-1">
              Welcome back
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
              Sign in to continue to your AI Assistant.
            </p>
          </div>

          {/* Social Sign In */}
          <div className="mb-5">
            <GoogleSignInButton
              onSuccess={() => {
                navigate('/app');
              }}
            />
          </div>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white dark:bg-neutral-900 text-neutral-400 font-medium">
                Or sign in with
              </span>
            </div>
          </div>

          {/* Tabs: Email vs Phone */}
          <div className="flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl mb-5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('email')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'email'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm font-semibold'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('phone')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'phone'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm font-semibold'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Phone</span>
            </button>
          </div>

          {/* Form */}
          {activeTab === 'email' ? (
            <LoginForm />
          ) : (
            <PhoneNumberForm onOtpSent={handlePhoneOtpSent} />
          )}

          {/* Create Account link */}
          <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 text-center text-xs text-neutral-500 dark:text-neutral-400">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="text-brand-600 dark:text-brand-400 font-semibold hover:underline"
            >
              Create an Account
            </Link>
          </div>
        </div>
      </div>

      {/* Footer links */}
      <div className="text-center text-xs text-neutral-400 space-x-4">
        <Link to="/terms" className="hover:underline">
          Terms of Service
        </Link>
        <span>•</span>
        <Link to="/privacy" className="hover:underline">
          Privacy Policy
        </Link>
      </div>
    </div>
  );
};
