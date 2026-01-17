import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { Mail, Lock, AlertCircle, Loader, Leaf } from 'lucide-react';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin, signIn, error, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setIsSigningIn(true);

    try {
      const { user: signedInUser, error } = await signIn(email, password);

      if (error) {
        setLocalError(error);
      } else if (signedInUser) {
        setEmail('');
        setPassword('');
        navigate('/bookings');
      }
    } catch (err) {
      setLocalError('Sign in failed. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  // If already signed in, show dashboard quick link
  if (user && isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 px-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md border border-emerald-200">
          <div className="text-center">
            <h1 className="text-5xl mb-2">🌿</h1>
            <h2 className="text-3xl font-bold text-emerald-900 mb-2">Welcome Back!</h2>
            <p className="text-lg text-gray-700 mb-4">You're logged in as:</p>
            <p className="text-xl font-semibold bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg mb-6">{user.email}</p>
            <div className="border-t border-emerald-200 my-6"></div>
            <button
              onClick={() => navigate('/bookings')}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-3 rounded-lg transition"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Logo & Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-35 h-35 flex items-center justify-center">
              <img src="../src/assets/bonsai.png" alt="Bonsai Logo" className="w-16 h-12" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-emerald-900">Bonsai Booking Portal</h1>
          <p className="text-gray-600 mt-2">Admin Panel</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-xl p-8 border border-emerald-100">
          {(error || localError) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex gap-3">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-red-800">Login Failed</h3>
                <div className="text-sm text-red-700">{error || localError}</div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="email"
                  placeholder="admin@bonsai.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  required
                  disabled={isSigningIn}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Contact support for your admin email
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  required
                  disabled={isSigningIn}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSigningIn}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              {isSigningIn ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Security Notice */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-6">
          <p className="font-semibold text-emerald-900 mb-3">🔒 Security Information</p>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>✓ Admin access only</li>
            <li>✓ Secure encryption</li>
            <li>✓ Protected database</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Home;