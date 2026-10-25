import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Mail, Lock, AlertCircle } from 'lucide-react';
import { loginSchema, LoginFormData } from '../../utils/validators';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface LoginFormProps {
  onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { loginWithEmail, isFirebaseConfigured, consumePendingQuestion, enableDemoUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/app';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setFormError(null);
    try {
      await loginWithEmail(data.email, data.password);
      showToast('Signed in successfully', 'success');

      // Check if there was a pending question from welcome page
      const pending = consumePendingQuestion();
      if (pending) {
        if (pending.mode === 'research') {
          navigate('/app/research', { state: { initialQuestion: pending.question } });
        } else {
          navigate('/app/chat/new', { state: { initialQuestion: pending.question, mode: 'document' } });
        }
      } else {
        navigate(from, { replace: true });
      }

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setFormError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleDemoAccess = () => {
    enableDemoUser();
    showToast('Entered UI Demo Mode as Alex Morgan', 'info');
    const pending = consumePendingQuestion();
    if (pending) {
      if (pending.mode === 'research') {
        navigate('/app/research', { state: { initialQuestion: pending.question } });
      } else {
        navigate('/app/chat/new', { state: { initialQuestion: pending.question, mode: 'document' } });
      }
    } else {
      navigate('/app', { replace: true });
    }
  };

  return (
    <div className="w-full">
      {!isFirebaseConfigured && (
        <div className="mb-5 p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Firebase Configuration Pending</p>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed mb-2">
                Live Firebase auth requires environment variables in <code className="font-mono bg-neutral-200 dark:bg-neutral-800 px-1 py-0.5 rounded">.env</code>. You can explore the full UI in Demo Mode:
              </p>
              <button
                type="button"
                onClick={handleDemoAccess}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 font-medium text-xs rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors"
              >
                Explore Full App in Demo Mode
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
            htmlFor="email-input"
            className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            Email address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="email-input"
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

        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="password-input"
              className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
            >
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="password-input"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
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
          {errors.password && (
            <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center">
          <input
            id="remember-me"
            type="checkbox"
            {...register('rememberMe')}
            className="w-4 h-4 text-brand-600 border-neutral-300 rounded focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-800"
          />
          <label
            htmlFor="remember-me"
            className="ml-2 block text-xs text-neutral-600 dark:text-neutral-400"
          >
            Remember me on this device
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 rounded-xl font-medium text-sm text-white bg-brand-600 hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <span>Sign In</span>
          )}
        </button>
      </form>
    </div>
  );
};
