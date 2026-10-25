import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Globe,
  SlidersHorizontal,
  RotateCcw,
  BookOpen,
  Layers,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ChatWindow } from '../components/chat/ChatWindow';
import { SearchStatusIndicator } from '../components/research/SearchStatusIndicator';
import {
  createChatSession,
  saveChatMessage,
  updateMessageFeedback,
} from '../services/chatService';
import { queryWebResearch } from '../services/researchService';
import {
  ChatMessage,
  ChatSession,
  ResponseLengthPreference,
  SourcePreference,
  SearchStep,
  AttachedImage,
} from '../types';

export const WebResearchPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Preference states
  const [lengthPref, setLengthPref] = useState<ResponseLengthPreference>('balanced');
  const [sourcePref, setSourcePref] = useState<SourcePreference>('both');
  const [showFilters, setShowFilters] = useState(false);

  // Real search progress step
  const [currentStep, setCurrentStep] = useState<SearchStep>('idle');
  const [stepMessage, setStepMessage] = useState<string>('');

  const abortControllerRef = useRef<AbortController | null>(null);

  // Check if initial question passed in navigation state
  useEffect(() => {
    const initial = (location.state as any)?.initialQuestion;
    if (initial && messages.length === 0) {
      handleSendMessage(initial);
    }
  }, [location.state]);

  const handleSendMessage = async (text: string, attachedImage?: AttachedImage | null) => {
    if ((!text.trim() && !attachedImage) || isLoading) return;

    const trimmedText = text.trim();
    const effectiveUserId = user?.uid || 'guest_user';

    // 1. Immediately render user question and image in conversation UI
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      sender: 'user',
      text: trimmedText,
      timestamp: Date.now(),
      mode: 'research',
      image: attachedImage
        ? {
            data: attachedImage.base64,
            mimeType: attachedImage.mimeType,
            filename: attachedImage.filename,
            size: attachedImage.size,
            width: attachedImage.width,
            height: attachedImage.height,
          }
        : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setCurrentStep('understanding');
    setStepMessage(
      attachedImage
        ? 'Analyzing image contents and visual query...'
        : 'Analyzing question and intent...'
    );
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 2. Safely manage session in background
    let activeSession = currentSession;
    if (!activeSession) {
      try {
        const title = trimmedText
          ? trimmedText.slice(0, 36) + (trimmedText.length > 36 ? '...' : '')
          : attachedImage?.filename || 'Image Analysis';
        activeSession = await createChatSession(effectiveUserId, 'research', title);
        setCurrentSession(activeSession);
      } catch (e) {
        console.warn('Session creation warning:', e);
      }
    }

    if (activeSession) {
      saveChatMessage(effectiveUserId, activeSession.id, userMessage).catch(() => {});
    }

    // 3. Dispatch Web Research query with optional image attachment to backend
    try {
      const response = await queryWebResearch(
        {
          question: trimmedText,
          sourcePreference: sourcePref,
          responseLength: lengthPref,
          conversationId: activeSession?.id,
          userId: effectiveUserId,
          image: attachedImage
            ? {
                data: attachedImage.base64,
                mimeType: attachedImage.mimeType,
                filename: attachedImage.filename,
                size: attachedImage.size,
                width: attachedImage.width,
                height: attachedImage.height,
              }
            : undefined,
        },
        (step, msg) => {
          setCurrentStep(step);
          setStepMessage(msg);
        },
        controller.signal
      );

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_a`,
        sender: 'assistant',
        text: response.answer || 'No response generated.',
        timestamp: Date.now(),
        mode: 'research',
        citations: response.citations || [],
        status: 'complete',
      };

      setMessages((prev) => [...prev, assistantMessage]);
      if (activeSession) {
        saveChatMessage(effectiveUserId, activeSession.id, assistantMessage).catch(() => {});
      }
    } catch (error: any) {
      const isStopped = Boolean(error.message && error.message.includes('stopped by user'));
      setCurrentStep(isStopped ? 'completed' : 'error');
      setStepMessage(error.message || 'Web research service encountered an error.');

      const errMessage: ChatMessage = {
        id: `msg_${Date.now()}_err`,
        sender: 'assistant',
        text: isStopped ? 'Research generation was stopped by the user.' : '',
        timestamp: Date.now(),
        mode: 'research',
        status: isStopped ? 'complete' : 'error',
        errorMessage: error.message || 'Web research service encountered an error.',
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
    setCurrentStep('idle');
    showToast('Research conversation cleared', 'info');
  };

  const handleFeedback = async (messageId: string, feedback: 'like' | 'dislike') => {
    if (!user || !currentSession) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, feedback } : m))
    );
    await updateMessageFeedback(user.uid, currentSession.id, messageId, feedback);
    showToast('Feedback noted', 'success');
  };

  const headerControls = (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={() => setShowFilters(!showFilters)}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium text-neutral-600 dark:text-neutral-300 transition-colors"
      >
        <SlidersHorizontal className="w-3 h-3" />
        <span>Options & Sources</span>
      </button>

      {showFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-neutral-400">Sources:</span>
            <select
              value={sourcePref}
              onChange={(e) => setSourcePref(e.target.value as SourcePreference)}
              className="py-0.5 px-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none text-xs"
            >
              <option value="both">Wikipedia & Web</option>
              <option value="wikipedia">Wikipedia Only</option>
              <option value="web">General Web Only</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-neutral-400">Length:</span>
            <select
              value={lengthPref}
              onChange={(e) => setLengthPref(e.target.value as ResponseLengthPreference)}
              className="py-0.5 px-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none text-xs"
            >
              <option value="balanced">Balanced</option>
              <option value="short">Short</option>
              <option value="detailed">Detailed</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-neutral-50 dark:bg-neutral-950 overflow-hidden">
      {/* Real search step status indicator */}
      {currentStep !== 'idle' && (
        <div className="p-2 sm:p-2.5 bg-neutral-100/70 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-800 max-w-4xl mx-auto w-full shrink-0">
          <SearchStatusIndicator currentStep={currentStep} message={stepMessage} />
        </div>
      )}

      {/* Main Chat Conversation View */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ChatWindow
          messages={messages}
          mode="research"
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
          onStopGeneration={handleStopGeneration}
          onClearConversation={handleClearConversation}
          onFeedback={handleFeedback}
          onRetryLast={() => {
            const lastUserMsg = [...messages].reverse().find((m) => m.sender === 'user');
            if (lastUserMsg) {
              const img: AttachedImage | undefined = lastUserMsg.image
                ? {
                    dataUrl: lastUserMsg.image.data
                      ? (lastUserMsg.image.data.startsWith('data:')
                          ? lastUserMsg.image.data
                          : `data:${lastUserMsg.image.mimeType};base64,${lastUserMsg.image.data}`)
                      : '',
                    base64: lastUserMsg.image.data,
                    mimeType: lastUserMsg.image.mimeType,
                    filename: lastUserMsg.image.filename || 'image',
                    size: lastUserMsg.image.size || 0,
                    width: lastUserMsg.image.width,
                    height: lastUserMsg.image.height,
                  }
                : undefined;
              handleSendMessage(lastUserMsg.text, img);
            }
          }}
          headerControls={headerControls}
        />
      </div>
    </div>
  );
};
