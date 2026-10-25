import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../services/firebase';
import {
  registerWithEmail as apiRegister,
  loginWithEmail as apiLogin,
  loginWithGoogle as apiLoginWithGoogle,
  createRecaptchaVerifier,
  sendPhoneOtp as apiSendOtp,
  verifyPhoneOtp as apiVerifyOtp,
  logoutUser as apiLogout,
  mapFirebaseUserToProfile,
} from '../services/authService';
import { UserProfile, PendingQuestion, AssistantMode } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isFirebaseConfigured: boolean;
  isDemoUser: boolean;
  pendingQuestion: PendingQuestion | null;
  phoneConfirmationResult: ConfirmationResult | null;
  phonePendingNumber: string | null;
  setPendingQuestion: (question: string, mode: AssistantMode) => void;
  clearPendingQuestion: () => void;
  consumePendingQuestion: () => PendingQuestion | null;
  loginWithEmail: (email: string, pass: string) => Promise<UserProfile>;
  registerWithEmail: (name: string, email: string, pass: string) => Promise<UserProfile>;
  loginWithGoogle: () => Promise<UserProfile>;
  setupRecaptcha: (containerId: string) => RecaptchaVerifier;
  initiatePhoneVerification: (phoneNumber: string, verifier: RecaptchaVerifier) => Promise<void>;
  confirmPhoneOtp: (code: string) => Promise<UserProfile>;
  clearPhoneSession: () => void;
  logout: () => Promise<void>;
  enableDemoUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PENDING_QUESTION_KEY = 'ai_assistant_pending_question';
const DEMO_USER_KEY = 'ai_assistant_demo_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoUser, setIsDemoUser] = useState<boolean>(false);
  const [phoneConfirmationResult, setPhoneConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [phonePendingNumber, setPhonePendingNumber] = useState<string | null>(null);

  const [pendingQuestion, setPendingQuestionState] = useState<PendingQuestion | null>(() => {
    try {
      const stored = sessionStorage.getItem(PENDING_QUESTION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Listen to Firebase Auth state if configured
  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
        if (fbUser) {
          const profile = mapFirebaseUserToProfile(fbUser);
          setUser(profile);
          setIsDemoUser(false);
        } else {
          // Check if demo user was active
          const demoStored = sessionStorage.getItem(DEMO_USER_KEY);
          if (demoStored) {
            setUser(JSON.parse(demoStored));
            setIsDemoUser(true);
          } else {
            setUser(null);
            setIsDemoUser(false);
          }
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      // Firebase not configured: check demo session
      const demoStored = sessionStorage.getItem(DEMO_USER_KEY);
      if (demoStored) {
        setUser(JSON.parse(demoStored));
        setIsDemoUser(true);
      } else {
        setUser(null);
        setIsDemoUser(false);
      }
      setLoading(false);
    }
  }, []);

  const setPendingQuestion = useCallback((question: string, mode: AssistantMode) => {
    const item: PendingQuestion = { question, mode };
    setPendingQuestionState(item);
    sessionStorage.setItem(PENDING_QUESTION_KEY, JSON.stringify(item));
  }, []);

  const clearPendingQuestion = useCallback(() => {
    setPendingQuestionState(null);
    sessionStorage.removeItem(PENDING_QUESTION_KEY);
  }, []);

  const consumePendingQuestion = useCallback(() => {
    try {
      const stored = sessionStorage.getItem(PENDING_QUESTION_KEY);
      if (stored) {
        const item: PendingQuestion = JSON.parse(stored);
        sessionStorage.removeItem(PENDING_QUESTION_KEY);
        setPendingQuestionState(null);
        return item;
      }
    } catch {}
    return null;
  }, []);

  const loginWithEmail = async (email: string, pass: string): Promise<UserProfile> => {
    const profile = await apiLogin(email, pass);
    setUser(profile);
    setIsDemoUser(false);
    return profile;
  };

  const registerWithEmail = async (name: string, email: string, pass: string): Promise<UserProfile> => {
    const profile = await apiRegister(name, email, pass);
    setUser(profile);
    setIsDemoUser(false);
    return profile;
  };

  const loginWithGoogle = async (): Promise<UserProfile> => {
    const profile = await apiLoginWithGoogle();
    setUser(profile);
    setIsDemoUser(false);
    return profile;
  };

  const setupRecaptcha = (containerId: string): RecaptchaVerifier => {
    return createRecaptchaVerifier(containerId);
  };

  const initiatePhoneVerification = async (phoneNumber: string, verifier: RecaptchaVerifier): Promise<void> => {
    const confirmation = await apiSendOtp(phoneNumber, verifier);
    setPhoneConfirmationResult(confirmation);
    setPhonePendingNumber(phoneNumber);
  };

  const confirmPhoneOtp = async (code: string): Promise<UserProfile> => {
    if (!phoneConfirmationResult) {
      throw new Error('No active phone verification session found. Please enter your phone number again.');
    }
    const profile = await apiVerifyOtp(phoneConfirmationResult, code);
    setUser(profile);
    setIsDemoUser(false);
    setPhoneConfirmationResult(null);
    setPhonePendingNumber(null);
    return profile;
  };

  const clearPhoneSession = useCallback(() => {
    setPhoneConfirmationResult(null);
    setPhonePendingNumber(null);
  }, []);

  const logout = async (): Promise<void> => {
    if (isDemoUser) {
      sessionStorage.removeItem(DEMO_USER_KEY);
      setUser(null);
      setIsDemoUser(false);
      return;
    }
    await apiLogout();
    setUser(null);
  };

  // Demo guest user mode allows viewing every authenticated route during design verification
  const enableDemoUser = () => {
    const demoProfile: UserProfile = {
      uid: 'demo_user_101',
      displayName: 'Alex Morgan',
      email: 'alex.morgan@example.com',
      phoneNumber: '+91 98765 43210',
      photoURL: null,
      authProvider: 'password',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    sessionStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoProfile));
    setUser(demoProfile);
    setIsDemoUser(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isFirebaseConfigured,
        isDemoUser,
        pendingQuestion,
        phoneConfirmationResult,
        phonePendingNumber,
        setPendingQuestion,
        clearPendingQuestion,
        consumePendingQuestion,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        setupRecaptcha,
        initiatePhoneVerification,
        confirmPhoneOtp,
        clearPhoneSession,
        logout,
        enableDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
