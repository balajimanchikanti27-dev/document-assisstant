import React, { useState } from 'react';
import { SourceCitation as SourceCitationType } from '../../types';
import { SourceCitation } from './SourceCitation';
import { ChevronDown, ChevronUp, Layers } from 'lucide-react';

interface SourceListProps {
  citations: SourceCitationType[];
}

export const SourceList: React.FC<SourceListProps> = ({ citations }) => {
  const [collapsed, setCollapsed] = useState(false);

  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          <Layers className="w-3.5 h-3.5 text-brand-500" />
          <span>Sources & Citations ({citations.length})</span>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 inline-flex items-center gap-1"
        >
          {collapsed ? (
            <>
              <span>Show</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <span>Hide</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {!collapsed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {citations.map((citation, idx) => (
            <SourceCitation key={citation.id || idx} citation={citation} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
};
