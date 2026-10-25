import React, { useState } from 'react';
import { ExternalLink, FileText, Globe, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { SourceCitation as SourceCitationType } from '../../types';

interface SourceCitationProps {
  citation: SourceCitationType;
  index?: number;
}

export const SourceCitation: React.FC<SourceCitationProps> = ({ citation, index }) => {
  const [expanded, setExpanded] = useState(false);

  const isDocument = citation.sourceType === 'document';
  const isWikipedia = citation.sourceType === 'wikipedia';

  return (
    <div className="text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 overflow-hidden transition-all shadow-sm">
      <div className="flex items-center justify-between p-2.5 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
              isDocument
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                : isWikipedia
                ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
            }`}
          >
            {isDocument ? (
              <FileText className="w-3.5 h-3.5" />
            ) : isWikipedia ? (
              <BookOpen className="w-3.5 h-3.5" />
            ) : (
              <Globe className="w-3.5 h-3.5" />
            )}
          </div>

          <div className="truncate">
            <span className="font-medium text-neutral-900 dark:text-neutral-100 truncate block">
              {index !== undefined && <span className="text-neutral-400 font-mono mr-1">[{index + 1}]</span>}
              {citation.title || citation.documentName || 'Reference'}
            </span>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
              {isDocument
                ? citation.pageNumber
                  ? `Page ${citation.pageNumber}`
                  : citation.slideNumber
                  ? `Slide ${citation.slideNumber}`
                  : 'Document reference'
                : citation.domain || 'Web source'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {citation.snippet && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              title={expanded ? 'Hide snippet' : 'View snippet'}
              aria-label={expanded ? 'Hide snippet' : 'View snippet'}
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}

          {citation.url && (
            <a
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded-md text-brand-600 hover:text-brand-700 dark:text-brand-400"
              title="Open source URL in new tab"
              aria-label="Open source URL"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Snippet preview */}
      {expanded && citation.snippet && (
        <div className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800/40 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-600 dark:text-neutral-300 leading-relaxed italic">
          "{citation.snippet}"
        </div>
      )}
    </div>
  );
};
