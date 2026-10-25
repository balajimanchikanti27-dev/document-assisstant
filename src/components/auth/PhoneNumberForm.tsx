import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Phone, Loader2, AlertCircle } from 'lucide-react';
import { phoneSchema, PhoneFormData } from '../../utils/validators';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface PhoneNumberFormProps {
  onOtpSent: (formattedPhone: string) => void;
  onBackToMethods?: () => void;
}

const COUNTRY_CODES = [
  { code: '+91', label: 'India (+91)' },
  { code: '+1', label: 'USA / Canada (+1)' },
  { code: '+44', label: 'UK (+44)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+49', label: 'Germany (+49)' },
  { code: '+33', label: 'France (+33)' },
  { code: '+81', label: 'Japan (+81)' },
  { code: '+65', label: 'Singapore (+65)' },
  { code: '+971', label: 'UAE (+971)' },
];

export const PhoneNumberForm: React.FC<PhoneNumberFormProps> = ({
  onOtpSent,
  onBackToMethods,
}) => {
  const { initiatePhoneVerification, setupRecaptcha, isFirebaseConfigured, enableDemoUser } = useAuth();
  const { showToast } = useToast();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      countryCode: '+91',
      phoneNumber: '',
    },
  });

  const onSubmit = async (data: PhoneFormData) => {
    setErrorMessage(null);

    if (!isFirebaseConfigured) {
      setErrorMessage(
        'Firebase Phone Authentication requires active credentials in .env and Phone Auth enabled in your Firebase console.'
      );
      showToast('Firebase credentials required for live SMS OTP', 'warning');
      return;
    }

    try {
      const fullPhone = `${data.countryCode}${data.phoneNumber.replace(/\s+/g, '')}`;
      // Initialize reCAPTCHA on the recaptcha container
      const verifier = setupRecaptcha('recaptcha-container');
      await initiatePhoneVerification(fullPhone, verifier);

      showToast(`Verification code sent to ${data.countryCode} ${data.phoneNumber}`, 'success');
      onOtpSent(fullPhone);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send verification code. Please check the phone number.');
    }
  };

  return (
    <div className="w-full">
      {!isFirebaseConfigured && (
        <div className="mb-5 p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Live SMS Requires Firebase Phone Provider</p>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed mb-2">
                Real SMS OTPs are delivered via Firebase Phone Authentication & Google reCAPTCHA. You can preview the application shell directly:
              </p>
              <button
                type="button"
                onClick={() => enableDemoUser()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 font-medium text-xs rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors"
              >
                Access via Demo Mode
              </button>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mb-4 p-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Phone number
          </label>
          <div className="flex gap-2">
            <select
              {...register('countryCode')}
              aria-label="Country code"
              className="w-36 py-2 px-2.5 text-xs sm:text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
            >
              {COUNTRY_CODES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>

            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                placeholder="98765 43210"
                autoComplete="tel-national"
                {...register('phoneNumber')}
                className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                  errors.phoneNumber
                    ? 'border-red-300 dark:border-red-700'
                    : 'border-neutral-300 dark:border-neutral-700'
                }`}
              />
            </div>
          </div>
          {errors.phoneNumber && (
            <p className="mt-1 text-xs text-red-500">{errors.phoneNumber.message}</p>
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
              <span>Sending code via SMS...</span>
            </>
          ) : (
            <span>Send Verification Code</span>
          )}
        </button>

        {onBackToMethods && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onBackToMethods}
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium"
            >
              ← Back to all sign-in options
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
