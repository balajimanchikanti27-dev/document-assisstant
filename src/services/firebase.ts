import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAU6xV9bUq8cTah4Iy2iLdx66BLx9UwZKU',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'document-assisstant.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'document-assisstant',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'document-assisstant.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '369567549824',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:369567549824:web:b05cba6bc3272b68889965',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-ZBRMG1J7D9',
};

// Check if credentials are provided and not dummy placeholders
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'your_api_key_here' &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== 'your_project_id'
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (error) {
    console.error('Failed to initialize Firebase application:', error);
  }
}

export { app, auth, db, storage };
export default app;
