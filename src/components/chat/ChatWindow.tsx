import React, { useState, useRef, useEffect } from 'react';
import { ArrowDown, Trash2, Sparkles, AlertCircle, FileText, Globe } from 'lucide-react';
import { ChatMessage as ChatMessageType, AssistantMode, SourceCitation, AttachedImage } from '../../types';
import { ChatMessage } from './ChatMessage';
import { AIQuestionInput } from '../common/AIQuestionInput';
import { ConfirmationDialog } from '../common/ConfirmationDialog';

interface ChatWindowProps {
  messages: ChatMessageType[];
  mode: AssistantMode;
  isLoading?: boolean;
  onSendMessage: (text: string, image?: AttachedImage | null) => void;
  onStopGeneration?: () => void;
  onClearConversation?: () => void;
  onFeedback?: (messageId: string, type: 'like' | 'dislike') => void;
  onRetryLast?: () => void;
  onAttachDocument?: () => void;
  selectedDocCount?: number;
  headerControls?: React.ReactNode;
}

const SUGGESTIONS = {
  document: [
    'Summarize key insights from my selected document.',
    'What are the primary conclusions and recommendations?',
    'Explain the methodology outlined in section 2.',
    'List all dates, milestones, and deadlines mentioned.',
  ],
  research: [
    'Explain how quantum computing differs from classical computing.',
    'Summarize recent developments in James Webb Space Telescope discoveries.',
    'Compare renewable energy storage technologies.',
    'Explain the theory of relativity in plain English.',
  ],
};

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  mode,
  isLoading = false,
  onSendMessage,
  onStopGeneration,
  onClearConversation,
  onFeedback,
  onRetryLast,
  onAttachDocument,
  selectedDocCount = 0,
  headerControls,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomMarkerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on messages change
  useEffect(() => {
    bottomMarkerRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBottom(isUp);
  };

  const scrollToBottom = () => {
    bottomMarkerRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = () => {
    if ((!inputValue.trim() && !attachedImage) || isLoading) return;
    onSendMessage(inputValue, attachedImage);
    setInputValue('');
    setAttachedImage(null);
  };

  const handleSuggestionClick = (prompt: string) => {
    setInputValue(prompt);
  };

  return (
    <div className="flex flex-col h-full bg-neutral-50 dark:bg-neutral-950 relative min-h-0">
      {/* Top Chat Bar */}
      <div className="px-4 py-2.5 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          {mode === 'document' ? (
            <span className="inline-flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <FileText className="w-3.5 h-3.5" />
              Document Only Mode
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              <Globe className="w-3.5 h-3.5" />
              AI Web & Wikipedia
            </span>
          )}

          {mode === 'document' && (
            <span className="text-neutral-500 dark:text-neutral-400">
              ({selectedDocCount} {selectedDocCount === 1 ? 'document' : 'documents'} selected)
            </span>
          )}

          {headerControls}
        </div>

        {messages.length > 0 && onClearConversation && (
          <button
            type="button"
            onClick={() => setShowClearDialog(true)}
            className="text-neutral-500 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors inline-flex items-center gap-1 shrink-0"
            title="Clear conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        )}
      </div>

      {/* Messages Scroll Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6"
      >
        {messages.length === 0 ? (
          <div className="min-h-full py-6 flex flex-col items-center justify-center max-w-lg mx-auto text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-950/60 text-brand-600 dark:text-brand-300 flex items-center justify-center mb-4 shadow-sm">
              <Sparkles className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1">
              {mode === 'document' ? 'Ask Your Documents' : 'Explore with AI Web Research'}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6">
              {mode === 'document'
                ? 'Ask precise questions grounded in your selected documents. The assistant will cite pages and slides, or notify you if the answer is not present.'
                : 'Explore real-world facts from Wikipedia and relevant web sources with cited domains and articles.'}
            </p>

            <div className="w-full space-y-2 text-left">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                Suggested questions:
              </span>
              <div className="grid grid-cols-1 gap-2">
                {SUGGESTIONS[mode].map((suggestion, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-left p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-brand-500 hover:bg-brand-50/30 dark:hover:bg-brand-950/20 text-xs text-neutral-700 dark:text-neutral-300 transition-colors shadow-sm"
                  >
                    "{suggestion}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {messages.map((msg, index) => (
              <ChatMessage
                key={msg.id || index}
                message={msg}
                onRetry={index === messages.length - 1 ? onRetryLast : undefined}
                onFeedback={(type) => onFeedback && onFeedback(msg.id, type)}
              />
            ))}
            <div ref={bottomMarkerRef} />
          </div>
        )}
      </div>

      {/* Floating Scroll-to-Bottom button */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-28 right-6 p-2 rounded-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 shadow-md text-neutral-600 dark:text-neutral-300 hover:text-brand-600 z-10 transition-transform transform hover:scale-105"
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}

      {/* Input Box Footer */}
      <div className="p-3 sm:p-4 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 shrink-0">
        <div className="max-w-4xl mx-auto">
          <AIQuestionInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSend}
            onStop={onStopGeneration}
            onAttach={mode === 'document' ? onAttachDocument : undefined}
            allowImageUpload={mode === 'research'}
            attachedImage={attachedImage}
            onImageSelect={setAttachedImage}
            onImageRemove={() => setAttachedImage(null)}
            isLoading={isLoading}
            placeholder={
              mode === 'document'
                ? selectedDocCount > 0
                  ? 'Ask a question about your selected documents...'
                  : 'Select at least one document or upload a file to ask...'
                : 'Ask a research question or attach an image to analyze...'
            }
          />
        </div>
      </div>

      {/* Clear Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showClearDialog}
        title="Clear Conversation"
        message="Are you sure you want to clear this entire conversation? All messages will be permanently removed from this chat."
        confirmLabel="Clear Conversation"
        isDestructive={true}
        onConfirm={() => {
          setShowClearDialog(false);
          if (onClearConversation) onClearConversation();
        }}
        onCancel={() => setShowClearDialog(false)}
      />
    </div>
  );
};
