import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Paperclip, ArrowUp } from 'lucide-react';
import { ModeSelector } from '../common/ModeSelector';
import { AssistantMode } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const SUGGESTED_CHIPS = [
  'Explain artificial intelligence.',
  'Summarize a document.',
  'Explain a topic in simple English.',
  'Compare two technologies.',
  'Find information about a scientific discovery.',
];

export const WelcomeHero: React.FC = () => {
  const navigate = useNavigate();
  const { user, setPendingQuestion } = useAuth();
  const { showToast } = useToast();

  const [question, setQuestion] = useState('');
  const [selectedMode, setSelectedMode] = useState<AssistantMode>('document');

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim()) return;

    if (!user) {
      // Preserve question and redirect to login
      setPendingQuestion(question.trim(), selectedMode);
      showToast('Please sign in or create an account to start your session.', 'info');
      navigate('/login', { state: { hasPendingQuestion: true } });
    } else {
      // User is already signed in
      if (selectedMode === 'research') {
        navigate('/app/research', { state: { initialQuestion: question.trim() } });
      } else {
        navigate('/app/chat/new', { state: { initialQuestion: question.trim(), mode: 'document' } });
      }
    }
  };

  const handleChipClick = (chip: string) => {
    setQuestion(chip);
  };

  return (
    <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 px-4 sm:px-6 max-w-5xl mx-auto text-center">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800/80 text-xs font-semibold mb-6 shadow-sm">
        <Sparkles className="w-3.5 h-3.5 text-brand-600" />
        <span>Next-Generation Document Intelligence & Research</span>
      </div>

      {/* Main Heading & Taglines */}
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-neutral-900 dark:text-neutral-50 tracking-tight leading-tight mb-4">
        Welcome to AI Assistant
      </h1>
      <p className="text-lg sm:text-xl font-medium text-neutral-800 dark:text-neutral-200 max-w-3xl mx-auto mb-3">
        Your documents. The world's knowledge. One intelligent assistant.
      </p>
      <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto mb-10 leading-relaxed">
        Ask questions, understand your documents, and explore knowledge from across the web — all in one place.
      </p>

      {/* Prominent Question Box */}
      <div className="max-w-3xl mx-auto mb-6 text-left">
        <div className="rounded-2xl border border-neutral-300 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 shadow-xl p-3 sm:p-4 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Ask anything or explore your documents..."
            rows={2}
            className="w-full resize-none bg-transparent text-sm sm:text-base text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none min-h-[56px] leading-relaxed"
          />

          <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800 mt-2">
            <div className="flex items-center gap-2 text-neutral-400 text-xs">
              <button
                type="button"
                onClick={() => {
                  setSelectedMode('document');
                  showToast('Document mode selected. Enter your prompt to continue.', 'info');
                }}
                className="p-1.5 rounded-lg hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                title="Attach document mode"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <span className="hidden sm:inline">Press Enter to continue</span>
            </div>

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!question.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Feature Mode Selectors */}
      <div className="max-w-3xl mx-auto mb-8 text-left">
        <ModeSelector
          selectedMode={selectedMode}
          onSelectMode={setSelectedMode}
          variant="cards"
        />
      </div>

      {/* Suggested Question Chips */}
      <div className="max-w-3xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2.5">
          Or try one of these suggestions:
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {SUGGESTED_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleChipClick(chip)}
              className="text-xs px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 text-neutral-700 dark:text-neutral-300 hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors shadow-sm"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
