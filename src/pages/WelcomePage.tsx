import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Menu, X, ArrowRight, Shield, HelpCircle } from 'lucide-react';
import { WelcomeHero } from '../components/welcome/WelcomeHero';
import { FeatureGrid } from '../components/welcome/FeatureGrid';
import { HowItWorksSection } from '../components/welcome/HowItWorksSection';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { useAuth } from '../context/AuthContext';

export const WelcomePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-sm shadow-brand-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-neutral-900 dark:text-neutral-100 tracking-tight">
              AI Assistant
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-600 dark:text-neutral-400">
            <a href="#features" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
              How It Works
            </a>
            <Link to="/privacy" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
              Privacy
            </Link>
          </nav>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {user ? (
              <button
                type="button"
                onClick={() => navigate('/app')}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl text-white bg-brand-600 hover:bg-brand-700 transition-colors shadow-sm"
              >
                <span>Go to Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl text-white bg-brand-600 hover:bg-brand-700 transition-colors shadow-sm"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-4 space-y-3">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 py-1.5"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 py-1.5"
            >
              How It Works
            </a>
            <Link
              to="/privacy"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 py-1.5"
            >
              Privacy Policy
            </Link>
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-col gap-2">
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/app');
                  }}
                  className="w-full py-2.5 text-center text-sm font-medium rounded-xl bg-brand-600 text-white"
                >
                  Go to Workspace
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2 text-center text-sm font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 rounded-xl"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2 text-center text-sm font-medium text-white bg-brand-600 rounded-xl"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <WelcomeHero />
        <FeatureGrid />
        <HowItWorksSection />
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-600" />
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
              AI Assistant
            </span>
            <span>— Document Intelligence & AI Web Research</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/privacy" className="hover:underline">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:underline">
              Terms of Service
            </Link>
            <a href="mailto:support@aiassistant.internal" className="hover:underline">
              Contact
            </a>
          </div>

          <p>© {new Date().getFullYear()} AI Assistant Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};
