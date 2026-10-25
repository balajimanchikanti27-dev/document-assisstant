import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft, FileCheck } from 'lucide-react';
import { ThemeToggle } from '../components/common/ThemeToggle';

export const TermsPage: React.FC = () => {
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
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Terms of Service</h1>
            <p className="text-xs text-neutral-500">Effective Date: October 2026</p>
          </div>
        </div>

        <div className="space-y-6 text-sm text-neutral-600 dark:text-neutral-300">
          <section>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or creating an account on AI Assistant, you agree to comply with and be bound by these Terms of Service. If you disagree with any part of these terms, you may not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              2. Acceptable Use
            </h2>
            <p>
              You agree not to upload harmful, infringing, or illegal material. The AI Assistant document analysis feature is intended for legitimate research, business analysis, and study purposes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              3. AI Limitations & Source Attribution
            </h2>
            <p>
              AI Assistant provides answers based on your uploaded documents and external public citations. While we design the system to minimize hallucinations, AI-generated content may occasionally be incomplete or inaccurate. Always verify critical facts using the cited sources provided.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              4. Service Availability
            </h2>
            <p>
              We strive for high reliability but do not warrant uninterrupted uptime. Services may be subject to maintenance or third-party quota limits (such as SMS and AI provider throughput limits).
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
