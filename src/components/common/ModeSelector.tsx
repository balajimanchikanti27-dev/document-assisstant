import React from 'react';
import { FileText, Globe } from 'lucide-react';
import { AssistantMode } from '../../types';

interface ModeSelectorProps {
  selectedMode: AssistantMode;
  onSelectMode: (mode: AssistantMode) => void;
  className?: string;
  variant?: 'cards' | 'tabs';
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  selectedMode,
  onSelectMode,
  className = '',
  variant = 'cards',
}) => {
  if (variant === 'tabs') {
    return (
      <div
        role="tablist"
        aria-label="Assistant mode switcher"
        className={`inline-flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700/60 ${className}`}
      >
        <button
          role="tab"
          aria-selected={selectedMode === 'document'}
          onClick={() => onSelectMode('document')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
            selectedMode === 'document'
              ? 'bg-white dark:bg-neutral-900 text-brand-700 dark:text-brand-300 shadow-sm font-semibold'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Ask My Documents</span>
        </button>

        <button
          role="tab"
          aria-selected={selectedMode === 'research'}
          onClick={() => onSelectMode('research')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
            selectedMode === 'research'
              ? 'bg-white dark:bg-neutral-900 text-brand-700 dark:text-brand-300 shadow-sm font-semibold'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>AI Web Research</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`}>
      {/* Option 1: Ask My Documents */}
      <button
        type="button"
        onClick={() => onSelectMode('document')}
        className={`group relative text-left p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
          selectedMode === 'document'
            ? 'border-brand-600 bg-brand-50/50 dark:bg-brand-950/20 ring-1 ring-brand-600 dark:border-brand-500'
            : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700'
        }`}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              selectedMode === 'document'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
            }`}
          >
            <FileText className="w-5 h-5" />
          </div>
          <span
            className={`text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${
              selectedMode === 'document'
                ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-200'
                : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
            }`}
          >
            Document Only
          </span>
        </div>
        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-base mb-1">
          Ask My Documents
        </h3>
        <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
          Get answers grounded in your uploaded PDF, Word, and PowerPoint files.
        </p>
      </button>

      {/* Option 2: AI Web Research */}
      <button
        type="button"
        onClick={() => onSelectMode('research')}
        className={`group relative text-left p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
          selectedMode === 'research'
            ? 'border-brand-600 bg-brand-50/50 dark:bg-brand-950/20 ring-1 ring-brand-600 dark:border-brand-500'
            : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700'
        }`}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              selectedMode === 'research'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
            }`}
          >
            <Globe className="w-5 h-5" />
          </div>
          <span
            className={`text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${
              selectedMode === 'research'
                ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-200'
                : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
            }`}
          >
            Web & Wikipedia
          </span>
        </div>
        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-base mb-1">
          AI Web Research
        </h3>
        <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
          Explore Wikipedia and other websites to find relevant information.
        </p>
      </button>
    </div>
  );
};
