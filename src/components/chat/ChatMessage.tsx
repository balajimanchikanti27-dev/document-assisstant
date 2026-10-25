import React from 'react';
import { User, Sparkles, AlertCircle, Copy, Check } from 'lucide-react';
import { ChatMessage as ChatMessageType } from '../../types';
import { AnswerRenderer } from './AnswerRenderer';
import { formatRelativeTime } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface ChatMessageProps {
  message: ChatMessageType;
  onRetry?: () => void;
  onFeedback?: (feedback: 'like' | 'dislike') => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onRetry,
  onFeedback,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [copiedUserMsg, setCopiedUserMsg] = React.useState(false);

  const isUser = message.sender === 'user';

  const handleCopyUserMsg = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopiedUserMsg(true);
      showToast('Copied question', 'info');
      setTimeout(() => setCopiedUserMsg(false), 2000);
    } catch {}
  };

  if (isUser) {
    const imageSrc = message.image?.data
      ? (message.image.data.startsWith('data:')
          ? message.image.data
          : `data:${message.image.mimeType};base64,${message.image.data}`)
      : (message.image as any)?.dataUrl;

    return (
      <div className="flex justify-end gap-3 max-w-3xl ml-auto mb-6 group">
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%]">
          {imageSrc && (
            <div className="mb-2 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 shadow-sm max-w-[260px] sm:max-w-[320px]">
              <img
                src={imageSrc}
                alt={message.image?.filename || 'Attached image'}
                className="w-full max-h-56 object-cover rounded-xl"
              />
              {message.image?.filename && (
                <div className="px-2.5 py-1 text-[11px] text-neutral-500 dark:text-neutral-400 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm truncate">
                  {message.image.filename}
                </div>
              )}
            </div>
          )}

          {message.text ? (
            <div className="relative bg-brand-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm text-sm leading-relaxed">
              <p className="whitespace-pre-wrap break-words">{message.text}</p>
            </div>
          ) : null}

          <div className="flex items-center gap-2 mt-1 px-1 text-[11px] text-neutral-400">
            <span>{formatRelativeTime(message.timestamp)}</span>
            {message.text && (
              <button
                onClick={handleCopyUserMsg}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-neutral-600 dark:hover:text-neutral-200"
                title="Copy message"
              >
                {copiedUserMsg ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>

        <div className="w-8 h-8 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center shrink-0 text-xs font-semibold select-none">
          {user?.displayName ? user.displayName[0].toUpperCase() : <User className="w-4 h-4" />}
        </div>
      </div>
    );
  }

  // Assistant Message
  return (
    <div className="flex items-start gap-3.5 max-w-3xl mr-auto mb-6 w-full">
      <div className="w-8 h-8 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center shrink-0 shadow-sm">
        <Sparkles className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0 bg-white dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-sm">
        {message.status === 'error' ? (
          <div className="text-red-600 dark:text-red-400 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-xs mb-1">Failed to generate response</p>
              <p className="text-xs text-neutral-600 dark:text-neutral-300">
                {message.errorMessage || 'A connection error occurred while communicating with the assistant.'}
              </p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-2.5 px-3 py-1 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Retry Request
                </button>
              )}
            </div>
          </div>
        ) : (
          <AnswerRenderer
            content={message.text}
            citations={message.citations}
            mode={message.mode}
            feedback={message.feedback}
            onFeedback={onFeedback}
            onRetry={onRetry}
            isStreaming={message.status === 'streaming'}
          />
        )}
      </div>
    </div>
  );
};
