import React, { useState, useRef, useEffect, ClipboardEvent, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { maskPhoneNumber } from '../../utils/formatters';

interface OTPVerificationFormProps {
  destinationPhone: string;
  onChangePhoneNumber: () => void;
  onSuccess?: () => void;
}

export const OTPVerificationForm: React.FC<OTPVerificationFormProps> = ({
  destinationPhone,
  onChangePhoneNumber,
  onSuccess,
}) => {
  const {
    confirmPhoneOtp,
    initiatePhoneVerification,
    setupRecaptcha,
    clearPhoneSession,
    consumePendingQuestion,
  } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleDigitChange = (index: number, value: string) => {
    const char = value.slice(-1);
    if (!/^\d*$/.test(char)) return; // numbers only

    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    setErrorMessage(null);

    // Auto-advance
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasteData)) {
      const newDigits = pasteData.split('');
      setDigits(newDigits);
      setErrorMessage(null);
      inputRefs.current[5]?.focus();
    }
  };

  const isComplete = digits.every((d) => d !== '');
  const otpCode = digits.join('');

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isComplete) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await confirmPhoneOtp(otpCode);
      showToast('Phone number verified successfully!', 'success');

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
      setErrorMessage(err.message || 'Invalid verification code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;

    setResending(true);
    setErrorMessage(null);
    try {
      const verifier = setupRecaptcha('recaptcha-container');
      await initiatePhoneVerification(destinationPhone, verifier);
      setCountdown(60);
      showToast('New verification code sent via SMS.', 'info');
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend code. Please try again later.');
    } finally {
      setResending(false);
    }
  };

  const handleBack = () => {
    clearPhoneSession();
    onChangePhoneNumber();
  };

  return (
    <div className="w-full">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
          Verify your phone number
        </h2>
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          Enter the 6-digit code sent to{' '}
          <span className="font-mono font-medium text-neutral-900 dark:text-neutral-200">
            {maskPhoneNumber(destinationPhone)}
          </span>
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mb-5 p-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-6">
        {/* Six digit OTP input fields */}
        <div className="flex justify-center items-center gap-2 sm:gap-3" onPaste={handlePaste}>
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => (inputRefs.current[idx] = el)}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              aria-label={`Digit ${idx + 1} of verification code`}
              className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-semibold rounded-xl border bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                digit
                  ? 'border-brand-600 dark:border-brand-500 shadow-sm'
                  : 'border-neutral-300 dark:border-neutral-700'
              }`}
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={!isComplete || loading}
          className="w-full py-2.5 px-4 rounded-xl font-medium text-sm text-white bg-brand-600 hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying code...</span>
            </>
          ) : (
            <span>Verify OTP & Sign In</span>
          )}
        </button>

        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 pt-2 border-t border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1 text-neutral-600 dark:text-neutral-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Change phone number</span>
          </button>

          {countdown > 0 ? (
            <span>Resend code in {countdown}s</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-400 font-medium hover:underline disabled:opacity-50"
            >
              {resending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Resend code</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
