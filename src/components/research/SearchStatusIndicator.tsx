import React from 'react';
import { SearchStep } from '../../types';
import {
  Brain,
  BookOpen,
  Globe,
  FileCheck2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface SearchStatusIndicatorProps {
  currentStep: SearchStep;
  message?: string;
  className?: string;
}

const STEP_DEFINITIONS: { key: SearchStep; label: string; icon: React.ElementType }[] = [
  { key: 'understanding', label: 'Understanding question', icon: Brain },
  { key: 'searching_wikipedia', label: 'Searching Wikipedia', icon: BookOpen },
  { key: 'searching_web', label: 'Searching the web', icon: Globe },
  { key: 'reading_sources', label: 'Reading sources', icon: FileCheck2 },
  { key: 'generating', label: 'Synthesizing response', icon: Sparkles },
];

export const SearchStatusIndicator: React.FC<SearchStatusIndicatorProps> = ({
  currentStep,
  message,
  className = '',
}) => {
  if (currentStep === 'idle') return null;

  if (currentStep === 'error') {
    return (
      <div
        role="alert"
        className={`p-3.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 text-xs flex items-center gap-2.5 ${className}`}
      >
        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
        <span>{message || 'Search execution encountered an error.'}</span>
      </div>
    );
  }

  if (currentStep === 'completed') {
    return (
      <div
        className={`p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 ${className}`}
      >
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
        <span className="font-medium">Web search and answer synthesis completed.</span>
      </div>
    );
  }

  const currentIdx = STEP_DEFINITIONS.findIndex((s) => s.key === currentStep);

  return (
    <div
      className={`p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
          <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
            {message || 'Executing live research...'}
          </span>
        </div>
        <span className="text-[11px] text-neutral-400 font-mono">
          Step {Math.max(1, currentIdx + 1)} of {STEP_DEFINITIONS.length}
        </span>
      </div>

      {/* Progress pill bar */}
      <div className="grid grid-cols-5 gap-1.5">
        {STEP_DEFINITIONS.map((step, idx) => {
          const isDone = currentIdx > idx;
          const isCurrent = currentIdx === idx;
          const Icon = step.icon;

          return (
            <div
              key={step.key}
              className={`flex flex-col items-center gap-1 text-center p-1.5 rounded-lg transition-colors ${
                isDone
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                  : isCurrent
                  ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 ring-1 ring-brand-500/30'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:block truncate w-full font-medium">
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
