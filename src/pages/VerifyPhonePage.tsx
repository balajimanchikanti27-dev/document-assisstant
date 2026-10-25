import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { PhoneNumberForm } from '../components/auth/PhoneNumberForm';
import { OTPVerificationForm } from '../components/auth/OTPVerificationForm';
import { ThemeToggle } from '../components/common/ThemeToggle';

export const VerifyPhonePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const initialPhone = (location.state as any)?.phoneNumber || '';
  const [phoneNumber, setPhoneNumber] = useState<string>(initialPhone);
  const [isOtpSent, setIsOtpSent] = useState<boolean>(Boolean(initialPhone));

  const handleOtpSent = (formattedPhone: string) => {
    setPhoneNumber(formattedPhone);
    setIsOtpSent(true);
  };

  const handleChangePhoneNumber = () => {
    setIsOtpSent(false);
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
          {!isOtpSent ? (
            <>
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight mb-1">
                  Sign in with phone
                </h1>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                  Enter your phone number to receive a 6-digit verification code.
                </p>
              </div>

              <PhoneNumberForm
                onOtpSent={handleOtpSent}
                onBackToMethods={() => navigate('/login')}
              />
            </>
          ) : (
            <OTPVerificationForm
              destinationPhone={phoneNumber}
              onChangePhoneNumber={handleChangePhoneNumber}
              onSuccess={() => navigate('/app')}
            />
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
