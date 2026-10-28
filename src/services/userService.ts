import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured, auth } from './firebase';
import { UserProfile, UserSettings } from '../types';
import { updateProfile, deleteUser } from 'firebase/auth';

import { API_BASE_URL } from './apiConfig';

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  defaultMode: 'document',
  responseLength: 'balanced',
  sourcePreference: 'both',
  enableSearchHistory: true,
};

async function getAuthHeaders(userId?: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  try {
    const token = await auth?.currentUser?.getIdToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {}
  if (userId) {
    headers['x-user-id'] = userId;
  }
  return headers;
}

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (!isFirebaseConfigured || !db) {
    // Try backend
    try {
      const headers = await getAuthHeaders(uid);
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, { headers });
      if (res.ok) {
        const body = await res.json();
        return body.data?.profile || null;
      }
    } catch {}
    return null;
  }

  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

export const saveUserProfile = async (profile: UserProfile): Promise<void> => {
  // Sync with backend API
  try {
    const headers = await getAuthHeaders(profile.uid);
    await fetch(`${API_BASE_URL}/api/auth/sync-profile`, {
      method: 'POST',
      headers,
      body: JSON.stringify(profile),
    });
  } catch (e) {}

  if (!isFirebaseConfigured || !db) {
    return;
  }

  try {
    const docRef = doc(db, 'users', profile.uid);
    await setDoc(docRef, profile, { merge: true });
  } catch (error) {
    console.error('Error saving user profile to Firestore:', error);
    throw error;
  }
};

export const updateUserProfileData = async (
  uid: string,
  data: { displayName?: string; photoURL?: string }
): Promise<void> => {
  // Sync with backend
  try {
    const headers = await getAuthHeaders(uid);
    await fetch(`${API_BASE_URL}/api/users/me`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });
  } catch (e) {}

  if (!isFirebaseConfigured) {
    return;
  }

  if (auth && auth.currentUser) {
    await updateProfile(auth.currentUser, {
      displayName: data.displayName !== undefined ? data.displayName : auth.currentUser.displayName,
      photoURL: data.photoURL !== undefined ? data.photoURL : auth.currentUser.photoURL,
    });
  }

  if (db) {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  }
};

export const deleteUserAccount = async (): Promise<void> => {
  const currentUser = auth?.currentUser;
  const uid = currentUser?.uid || 'anonymous';

  // 1. Delete user data on backend (documents, vectors, chat sessions)
  try {
    const headers = await getAuthHeaders(uid);
    await fetch(`${API_BASE_URL}/api/users/me`, {
      method: 'DELETE',
      headers,
    });
  } catch (e) {}

  // 2. Clean up Firestore
  if (db && uid !== 'anonymous') {
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (e) {
      console.warn('Could not clean up Firestore profile during account deletion', e);
    }
  }

  // 3. Delete Firebase Auth user if configured
  if (currentUser) {
    await deleteUser(currentUser);
  }
};

export const getUserSettings = (uid: string): UserSettings => {
  try {
    const raw = localStorage.getItem(`ai_settings_${uid}`);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {}
  return DEFAULT_SETTINGS;
};

export const saveUserSettings = (uid: string, settings: UserSettings): void => {
  try {
    localStorage.setItem(`ai_settings_${uid}`, JSON.stringify(settings));
  } catch (e) {}

  // Sync with backend
  (async () => {
    try {
      const headers = await getAuthHeaders(uid);
      await fetch(`${API_BASE_URL}/api/users/me/settings`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(settings),
      });
    } catch (e) {}
  })();
};

export const exportUserData = async (uid: string): Promise<any> => {
  const headers = await getAuthHeaders(uid);
  const res = await fetch(`${API_BASE_URL}/api/users/me/export`, {
    method: 'POST',
    headers,
  });

  if (!res.ok) {
    throw new Error(`Export failed with HTTP ${res.status}`);
  }

  const json = await res.json();
  const data = json.data || json;

  // Trigger browser JSON download
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ai_assistant_export_${uid}_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return data;
};
