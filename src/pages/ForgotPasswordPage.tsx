import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Sparkles, Mail, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { forgotPasswordSchema, ForgotPasswordFormData } from '../utils/validators';
import { requestPasswordReset } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ThemeToggle } from '../components/common/ThemeToggle';

export const ForgotPasswordPage: React.FC = () => {
  const { isFirebaseConfigured } = useAuth();
  const { showToast } = useToast();

  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setFormError(null);

    if (!isFirebaseConfigured) {
      setFormError(
        'Firebase Authentication is not configured. Live password resets require active credentials in .env.'
      );
      showToast('Firebase credentials required for reset emails', 'warning');
      return;
    }

    try {
      await requestPasswordReset(data.email);
      setSubmittedEmail(data.email);
      showToast('Password reset link sent to your email', 'success');
    } catch (err: any) {
      setFormError(err.message || 'Failed to send reset link. Please check your email.');
    }
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
          {submittedEmail ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                Check your inbox
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6">
                We sent a password reset link to{' '}
                <span className="font-semibold text-neutral-900 dark:text-neutral-200">
                  {submittedEmail}
                </span>
                . Click the link in the email to choose a new password.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl text-white bg-brand-600 hover:bg-brand-700 transition-colors shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight mb-1">
                  Reset your password
                </h1>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                  Enter your registered email address and we'll send you instructions to reset your password.
                </p>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="mb-4 p-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label
                    htmlFor="reset-email"
                    className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      placeholder="name@company.com"
                      {...register('email')}
                      className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                        errors.email
                          ? 'border-red-300 dark:border-red-700'
                          : 'border-neutral-300 dark:border-neutral-700'
                      }`}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl font-medium text-sm text-white bg-brand-600 hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending reset link...</span>
                    </>
                  ) : (
                    <span>Send Reset Instructions</span>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

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
