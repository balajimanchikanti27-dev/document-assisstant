import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  FileText,
  Upload,
  Plus,
  Layers,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FolderOpen,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ChatWindow } from '../components/chat/ChatWindow';
import { DocumentUploader } from '../components/documents/DocumentUploader';
import { DocumentList } from '../components/documents/DocumentList';
import { StudySummaryModal } from '../components/documents/StudySummaryModal';
import {
  getDocuments,
  deleteDocument,
  retryDocumentProcessing,
} from '../services/documentService';
import {
  getChatSession,
  createChatSession,
  getSessionMessages,
  saveChatMessage,
  updateMessageFeedback,
} from '../services/chatService';
import { queryDocumentAssistant, DOCUMENT_FALLBACK_MESSAGE } from '../services/aiService';
import { UserDocument, ChatMessage, ChatSession } from '../types';

export const DocumentAssistantPage: React.FC = () => {
  const { chatId } = useParams<{ chatId?: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [showDocDrawer, setShowDocDrawer] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocForSummary, setSelectedDocForSummary] = useState<UserDocument | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load documents
  useEffect(() => {
    if (user?.uid) {
      getDocuments(user.uid)
        .then((docs) => {
          setDocuments(docs);
          const validDocIds = new Set(docs.map((d) => d.id));
          const readyIds = docs.filter((d) => d.status === 'ready').map((d) => d.id);
          setSelectedDocIds((prev) => {
            const filtered = prev.filter((id) => validDocIds.has(id));
            return filtered.length > 0 ? filtered : readyIds;
          });
        })
        .catch(() => {});
    } else {
      setDocuments([]);
      setSelectedDocIds([]);
      setMessages([]);
      setCurrentSession(null);
    }
  }, [user?.uid]);

  // Load or initialize chat session
  useEffect(() => {
    if (!user?.uid) return;

    if (chatId && chatId !== 'new') {
      // Don't re-fetch and clear if we're already on this session with active messages
      if (currentSession && currentSession.id === chatId && messages.length > 0) {
        return;
      }

      getChatSession(user.uid, chatId)
        .then((session) => {
          if (session) {
            setCurrentSession(session);
            const sessionDocIds = session.selectedDocumentIds;
            if (sessionDocIds && sessionDocIds.length > 0) {
              setDocuments((currentDocs) => {
                const validIds = new Set(currentDocs.map((d) => d.id));
                const cleaned = sessionDocIds.filter((id) => validIds.has(id));
                setSelectedDocIds(cleaned.length > 0 ? cleaned : currentDocs.filter((d) => d.status === 'ready').map((d) => d.id));
                return currentDocs;
              });
            }
            return getSessionMessages(user.uid, chatId);
          }
          return [];
        })
        .then((msgs) => {
          if (msgs.length > 0) {
            setMessages(msgs);
          }
        })
        .catch(() => {});
    } else {
      // New conversation
      setCurrentSession(null);
      setMessages([]);

      // Check if location state has initial question
      const initialQuestion = (location.state as any)?.initialQuestion;
      if (initialQuestion) {
        handleSendMessage(initialQuestion);
      }
    }
  }, [chatId, user?.uid]);

  const handleToggleSelectDoc = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleSelectAllDocs = (allIds: string[]) => {
    setSelectedDocIds(allIds);
  };

  const handleClearDocSelection = () => {
    setSelectedDocIds([]);
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!user) return;
    try {
      await deleteDocument(user.uid, docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      setSelectedDocIds((prev) => prev.filter((id) => id !== docId));
      showToast('Document deleted', 'info');
    } catch (e: any) {
      showToast(e.message || 'Failed to delete document', 'error');
    }
  };

  const handleRetryDocument = async (docId: string) => {
    if (!user) return;
    try {
      await retryDocumentProcessing(user.uid, docId);
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, status: 'processing', errorMessage: undefined } : d))
      );
      showToast('Document submitted for re-indexing', 'info');
    } catch (e: any) {
      showToast(e.message || 'Retry failed', 'error');
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Check if documents are selected
    if (selectedDocIds.length === 0) {
      showToast('Please select at least one ready document first.', 'warning');
      setShowDocDrawer(true);
      return;
    }

    // Check if any selected document is still processing
    const processingDocs = documents.filter(
      (d) => selectedDocIds.includes(d.id) && d.status === 'processing'
    );
    if (processingDocs.length > 0) {
      showToast(
        `Document "${processingDocs[0].name}" is still processing. Please wait for indexing to finish.`,
        'warning'
      );
      return;
    }

    const trimmedText = text.trim();
    const effectiveUserId = user?.uid || 'guest_user';

    // 1. Immediately render user question in conversation UI
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      sender: 'user',
      text: trimmedText,
      timestamp: Date.now(),
      mode: 'document',
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 2. Safely manage session in background without wiping UI state
    let activeSession = currentSession;
    if (!activeSession) {
      try {
        const title = trimmedText.slice(0, 36) + (trimmedText.length > 36 ? '...' : '');
        activeSession = await createChatSession(effectiveUserId, 'document', title, selectedDocIds);
        setCurrentSession(activeSession);
        window.history.replaceState(null, '', `/app/chat/${activeSession.id}`);
      } catch (e) {
        console.warn('Session setup warning:', e);
      }
    }

    if (activeSession) {
      saveChatMessage(effectiveUserId, activeSession.id, userMessage).catch(() => {});
    }

    // 3. Dispatch Document Query to backend
    try {
      const response = await queryDocumentAssistant(
        {
          question: trimmedText,
          documentIds: selectedDocIds,
          userId: effectiveUserId,
          conversationId: activeSession?.id,
        },
        controller.signal
      );

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_a`,
        sender: 'assistant',
        text: response.answer || DOCUMENT_FALLBACK_MESSAGE,
        timestamp: Date.now(),
        mode: 'document',
        citations: response.citations || [],
        status: response.isInsufficientEvidence ? 'insufficient_evidence' : 'complete',
      };

      setMessages((prev) => [...prev, assistantMessage]);
      if (activeSession) {
        saveChatMessage(effectiveUserId, activeSession.id, assistantMessage).catch(() => {});
      }
    } catch (error: any) {
      const isStopped = Boolean(error.message && error.message.includes('stopped by user'));
      const errMessage: ChatMessage = {
        id: `msg_${Date.now()}_err`,
        sender: 'assistant',
        text: isStopped ? 'Response generation stopped by user.' : '',
        timestamp: Date.now(),
        mode: 'document',
        status: isStopped ? 'complete' : 'error',
        errorMessage: error.message || 'Unable to connect to document assistant backend.',
      };

      setMessages((prev) => [...prev, errMessage]);
      if (activeSession) {
        saveChatMessage(effectiveUserId, activeSession.id, errMessage).catch(() => {});
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleClearConversation = () => {
    setMessages([]);
    showToast('Conversation cleared', 'info');
  };

  const handleFeedback = async (messageId: string, feedback: 'like' | 'dislike') => {
    if (!user || !currentSession) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, feedback } : m))
    );
    await updateMessageFeedback(user.uid, currentSession.id, messageId, feedback);
    showToast('Thank you for your feedback!', 'success');
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col md:flex-row bg-neutral-50 dark:bg-neutral-950 overflow-hidden">
      {/* Side Document Drawer / Sidebar */}
      <div
        className={`fixed md:static inset-y-0 left-0 z-40 w-80 md:w-80 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col transition-transform duration-300 ${
          showDocDrawer ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-600" />
            <h3 className="font-semibold text-xs sm:text-sm text-neutral-900 dark:text-neutral-100">
              Selected Documents ({selectedDocIds.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 text-xs font-medium flex items-center gap-1"
            title="Upload new file"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>
        </div>

        {/* Document Selection Checklist */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {documents.length === 0 ? (
            <div className="p-6 text-center text-xs text-neutral-400">
              <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No documents uploaded yet.</p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="mt-2 text-brand-600 hover:underline font-medium"
              >
                Upload your first file
              </button>
            </div>
          ) : (
            documents.map((doc) => (
              <label
                key={doc.id}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer text-xs ${
                  selectedDocIds.includes(doc.id)
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 text-neutral-900 dark:text-neutral-100 font-medium'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedDocIds.includes(doc.id)}
                  onChange={() => handleToggleSelectDoc(doc.id)}
                  disabled={doc.status !== 'ready'}
                  className="mt-0.5 rounded text-brand-600 focus:ring-brand-500"
                />
                <div className="flex-1 min-w-0">
                  <span className="block truncate font-semibold">{doc.name}</span>
                  <span className="text-[10px] text-neutral-400">
                    {doc.status === 'ready'
                      ? 'Indexed'
                      : doc.status === 'processing'
                      ? 'Indexing...'
                      : 'Not Ready'}
                  </span>
                </div>
                {doc.status === 'ready' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedDocForSummary(doc);
                    }}
                    className="p-1 rounded-lg text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-950/60 transition-colors shrink-0"
                    title="Summarize for Easy Learning"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                  </button>
                )}
              </label>
            ))
          )}
        </div>

        {/* Mobile close button */}
        <div className="p-3 border-t border-neutral-100 dark:border-neutral-800 md:hidden">
          <button
            onClick={() => setShowDocDrawer(false)}
            className="w-full py-2 text-center text-xs font-semibold rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
          >
            Apply Selection
          </button>
        </div>
      </div>

      {/* Backdrop for mobile document drawer */}
      {showDocDrawer && (
        <div
          className="fixed inset-0 bg-neutral-900/60 z-30 md:hidden"
          onClick={() => setShowDocDrawer(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden">
        {/* Toggle bar for mobile / quick selection */}
        <div className="md:hidden p-2.5 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setShowDocDrawer(true)}
            className="inline-flex items-center gap-1.5 font-medium text-brand-600 dark:text-brand-400"
          >
            <Layers className="w-4 h-4" />
            <span>Select Documents ({selectedDocIds.length})</span>
          </button>
        </div>

        <ChatWindow
          messages={messages}
          mode="document"
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
          onStopGeneration={handleStopGeneration}
          onClearConversation={handleClearConversation}
          onFeedback={handleFeedback}
          onRetryLast={() => {
            const lastUserMsg = [...messages].reverse().find((m) => m.sender === 'user');
            if (lastUserMsg) handleSendMessage(lastUserMsg.text);
          }}
          onAttachDocument={() => setShowDocDrawer(true)}
          selectedDocCount={selectedDocIds.length}
        />
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Upload New Documents
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                ✕
              </button>
            </div>

            <DocumentUploader
              onUploadSuccess={(newDoc) => {
                setDocuments((prev) => {
                  const idx = prev.findIndex((d) => d.id === newDoc.id);
                  if (idx !== -1) {
                    const copy = [...prev];
                    copy[idx] = newDoc;
                    return copy;
                  }
                  return [newDoc, ...prev];
                });
                if (newDoc.status === 'ready') {
                  setSelectedDocIds((prev) =>
                    prev.includes(newDoc.id) ? prev : [...prev, newDoc.id]
                  );
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Study Summary for Easy Learning Modal */}
      <StudySummaryModal
        isOpen={!!selectedDocForSummary}
        onClose={() => setSelectedDocForSummary(null)}
        document={selectedDocForSummary}
        onStartFollowUpChat={(docId, initialQuestion) => {
          setSelectedDocForSummary(null);
          if (!selectedDocIds.includes(docId)) {
            setSelectedDocIds((prev) => [...prev, docId]);
          }
          if (initialQuestion) {
            handleSendMessage(initialQuestion);
          }
        }}
      />
    </div>
  );
};
