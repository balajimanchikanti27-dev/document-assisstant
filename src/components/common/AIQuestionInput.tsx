import React, { useRef, useEffect, useState, KeyboardEvent } from 'react';
import { ArrowUp, Paperclip, Square, Loader2, Image as ImageIcon, X, AlertCircle } from 'lucide-react';
import { AttachedImage } from '../../types';

interface AIQuestionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  onAttach?: () => void;
  placeholder?: string;
  isLoading?: boolean;
  disabled?: boolean;
  maxLength?: number;
  showCharCount?: boolean;
  autoFocus?: boolean;
  className?: string;
  // Multimodal image upload props
  allowImageUpload?: boolean;
  attachedImage?: AttachedImage | null;
  onImageSelect?: (image: AttachedImage) => void;
  onImageRemove?: () => void;
  onImageError?: (errorMessage: string) => void;
}

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export const AIQuestionInput: React.FC<AIQuestionInputProps> = ({
  value,
  onChange,
  onSubmit,
  onStop,
  onAttach,
  placeholder = 'Ask anything or explore your documents...',
  isLoading = false,
  disabled = false,
  maxLength = 4000,
  showCharCount = false,
  autoFocus = false,
  className = '',
  allowImageUpload = false,
  attachedImage = null,
  onImageSelect,
  onImageRemove,
  onImageError,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [localImageError, setLocalImageError] = useState<string | null>(null);

  // Auto-resize textarea up to max height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 44), 160)}px`;
    }
  }, [value]);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleFileSelection = (file: File) => {
    setLocalImageError(null);

    // Validate extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const isExtensionValid = ALLOWED_EXTENSIONS.includes(ext);
    const isMimeValid = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());

    if (!isExtensionValid && !isMimeValid) {
      const err = 'Unsupported image format. Please select a JPEG, PNG, or WEBP image.';
      setLocalImageError(err);
      if (onImageError) onImageError(err);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate size
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      const err = `Image exceeds maximum allowed size of 10MB (${sizeMb}MB).`;
      setLocalImageError(err);
      if (onImageError) onImageError(err);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsProcessingImage(true);
    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = reader.result as string;
      const cleanBase64 = dataUrl.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

      const img = new Image();
      img.onload = () => {
        setIsProcessingImage(false);
        if (onImageSelect) {
          onImageSelect({
            dataUrl,
            base64: cleanBase64,
            mimeType: file.type || 'image/jpeg',
            filename: file.name,
            size: file.size,
            width: img.width,
            height: img.height,
          });
        }
      };
      img.onerror = () => {
        setIsProcessingImage(false);
        if (onImageSelect) {
          onImageSelect({
            dataUrl,
            base64: cleanBase64,
            mimeType: file.type || 'image/jpeg',
            filename: file.name,
            size: file.size,
          });
        }
      };
      img.src = dataUrl;
    };

    reader.onerror = () => {
      setIsProcessingImage(false);
      const err = 'Failed to read the selected image file.';
      setLocalImageError(err);
      if (onImageError) onImageError(err);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsDataURL(file);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((value.trim() || attachedImage) && !disabled && !isLoading && !isProcessingImage) {
        onSubmit();
      }
    }
  };

  const isSubmitDisabled =
    (!value.trim() && !attachedImage) || disabled || isLoading || isProcessingImage;

  return (
    <div
      className={`relative rounded-2xl border border-neutral-300 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 shadow-sm transition-all focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 ${className}`}
    >
      <div className="p-3">
        {/* Error notification for oversized / unsupported image */}
        {localImageError && (
          <div className="mb-2 p-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center justify-between text-xs text-red-700 dark:text-red-300 animate-fadeIn">
            <div className="flex items-center gap-1.5 min-w-0 pr-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{localImageError}</span>
            </div>
            <button
              type="button"
              onClick={() => setLocalImageError(null)}
              className="p-1 hover:text-red-900 dark:hover:text-red-100 rounded-md transition-colors"
              title="Dismiss error"
              aria-label="Dismiss error"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Selected image preview thumbnail with removal button */}
        {attachedImage && (
          <div className="mb-2.5 p-2 rounded-xl bg-neutral-100/90 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-700 shrink-0 border border-neutral-300/80 dark:border-neutral-600">
                <img
                  src={attachedImage.dataUrl}
                  alt={attachedImage.filename}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate max-w-[200px] sm:max-w-xs">
                  {attachedImage.filename}
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  {attachedImage.mimeType.split('/')[1]?.toUpperCase() || 'IMAGE'} • {(attachedImage.size / 1024).toFixed(1)} KB
                  {attachedImage.width && attachedImage.height ? ` • ${attachedImage.width}×${attachedImage.height}px` : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setLocalImageError(null);
                if (onImageRemove) onImageRemove();
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              disabled={disabled || isLoading}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              title="Remove attached image"
              aria-label="Remove attached image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            attachedImage
              ? 'Ask a question about this image, or press Enter to analyze...'
              : placeholder
          }
          disabled={disabled || isLoading}
          maxLength={maxLength}
          rows={1}
          aria-label="Ask a question"
          className="w-full resize-none bg-transparent text-sm sm:text-base text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none min-h-[44px] max-h-[160px] leading-relaxed"
        />

        <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800/80 mt-1">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {onAttach && (
              <button
                type="button"
                onClick={onAttach}
                disabled={disabled || isLoading}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-40"
                title="Attach documents"
                aria-label="Attach documents"
              >
                <Paperclip className="w-4 h-4" />
              </button>
            )}

            {allowImageUpload && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelection(file);
                  }}
                  disabled={disabled || isLoading || isProcessingImage}
                  aria-label="Upload image"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || isLoading || isProcessingImage}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-40"
                  title="Attach image (JPEG, PNG, WEBP up to 10MB)"
                  aria-label="Attach image"
                >
                  {isProcessingImage ? (
                    <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                  ) : (
                    <ImageIcon className="w-4 h-4" />
                  )}
                </button>
              </>
            )}

            {showCharCount && (
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-mono">
                {value.length}/{maxLength}
              </span>
            )}
            <span className="hidden sm:inline text-[11px] text-neutral-400 dark:text-neutral-500">
              Shift + Enter for new line
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isLoading ? (
              <button
                type="button"
                onClick={onStop}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 transition-colors shadow-sm"
                title="Stop generation"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onSubmit}
                disabled={isSubmitDisabled}
                className="p-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1"
                aria-label="Send message"
                title="Send message (Enter)"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
