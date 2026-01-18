import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Calendar, User as UserIcon, ExternalLink, TrendingUp } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import logo from '../assets/logo.png';

const Navbar: React.FC = () => {
  const { user, isAdmin, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="navbar bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 shadow-2xl px-3 sm:px-6 backdrop-blur-md sticky top-0 z-50 transition-all duration-300">
      <div className="flex-1 min-w-0">
        <Link
          to="/"
          className="btn btn-ghost normal-case text-lg sm:text-2xl font-bold text-white flex gap-2 items-center no-underline hover:no-underline focus:no-underline hover:scale-105 transition-transform duration-300"
        >
          <img src={logo} alt="Bonsai Logo" className="h-12 w-16 sm:h-12 sm:w-18 flex-shrink-4 hover:rotate-12 transition-transform duration-300" />
          <span className="hidden sm:inline">Booking Portal</span>
          <span className="sm:hidden"> Booking Portal</span>
        </Link>
      </div>
      <div className="flex-none gap-3 sm:gap-5">
        {user && isAdmin ? (
          <>
            {/* Visit Resort Website Button - Hidden on mobile */}
            <a
              href="https://bonsaiecovillage.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-outline gap-2 text-white border-none hover:bg-dark hover:text-white-700 hidden sm:flex no-underline hover:no-underline focus:no-underline hover:shadow-lg hover:scale-105 transition-all duration-300"
            >
              <ExternalLink size={18} />
              Visit Resort
            </a>
            
            {/* User Menu */}
            <div className="dropdown dropdown-end">
              <button className="btn btn-ghost btn-sm sm:btn-md gap-1 text-white hover:bg-emerald-800 hover:shadow-lg transition-all duration-300 hover:scale-105">
                <UserIcon size={16} className="sm:size-18" />
                <span className="hidden sm:inline text-sm">{user.email}</span>
              </button>
              <ul className="dropdown-content z-[1] menu p-2 shadow-2xl bg-base-100 rounded-box w-52 border border-emerald-100 animate-in fade-in duration-200">
                <li>
                  <Link to="/bookings" className="gap-2 no-underline hover:no-underline focus:no-underline hover:bg-emerald-50 hover:shadow-md transition-all duration-200 rounded-lg">
                    <Calendar size={18} className="text-emerald-600" />
                    Manage Bookings
                  </Link>
                </li>
                <li>
                  <Link to="/expenses" className="gap-2 no-underline hover:no-underline focus:no-underline hover:bg-blue-50 hover:shadow-md transition-all duration-200 rounded-lg">
                    <TrendingUp size={18} className="text-blue-600" />
                    Expenses & Revenue
                  </Link>
                </li>
                <li>
                  <a onClick={handleSignOut} className="gap-2 no-underline hover:no-underline focus:no-underline hover:bg-red-50 hover:shadow-md transition-all duration-200 rounded-lg">
                    <LogOut size={18} className="text-red-600" />
                    Sign Out
                  </a>
                </li>
              </ul>
            </div>
          </>
        ) : (
          <Link to="/" className="btn btn-sm btn-primary gap-2 hover:shadow-lg hover:scale-110 transition-all duration-300 no-underline hover:no-underline focus:no-underline">
            Sign In
          </Link>
        )}
      </div>
    </div>
  );
};

export default Navbar;