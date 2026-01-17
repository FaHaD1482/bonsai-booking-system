import React from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { LogOut, Mail, Shield, Calendar } from 'lucide-react';

const Profile: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Admin Profile</h1>

      {user ? (
        <div className="space-y-6">
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title mb-6 flex items-center gap-2">
                <Shield size={24} className="text-primary" />
                Admin Account Information
              </h2>

              <div className="space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-base-300">
                  <Mail size={20} className="text-info" />
                  <div>
                    <p className="text-sm opacity-75">Email Address</p>
                    <p className="font-semibold text-lg">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 pb-4 border-b border-base-300">
                  <Shield size={20} className="text-success" />
                  <div>
                    <p className="text-sm opacity-75">Access Level</p>
                    <p className="font-semibold text-lg">Administrator</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Calendar size={20} className="text-warning" />
                  <div>
                    <p className="text-sm opacity-75">User ID</p>
                    <p className="font-semibold font-mono text-sm">{user.id}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title mb-4">Preferences</h2>

              <div className="space-y-3">
                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text">Enable Notifications</span>
                    <input type="checkbox" className="checkbox" defaultChecked />
                  </label>
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text">Auto-sync to Google Sheets</span>
                    <input type="checkbox" className="checkbox" defaultChecked />
                  </label>
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text">Email Notifications</span>
                    <input type="checkbox" className="checkbox" defaultChecked />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title mb-4">Security</h2>

              <div className="space-y-3">
                <button className="btn btn-outline w-full">
                  Change Password
                </button>
                <button className="btn btn-outline w-full">
                  View Login History
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="btn btn-error w-full gap-2"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      ) : (
        <div className="alert alert-warning">
          <span>You are not logged in. Please sign in to view your profile.</span>
        </div>
      )}
    </div>
  );
};

export default Profile;