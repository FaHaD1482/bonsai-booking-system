import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="footer items-center justify-center p-6 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white border-t border-emerald-700">
      <div className="text-center">
        <p className="text-sm opacity-90">© <>{new Date().getFullYear()}</> Bonsai Eco Village. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;