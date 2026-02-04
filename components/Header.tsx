
import React from 'react';

interface HeaderProps {
  onLogout: () => void;
  onShowLogs: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLogout, onShowLogs }) => {
  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-zinc-200 bg-white px-8 py-4 sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-4 text-zinc-900">
          <h2 className="text-xl font-black leading-tight tracking-tight text-zinc-900">MOZA 赛事排名管理系统</h2>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex gap-2">
          <button 
            className="flex items-center justify-center gap-2 rounded-lg px-3 h-10 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition-colors" 
            title="操作日志"
            onClick={onShowLogs}
          >
            <span className="material-symbols-outlined text-[20px]">receipt_long</span>
            <span className="text-xs font-bold">操作日志</span>
          </button>
          <button className="flex items-center justify-center rounded-lg w-10 h-10 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition-colors" onClick={onLogout} title="退出登录">
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
        <div 
          className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-10 h-10 border border-zinc-200 cursor-pointer shadow-sm" 
          style={{ backgroundImage: `url('https://picsum.photos/id/64/100/100')` }}
        ></div>
      </div>
    </header>
  );
};

export default Header;
