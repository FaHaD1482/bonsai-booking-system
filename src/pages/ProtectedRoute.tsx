import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { AlertCircle } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="alert alert-warning">
        <AlertCircle size={24} />
        <span>Please sign in to access this page</span>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="alert alert-error">
        <AlertCircle size={24} />
        <span>You do not have permission to access this page</span>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
