import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { ToastNotifications } from './components/common/ToastNotifications';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <ToastNotifications />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
