import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, ThumbsUp, ThumbsDown, RotateCcw, AlertTriangle } from 'lucide-react';
import { SourceCitation as SourceCitationType, AssistantMode } from '../../types';
import { SourceList } from './SourceList';
import { useToast } from '../../context/ToastContext';
import { DOCUMENT_FALLBACK_MESSAGE } from '../../services/aiService';

interface AnswerRendererProps {
  content: string;
  citations?: SourceCitationType[];
  mode?: AssistantMode;
  onRetry?: () => void;
  onFeedback?: (type: 'like' | 'dislike') => void;
  feedback?: 'like' | 'dislike' | null;
  isStreaming?: boolean;
}

export const AnswerRenderer: React.FC<AnswerRendererProps> = ({
  content,
  citations = [],
  mode = 'document',
  onRetry,
  onFeedback,
  feedback,
  isStreaming = false,
}) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const isInsufficientEvidence = content.trim() === DOCUMENT_FALLBACK_MESSAGE;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      showToast('Copied answer to clipboard', 'info');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  return (
    <div className="w-full">
      {/* Insufficient Evidence specific alert banner */}
      {isInsufficientEvidence && (
        <div
          role="note"
          className="mb-3 p-3.5 rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5">Insufficient Evidence in Selected Documents</p>
            <p className="text-amber-700 dark:text-amber-300 leading-relaxed">
              This response is strictly grounded in your selected files. No factual evidence matching this query was detected in the document text.
            </p>
          </div>
        </div>
      )}

      {/* Main Answer Content (Markdown) */}
      <div className="prose-custom text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ node, ...props }) => <p className="mb-3 leading-relaxed last:mb-0" {...props} />,
            ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
            ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
            li: ({ node, ...props }) => <li className="mb-0.5" {...props} />,
            h1: ({ node, ...props }) => (
              <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-4 mb-2" {...props} />
            ),
            h2: ({ node, ...props }) => (
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mt-3 mb-1.5" {...props} />
            ),
            h3: ({ node, ...props }) => (
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mt-2.5 mb-1" {...props} />
            ),
            blockquote: ({ node, ...props }) => (
              <blockquote
                className="border-l-2 border-neutral-300 dark:border-neutral-700 pl-3 italic text-neutral-600 dark:text-neutral-400 my-2"
                {...props}
              />
            ),
            code: ({ node, className, children, ...props }) => {
              const isInline = !className;
              if (isInline) {
                return (
                  <code
                    className="font-mono text-xs px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-brand-700 dark:text-brand-300"
                    {...props}
                  >
                    {children}
                  </code>
                );
              }
              return (
                <div className="rounded-xl overflow-hidden my-3 border border-neutral-200 dark:border-neutral-800 bg-neutral-900 text-neutral-100">
                  <div className="px-3 py-1.5 bg-neutral-950 border-b border-neutral-800 text-[10px] font-mono text-neutral-400">
                    Code
                  </div>
                  <pre className="p-3 overflow-x-auto text-xs font-mono">
                    <code {...props}>{children}</code>
                  </pre>
                </div>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>

        {isStreaming && (
          <span className="inline-block w-2 h-4 ml-1 bg-brand-500 animate-pulse align-middle" />
        )}
      </div>

      {/* Sources and Citations */}
      {citations && citations.length > 0 && <SourceList citations={citations} />}

      {/* Bottom Actions Bar */}
      {!isStreaming && (
        <div className="flex items-center justify-between mt-3 pt-2 text-xs text-neutral-400">
          <div className="flex items-center gap-1">
            {/* Copy button */}
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
              title="Copy to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {/* Regenerate / retry */}
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                title="Regenerate answer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Regenerate</span>
              </button>
            )}
          </div>

          {/* Feedback buttons */}
          {onFeedback && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onFeedback('like')}
                className={`p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${
                  feedback === 'like'
                    ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40'
                    : 'hover:text-neutral-700 dark:hover:text-neutral-200'
                }`}
                title="Helpful response"
                aria-label="Mark response as helpful"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onFeedback('dislike')}
                className={`p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${
                  feedback === 'dislike'
                    ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40'
                    : 'hover:text-neutral-700 dark:hover:text-neutral-200'
                }`}
                title="Unhelpful response"
                aria-label="Mark response as unhelpful"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
