import React from 'react';
import {
  FileText,
  Globe,
  Quote,
  History,
  FileType,
  ShieldCheck,
} from 'lucide-react';

const FEATURES = [
  {
    icon: FileText,
    title: 'Document Question Answering',
    description:
      'Grounded RAG architecture ensures answers come strictly from your files with page-level citations.',
  },
  {
    icon: Globe,
    title: 'AI-Powered Web Research',
    description:
      'Query Wikipedia and high-authority live web sources to obtain synthesized, verifiable explanations.',
  },
  {
    icon: Quote,
    title: 'Clear Source Citations',
    description:
      'Every fact is backed by transparent document page numbers, slide references, or direct web URLs.',
  },
  {
    icon: History,
    title: 'Conversation History',
    description:
      'Revisit, rename, and manage all your past research chats and document Q&A sessions whenever you need.',
  },
  {
    icon: FileType,
    title: 'Multiple Document Formats',
    description:
      'Support for PDF, Word (.doc/.docx), PowerPoint (.ppt/.pptx), Markdown, and plain text files up to 25 MB.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure Personal Workspace',
    description:
      'Firebase Authentication and secure Firestore isolation ensure your private documents are never exposed.',
  },
];

export const FeatureGrid: React.FC = () => {
  return (
    <section id="features" className="py-16 md:py-20 px-4 sm:px-6 max-w-6xl mx-auto border-t border-neutral-200 dark:border-neutral-800">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight mb-3">
          Designed for Accurate Knowledge Discovery
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Everything you need to turn raw documents and online sources into actionable intelligence.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {FEATURES.map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <div
              key={idx}
              className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                {feat.title}
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {feat.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
