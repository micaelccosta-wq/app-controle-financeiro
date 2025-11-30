import React from 'react';
import { Wallet, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  onReset?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onReset }) => {
  const { user, logout } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Wallet size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Finanças Pro</h1>
              <p className="text-xs text-slate-500 font-medium">Controle Pessoal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-xs text-slate-500">Usuário</p>
              <p className="text-sm font-semibold text-slate-800">{user?.name || 'Usuário'}</p>
            </div>

            <div className="relative group">
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="h-9 w-9 rounded-full border border-slate-300 object-cover"
                />
              ) : (
                <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-300">
                  {user?.name ? getInitials(user.name) : <UserIcon size={18} />}
                </div>
              )}

              {/* Logout Tooltip/Button */}
              <button
                onClick={logout}
                className="absolute top-full right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-slate-100 p-2 hidden group-hover:flex items-center gap-2 text-sm text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-all z-20"
              >
                <LogOut size={14} />
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
