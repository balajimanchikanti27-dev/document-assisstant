import React, { useState } from 'react';
import {
  FileText,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  RotateCcw,
  ExternalLink,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserDocument } from '../../types';
import { formatBytes, formatRelativeTime } from '../../utils/formatters';
import { ConfirmationDialog } from '../common/ConfirmationDialog';

interface DocumentCardProps {
  document: UserDocument;
  isSelected?: boolean;
  onToggleSelect?: (docId: string) => void;
  onDelete: (docId: string) => Promise<void>;
  onRetry?: (docId: string) => Promise<void>;
  onSummarize?: (docId: string) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document: doc,
  isSelected = false,
  onToggleSelect,
  onDelete,
  onRetry,
  onSummarize,
}) => {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const getExtensionBadge = (ext: string) => {
    const cleanExt = ext.replace('.', '').toUpperCase();
    let bg = 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300';
    if (cleanExt === 'PDF') bg = 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400';
    if (cleanExt === 'DOC' || cleanExt === 'DOCX')
      bg = 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400';
    if (cleanExt === 'PPT' || cleanExt === 'PPTX')
      bg = 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400';
    return (
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${bg}`}>
        {cleanExt}
      </span>
    );
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(doc.id);
      setShowDeleteDialog(false);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete document. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    if (isDeleting) return;
    setDeleteError(null);
    setShowDeleteDialog(false);
  };

  const handleRetry = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onRetry) return;
    setIsRetrying(true);
    try {
      await onRetry(doc.id);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <>
      <div
        onClick={() => onToggleSelect && doc.status === 'ready' && onToggleSelect(doc.id)}
        className={`group p-4 rounded-2xl border transition-all duration-200 bg-white dark:bg-neutral-900 flex flex-col justify-between ${
          isSelected
            ? 'border-brand-600 dark:border-brand-500 ring-2 ring-brand-500/20 shadow-sm'
            : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 shadow-sm'
        } ${doc.status === 'ready' && onToggleSelect ? 'cursor-pointer' : ''}`}
      >
        <div>
          {/* Header row: Checkbox, Extension Badge, Status */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              {onToggleSelect && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={doc.status !== 'ready'}
                  onChange={() => onToggleSelect(doc.id)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Select ${doc.name}`}
                  className="w-4 h-4 text-brand-600 rounded border-neutral-300 dark:border-neutral-700 focus:ring-brand-500 disabled:opacity-40"
                />
              )}
              {getExtensionBadge(doc.extension)}
            </div>

            {/* Status indicator */}
            <div>
              {doc.status === 'ready' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3 h-3" />
                  Ready
                </span>
              )}
              {doc.status === 'processing' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Indexing...
                </span>
              )}
              {doc.status === 'uploading' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Uploading
                </span>
              )}
              {doc.status === 'error' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-3 h-3" />
                  Failed
                </span>
              )}
            </div>
          </div>

          {/* Document Title */}
          <h4
            className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate mb-1"
            title={doc.name}
          >
            {doc.name}
          </h4>

          {/* Metadata */}
          <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 flex-wrap">
            <span>{formatBytes(doc.size)}</span>
            <span>•</span>
            <span>{formatRelativeTime(doc.uploadedAt)}</span>
            {doc.slideCount ? (
              <>
                <span>•</span>
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  {doc.slideCount} {doc.slideCount === 1 ? 'slide' : 'slides'}
                </span>
              </>
            ) : doc.pageCount ? (
              <>
                <span>•</span>
                <span className="font-medium text-neutral-600 dark:text-neutral-300">
                  {doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'}
                </span>
              </>
            ) : null}
          </p>

          {/* Failure message if any */}
          {doc.status === 'error' && doc.errorMessage && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20 p-2 rounded-lg leading-relaxed">
              {doc.errorMessage}
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-neutral-100 dark:border-neutral-800/80">
          <div className="flex items-center gap-1.5">
            {doc.status === 'error' && onRetry && (
              <button
                type="button"
                onClick={handleRetry}
                disabled={isRetrying}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                title="Retry indexing"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                <span>Retry</span>
              </button>
            )}

            {doc.downloadUrl && (
              <a
                href={doc.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                title="Download original file"
                aria-label="Download document"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {doc.status === 'ready' && onSummarize && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSummarize(doc.id);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 dark:text-indigo-300 transition-colors border border-indigo-200/60 dark:border-indigo-800/60"
                title="Summarize for Easy Learning"
              >
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Easy Learning</span>
              </button>
            )}

            {doc.status === 'ready' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/app/coach?docId=${doc.id}`);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-300 transition-colors border border-emerald-200/60 dark:border-emerald-800/60 shadow-xs"
                title="Open in Smart Study Coach"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Study Coach</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteDialog(true);
            }}
            className="p-1.5 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Delete document"
            aria-label={`Delete ${doc.name}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={showDeleteDialog}
        title="Delete Document"
        message={`Are you sure you want to delete "${doc.name}"? This file and its indexed vectors will be removed.`}
        confirmLabel="Delete"
        loadingLabel="Deleting…"
        isDestructive={true}
        isLoading={isDeleting}
        error={deleteError}
        onConfirm={handleDelete}
        onCancel={handleCancelDelete}
        onRetry={handleDelete}
      />
    </>
  );
};
