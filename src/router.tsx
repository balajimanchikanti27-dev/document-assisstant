import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

// Layouts & Guards
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Public Pages
import { WelcomePage } from './pages/WelcomePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { VerifyPhonePage } from './pages/VerifyPhonePage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';

// Authenticated Pages
import { DashboardPage } from './pages/DashboardPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { DocumentAssistantPage } from './pages/DocumentAssistantPage';
import { WebResearchPage } from './pages/WebResearchPage';
import { ChatHistoryPage } from './pages/ChatHistoryPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { EvaluationPage } from './pages/EvaluationPage';
import { SmartStudyCoachPage } from './pages/SmartStudyCoachPage';

export const router = createBrowserRouter([
  // Public Routes
  {
    path: '/',
    element: <WelcomePage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/verify-phone',
    element: <VerifyPhonePage />,
  },
  {
    path: '/privacy',
    element: <PrivacyPage />,
  },
  {
    path: '/terms',
    element: <TermsPage />,
  },

  // Authenticated Application Shell
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'documents',
        element: <DocumentsPage />,
      },
      {
        path: 'research',
        element: <WebResearchPage />,
      },
      {
        path: 'chat/:chatId',
        element: <DocumentAssistantPage />,
      },
      {
        path: 'history',
        element: <ChatHistoryPage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'evaluation',
        element: <EvaluationPage />,
      },
      {
        path: 'coach',
        element: <SmartStudyCoachPage />,
      },
    ],
  },

  // Fallback redirect
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
