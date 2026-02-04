
import React, { useState, useEffect, useCallback } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import DriverTable from './DriverTable';
import BulkImportModal from './BulkImportModal';
import { Driver, Tournament, Round, DBRanking, TableColumn } from '../types';
import { supabase } from '../lib/supabase';

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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  
  // Manage Tournaments and Rounds State
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [dynamicColumns, setDynamicColumns] = useState<TableColumn[] | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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
    }
  }, [selectedRoundId]);

  useEffect(() => {
    fetchTournaments(true);
  }, []); // Remove fetchTournaments from dependency to avoid loop if not careful, but useCallback handles it.

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
  }, [selectedRoundId, refreshKey]);

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

  // Determine columns based on Tournament name or metadata (Mocking logic for now)
  const columns = React.useMemo(() => {
    if (dynamicColumns) return dynamicColumns;

    if (currentTournament?.name.includes('安全')) {
      return safetyColumns;
    }
    return defaultColumns;
  }, [currentTournament, dynamicColumns]);

  // CRUD Handlers
  const handleAddTournament = async () => {
    const name = prompt('请输入赛事名称:');
    if (name) {
      // Generate a simple UUID if database doesn't auto-generate
      const id = crypto.randomUUID();
      const { error } = await supabase
        .from('series')
        .insert([{ id, name }]);
      
      if (error) {
        alert('创建赛事失败: ' + error.message);
      } else {
        fetchTournaments();
      }
    }
  };

  const handleEditTournament = async (t: Tournament) => {
    const name = prompt('重命名赛事:', t.name);
    if (name && name !== t.name) {
      const { error } = await supabase
        .from('series')
        .update({ name })
        .eq('id', t.id);

      if (error) {
        alert('更新赛事失败: ' + error.message);
      } else {
        fetchTournaments();
      }
    }
  };

  const handleDeleteTournament = async (id: string) => {
    if (confirm('确定要删除此赛事及所有相关赛程吗？')) {
      const { error } = await supabase
        .from('series')
        .delete()
        .eq('id', id);

      if (error) {
        alert('删除赛事失败: ' + error.message);
      } else {
        if (currentTournament?.id === id) {
          setSelectedRoundId(null); // Deselect if current
        }
        fetchTournaments(true);
      }
    }
  };

  const handleAddRound = async (tId: string) => {
    const name = prompt('请输入新赛程名称:');
    if (name) {
      // Get current round count for sequence
      const tournament = tournaments.find(t => t.id === tId);
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
        alert('创建赛程失败: ' + error.message);
      } else {
        fetchTournaments();
      }
    }
  };

  const handleEditRound = async (r: Round) => {
    const name = prompt('重命名赛程:', r.name);
    if (name && name !== r.name) {
      const { error } = await supabase
        .from('rounds')
        .update({ name })
        .eq('id', r.id);

      if (error) {
        alert('更新赛程失败: ' + error.message);
      } else {
        fetchTournaments();
      }
    }
  };

  const handleDeleteRound = async (id: string) => {
    if (confirm('确定要删除此赛程吗？')) {
      const { error } = await supabase
        .from('rounds')
        .delete()
        .eq('id', id);

      if (error) {
        alert('删除赛程失败: ' + error.message);
      } else {
        if (selectedRoundId === id) {
          setSelectedRoundId(null);
        }
        fetchTournaments(true);
      }
    }
  };

  const handleClearData = async () => {
      if (!selectedRoundId) return;
      
      try {
          const { error } = await supabase
              .from('rankings')
              .delete()
              .eq('round_id', selectedRoundId);
          
          if (error) throw error;
          
          // Refresh
          setRefreshKey(prev => prev + 1);
          alert('数据已清除');
      } catch (err: any) {
          console.error('Error clearing data:', err);
          alert('清除数据失败: ' + err.message);
      }
  };

  return (
    <div className="flex h-screen bg-zinc-50 font-sans text-zinc-900 selection:bg-brand-blue/20">
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
        <Header onLogout={onLogout} />
        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight">车手积分榜</h2>
                <p className="text-sm text-zinc-500 font-medium mt-1">
                  当前位置: {currentTournament?.name || '未选择'} &gt; {currentRound?.name || '未选择'}
                </p>
              </div>
              <button 
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-zinc-900/20 active:scale-95 group"
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
            />
          </div>
        </main>
      </div>

      {isImportModalOpen && (
        <BulkImportModal 
          onClose={() => setIsImportModalOpen(false)} 
          roundId={selectedRoundId || undefined}
          onImportSuccess={() => {
            setIsImportModalOpen(false);
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
