import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen,
  Upload,
  MessageSquare,
  Sparkles,
  Layers,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { DocumentUploader } from '../components/documents/DocumentUploader';
import { DocumentList } from '../components/documents/DocumentList';
import { StudySummaryModal } from '../components/documents/StudySummaryModal';
import {
  getDocuments,
  deleteDocument,
  retryDocumentProcessing,
} from '../services/documentService';
import { UserDocument } from '../types';

export const DocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [selectedDocForSummary, setSelectedDocForSummary] = useState<UserDocument | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setDocuments([]);
      setSelectedDocIds([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getDocuments(user.uid)
      .then((docs) => {
        setDocuments(docs);
        const validIds = new Set(docs.map((d) => d.id));
        setSelectedDocIds((prev) => prev.filter((id) => validIds.has(id)));
      })
      .catch((err) => {
        showToast('Failed to load documents', 'error');
      })
      .finally(() => setLoading(false));
  }, [user?.uid]);

  const handleToggleSelect = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleSelectAll = (allIds: string[]) => {
    setSelectedDocIds(allIds);
  };

  const handleClearSelection = () => {
    setSelectedDocIds([]);
  };

  const handleDelete = async (docId: string) => {
    if (!user) return;
    const docToDelete = documents.find((d) => d.id === docId);
    try {
      await deleteDocument(user.uid, docId, docToDelete?.name);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      setSelectedDocIds((prev) => prev.filter((id) => id !== docId));
      showToast('Document deleted successfully', 'info');
    } catch (e: any) {
      showToast(e.message || 'Failed to delete document', 'error');
      throw e;
    }
  };

  const handleRetry = async (docId: string) => {
    if (!user) return;
    try {
      await retryDocumentProcessing(user.uid, docId);
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, status: 'processing', errorMessage: undefined } : d))
      );
      showToast('Indexing re-attempt initiated', 'info');
    } catch (e: any) {
      showToast(e.message || 'Retry failed', 'error');
    }
  };

  const handleStartChatWithSelected = () => {
    if (selectedDocIds.length === 0) {
      showToast('Select at least one ready document to start chatting', 'warning');
      return;
    }
    navigate('/app/chat/new?mode=document');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight flex items-center gap-2.5">
            <FolderOpen className="w-7 h-7 text-brand-600" />
            <span>My Documents</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Upload, manage, and inspect files indexed for your grounded document assistant.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowUploader(!showUploader)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>{showUploader ? 'Hide Uploader' : 'Upload Documents'}</span>
          </button>

          {selectedDocIds.length === 1 && (
            <button
              type="button"
              onClick={() => {
                const doc = documents.find((d) => d.id === selectedDocIds[0]);
                if (doc) setSelectedDocForSummary(doc);
              }}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-300 dark:border-brand-800 hover:bg-brand-100 transition-colors shadow-sm"
            >
              <GraduationCap className="w-4 h-4 text-brand-600" />
              <span>Summarize for Easy Learning</span>
            </button>
          )}

          {selectedDocIds.length > 0 && (
            <button
              type="button"
              onClick={handleStartChatWithSelected}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 transition-colors shadow-sm"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Ask Selected ({selectedDocIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Uploader Panel */}
      {showUploader && (
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm animate-fade-in">
          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-3">
            Add Documents to Your Library
          </h3>
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
            }}
          />
        </div>
      )}

      {/* Document Library List */}
      <DocumentList
        documents={documents}
        selectedDocIds={selectedDocIds}
        onToggleSelect={handleToggleSelect}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onDeleteDocument={handleDelete}
        onRetryDocument={handleRetry}
        onSummarizeDocument={(docId) => {
          const doc = documents.find((d) => d.id === docId);
          if (doc) setSelectedDocForSummary(doc);
        }}
        onUploadClick={() => setShowUploader(true)}
      />

      {/* Study Summary for Easy Learning Modal */}
      <StudySummaryModal
        isOpen={!!selectedDocForSummary}
        onClose={() => setSelectedDocForSummary(null)}
        document={selectedDocForSummary}
        onStartFollowUpChat={(docId, initialQuestion) => {
          setSelectedDocForSummary(null);
          navigate(`/app/chat/new?mode=document`);
        }}
      />
    </div>
  );
};
