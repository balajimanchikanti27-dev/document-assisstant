import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  User as FirebaseUser,
  updateProfile,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase';
import { UserProfile } from '../types';

export class AuthError extends Error {
  code: string;
  constructor(message: string, code: string = 'auth/unknown') {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

export const getAuthErrorMessage = (code: string, rawMessage?: string, providerName?: string): string => {
  switch (code) {
    case 'auth/unconfigured':
      return 'Firebase Authentication is not configured. Please add your credentials in .env file.';
    case 'auth/operation-not-allowed':
      if (rawMessage && (rawMessage.toLowerCase().includes('region') || rawMessage.toLowerCase().includes('sms'))) {
        return 'SMS to this country (+91) is blocked by Firebase SMS Region Policy. In Firebase Console → Authentication → Settings → SMS Region Policy, add India (+91) to the allowlist, OR add your number under "Phone numbers for testing".';
      }
      return `${providerName || 'This sign-in method'} is not enabled in Firebase Console. In your Firebase Console, click Authentication → Sign-in method, and toggle ${providerName || 'it'} to Enable.`;
    case 'auth/invalid-app-credential':
      return 'Verification blocked by Firebase. Please ensure the provider is enabled in Firebase Console and localhost is an authorized domain.';
    case 'auth/invalid-phone-number':
      return 'Invalid phone number. Please enter a valid number with country code.';
    case 'auth/missing-phone-number':
      return 'Please enter a phone number.';
    case 'auth/network-request-failed':
      return 'Network request failed. Please check your internet connection or Firebase project status.';
    case 'auth/invalid-email':
      return 'The email address is invalid.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please verify your credentials.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 8 characters.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completing.';
    case 'auth/cancelled-popup-request':
      return 'Another popup was already opened. Please try again.';
    case 'auth/invalid-verification-code':
      return 'The six-digit verification code is invalid. Please try again.';
    case 'auth/code-expired':
      return 'The verification code has expired. Please request a new code.';
    case 'auth/quota-exceeded':
      return 'SMS quota exceeded for this Firebase project. You can add test phone numbers in Firebase Console for free local testing.';
    case 'auth/too-many-requests':
      return 'Too many requests. Please wait a moment before trying again.';
    case 'auth/captcha-check-failed':
      return 'reCAPTCHA verification failed. Please refresh the page and try again.';
    default:
      if (rawMessage && !rawMessage.includes('FirebaseError:')) {
        return rawMessage;
      }
      return code ? `Authentication failed (${code}). Please check your settings.` : 'Authentication failed. Please check your network and try again.';
  }
};

export const registerWithEmail = async (name: string, email: string, password: string): Promise<UserProfile> => {
  if (!isFirebaseConfigured || !auth) {
    throw new AuthError(
      'Firebase is not configured. Please supply your Firebase credentials in .env to connect live authentication.',
      'auth/unconfigured'
    );
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName: name });

    return {
      uid: user.uid,
      email: user.email,
      displayName: name,
      phoneNumber: user.phoneNumber,
      photoURL: user.photoURL,
      authProvider: 'password',
      createdAt: user.metadata.creationTime || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('Firebase registerWithEmail error:', error);
    throw new AuthError(getAuthErrorMessage(error.code, error.message, 'Email/Password'), error.code);
  }
};

export const loginWithEmail = async (email: string, password: string): Promise<UserProfile> => {
  if (!isFirebaseConfigured || !auth) {
    throw new AuthError(
      'Firebase is not configured. Please supply your Firebase credentials in .env to connect live authentication.',
      'auth/unconfigured'
    );
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      phoneNumber: user.phoneNumber,
      photoURL: user.photoURL,
      authProvider: 'password',
      createdAt: user.metadata.creationTime || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('Firebase loginWithEmail error:', error);
    throw new AuthError(getAuthErrorMessage(error.code, error.message, 'Email/Password'), error.code);
  }
};

export const loginWithGoogle = async (): Promise<UserProfile> => {
  if (!isFirebaseConfigured || !auth) {
    throw new AuthError(
      'Firebase is not configured. Please supply your Firebase credentials in .env to connect live Google authentication.',
      'auth/unconfigured'
    );
  }

  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      phoneNumber: user.phoneNumber,
      photoURL: user.photoURL,
      authProvider: 'google',
      createdAt: user.metadata.creationTime || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('Firebase loginWithGoogle error:', error);
    throw new AuthError(getAuthErrorMessage(error.code, error.message, 'Google Sign-In'), error.code);
  }
};

export const createRecaptchaVerifier = (containerId: string = 'recaptcha-container'): RecaptchaVerifier => {
  if (!isFirebaseConfigured || !auth) {
    throw new AuthError('Firebase is not configured for reCAPTCHA.', 'auth/unconfigured');
  }

  // Clear existing reCAPTCHA instance if any
  if ((window as any).recaptchaVerifier) {
    try {
      (window as any).recaptchaVerifier.clear();
    } catch (e) {}
    (window as any).recaptchaVerifier = null;
  }

  // Replace container DOM element completely to ensure grecaptcha doesn't complain about already-rendered elements
  let container = document.getElementById(containerId);
  if (container && container.parentNode) {
    const parent = container.parentNode;
    parent.removeChild(container);
    container = document.createElement('div');
    container.id = containerId;
    parent.appendChild(container);
  } else if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    document.body.appendChild(container);
  }

  const verifier = new RecaptchaVerifier(auth, container, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved
    },
    'expired-callback': () => {
      console.warn('reCAPTCHA expired.');
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch (e) {}
        (window as any).recaptchaVerifier = null;
      }
    },
  });

  (window as any).recaptchaVerifier = verifier;
  return verifier;
};

export const sendPhoneOtp = async (
  phoneNumber: string,
  verifier: RecaptchaVerifier
): Promise<ConfirmationResult> => {
  if (!isFirebaseConfigured || !auth) {
    throw new AuthError(
      'Firebase is not configured. Please supply your Firebase credentials in .env to send phone OTPs.',
      'auth/unconfigured'
    );
  }

  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
    return confirmationResult;
  } catch (error: any) {
    console.error('Firebase signInWithPhoneNumber error:', error);
    // Clear verifier on failure so next attempt gets a fresh verifier
    if ((window as any).recaptchaVerifier) {
      try {
        (window as any).recaptchaVerifier.clear();
      } catch (e) {}
      (window as any).recaptchaVerifier = null;
    }
    throw new AuthError(getAuthErrorMessage(error.code, error.message, 'Phone Authentication'), error.code);
  }
};

export const verifyPhoneOtp = async (
  confirmationResult: ConfirmationResult,
  otpCode: string
): Promise<UserProfile> => {
  try {
    const userCredential = await confirmationResult.confirm(otpCode);
    const user = userCredential.user;

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || 'Phone User',
      phoneNumber: user.phoneNumber,
      photoURL: user.photoURL,
      authProvider: 'phone',
      createdAt: user.metadata.creationTime || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    throw new AuthError(getAuthErrorMessage(error.code), error.code);
  }
};

export const requestPasswordReset = async (email: string): Promise<void> => {
  if (!isFirebaseConfigured || !auth) {
    throw new AuthError(
      'Firebase is not configured. Please supply your Firebase credentials in .env to send reset emails.',
      'auth/unconfigured'
    );
  }

  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    throw new AuthError(getAuthErrorMessage(error.code), error.code);
  }
};

export const logoutUser = async (): Promise<void> => {
  if (!isFirebaseConfigured || !auth) {
    return;
  }

  try {
    await fbSignOut(auth);
  } catch (error: any) {
    throw new AuthError(getAuthErrorMessage(error.code), error.code);
  }
};

export const mapFirebaseUserToProfile = (user: FirebaseUser): UserProfile => {
  const isGoogle = user.providerData.some((p) => p.providerId === 'google.com');
  const isPhone = user.providerData.some((p) => p.providerId === 'phone');

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    phoneNumber: user.phoneNumber,
    photoURL: user.photoURL,
    authProvider: isGoogle ? 'google' : isPhone ? 'phone' : 'password',
    createdAt: user.metadata.creationTime || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};
