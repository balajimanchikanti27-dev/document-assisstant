import React, { useState, useMemo } from 'react';
import { Search, Filter, FolderOpen, CheckSquare, Square } from 'lucide-react';
import { UserDocument } from '../../types';
import { DocumentCard } from './DocumentCard';
import { EmptyState } from '../common/EmptyState';

interface DocumentListProps {
  documents: UserDocument[];
  selectedDocIds?: string[];
  onToggleSelect?: (docId: string) => void;
  onSelectAll?: (allIds: string[]) => void;
  onClearSelection?: () => void;
  onDeleteDocument: (docId: string) => Promise<void>;
  onRetryDocument?: (docId: string) => Promise<void>;
  onSummarizeDocument?: (docId: string) => void;
  onUploadClick?: () => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  selectedDocIds = [],
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onDeleteDocument,
  onRetryDocument,
  onSummarizeDocument,
  onUploadClick,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'name' | 'size'>('date_desc');

  // Filtered & Sorted documents
  const filteredDocs = useMemo(() => {
    return documents
      .filter((doc) => {
        const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType =
          typeFilter === 'all' || doc.extension.toLowerCase().includes(typeFilter.toLowerCase());
        const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
        return matchesSearch && matchesType && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
        if (sortBy === 'date_asc') return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'size') return b.size - a.size;
        return 0;
      });
  }, [documents, searchQuery, typeFilter, statusFilter, sortBy]);

  const readyDocs = useMemo(() => filteredDocs.filter((d) => d.status === 'ready'), [filteredDocs]);
  const allReadySelected =
    readyDocs.length > 0 && readyDocs.every((d) => selectedDocIds.includes(d.id));

  const handleToggleSelectAll = () => {
    if (allReadySelected) {
      if (onClearSelection) onClearSelection();
    } else {
      if (onSelectAll) onSelectAll(readyDocs.map((d) => d.id));
    }
  };

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="No documents uploaded yet"
        description="Upload your PDF, Word, PowerPoint, or text documents to start asking questions grounded in your content."
        actionText="Upload Documents"
        onAction={onUploadClick}
      />
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Search, Filter and Selection Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search documents by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium focus:outline-none"
          >
            <option value="all">All Formats</option>
            <option value="pdf">PDF</option>
            <option value="doc">Word (.doc/.docx)</option>
            <option value="ppt">PowerPoint (.ppt)</option>
            <option value="txt">Text & Markdown</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="ready">Ready only</option>
            <option value="processing">Indexing only</option>
            <option value="error">Failed only</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs py-1.5 px-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium focus:outline-none"
          >
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="name">Name (A-Z)</option>
            <option value="size">File size</option>
          </select>
        </div>
      </div>

      {/* Select All Bar if selection is enabled */}
      {onToggleSelect && readyDocs.length > 0 && (
        <div className="flex items-center justify-between px-2 text-xs text-neutral-600 dark:text-neutral-400">
          <button
            type="button"
            onClick={handleToggleSelectAll}
            className="inline-flex items-center gap-1.5 hover:text-neutral-900 dark:hover:text-neutral-200 font-medium"
          >
            {allReadySelected ? (
              <CheckSquare className="w-4 h-4 text-brand-600" />
            ) : (
              <Square className="w-4 h-4 text-neutral-400" />
            )}
            <span>
              {allReadySelected
                ? 'Deselect all'
                : `Select all ready documents (${readyDocs.length})`}
            </span>
          </button>

          <span>
            {selectedDocIds.length} of {documents.length} selected
          </span>
        </div>
      )}

      {/* Grid of Documents */}
      {filteredDocs.length === 0 ? (
        <div className="py-12 text-center text-xs text-neutral-500 dark:text-neutral-400">
          No documents matched your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredDocs.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              isSelected={selectedDocIds.includes(doc.id)}
              onToggleSelect={onToggleSelect}
              onDelete={onDeleteDocument}
              onRetry={onRetryDocument}
              onSummarize={onSummarizeDocument}
            />
          ))}
        </div>
      )}
    </div>
  );
};
