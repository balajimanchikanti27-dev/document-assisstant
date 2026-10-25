import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Phone } from 'lucide-react';
import { SignupForm } from '../components/auth/SignupForm';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { ThemeToggle } from '../components/common/ThemeToggle';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();

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
              Create your account
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
              Start exploring your documents and the world's knowledge.
            </p>
          </div>

          {/* Social Sign Up */}
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
                Or register with email
              </span>
            </div>
          </div>

          {/* Signup Form */}
          <SignupForm />

          {/* Phone sign up link */}
          <div className="mt-4 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400 font-medium"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Sign up or log in using Phone Number instead</span>
            </Link>
          </div>

          {/* Existing user login link */}
          <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800 text-center text-xs text-neutral-500 dark:text-neutral-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-brand-600 dark:text-brand-400 font-semibold hover:underline"
            >
              Sign In
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
