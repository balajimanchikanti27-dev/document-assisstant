import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Globe,
  Upload,
  MessageSquare,
  ArrowRight,
  Sparkles,
  Clock,
  FolderOpen,
  MoreVertical,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AIQuestionInput } from '../components/common/AIQuestionInput';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { getChatSessions, deleteChatSession, updateChatSessionTitle } from '../services/chatService';
import { getDocuments } from '../services/documentService';
import { ChatSession, UserDocument, AssistantMode } from '../types';
import { formatRelativeTime, formatBytes } from '../utils/formatters';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [question, setQuestion] = useState('');
  const [selectedMode, setSelectedMode] = useState<AssistantMode>('document');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // Rename session state
  const [editingSession, setEditingSession] = useState<ChatSession | null>(null);
  const [newTitle, setNewTitle] = useState('');

  // Delete session state
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [loadedSessions, loadedDocs] = await Promise.all([
          getChatSessions(user.uid),
          getDocuments(user.uid),
        ]);
        setSessions(loadedSessions);
        setDocuments(loadedDocs);
      } catch (e) {
        console.error('Error loading dashboard data:', e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.uid]);

  const handleStartPrompt = () => {
    if (!question.trim()) return;

    if (selectedMode === 'research') {
      navigate('/app/research', { state: { initialQuestion: question.trim() } });
    } else {
      navigate('/app/chat/new', { state: { initialQuestion: question.trim(), mode: 'document' } });
    }
  };

  const handleConfirmDeleteSession = async () => {
    if (!user || !deletingSessionId) return;
    try {
      await deleteChatSession(user.uid, deletingSessionId);
      setSessions((prev) => prev.filter((s) => s.id !== deletingSessionId));
      showToast('Conversation deleted', 'info');
    } catch {
      showToast('Failed to delete chat session', 'error');
    } finally {
      setDeletingSessionId(null);
    }
  };

  const handleSaveRename = async () => {
    if (!user || !editingSession || !newTitle.trim()) return;
    try {
      await updateChatSessionTitle(user.uid, editingSession.id, newTitle.trim());
      setSessions((prev) =>
        prev.map((s) => (s.id === editingSession.id ? { ...s, title: newTitle.trim() } : s))
      );
      showToast('Conversation renamed', 'success');
      setEditingSession(null);
    } catch {
      showToast('Failed to rename conversation', 'error');
    }
  };

  const firstName = user?.displayName ? user.displayName.split(' ')[0] : 'there';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Welcome Banner */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">
          Hello, {firstName}
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          What would you like to explore today?
        </p>
      </div>

      {/* Large AI Question Input */}
      <div className="bg-white dark:bg-neutral-900 p-4 sm:p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
        {/* Mode switcher tabs */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedMode('document')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedMode === 'document'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Ask My Documents</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMode('research')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedMode === 'research'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>AI Web Research</span>
          </button>
        </div>

        <AIQuestionInput
          value={question}
          onChange={setQuestion}
          onSubmit={handleStartPrompt}
          placeholder={
            selectedMode === 'document'
              ? 'Ask anything grounded in your uploaded documents...'
              : 'Search Wikipedia and the web for any topic or fact...'
          }
          className="border-neutral-200 dark:border-neutral-800"
        />
      </div>

      {/* Three Prominent Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Ask My Documents */}
        <div
          onClick={() => navigate('/app/chat/new?mode=document')}
          className="group cursor-pointer p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-brand-500 hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                Ask My Documents
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                Document Only
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-4">
              Upload PDF, Word, and PowerPoint files. Ask questions and get responses verified with exact page and slide numbers.
            </p>
          </div>

          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs font-semibold text-brand-600 dark:text-brand-400 group-hover:translate-x-0.5 transition-transform">
            <span>Open Document Assistant</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* Card 2: Smart Study Coach */}
        <div
          onClick={() => navigate('/app/coach')}
          className="group cursor-pointer p-6 rounded-3xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-b from-indigo-50/40 to-white dark:from-indigo-950/20 dark:to-neutral-900 hover:border-indigo-500 hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 flex items-center justify-center mb-4 shadow-sm">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                Smart Study Coach
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 uppercase tracking-wide">
                Exam Prep
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-4">
              Topic-by-topic simple explanations, 15-question practice exams, verified mistake breakdowns, and exam cram cheat sheets.
            </p>
          </div>

          <div className="pt-4 border-t border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">
            <span>Open Study Coach</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* Card 3: AI Web Research */}
        <div
          onClick={() => navigate('/app/research')}
          className="group cursor-pointer p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-brand-500 hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center mb-4">
              <Globe className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                AI Web Research
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 uppercase tracking-wide">
                Web & Wikipedia
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-4">
              Synthesize insights from Wikipedia and trusted web articles with transparent citations, domain sources, and customizable depth.
            </p>
          </div>

          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs font-semibold text-brand-600 dark:text-brand-400 group-hover:translate-x-0.5 transition-transform">
            <span>Start Web Research</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Grid of Recent Activity: Conversations & Uploads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Conversations Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-brand-500" />
              <span>Recent Conversations</span>
            </h2>
            <button
              type="button"
              onClick={() => navigate('/app/history')}
              className="text-xs text-brand-600 dark:text-brand-400 font-medium hover:underline"
            >
              View all
            </button>
          </div>

          {sessions.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 text-center">
              <MessageSquare className="w-8 h-8 text-neutral-300 dark:text-neutral-700 mx-auto mb-2" />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                No conversations yet. Choose a mode above to start your first chat!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.slice(0, 4).map((chat) => (
                <div
                  key={chat.id}
                  className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors flex items-center justify-between gap-3"
                >
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => navigate(`/app/chat/${chat.id}`)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        {chat.title}
                      </span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.2 rounded-full ${
                          chat.mode === 'document'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                            : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                        }`}
                      >
                        {chat.mode === 'document' ? 'Document' : 'Research'}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>{formatRelativeTime(chat.updatedAt)}</span>
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSession(chat);
                        setNewTitle(chat.title);
                      }}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      title="Rename"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingSessionId(chat.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recently Uploaded Documents Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-brand-500" />
              <span>Recent Documents</span>
            </h2>
            <button
              type="button"
              onClick={() => navigate('/app/documents')}
              className="text-xs text-brand-600 dark:text-brand-400 font-medium hover:underline"
            >
              Manage ({documents.length})
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 text-center">
              <FolderOpen className="w-8 h-8 text-neutral-300 dark:text-neutral-700 mx-auto mb-2" />
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                No documents uploaded yet. Upload a PDF or Word file to chat.
              </p>
              <button
                type="button"
                onClick={() => navigate('/app/documents')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Documents</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.slice(0, 4).map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => navigate('/app/documents')}
                  className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center shrink-0 font-mono text-[10px] font-bold uppercase">
                      {doc.extension.replace('.', '')}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        {doc.name}
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        {formatBytes(doc.size)} • {formatRelativeTime(doc.uploadedAt)}
                      </p>
                    </div>
                  </div>

                  <div>
                    {doc.status === 'ready' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Ready
                      </span>
                    )}
                    {doc.status === 'processing' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                        <Loader2 className="w-3 h-3 animate-spin" /> Indexing
                      </span>
                    )}
                    {doc.status === 'error' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full">
                        <AlertCircle className="w-3 h-3" /> Failed
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Chat Session Dialog */}
      <ConfirmationDialog
        isOpen={Boolean(deletingSessionId)}
        title="Delete Conversation"
        message="Are you sure you want to delete this chat session? This cannot be undone."
        confirmLabel="Delete"
        isDestructive={true}
        onConfirm={handleConfirmDeleteSession}
        onCancel={() => setDeletingSessionId(null)}
      />

      {/* Rename Chat Modal */}
      {editingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-xl">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
              Rename Conversation
            </h3>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-brand-500 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setEditingSession(null)}
                className="px-3 py-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRename}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
