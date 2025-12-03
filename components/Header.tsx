import React from 'react';
import { Wallet, LogOut, User as UserIcon, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  onReset?: () => void;
  onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({ onReset, onOpenSettings }) => {
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
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Wallet size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Finanças Pro</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Controle Pessoal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onOpenSettings}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              title="Configurações"
            >
              <Settings size={20} />
            </button>

            <div className="hidden sm:block text-right">
              <p className="text-xs text-slate-500 dark:text-slate-400">Usuário</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{user?.name || 'Usuário'}</p>
            </div>

            <div className="relative group">
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="h-9 w-9 rounded-full border border-slate-300 object-cover"
                />
              ) : (
                <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold border border-slate-300 dark:border-slate-600">
                  {user?.name ? getInitials(user.name) : <UserIcon size={18} />}
                </div>
              )}

              {/* Logout Tooltip/Button */}
              <button
                onClick={logout}
                className="absolute top-full right-0 mt-2 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-100 dark:border-slate-700 p-2 hidden group-hover:flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all z-20"
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
