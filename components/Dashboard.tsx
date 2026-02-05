import React, { useState, useEffect, useCallback } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import DriverTable from './DriverTable';
import BulkImportModal from './BulkImportModal';
import EditDriverModal from './EditDriverModal';
import { Driver, Tournament, Round, DBRanking, TableColumn } from '../types';
import { supabase } from '../lib/supabase';
import { useUI } from '../context/UIContext';

interface DashboardProps {
  onLogout: () => void;
}

const defaultColumns: TableColumn[] = [
  { key: 'rank', label: '排名', sortable: true },
  { key: 'name', label: '车手姓名', sortable: true },
  { key: 'team', label: '车队' },
  { key: 'car', label: '车型' },
  { key: 'bestLap', label: '最快圈速', sortable: true },
  { key: 'points', label: '积分', sortable: true },
];

const safetyColumns: TableColumn[] = [
  { key: 'rank', label: '排名', sortable: true },
  { key: 'name', label: '车手姓名', sortable: true },
  { key: 'safetyScore', label: '安全分', sortable: true },
  { key: 'podiums', label: '登台数', sortable: true },
  { key: 'finishedRaces', label: '完赛数', sortable: true },
  { key: 'points', label: '积分', sortable: true },
];

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const { showToast, showConfirm, showInput } = useUI();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [logs, setLogs] = useState<{id: string, action: string, created_at: string, details: string, tournament_name?: string}[]>([]);
  
  // Manage Tournaments and Rounds State
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [dynamicColumns, setDynamicColumns] = useState<TableColumn[] | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Derived state for Sidebar (handling isActive)
  const displayTournaments = tournaments.map(t => ({
    ...t,
    rounds: t.rounds.map(r => ({
      ...r,
      isActive: r.id === selectedRoundId
    }))
  }));

  // Find current selection details for Header
  const currentRound = displayTournaments
    .flatMap(t => t.rounds)
    .find(r => r.id === selectedRoundId);
    
  const currentTournament = displayTournaments
    .find(t => t.rounds.some(r => r.id === selectedRoundId));

  // Fetch Logs
  const fetchLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      if (data) setLogs(data);
    } catch (error) {
      console.error('Error fetching logs:', error);
      // Fail silently for logs
    }
  }, []);

  // Load logs when modal opens
  useEffect(() => {
    if (isLogsModalOpen) {
      fetchLogs();
    }
  }, [isLogsModalOpen, fetchLogs]);

  const addLog = async (action: string, details: string, tournamentNameOverride?: string) => {
    try {
      // Use override if provided, otherwise current tournament, otherwise '未知赛事'
      // NOTE: For 'New Tournament', currentTournament might be undefined or old selection.
      const tName = tournamentNameOverride || currentTournament?.name || '未知赛事';

      const { error } = await supabase
        .from('logs')
        .insert([{
          action,
          details,
          tournament_name: tName
        }]);

      if (error) throw error;
      
      // If modal is open, refresh logs
      if (isLogsModalOpen) {
        fetchLogs();
      }
    } catch (err) {
      console.error('Failed to add log:', err);
    }
  };

  // Fetch Series and Rounds
  const fetchTournaments = useCallback(async (selectFirstRound = false) => {
    try {
      const { data: seriesData, error: seriesError } = await supabase
        .from('series')
        .select('*')
        .order('created_at');
      
      const { data: roundsData, error: roundsError } = await supabase
        .from('rounds')
        .select('*')
        .order('sequence');

      if (seriesError) console.error('Error fetching series:', seriesError);
      if (roundsError) console.error('Error fetching rounds:', roundsError);

      if (seriesData && roundsData) {
        const formattedTournaments: Tournament[] = seriesData.map(series => ({
          id: series.id,
          name: series.name,
          rounds: roundsData
            .filter(round => round.series_id === series.id)
            .map(round => ({
              id: round.id,
              name: round.name,
              isActive: false
            }))
        }));
        setTournaments(formattedTournaments);

        // Select the first round by default if none selected or requested
        if (selectFirstRound && !selectedRoundId && roundsData.length > 0) {
          // Find the first round of the first tournament
           const firstRound = roundsData.find(r => r.series_id === seriesData[0]?.id);
           if (firstRound) setSelectedRoundId(firstRound.id);
           else if (roundsData[0]) setSelectedRoundId(roundsData[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      showToast('加载数据失败', 'error');
    }
  }, [selectedRoundId, showToast]);

  useEffect(() => {
    fetchTournaments(true);
  }, []); 

  // Fetch Rankings when Round changes
  useEffect(() => {
    if (!selectedRoundId) return;

    const fetchRankings = async () => {
      try {
        const { data, error } = await supabase
          .from('rankings')
          .select('*')
          .eq('round_id', selectedRoundId)
          .order('rank');

        if (error) {
          console.error('Error fetching rankings:', error);
          showToast('获取排名失败', 'error');
          return;
        }

        if (data) {
          // 1. Check for Metadata Row
          const metadataRow = data.find(r => r.driver_id === '__METADATA__');
          let currentDynamicCols: TableColumn[] | null = null;

          if (metadataRow && metadataRow.display_races) {
             try {
                const meta = JSON.parse(metadataRow.display_races);
                if (meta.columns && Array.isArray(meta.columns)) {
                   currentDynamicCols = meta.columns.map((col: string) => ({
                      key: col,
                      label: col,
                      sortable: true, // Allow sorting by default
                      // Custom render to pull from rawData
                      render: (val: any, row: Driver) => {
                         return row.rawData ? row.rawData[col] : '-';
                      }
                   }));
                }
             } catch (e) {
                console.error('Failed to parse metadata columns', e);
             }
          }
          setDynamicColumns(currentDynamicCols);

          // 2. Filter out Metadata row and Map Drivers
          const realData = data.filter(r => r.driver_id !== '__METADATA__');

          const mappedDrivers: Driver[] = realData.map((r: DBRanking) => {
            let rawData = {};
            try {
                if (r.display_races) {
                    rawData = JSON.parse(r.display_races);
                }
            } catch (e) { console.error('Error parsing row data', e); }

            return {
              id: r.id.toString(),
              rank: r.rank,
              name: r.driver_id,
              team: '-', 
              car: r.tier || '-', 
              bestLap: '-', 
              points: r.points,
              status: 'normal',
              safetyScore: r.safety_score,
              podiums: r.podiums,
              finishedRaces: r.finished_races,
              totalRaces: r.total_races,
              displayRaces: r.display_races || undefined,
              rawData: rawData
            };
          });
          setDrivers(mappedDrivers);
        } else {
            setDrivers([]);
            setDynamicColumns(null);
        }
      } catch (error) {
        console.error('Error loading rankings:', error);
      }
    };

    fetchRankings();
  }, [selectedRoundId, refreshKey, showToast]);

  // Determine columns based on Tournament name or metadata
  const columns = React.useMemo(() => {
    if (dynamicColumns) return dynamicColumns;

    if (currentTournament?.name.includes('安全')) {
      return safetyColumns;
    }
    return defaultColumns;
  }, [currentTournament, dynamicColumns]);

  // CRUD Handlers
  const handleUpdateDriver = async (updatedDriver: Driver) => {
    try {
        const { error } = await supabase
            .from('rankings')
            .update({
                rank: updatedDriver.rank,
                points: updatedDriver.points,
                display_races: JSON.stringify(updatedDriver.rawData)
            })
            .eq('id', updatedDriver.id);

        if (error) throw error;

        addLog('更新车手', `更新了车手 [${updatedDriver.name}] 的数据`);
        setRefreshKey(prev => prev + 1);
        showToast('车手数据更新成功', 'success');
    } catch (err: any) {
        console.error('Update failed:', err);
        showToast('更新失败: ' + err.message, 'error');
    }
  };

  const handleAddTournament = async () => {
    showInput({
      title: '新建赛事',
      placeholder: '请输入赛事名称',
      onConfirm: async (name) => {
        if (name) {
          const id = crypto.randomUUID();
          const { error } = await supabase
            .from('series')
            .insert([{ id, name }]);
          
          if (error) {
            showToast('创建赛事失败: ' + error.message, 'error');
          } else {
            // Explicitly pass name because currentTournament is not selected yet
            addLog('新建赛事', `创建了新赛事: ${name}`, name);
            fetchTournaments();
            showToast('赛事创建成功', 'success');
          }
        }
      }
    });
  };

  const handleEditTournament = async (t: Tournament) => {
    showInput({
      title: '重命名赛事',
      defaultValue: t.name,
      onConfirm: async (name) => {
        if (name && name !== t.name) {
          const { error } = await supabase
            .from('series')
            .update({ name })
            .eq('id', t.id);

          if (error) {
            showToast('更新赛事失败: ' + error.message, 'error');
          } else {
            // Explicitly pass new name
            addLog('重命名赛事', `将赛事重命名为: ${name}`, name);
            fetchTournaments();
            showToast('赛事重命名成功', 'success');
          }
        }
      }
    });
  };

  const handleDeleteTournament = async (id: string) => {
    // Find tournament name before deleting
    const tName = tournaments.find(t => t.id === id)?.name || '未知赛事';
    
    showConfirm({
      title: '删除赛事',
      message: '确定要删除此赛事及所有相关赛程吗？此操作不可恢复。',
      confirmText: '删除',
      isDestructive: true,
      onConfirm: async () => {
        const { error } = await supabase
          .from('series')
          .delete()
          .eq('id', id);

        if (error) {
          showToast('删除赛事失败: ' + error.message, 'error');
        } else {
          // Explicitly pass name
          addLog('删除赛事', `删除了赛事: ${tName}`, tName);
          if (currentTournament?.id === id) {
            setSelectedRoundId(null);
          }
          fetchTournaments(true);
          showToast('赛事已删除', 'success');
        }
      }
    });
  };

  const handleAddRound = async (tId: string) => {
    const tournament = tournaments.find(t => t.id === tId);
    
    showInput({
      title: '新建赛程',
      placeholder: '请输入赛程名称',
      onConfirm: async (name) => {
        if (name) {
          const sequence = tournament ? tournament.rounds.length + 1 : 1;
          const id = crypto.randomUUID();

          const { error } = await supabase
            .from('rounds')
            .insert([{ 
              id,
              name, 
              series_id: tId,
              sequence
            }]);

          if (error) {
            showToast('创建赛程失败: ' + error.message, 'error');
          } else {
            addLog('新建赛程', `在赛事 [${tournament?.name}] 中创建了新赛程: ${name}`, tournament?.name);
            fetchTournaments();
            showToast('赛程创建成功', 'success');
          }
        }
      }
    });
  };

  const handleEditRound = async (r: Round) => {
    showInput({
      title: '重命名赛程',
      defaultValue: r.name,
      onConfirm: async (name) => {
        if (name && name !== r.name) {
          const { error } = await supabase
            .from('rounds')
            .update({ name })
            .eq('id', r.id);

          if (error) {
            showToast('更新赛程失败: ' + error.message, 'error');
          } else {
            addLog('重命名赛程', `将赛程重命名为: ${name}`);
            fetchTournaments();
            showToast('赛程重命名成功', 'success');
          }
        }
      }
    });
  };

  const handleDeleteRound = async (id: string) => {
    showConfirm({
      title: '删除赛程',
      message: '确定要删除此赛程吗？所有相关排名数据将被清除。',
      confirmText: '删除',
      isDestructive: true,
      onConfirm: async () => {
        const { error } = await supabase
          .from('rounds')
          .delete()
          .eq('id', id);

        if (error) {
          showToast('删除赛程失败: ' + error.message, 'error');
        } else {
          addLog('删除赛程', `删除了赛程ID: ${id}`);
          if (selectedRoundId === id) {
            setSelectedRoundId(null);
          }
          fetchTournaments(true);
          showToast('赛程已删除', 'success');
        }
      }
    });
  };

  const handleClearData = async () => {
      if (!selectedRoundId) return;
      
      try {
          const { error } = await supabase
              .from('rankings')
              .delete()
              .eq('round_id', selectedRoundId);
          
          if (error) throw error;
          
          setRefreshKey(prev => prev + 1);
          addLog('清空数据', `清空了赛程 [${currentRound?.name}] 的所有排名数据`);
          showToast('数据已清除', 'success');
      } catch (err: any) {
          console.error('Error clearing data:', err);
          showToast('清除数据失败: ' + err.message, 'error');
      }
  };

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 selection:bg-brand-blue/20 transition-colors duration-200">
      <Sidebar 
        tournaments={displayTournaments}
        onAddTournament={handleAddTournament}
        onEditTournament={handleEditTournament}
        onDeleteTournament={handleDeleteTournament}
        onAddRound={handleAddRound}
        onEditRound={handleEditRound}
        onDeleteRound={handleDeleteRound}
        onSelectRound={setSelectedRoundId}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onLogout={onLogout} onShowLogs={() => setIsLogsModalOpen(true)} />
        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">车手积分榜</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-1">
                  当前位置: {currentTournament?.name || '未选择'} &gt; {currentRound?.name || '未选择'}
                </p>
              </div>
              <button 
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-zinc-900/20 active:scale-95 group"
              >
                <span className="material-symbols-outlined text-[20px] group-hover:rotate-12 transition-transform">upload_file</span>
                <span className="text-sm font-bold">批量导入数据</span>
              </button>
            </div>

            <DriverTable 
                drivers={drivers} 
                columns={dynamicColumns || defaultColumns} 
                onOpenImport={() => setIsImportModalOpen(true)}
                onClearData={handleClearData}
                onEditDriver={setEditingDriver}
            />
          </div>
        </main>
      </div>

      {editingDriver && (
        <EditDriverModal 
            driver={editingDriver}
            onClose={() => setEditingDriver(null)}
            onSave={handleUpdateDriver}
        />
      )}

      {isImportModalOpen && (
        <BulkImportModal 
          onClose={() => setIsImportModalOpen(false)} 
          roundId={selectedRoundId || undefined}
          tournamentName={currentTournament?.name}
          onImportSuccess={() => {
            setIsImportModalOpen(false);
            setRefreshKey(prev => prev + 1);
            addLog('导入数据', `在赛程 [${currentRound?.name}] 中导入了新数据`);
            showToast('数据导入成功', 'success');
          }}
        />
      )}

      {isLogsModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 p-6 bg-white dark:bg-zinc-900">
              <h2 className="text-zinc-900 dark:text-white text-xl font-bold">系统操作日志</h2>
              <button onClick={() => setIsLogsModalOpen(false)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                    {logs.length === 0 ? (
                        <div className="text-center text-zinc-400 text-sm py-8">
                            暂无更多操作记录
                        </div>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className="flex items-start gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-700">
                                <span className="material-symbols-outlined text-zinc-400 mt-0.5">info</span>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{log.action}</p>
                                        {log.tournament_name && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-medium">
                                                {log.tournament_name}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-1">{new Date(log.created_at).toLocaleString()}</p>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">{log.details}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
