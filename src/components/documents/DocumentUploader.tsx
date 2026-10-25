import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import {
  Upload,
  FileUp,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  RotateCcw,
  FileText,
  FileCode,
  FileSpreadsheet,
} from 'lucide-react';
import {
  SUPPORTED_FILE_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  validateDocumentFile,
  uploadDocument,
} from '../../services/documentService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { auth } from '../../services/firebase';
import { UserDocument, UploadItemState, UploadStage } from '../../types';

interface DocumentUploaderProps {
  onUploadSuccess: (doc: UserDocument) => void;
  className?: string;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  onUploadSuccess,
  className = '',
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadItemState[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStageBadge = (stage: UploadStage, progress: number) => {
    switch (stage) {
      case 'selected':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500 font-medium">
            Queued
          </span>
        );
      case 'uploading':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-brand-600 dark:text-brand-400 font-medium">
            <Loader2 className="w-3 h-3 animate-spin" />
            Uploading ({progress}%)
          </span>
        );
      case 'saving_metadata':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400 font-medium">
            <Loader2 className="w-3 h-3 animate-spin" />
            Saving metadata...
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            <Loader2 className="w-3 h-3 animate-spin" />
            Extracting text & slides...
          </span>
        );
      case 'indexing':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
            <Loader2 className="w-3 h-3 animate-spin" />
            Generating embeddings...
          </span>
        );
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Ready for questions
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            Failed
          </span>
        );
    }
  };

  const processUploadItem = async (item: UploadItemState) => {
    const effectiveUserId = auth?.currentUser?.uid || user?.uid || 'guest_user';

    try {
      const uploadedDoc = await uploadDocument(
        effectiveUserId,
        item.file,
        (progress, stage, stageMessage) => {
          setUploadQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? { ...q, progress, stage, stageMessage }
                : q
            )
          );
        },
        item.documentId
      );

      setUploadQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? {
                ...q,
                progress: 100,
                stage: 'ready',
                stageMessage: 'Document successfully indexed',
                documentId: uploadedDoc.id,
              }
            : q
        )
      );

      showToast(`"${item.name}" indexed successfully and ready for RAG.`, 'success');
      onUploadSuccess(uploadedDoc);
    } catch (err: any) {
      setUploadQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? {
                ...q,
                stage: 'error',
                errorMessage: err.message || 'Upload or processing failed.',
              }
            : q
        )
      );
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;
    setGeneralError(null);

    const fileList = Array.from(files);
    const newItems: UploadItemState[] = [];

    for (const file of fileList) {
      const valError = validateDocumentFile(file);
      const itemId = `up_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      if (valError) {
        newItems.push({
          id: itemId,
          file,
          name: file.name,
          size: file.size,
          progress: 0,
          stage: 'error',
          errorMessage: valError,
        });
      } else {
        newItems.push({
          id: itemId,
          file,
          name: file.name,
          size: file.size,
          progress: 0,
          stage: 'selected',
          stageMessage: 'Queued for upload',
        });
      }
    }

    setUploadQueue((prev) => [...newItems, ...prev]);

    // Start processing non-error items
    for (const item of newItems) {
      if (item.stage !== 'error') {
        processUploadItem(item);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRetryItem = (item: UploadItemState) => {
    setUploadQueue((prev) =>
      prev.map((q) =>
        q.id === item.id
          ? { ...q, stage: 'selected', progress: 0, errorMessage: undefined }
          : q
      )
    );
    processUploadItem(item);
  };

  const handleRemoveQueueItem = (id: string) => {
    setUploadQueue((prev) => prev.filter((q) => q.id !== id));
  };

  const handleClearCompleted = () => {
    setUploadQueue((prev) => prev.filter((q) => q.stage !== 'ready'));
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/30 ring-4 ring-brand-500/10'
            : 'border-neutral-300 dark:border-neutral-700/80 hover:border-brand-400 bg-white dark:bg-neutral-900/40 hover:bg-neutral-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.md"
          onChange={handleInputChange}
          className="hidden"
          aria-label="Upload documents"
        />

        <div className="flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-3 shadow-sm">
            <Upload className="w-6 h-6" />
          </div>

          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
            Drag and drop multiple files here, or <span className="text-brand-600 dark:text-brand-400 underline">browse</span>
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm">
            Supported formats: PDF, PPT, PPTX, DOC, DOCX, TXT, MD (Up to 100 MB per file)
          </p>
        </div>
      </div>

      {/* Upload queue list with separate stages for each file */}
      {uploadQueue.length > 0 && (
        <div className="mt-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300 px-1">
            <span>Upload Queue ({uploadQueue.length} files)</span>
            {uploadQueue.some((q) => q.stage === 'ready') && (
              <button
                type="button"
                onClick={handleClearCompleted}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 font-normal"
              >
                Clear completed
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {uploadQueue.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition-all text-xs ${
                  item.stage === 'error'
                    ? 'border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20'
                    : item.stage === 'ready'
                    ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20'
                    : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileText className="w-4 h-4 text-brand-600 shrink-0" />
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      {item.name}
                    </span>
                    <span className="text-neutral-400 font-mono text-[10px] shrink-0">
                      ({formatFileSize(item.size)})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {getStageBadge(item.stage, item.progress)}
                    {item.stage === 'error' && (
                      <button
                        type="button"
                        onClick={() => handleRetryItem(item)}
                        className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition-colors"
                        title="Retry upload"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveQueueItem(item.id)}
                      className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                      title="Dismiss"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Status message or error description */}
                {item.stageMessage && item.stage !== 'error' && (
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-1.5 truncate">
                    {item.stageMessage}
                  </p>
                )}

                {item.errorMessage && (
                  <p className="text-[11px] text-red-600 dark:text-red-400 font-medium mb-1.5">
                    {item.errorMessage}
                  </p>
                )}

                {/* Progress bar during uploading/processing */}
                {item.stage !== 'ready' && item.stage !== 'error' && (
                  <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-200 ${
                        item.stage === 'uploading'
                          ? 'bg-brand-600'
                          : 'bg-amber-500 animate-pulse'
                      }`}
                      style={{ width: `${Math.max(item.progress, 5)}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* General error alert */}
      {generalError && (
        <div
          role="alert"
          className="mt-3 p-3 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">Upload Notice</span>
            <span>{generalError}</span>
          </div>
          <button
            onClick={() => setGeneralError(null)}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
