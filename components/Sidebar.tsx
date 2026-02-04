
import React from 'react';
import { Tournament, Round } from '../types';

interface SidebarProps {
  tournaments: Tournament[];
  onAddTournament: () => void;
  onEditTournament: (t: Tournament) => void;
  onDeleteTournament: (id: string) => void;
  onAddRound: (tId: string) => void;
  onEditRound: (r: Round) => void;
  onDeleteRound: (id: string) => void;
  onSelectRound: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  tournaments,
  onAddTournament,
  onEditTournament,
  onDeleteTournament,
  onAddRound,
  onEditRound,
  onDeleteRound,
  onSelectRound
}) => {
  return (
    <aside className="w-80 bg-white border-r border-zinc-200 flex flex-col justify-between p-4 overflow-y-auto shrink-0">
      <div className="flex flex-col gap-6">
        <div>
          <div className="p-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">赛事列表</h3>
            <button 
              onClick={onAddTournament}
              className="text-zinc-400 hover:text-brand-blue transition-colors"
              title="新建赛事"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
            </button>
          </div>
          
          <div className="flex flex-col gap-4">
            {tournaments.map((t) => (
              <div key={t.id} className="group/tournament">
                <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-zinc-50 text-zinc-900 mb-1">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="material-symbols-outlined text-[18px] text-zinc-400">trophy</span>
                    <p className="text-sm font-bold truncate">{t.name}</p>
                  </div>
                  <div className="flex items-center opacity-0 group-hover/tournament:opacity-100 transition-opacity">
                    <button onClick={() => onEditTournament(t)} className="p-1 hover:text-brand-blue" title="编辑赛事">
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button onClick={() => onDeleteTournament(t.id)} className="p-1 hover:text-red-500" title="删除赛事">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>

                <div className="ml-6 flex flex-col gap-1 border-l-2 border-zinc-100 pl-3">
                  {t.rounds.map((r) => (
                    <div 
                      key={r.id} 
                      onClick={() => onSelectRound(r.id)}
                      className="group/round flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-zinc-50 cursor-pointer"
                    >
                      <p className={`text-xs font-medium ${r.isActive ? 'text-brand-blue font-bold' : 'text-zinc-500'}`}>
                        {r.name}
                      </p>
                      <div className="flex items-center opacity-0 group-hover/round:opacity-100 transition-opacity">
                        <button onClick={() => onEditRound(r)} className="p-0.5 hover:text-brand-blue" title="编辑赛程">
                          <span className="material-symbols-outlined text-xs">edit</span>
                        </button>
                        <button onClick={() => onDeleteRound(r.id)} className="p-0.5 hover:text-red-500" title="删除赛程">
                          <span className="material-symbols-outlined text-xs">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => onAddRound(t.id)}
                    className="flex items-center gap-1 px-2 py-1.5 text-xs text-zinc-400 hover:text-brand-blue transition-colors"
                  >
                    <span className="material-symbols-outlined text-xs">add</span>
                    <span>新增赛程</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="pt-6 mt-auto border-t border-zinc-100">
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <p className="text-xs font-bold text-zinc-600 uppercase tracking-tighter">当前服务器状态正常</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
