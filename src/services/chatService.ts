import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, auth } from './firebase';
import { ChatSession, ChatMessage, AssistantMode } from '../types';

import { API_BASE_URL } from './apiConfig';

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

export const getChatSessions = async (
  userId: string,
  modeFilter?: AssistantMode
): Promise<ChatSession[]> => {
  // 1. Try local storage first for instant responsiveness
  let localSessions: ChatSession[] = [];
  try {
    const stored = localStorage.getItem(`ai_chats_${userId}`);
    if (stored) {
      localSessions = JSON.parse(stored);
    }
  } catch (e) {}

  // 2. Try Firestore if configured
  if (isFirebaseConfigured && db) {
    try {
      const q = query(
        collection(db, `users/${userId}/chats`),
        orderBy('updatedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const sessions = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ChatSession[];

      if (sessions.length > 0) {
        // Cache to localStorage
        try {
          localStorage.setItem(`ai_chats_${userId}`, JSON.stringify(sessions));
        } catch (e) {}
        return modeFilter ? sessions.filter((s) => s.mode === modeFilter) : sessions;
      }
    } catch (error) {
      console.warn('Firestore fetch chat sessions error (using local / server cache):', error);
    }
  }

  // 3. Try backend API
  try {
    const headers = await getAuthHeaders(userId);
    const url = modeFilter
      ? `${API_BASE_URL}/api/chats?mode=${modeFilter}`
      : `${API_BASE_URL}/api/chats`;
    const res = await fetch(url, { headers });
    if (res.ok) {
      const data = await res.json();
      const serverChats = (data.data?.chats || data.chats || []) as ChatSession[];
      if (serverChats.length > 0) {
        // Merge with local sessions
        const ids = new Set(serverChats.map((c) => c.id));
        const merged = [...serverChats, ...localSessions.filter((s) => !ids.has(s.id))];
        try {
          localStorage.setItem(`ai_chats_${userId}`, JSON.stringify(merged));
        } catch (e) {}
        return modeFilter ? merged.filter((s) => s.mode === modeFilter) : merged;
      }
    }
  } catch (e) {}

  return modeFilter ? localSessions.filter((s) => s.mode === modeFilter) : localSessions;
};

export const getChatSession = async (
  userId: string,
  sessionId: string
): Promise<ChatSession | null> => {
  // 1. Check local storage
  try {
    const stored = localStorage.getItem(`ai_chats_${userId}`);
    if (stored) {
      const all: ChatSession[] = JSON.parse(stored);
      const found = all.find((s) => s.id === sessionId);
      if (found) return found;
    }
  } catch (e) {}

  // 2. Try Firestore if configured
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, `users/${userId}/chats`, sessionId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as ChatSession;
      }
    } catch (error) {
      console.warn('Firestore getChatSession warning:', error);
    }
  }

  // 3. Try backend
  try {
    const headers = await getAuthHeaders(userId);
    const res = await fetch(`${API_BASE_URL}/api/chats/${sessionId}`, { headers });
    if (res.ok) {
      const data = await res.json();
      const chat = data.data?.chat || data.chat;
      if (chat) return chat as ChatSession;
    }
  } catch (e) {}

  return null;
};

export const createChatSession = async (
  userId: string,
  mode: AssistantMode,
  title: string,
  selectedDocumentIds?: string[]
): Promise<ChatSession> => {
  const sessionId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();

  const session: ChatSession = {
    id: sessionId,
    title,
    mode,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
    selectedDocumentIds: selectedDocumentIds || [],
  };

  // 1. Store in local storage first for resilience
  try {
    const stored = localStorage.getItem(`ai_chats_${userId}`);
    const list: ChatSession[] = stored ? JSON.parse(stored) : [];
    list.unshift(session);
    localStorage.setItem(`ai_chats_${userId}`, JSON.stringify(list));
  } catch (e) {}

  // 2. Sync with backend API
  (async () => {
    try {
      const headers = await getAuthHeaders(userId);
      await fetch(`${API_BASE_URL}/api/chats`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mode,
          title,
          selectedDocumentIds,
        }),
      });
    } catch (e) {}
  })();

  // 3. Attempt Firestore write if configured, but do not throw if rules or offline block it
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, `users/${userId}/chats`, sessionId);
      await setDoc(docRef, session);
    } catch (error) {
      console.warn('Firestore createChatSession notice (session saved locally):', error);
    }
  }

  return session;
};

export const updateChatSessionTitle = async (
  userId: string,
  sessionId: string,
  title: string
): Promise<void> => {
  // Update local storage
  try {
    const stored = localStorage.getItem(`ai_chats_${userId}`);
    if (stored) {
      const list: ChatSession[] = JSON.parse(stored);
      const idx = list.findIndex((s) => s.id === sessionId);
      if (idx !== -1) {
        list[idx].title = title;
        list[idx].updatedAt = Date.now();
        localStorage.setItem(`ai_chats_${userId}`, JSON.stringify(list));
      }
    }
  } catch (e) {}

  // Sync with backend
  (async () => {
    try {
      const headers = await getAuthHeaders(userId);
      await fetch(`${API_BASE_URL}/api/chats/${sessionId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ title }),
      });
    } catch (e) {}
  })();

  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, `users/${userId}/chats`, sessionId);
      await updateDoc(docRef, { title, updatedAt: Date.now() });
    } catch (error) {
      console.warn('Firestore updateChatSessionTitle warning:', error);
    }
  }
};

export const deleteChatSession = async (
  userId: string,
  sessionId: string
): Promise<void> => {
  // Remove from local storage
  try {
    const stored = localStorage.getItem(`ai_chats_${userId}`);
    if (stored) {
      const list: ChatSession[] = JSON.parse(stored);
      localStorage.setItem(
        `ai_chats_${userId}`,
        JSON.stringify(list.filter((s) => s.id !== sessionId))
      );
    }
    localStorage.removeItem(`ai_messages_${sessionId}`);
  } catch (e) {}

  // Sync with backend
  (async () => {
    try {
      const headers = await getAuthHeaders(userId);
      await fetch(`${API_BASE_URL}/api/chats/${sessionId}`, {
        method: 'DELETE',
        headers,
      });
    } catch (e) {}
  })();

  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, `users/${userId}/chats`, sessionId);
      await deleteDoc(docRef);
    } catch (error) {
      console.warn('Firestore deleteChatSession warning:', error);
    }
  }
};

export const getSessionMessages = async (
  userId: string,
  sessionId: string
): Promise<ChatMessage[]> => {
  // 1. Try local storage first
  let localMsgs: ChatMessage[] = [];
  try {
    const stored = localStorage.getItem(`ai_messages_${sessionId}`);
    if (stored) {
      localMsgs = JSON.parse(stored);
    }
  } catch (e) {}

  // 2. Try Firestore
  if (isFirebaseConfigured && db) {
    try {
      const q = query(
        collection(db, `users/${userId}/chats/${sessionId}/messages`),
        orderBy('timestamp', 'asc')
      );
      const snapshot = await getDocs(q);
      const fsMsgs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ChatMessage[];
      if (fsMsgs.length > 0) {
        try {
          localStorage.setItem(`ai_messages_${sessionId}`, JSON.stringify(fsMsgs));
        } catch (e) {}
        return fsMsgs;
      }
    } catch (error) {
      console.warn('Firestore getSessionMessages warning:', error);
    }
  }

  // 3. Try backend
  try {
    const headers = await getAuthHeaders(userId);
    const res = await fetch(`${API_BASE_URL}/api/chats/${sessionId}/messages`, { headers });
    if (res.ok) {
      const data = await res.json();
      const serverMsgs = (data.data?.messages || data.messages || []) as any[];
      if (serverMsgs.length > 0) {
        const mapped = serverMsgs.map((m) => ({
          id: m.id,
          sessionId: m.chatId,
          sender: m.role,
          text: m.content,
          timestamp: m.createdAt,
          mode: m.mode,
          citations: m.citations,
          isInsufficientEvidence: m.isInsufficientEvidence,
        }));
        try {
          localStorage.setItem(`ai_messages_${sessionId}`, JSON.stringify(mapped));
        } catch (e) {}
        return mapped;
      }
    }
  } catch (e) {}

  return localMsgs;
};

export const saveChatMessage = async (
  userId: string,
  sessionId: string,
  message: ChatMessage
): Promise<void> => {
  // 1. Save in local storage immediately
  try {
    const stored = localStorage.getItem(`ai_messages_${sessionId}`);
    const list: ChatMessage[] = stored ? JSON.parse(stored) : [];
    // Prevent duplicate messages
    const existingIdx = list.findIndex((m) => m.id === message.id);
    if (existingIdx !== -1) {
      list[existingIdx] = message;
    } else {
      list.push(message);
    }
    localStorage.setItem(`ai_messages_${sessionId}`, JSON.stringify(list));

    // Update session last snippet and count
    const storedSessions = localStorage.getItem(`ai_chats_${userId}`);
    if (storedSessions) {
      const sessions: ChatSession[] = JSON.parse(storedSessions);
      const target = sessions.find((s) => s.id === sessionId);
      if (target) {
        target.messageCount = list.length;
        target.lastMessageSnippet = message.text.slice(0, 80);
        target.updatedAt = message.timestamp;
        localStorage.setItem(`ai_chats_${userId}`, JSON.stringify(sessions));
      }
    }
  } catch (e) {}

  // 2. Sync to backend API with persistOnly: true so it doesn't trigger a duplicate AI generation
  (async () => {
    try {
      const headers = await getAuthHeaders(userId);
      await fetch(`${API_BASE_URL}/api/chats/${sessionId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: message.text,
          role: message.sender,
          mode: message.mode,
          citations: message.citations,
          isInsufficientEvidence: message.isInsufficientEvidence,
          persistOnly: true,
        }),
      });
    } catch (e) {}
  })();

  // 3. Attempt Firestore write if configured
  if (isFirebaseConfigured && db) {
    try {
      // Do not store large base64 strings in Firestore to keep documents lightweight
      const firestoreMsg: any = { ...message };
      if (firestoreMsg.image) {
        firestoreMsg.image = {
          mimeType: firestoreMsg.image.mimeType,
          filename: firestoreMsg.image.filename,
          size: firestoreMsg.image.size,
          width: firestoreMsg.image.width,
          height: firestoreMsg.image.height,
          data: '', // Base64 data stripped for Firestore persistence
        };
      }

      const msgRef = doc(db, `users/${userId}/chats/${sessionId}/messages`, message.id);
      await setDoc(msgRef, firestoreMsg);

      const sessionRef = doc(db, `users/${userId}/chats`, sessionId);
      await updateDoc(sessionRef, {
        updatedAt: message.timestamp,
        lastMessageSnippet: message.text ? message.text.slice(0, 80) : '[Image]',
      });
    } catch (error) {
      console.warn('Firestore saveChatMessage warning (saved locally & to backend):', error);
    }
  }
};

export const updateMessageFeedback = async (
  userId: string,
  sessionId: string,
  messageId: string,
  feedback: 'like' | 'dislike' | null
): Promise<void> => {
  // Update local storage
  try {
    const stored = localStorage.getItem(`ai_messages_${sessionId}`);
    if (stored) {
      const list: ChatMessage[] = JSON.parse(stored);
      const target = list.find((m) => m.id === messageId);
      if (target) {
        target.feedback = feedback;
        localStorage.setItem(`ai_messages_${sessionId}`, JSON.stringify(list));
      }
    }
  } catch (e) {}

  // Record on backend feedback API if feedback is given
  if (feedback) {
    try {
      const headers = await getAuthHeaders(userId);
      await fetch(`${API_BASE_URL}/api/feedback`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messageId,
          conversationId: sessionId,
          rating: feedback === 'like' ? 'positive' : 'negative',
          comment: '',
        }),
      });
    } catch (e) {}
  }

  if (isFirebaseConfigured && db) {
    try {
      const msgRef = doc(db, `users/${userId}/chats/${sessionId}/messages`, messageId);
      await updateDoc(msgRef, { feedback });
    } catch (error) {
      console.warn('Firestore updateFeedback warning:', error);
    }
  }
};
