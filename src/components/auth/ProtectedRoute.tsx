import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingIndicator } from '../common/LoadingIndicator';
import { AlertCircle } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, isDemoUser, isFirebaseConfigured } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <LoadingIndicator message="Verifying session..." size="lg" />
      </div>
    );
  }

  if (!user) {
    // Preserve intended destination path
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <>
      {isDemoUser && !isFirebaseConfigured && (
        <aside
          aria-label="Demo environment notification"
          className="bg-amber-500/10 border-b border-amber-500/20 text-amber-900 dark:text-amber-200 px-4 py-2 text-xs flex items-center justify-between z-40 relative"
        >
          <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              <strong>Demo Preview Mode:</strong> Firebase credentials are not yet configured in{' '}
              <code className="font-mono bg-amber-500/20 px-1 py-0.5 rounded">.env</code>. You are exploring the complete UI with a local preview profile.
            </span>
          </div>
        </aside>
      )}
      {children}
    </>
  );
};
