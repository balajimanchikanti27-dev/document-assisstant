import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History,
  Search,
  Filter,
  MessageSquare,
  FileText,
  Globe,
  Trash2,
  Edit2,
  ArrowRight,
  Clock,
  Plus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { EmptyState } from '../components/common/EmptyState';
import {
  getChatSessions,
  deleteChatSession,
  updateChatSessionTitle,
} from '../services/chatService';
import { ChatSession, AssistantMode } from '../types';
import { formatRelativeTime } from '../utils/formatters';

export const ChatHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | AssistantMode>('all');

  // Rename session
  const [renamingSession, setRenamingSession] = useState<ChatSession | null>(null);
  const [newTitle, setNewTitle] = useState('');

  // Delete session
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    getChatSessions(user.uid)
      .then((data) => setSessions(data))
      .catch((err) => showToast('Failed to load chat history', 'error'))
      .finally(() => setLoading(false));
  }, [user?.uid]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMode = modeFilter === 'all' || s.mode === modeFilter;
      return matchesSearch && matchesMode;
    });
  }, [sessions, searchQuery, modeFilter]);

  const handleConfirmDelete = async () => {
    if (!user || !deletingId) return;
    try {
      await deleteChatSession(user.uid, deletingId);
      setSessions((prev) => prev.filter((s) => s.id !== deletingId));
      showToast('Conversation deleted', 'info');
    } catch {
      showToast('Failed to delete chat', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveRename = async () => {
    if (!user || !renamingSession || !newTitle.trim()) return;
    try {
      await updateChatSessionTitle(user.uid, renamingSession.id, newTitle.trim());
      setSessions((prev) =>
        prev.map((s) => (s.id === renamingSession.id ? { ...s, title: newTitle.trim() } : s))
      );
      showToast('Conversation renamed', 'success');
      setRenamingSession(null);
    } catch {
      showToast('Failed to rename chat', 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight flex items-center gap-2.5">
            <History className="w-7 h-7 text-brand-600" />
            <span>Chat History</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Revisit, manage, and continue past conversations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/app/chat/new')}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search conversations by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value as any)}
            className="text-xs py-1.5 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium focus:outline-none"
          >
            <option value="all">All Modes</option>
            <option value="document">Ask My Documents</option>
            <option value="research">AI Web Research</option>
          </select>
        </div>
      </div>

      {/* Conversations List */}
      {filteredSessions.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={searchQuery ? 'No matching conversations' : 'No chat history found'}
          description={
            searchQuery
              ? 'Try modifying your search term or mode filter.'
              : 'You have not started any conversations yet. Launch a new session to begin exploring.'
          }
          actionText="Start New Chat"
          onAction={() => navigate('/app/chat/new')}
        />
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              className="group p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex items-center justify-between gap-4 shadow-sm"
            >
              <div
                className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer"
                onClick={() => navigate(`/app/chat/${session.id}`)}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    session.mode === 'document'
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                      : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                  }`}
                >
                  {session.mode === 'document' ? (
                    <FileText className="w-5 h-5" />
                  ) : (
                    <Globe className="w-5 h-5" />
                  )}
                </div>

                <div className="truncate flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
                      {session.title}
                    </h3>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        session.mode === 'document'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                          : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300'
                      }`}
                    >
                      {session.mode === 'document' ? 'Document Only' : 'Web & Wikipedia'}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-400 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>{formatRelativeTime(session.updatedAt)}</span>
                    {session.lastMessageSnippet && (
                      <>
                        <span>•</span>
                        <span className="truncate italic">"{session.lastMessageSnippet}"</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setRenamingSession(session);
                    setNewTitle(session.title);
                  }}
                  className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  title="Rename conversation"
                  aria-label="Rename conversation"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setDeletingId(session.id)}
                  className="p-2 rounded-xl text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  title="Delete conversation"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/app/chat/${session.id}`)}
                  className="p-2 rounded-xl text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors"
                  title="Open conversation"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={Boolean(deletingId)}
        title="Delete Conversation"
        message="Are you sure you want to delete this chat session? All messages will be permanently removed."
        confirmLabel="Delete"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingId(null)}
      />

      {/* Rename Modal */}
      {renamingSession && (
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
                onClick={() => setRenamingSession(null)}
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
