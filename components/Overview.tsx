import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Tournament, Round } from '../types';

interface OverviewProps {
  tournaments: Tournament[];
  logs: {id: string, action: string, created_at: string, details: string, tournament_name?: string}[];
  refreshKey: number;
  onViewAllLogs: () => void;
}

const Overview: React.FC<OverviewProps> = ({ tournaments, logs, refreshKey, onViewAllLogs }) => {
  const [totalDrivers, setTotalDrivers] = useState(0);
  const [newDriversCount, setNewDriversCount] = useState(0);
  const [oldDriversCount, setOldDriversCount] = useState(0);
  const [driverTrend, setDriverTrend] = useState<number>(0); // Percentage
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('-');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('all');

  // Derived stats filtered by selection
  const filteredTournaments = useMemo(() => {
    if (selectedTournamentId === 'all') return tournaments;
    return tournaments.filter(t => String(t.id) === selectedTournamentId);
  }, [tournaments, selectedTournamentId]);

  const displayTournamentsCount = filteredTournaments.length;
  const displayRoundsCount = filteredTournaments.reduce((acc, t) => acc + t.rounds.length, 0);

  useEffect(() => {
    fetchDriverStats();
  }, [refreshKey, tournaments, selectedTournamentId]);

  const fetchDriverStats = async () => {
    try {
      setIsLoading(true);
      
      // Build query
      let query = supabase
        .from('rankings')
        .select('driver_id, created_at, round_id')
        .order('created_at', { ascending: true });

      // If specific tournament selected, we need to filter by round_ids belonging to that tournament
      let targetRoundIds: string[] = [];
      if (selectedTournamentId !== 'all') {
        const tournament = tournaments.find(t => String(t.id) === selectedTournamentId);
        if (tournament) {
          // Ensure IDs are strings for the IN clause if needed, though Supabase handles numbers too
          targetRoundIds = tournament.rounds.map(r => r.id);
          
          // Note: Supabase 'in' filter for array of IDs
          if (targetRoundIds.length > 0) {
            query = query.in('round_id', targetRoundIds);
          } else {
             // Selected tournament has no rounds, so no data
             setTotalDrivers(0);
             setNewDriversCount(0);
             setOldDriversCount(0);
             setLastUpdateTime('-');
             setDriverTrend(0);
             setIsLoading(false);
             return;
          }
        }
      }

      const { data: rankings, error } = await query;

      if (error) throw error;
      if (!rankings || rankings.length === 0) {
        setTotalDrivers(0);
        setNewDriversCount(0);
        setOldDriversCount(0);
        setLastUpdateTime('-');
        setDriverTrend(0);
        setIsLoading(false);
        return;
      }

      // Last Update Time
      const lastUpdate = rankings.reduce((max, r) => r.created_at > max ? r.created_at : max, rankings[0].created_at);
      setLastUpdateTime(new Date(lastUpdate).toLocaleString('zh-CN', { 
        year: 'numeric', month: '2-digit', day: '2-digit', 
        hour: '2-digit', minute: '2-digit', second: '2-digit' 
      }));

      // Calculate New vs Old Logic
      // "New" = Drivers who appeared ONLY in the LATEST round (of the selection).
      // "Old" = Drivers who appeared in ANY PREVIOUS round.
      
      // 1. Identify rounds and their timestamps (or just order by created_at) to find "Latest Round"
      // Since we don't have round dates easily, we can use the 'created_at' of the ranking entries as proxy,
      // OR we just look at the set of round_ids present in the data.
      // But rounds don't have explicit order in 'rankings' table other than 'created_at'.
      // Let's group by round_id and find the one with the latest max(created_at).
      
      const roundMaxDates = new Map<string, string>();
      rankings.forEach(r => {
          if (!roundMaxDates.has(r.round_id) || r.created_at > roundMaxDates.get(r.round_id)!) {
              roundMaxDates.set(r.round_id, r.created_at);
          }
      });
      
      // Find the round_id with the latest date
      let latestRoundId = '';
      let maxDate = '';
      roundMaxDates.forEach((date, rId) => {
          if (date > maxDate) {
              maxDate = date;
              latestRoundId = rId;
          }
      });

      // 2. Classify drivers
      const driversInLatest = new Set<string>();
      const driversInPrevious = new Set<string>();
      const allDrivers = new Set<string>();

      rankings.forEach(r => {
          if (r.driver_id === '__METADATA__') return;
          allDrivers.add(r.driver_id);
          
          if (r.round_id === latestRoundId) {
              driversInLatest.add(r.driver_id);
          } else {
              driversInPrevious.add(r.driver_id);
          }
      });

      const totalUnique = allDrivers.size;
      setTotalDrivers(totalUnique);

      // "New" driver = In Latest AND NOT In Previous
      let newCount = 0;
      driversInLatest.forEach(dId => {
          if (!driversInPrevious.has(dId)) {
              newCount++;
          }
      });

      // "Old" driver = Everyone else (Total - New) 
      // OR (In Previous) -> Logic: Old drivers are those who have raced before. 
      // If a driver raced before and also in latest, they are OLD.
      // If a driver raced before and NOT in latest, they are OLD.
      // So Old = Total - New.
      const oldCount = totalUnique - newCount;

      setNewDriversCount(newCount);
      setOldDriversCount(oldCount);
      
      // Trend calculation (Growth of pool due to latest round)
      const growth = totalUnique > 0 ? Math.round((newCount / totalUnique) * 100) : 0;
      setDriverTrend(growth);

    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard = ({ title, value, subtext, icon, color, loading }: any) => (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between h-40">
      <div className="flex justify-between items-start">
        <span className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">{title}</span>
        <div className={`p-2 rounded-lg ${color}`}>
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </div>
      </div>
      <div>
        {loading ? (
            <div className="h-8 w-24 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded"></div>
        ) : (
            <h3 className="text-3xl xl:text-4xl font-black text-zinc-900 dark:text-white tracking-tight truncate" title={String(value)}>{value}</h3>
        )}
        <p className="text-zinc-400 text-xs mt-2 font-medium">{subtext}</p>
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">仪表盘</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">系统概览与数据统计</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="赛事数量" 
          value={displayTournamentsCount} 
          subtext="项活跃赛事" 
          icon="trophy" 
          color="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
          loading={isLoading}
        />
        <StatCard 
          title="赛程数量" 
          value={displayRoundsCount} 
          subtext="本季赛程" 
          icon="calendar_month" 
          color="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
          loading={isLoading}
        />
        <StatCard 
          title="车手数量" 
          value={totalDrivers} 
          subtext={`新一轮次增长 ${driverTrend}%`} 
          icon="groups" 
          color="bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
          loading={isLoading}
        />
        <StatCard 
          title="数据最后更新时间" 
          value={lastUpdateTime.split(' ')[0]} 
          subtext={lastUpdateTime.split(' ')[1] || ''} 
          icon="history" 
          color="bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
          loading={isLoading}
        />
      </div>

      {/* Charts & Logs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Driver Ratio */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-zinc-900 dark:text-white">新旧车手占比</h3>
            <div className="relative group/menu">
                <button className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                    <span className="material-symbols-outlined">more_horiz</span>
                </button>
                {/* Dropdown Menu */}
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-10 hidden group-hover/menu:block hover:block p-1">
                    <div className="text-xs font-bold text-zinc-400 px-3 py-2 uppercase tracking-wider">选择赛事范围</div>
                    <button 
                        onClick={() => setSelectedTournamentId('all')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedTournamentId === 'all' ? 'bg-brand-blue/10 text-brand-blue font-bold' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
                    >
                        全部赛事
                    </button>
                    {tournaments.map(t => (
                        <button 
                            key={t.id}
                            onClick={() => setSelectedTournamentId(String(t.id))}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate ${selectedTournamentId === String(t.id) ? 'bg-brand-blue/10 text-brand-blue font-bold' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
                        >
                            {t.name}
                        </button>
                    ))}
                </div>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center relative min-h-[250px]">
             {/* Simple CSS Donut Chart */}
             <div className="relative w-48 h-48 rounded-full" 
                style={{
                    background: `conic-gradient(
                        #3b82f6 0% ${isLoading ? 0 : (oldDriversCount / (totalDrivers || 1)) * 100}%, 
                        #a855f7 ${isLoading ? 0 : (oldDriversCount / (totalDrivers || 1)) * 100}% 100%
                    )`
                }}
             >
                <div className="absolute inset-4 bg-white dark:bg-zinc-900 rounded-full flex flex-col items-center justify-center">
                    <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">{selectedTournamentId === 'all' ? '总注册' : '赛事车手'}</span>
                    <span className="text-3xl font-black text-zinc-900 dark:text-white">{isLoading ? '-' : (totalDrivers > 1000 ? (totalDrivers/1000).toFixed(1) + 'k+' : totalDrivers)}</span>
                </div>
             </div>
          </div>

          <div className="flex justify-around mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
             <div className="text-center">
                <div className="flex items-center gap-2 mb-1 justify-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-zinc-500 text-sm">老车手</span>
                </div>
                <p className="font-bold text-lg text-zinc-900 dark:text-white">
                    {isLoading ? '-' : ((oldDriversCount / (totalDrivers || 1)) * 100).toFixed(1)}%
                </p>
             </div>
             <div className="text-center">
                <div className="flex items-center gap-2 mb-1 justify-center">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-zinc-500 text-sm">新车手</span>
                </div>
                <p className="font-bold text-lg text-zinc-900 dark:text-white">
                    {isLoading ? '-' : ((newDriversCount / (totalDrivers || 1)) * 100).toFixed(1)}%
                </p>
             </div>
          </div>
        </div>

        {/* Right: Recent Logs */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-zinc-900 dark:text-white">近期操作更新通知</h3>
                <button onClick={onViewAllLogs} className="text-brand-blue text-sm font-bold hover:underline">查看全部日志</button>
            </div>

            <div className="space-y-6">
                {logs.slice(0, 4).map((log, idx) => {
                    let icon = 'info';
                    let bg = 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400';
                    
                    if (log.action.includes('导入')) { icon = 'upload_file'; bg = 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'; }
                    if (log.action.includes('删除')) { icon = 'delete'; bg = 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'; }
                    if (log.action.includes('新建') || log.action.includes('添加')) { icon = 'add_circle'; bg = 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'; }
                    if (log.action.includes('修改') || log.action.includes('更新')) { icon = 'edit'; bg = 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'; }

                    return (
                        <div key={log.id} className="flex gap-4 group">
                            <div className="flex flex-col items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${bg}`}>
                                    <span className="material-symbols-outlined text-[20px]">{icon}</span>
                                </div>
                                {idx !== 3 && <div className="w-0.5 flex-1 bg-zinc-100 dark:bg-zinc-800 mt-2 group-last:hidden"></div>}
                            </div>
                            <div className="flex-1 pb-2">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-zinc-900 dark:text-white text-sm">{log.action} : {log.tournament_name || '系统操作'}</h4>
                                    <span className="text-xs text-zinc-400 font-mono whitespace-nowrap ml-2">
                                        {new Date(log.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1 leading-relaxed">
                                    {log.details}
                                </p>
                            </div>
                        </div>
                    );
                })}
                
                {logs.length === 0 && (
                    <div className="text-center py-12 text-zinc-400 text-sm">暂无近期操作记录</div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
