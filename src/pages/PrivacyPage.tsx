import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft, Shield } from 'lucide-react';
import { ThemeToggle } from '../components/common/ThemeToggle';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col justify-between py-8 px-4 sm:px-6">
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-bold text-base">AI Assistant</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl w-full mx-auto my-10 bg-white dark:bg-neutral-900 p-8 sm:p-12 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm leading-relaxed">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Privacy Policy</h1>
            <p className="text-xs text-neutral-500">Last updated: October 2026</p>
          </div>
        </div>

        <div className="space-y-6 text-sm text-neutral-600 dark:text-neutral-300">
          <section>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              1. Information We Collect
            </h2>
            <p>
              AI Assistant collects account information (email address, full name, phone number) when you authenticate via Firebase Authentication. We also store document metadata and text vectors necessary to provide the Retrieval-Augmented Generation (RAG) assistant service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              2. Document Privacy & Grounding
            </h2>
            <p>
              Your uploaded documents are isolated to your authenticated account in Cloud Firestore and Firebase Storage. Your documents are never shared across users or used to train public machine learning models without your explicit consent.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              3. Web Research Data
            </h2>
            <p>
              When using AI Web Research, search queries are sent to external sources (such as Wikipedia and verified web search APIs) solely to retrieve real-time reference articles. No private document text is shared with web search engines.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              4. Data Retention & Account Deletion
            </h2>
            <p>
              You can delete your uploaded files, chat conversations, or entire account profile at any time from your account settings. Deletion permanently erases your records from our active databases.
            </p>
          </section>
        </div>
      </main>

      <footer className="text-center text-xs text-neutral-400 max-w-4xl mx-auto w-full pt-6 border-t border-neutral-200 dark:border-neutral-800">
        © {new Date().getFullYear()} AI Assistant. All rights reserved.
      </footer>
    </div>
  );
};
