
import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import ChangePasswordModal from './ChangePasswordModal';

interface HeaderProps {
  onLogout: () => void;
  onShowLogs: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLogout, onShowLogs }) => {
  const { theme, toggleTheme } = useTheme();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between whitespace-nowrap border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-8 py-4 sticky top-0 z-50 transition-colors duration-200">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4 text-zinc-900 dark:text-white">
            <h2 className="text-xl font-black leading-tight tracking-tight">MOZA 赛事排名管理系统</h2>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex gap-2">
            <button 
              className="flex items-center justify-center rounded-lg w-10 h-10 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              onClick={toggleTheme}
              title={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
            >
              <span className="material-symbols-outlined text-[20px]">
                {theme === 'light' ? 'dark_mode' : 'light_mode'}
              </span>
            </button>
            <button 
              className="flex items-center justify-center gap-2 rounded-lg px-3 h-10 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors" 
              title="操作日志"
              onClick={onShowLogs}
            >
              <span className="material-symbols-outlined text-[20px]">receipt_long</span>
              <span className="text-xs font-bold">操作日志</span>
            </button>
          </div>
          
          <div className="relative">
            <div 
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-10 h-10 border border-zinc-200 dark:border-zinc-700 cursor-pointer shadow-sm hover:ring-2 ring-brand-blue/50 transition-all" 
              style={{ backgroundImage: `url('https://picsum.photos/id/64/100/100')` }}
              onClick={() => setShowUserMenu(!showUserMenu)}
            ></div>
            
            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)}></div>
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden py-1 animate-fade-in">
                  <button 
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowPasswordModal(true);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">lock</span>
                    修改密码
                  </button>
                  <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1"></div>
                  <button 
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    退出登录
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </>
  );
};

export default Header;
