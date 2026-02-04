import React, { useState } from 'react';
import { Driver, TableColumn } from '../types';

interface DriverTableProps {
  drivers: Driver[];
  columns: TableColumn[];
  onOpenImport: () => void;
  onClearData?: () => void;
  onEditDriver?: (driver: Driver) => void;
}

const DriverTable: React.FC<DriverTableProps> = ({ drivers, columns, onOpenImport, onClearData, onEditDriver }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const itemsPerPage = 10;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const filteredDrivers = drivers.filter(driver => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    
    // Search in standard fields
    if (driver.name.toLowerCase().includes(q)) return true;
    if (driver.team.toLowerCase().includes(q)) return true;
    if (driver.car.toLowerCase().includes(q)) return true;

    // Search in rawData (dynamic fields)
    if (driver.rawData) {
        return Object.values(driver.rawData).some(val => 
            String(val).toLowerCase().includes(q)
        );
    }
    
    return false;
  });

  const sortedDrivers = [...filteredDrivers].sort((a, b) => {
    if (!sortKey) return 0;
    
    // Helper to get value from either direct property or rawData
    const getVal = (obj: Driver, k: string) => {
        if (k in obj) return (obj as any)[k];
        if (obj.rawData && k in obj.rawData) return obj.rawData[k];
        return undefined;
    };

    const valA = getVal(a, sortKey);
    const valB = getVal(b, sortKey);
    
    if (valA === undefined || valB === undefined) return 0;
    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination Logic
  const totalPages = Math.ceil(sortedDrivers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDrivers = sortedDrivers.slice(startIndex, startIndex + itemsPerPage);

  const handleClearData = async () => {
      if (confirm('确定要清除当前列表的所有数据吗？此操作不可撤销。')) {
          if (onClearData) {
              onClearData();
          }
      }
  };

  const handleExport = () => {
      // Export filteredDrivers to CSV
      if (filteredDrivers.length === 0) {
          alert('没有数据可导出');
          return;
      }

      // Determine headers
      const csvHeaders = columns.map(c => c.label);
      const csvKeys = columns.map(c => c.key);

      const csvRows = filteredDrivers.map(d => {
          return csvKeys.map(k => {
              // Same logic as getVal
              let val: any = '';
              if (k in d) val = (d as any)[k];
              else if (d.rawData && k in d.rawData) val = d.rawData[k];
              
              // Escape quotes
              const strVal = String(val ?? '');
              if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
                  return `"${strVal.replace(/"/g, '""')}"`;
              }
              return strVal;
          }).join(',');
      });

      const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `export_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
      <div className="flex justify-between items-center gap-2 px-6 py-4 border-b border-zinc-100">
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
             <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">筛选:</span>
             <div className="flex items-center bg-zinc-50 rounded-md border border-zinc-200 p-0.5">
               <select 
                 className="text-xs border-none bg-transparent py-0.5 pl-2 pr-6 text-zinc-700 focus:ring-0 cursor-pointer"
                 onChange={(e) => {
                    const key = e.target.value;
                    if (key) {
                        setSortKey(key);
                        setSortDirection('asc'); // Reset to asc when changing key
                    } else {
                        setSortKey(null);
                    }
                 }}
                 value={sortKey || ''}
               >
                 <option value="">默认排序</option>
                 {columns.filter(c => c.sortable).map(c => (
                   <option key={c.key} value={c.key}>{c.label}</option>
                 ))}
               </select>
               <button 
                 onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                 className={`p-1 rounded hover:bg-zinc-200 transition-colors ${!sortKey ? 'opacity-50 cursor-not-allowed' : ''}`}
                 disabled={!sortKey}
                 title={sortDirection === 'asc' ? '升序' : '降序'}
               >
                 <span className="material-symbols-outlined text-[16px] text-zinc-500">
                    {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                 </span>
               </button>
             </div>
           </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input 
              type="text" 
              placeholder="搜索车手..." 
              value={searchQuery}
              onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset to first page on search
              }}
              className="pl-8 pr-4 py-1.5 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-brand-blue focus:border-brand-blue w-48 transition-all"
            />
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">search</span>
          </div>
          
          <button 
            className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
            onClick={handleClearData}
            title="清除当前所有数据"
          >
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </button>

          <button 
            className="p-2 text-zinc-400 hover:text-brand-blue transition-colors"
            onClick={handleExport}
            title="导出报表"
          >
            <span className="material-symbols-outlined text-[20px]">download</span>
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-zinc-50 border-b border-zinc-100 sticky top-0 z-10">
            <tr>
              {columns.map((col) => (
                <th 
                  key={col.key} 
                  className={`px-6 py-4 text-[11px] font-black text-zinc-400 uppercase tracking-widest ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {col.label}
                </th>
              ))}
              <th className="px-6 py-4 text-[11px] font-black text-zinc-400 uppercase tracking-widest text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {paginatedDrivers.map((driver) => (
              <tr key={driver.id} className="hover:bg-zinc-50/50 transition-colors group">
                {columns.map((col) => (
                  <td 
                    key={`${driver.id}-${col.key}`} 
                    className={`px-6 py-4 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    {col.render ? col.render(driver[col.key] as any, driver) : (
                       // Default rendering logic based on known keys if no custom render
                       col.key === 'rank' ? (
                          <span className={`inline-flex items-center justify-center font-black text-xs ${
                            driver.rank <= 3 ? 'text-brand-blue' : 'text-zinc-400'
                          }`}>
                            #{driver.rank.toString().padStart(2, '0')}
                          </span>
                       ) :
                       col.key === 'name' ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-zinc-900 leading-none mb-0.5">{driver.name}</span>
                            <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-tighter">Verified Racer</span>
                          </div>
                       ) :
                       col.key === 'car' ? (
                          <span className="px-2 py-1 bg-zinc-100 rounded text-[10px] font-black text-zinc-600 uppercase">
                            {driver.car}
                          </span>
                       ) :
                       col.key === 'bestLap' ? (
                          <span className="font-mono text-xs text-brand-blue font-bold tracking-tighter tabular-nums">
                            {driver.bestLap}
                          </span>
                       ) :
                       col.key === 'points' ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-sm text-zinc-900">{driver.points}</span>
                            <span className="text-[10px] text-zinc-400">PTS</span>
                          </div>
                       ) : (
                         <span className="text-xs font-bold text-zinc-500">{String((driver as any)[col.key] ?? '-')}</span>
                       )
                    )}
                  </td>
                ))}
                <td className="px-6 py-4 text-right">
                  <button 
                    className="p-1.5 text-zinc-400 hover:text-brand-blue transition-colors"
                    onClick={() => onEditDriver && onEditDriver(driver)}
                    title="修改信息"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/30 flex items-center justify-between">
        <p className="text-xs text-zinc-500 font-medium">
            当前显示 {startIndex + 1} - {Math.min(startIndex + itemsPerPage, sortedDrivers.length)} 条，共 {sortedDrivers.length} 条记录
        </p>
        <div className="flex gap-2 items-center">
          <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest mr-2">分页</span>
          <button 
            className="px-2 py-1 rounded hover:bg-zinc-200 transition-all text-zinc-600 disabled:opacity-50"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <span className="material-symbols-outlined text-sm">chevron_left</span>
          </button>
          <div className="flex gap-1">
             {/* Simple Pagination: Show current page and total */}
             <span className="text-xs font-bold text-zinc-700 self-center">
                 {currentPage} / {totalPages || 1}
             </span>
          </div>
          <button 
            className="px-2 py-1 rounded hover:bg-zinc-200 transition-all text-zinc-600 disabled:opacity-50"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriverTable;
