import React, { useState } from 'react';
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
  // Store collapsed state. By default (empty set), all are expanded? 
  // Changed: By default, we want them collapsed. 
  // Let's invert the logic or initialize with all IDs if we want them expanded, 
  // OR use a "expandedIds" set instead.
  // Using "collapsedIds" (if has ID -> collapsed).
  // To make them collapsed by default, we need to populate this set with all IDs initially?
  // Better: Use `expandedIds`. If has ID -> expanded. Default empty -> all collapsed.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleCollapse = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <aside className="w-80 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-full shrink-0 transition-colors duration-200">
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
        <div className="flex flex-col gap-6">
          <div>
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between rounded-t-xl">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">赛事列表</h3>
              <button 
                onClick={onAddTournament}
                className="text-zinc-400 hover:text-brand-blue transition-colors"
                title="新建赛事"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
              </button>
            </div>
            
            <div className="flex flex-col gap-4 mt-4">
              {tournaments.map((t) => {
                const isExpanded = expandedIds.has(t.id);
                return (
                  <div key={t.id} className="group/tournament">
                    <div 
                        className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white mb-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        onClick={() => toggleCollapse(t.id)}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className={`material-symbols-outlined text-[18px] text-zinc-400 transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>expand_more</span>
                        <p className="text-sm font-bold truncate select-none">{t.name}</p>
                      </div>
                      <div className="flex items-center opacity-0 group-hover/tournament:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button onClick={() => onEditTournament(t)} className="p-1 hover:text-brand-blue text-zinc-400" title="编辑赛事">
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button onClick={() => onDeleteTournament(t.id)} className="p-1 hover:text-red-500 text-zinc-400" title="删除赛事">
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </div>

                    <div className={`ml-6 flex flex-col gap-1 border-l-2 border-zinc-100 dark:border-zinc-800 pl-3 overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                      {t.rounds.map((r) => (
                        <div 
                          key={r.id} 
                          onClick={() => onSelectRound(r.id)}
                          className={`group/round flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors ${r.isActive ? 'bg-brand-blue/10 dark:bg-brand-blue/20' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                        >
                          <p className={`text-xs font-medium truncate ${r.isActive ? 'text-brand-blue font-bold' : 'text-zinc-500 dark:text-zinc-400'}`}>
                            {r.name}
                          </p>
                          <div className="flex items-center opacity-0 group-hover/round:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); onEditRound(r); }} className="p-0.5 hover:text-brand-blue text-zinc-400" title="编辑赛程">
                              <span className="material-symbols-outlined text-xs">edit</span>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onDeleteRound(r.id); }} className="p-0.5 hover:text-red-500 text-zinc-400" title="删除赛程">
                              <span className="material-symbols-outlined text-xs">delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                      <button 
                        onClick={() => onAddRound(t.id)}
                        className="flex items-center gap-1 px-2 py-1.5 text-xs text-zinc-400 hover:text-brand-blue transition-colors mt-1"
                      >
                        <span className="material-symbols-outlined text-xs">add</span>
                        <span>新增赛程</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* Pinned Service Status */}
      <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-950">
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-tighter">当前服务器状态正常</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
