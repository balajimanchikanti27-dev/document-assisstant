import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { signupSchema, SignupFormData } from '../../utils/validators';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface SignupFormProps {
  onSuccess?: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSuccess }) => {
  const { registerWithEmail, isFirebaseConfigured, consumePendingQuestion, enableDemoUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      termsAccepted: false as any,
    },
  });

  const currentPassword = watch('password') || '';
  const hasMinLength = currentPassword.length >= 8;
  const hasLetter = /[A-Za-z]/.test(currentPassword);
  const hasNumber = /[0-9]/.test(currentPassword);

  const onSubmit = async (data: SignupFormData) => {
    setFormError(null);
    try {
      const user = await registerWithEmail(data.fullName, data.email, data.password);
      showToast(`Welcome to AI Assistant, ${user.displayName || 'friend'}!`, 'success');

      const pending = consumePendingQuestion();
      if (pending) {
        if (pending.mode === 'research') {
          navigate('/app/research', { state: { initialQuestion: pending.question } });
        } else {
          navigate('/app/chat/new', { state: { initialQuestion: pending.question, mode: 'document' } });
        }
      } else {
        navigate('/app');
      }

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setFormError(err.message || 'Registration failed. Please check the form and try again.');
    }
  };

  const handleDemoAccess = () => {
    enableDemoUser();
    showToast('Demo Account Created: Welcome, Alex Morgan!', 'success');
    navigate('/app');
  };

  return (
    <div className="w-full">
      {!isFirebaseConfigured && (
        <div className="mb-5 p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Live Registration Requires Firebase</p>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed mb-2">
                Configure your project credentials in <code className="font-mono bg-neutral-200 dark:bg-neutral-800 px-1 py-0.5 rounded">.env</code> to store credentials securely in Firebase Auth.
              </p>
              <button
                type="button"
                onClick={handleDemoAccess}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 font-medium text-xs rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors"
              >
                Instant Access via Demo Account
              </button>
            </div>
          </div>
        </div>
      )}

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
            htmlFor="fullname-input"
            className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            Full name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              <User className="w-4 h-4" />
            </div>
            <input
              id="fullname-input"
              type="text"
              autoComplete="name"
              placeholder="e.g. Jane Doe"
              {...register('fullName')}
              className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                errors.fullName
                  ? 'border-red-300 dark:border-red-700'
                  : 'border-neutral-300 dark:border-neutral-700'
              }`}
            />
          </div>
          {errors.fullName && (
            <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="signup-email"
            className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            Email address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              placeholder="jane@company.com"
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

        <div>
          <label
            htmlFor="signup-password"
            className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              {...register('password')}
              className={`w-full pl-9 pr-10 py-2 text-sm rounded-xl border bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                errors.password
                  ? 'border-red-300 dark:border-red-700'
                  : 'border-neutral-300 dark:border-neutral-700'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {/* Password policy requirements */}
          <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
            <span className={`inline-flex items-center gap-1 ${hasMinLength ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
              <CheckCircle2 className="w-3 h-3" /> 8+ chars
            </span>
            <span className={`inline-flex items-center gap-1 ${hasLetter ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
              <CheckCircle2 className="w-3 h-3" /> Letters
            </span>
            <span className={`inline-flex items-center gap-1 ${hasNumber ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
              <CheckCircle2 className="w-3 h-3" /> Numbers
            </span>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="confirm-password"
            className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            Confirm password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              {...register('confirmPassword')}
              className={`w-full pl-9 pr-10 py-2 text-sm rounded-xl border bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                errors.confirmPassword
                  ? 'border-red-300 dark:border-red-700'
                  : 'border-neutral-300 dark:border-neutral-700'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
          )}
        </div>

        <div>
          <div className="flex items-start">
            <input
              id="terms"
              type="checkbox"
              {...register('termsAccepted')}
              className="w-4 h-4 mt-0.5 text-brand-600 border-neutral-300 rounded focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-800"
            />
            <label htmlFor="terms" className="ml-2 block text-xs text-neutral-600 dark:text-neutral-400 leading-normal">
              I agree to the{' '}
              <Link to="/terms" className="text-brand-600 hover:underline dark:text-brand-400">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-brand-600 hover:underline dark:text-brand-400">
                Privacy Policy
              </Link>
            </label>
          </div>
          {errors.termsAccepted && (
            <p className="mt-1 text-xs text-red-500">{errors.termsAccepted.message}</p>
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
              <span>Creating your account...</span>
            </>
          ) : (
            <span>Create Account</span>
          )}
        </button>
      </form>
    </div>
  );
};
