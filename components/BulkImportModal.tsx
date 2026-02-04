import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { DBRanking } from '../types';

interface BulkImportModalProps {
  onClose: () => void;
  roundId?: string;
  onImportSuccess?: () => void;
}

// Minimal map just to find the essential columns for DB indexing/sorting
const ESSENTIAL_MAP: Record<string, keyof DBRanking> = {
  '排名': 'rank', 'Rank': 'rank', 'RANK': 'rank',
  '车手': 'driver_id', '车手姓名': 'driver_id', '车手ID': 'driver_id', '姓名': 'driver_id', 'Driver': 'driver_id', 'Name': 'driver_id',
  '积分': 'points', 'Points': 'points', 'POINTS': 'points'
};

const BulkImportModal: React.FC<BulkImportModalProps> = ({ onClose, roundId, onImportSuccess }) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'uploading' | 'success'>('upload');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = async (file: File) => {
    try {
      setErrorMsg(null);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Get headers first
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      if (jsonData.length === 0) {
        setErrorMsg('文件为空');
        return;
      }
      
      const fileHeaders = jsonData[0] as string[];
      // Remove empty headers
      const cleanHeaders = fileHeaders.filter(h => h && h.toString().trim() !== '');
      
      // Get Data Rows
      const rows = XLSX.utils.sheet_to_json(worksheet);
      
      if (rows.length === 0) {
        setErrorMsg('未找到有效数据行');
        return;
      }

      setHeaders(cleanHeaders);
      setParsedRows(rows);
      setStep('preview');
    } catch (err: any) {
      console.error('File parsing error:', err);
      setErrorMsg('解析文件失败: ' + err.message);
    }
  };

  const handleImport = async () => {
    if (!roundId) {
      setErrorMsg('未选择目标赛程 (Round)');
      return;
    }

    setStep('uploading');
    try {
      // 1. Prepare Metadata Row (Stores the Column Headers)
      const metadataRecord = {
        round_id: roundId,
        driver_id: '__METADATA__',
        rank: 0,
        points: 0,
        safety_score: 0,
        podiums: 0,
        finished_races: 0,
        total_races: 0,
        display_races: JSON.stringify({ columns: headers }), // Store headers here
        created_at: new Date().toISOString()
      };

      // 2. Prepare Data Rows
      const dataRecords = parsedRows.map((row: any) => {
        // Try to find mapped values for indexing
        let rank = 999;
        let driver_id = 'Unknown';
        let points = 0;

        Object.keys(row).forEach(key => {
            const cleanKey = key.trim();
            const mapped = ESSENTIAL_MAP[cleanKey];
            if (mapped === 'rank') rank = Number(row[key]) || 999;
            if (mapped === 'driver_id') driver_id = String(row[key]);
            if (mapped === 'points') points = Number(row[key]) || 0;
        });

        // Store the ENTIRE row object as JSON string in display_races
        // Use a random suffix for driver_id if it's 'Unknown' to avoid collision? 
        // Or if multiple drivers have same name in same round?
        // Actually unique constraint is (round_id, driver_id). 
        // If Excel has duplicate names, we must handle it.
        if (driver_id === 'Unknown') {
            driver_id = `Unknown_${Math.random().toString(36).substr(2, 9)}`;
        }

        return {
            round_id: roundId,
            driver_id: driver_id,
            rank: rank,
            points: points,
            // Zero out other specific fields, we rely on JSON data now
            tier: null,
            safety_score: 0,
            podiums: 0,
            finished_races: 0,
            total_races: 0,
            display_races: JSON.stringify(row), 
            created_at: new Date().toISOString()
        };
      });

      // 3. Transaction: Delete Old -> Insert New
      // We must make sure to delete ALL data for this round, including metadata
      const { error: deleteError } = await supabase
        .from('rankings')
        .delete()
        .eq('round_id', roundId);

      if (deleteError) throw deleteError;

      // Small delay to ensure deletion propagation (optional but safe)
      // await new Promise(r => setTimeout(r, 100));

      // Deduplicate records based on driver_id
      const uniqueRecords = new Map();
      dataRecords.forEach((record: any) => {
          if (!uniqueRecords.has(record.driver_id)) {
              uniqueRecords.set(record.driver_id, record);
          } else {
              // Handle Duplicate: maybe append a counter?
              // For now, let's just warn or skip. Or modify ID.
              let counter = 1;
              let newId = `${record.driver_id}_${counter}`;
              while (uniqueRecords.has(newId)) {
                  counter++;
                  newId = `${record.driver_id}_${counter}`;
              }
              const newRecord = { ...record, driver_id: newId };
              uniqueRecords.set(newId, newRecord);
          }
      });
      
      const finalDataRecords = Array.from(uniqueRecords.values());

      // Batch insert (Metadata + Data)
      const allRecords = [metadataRecord, ...finalDataRecords];
      
      // Supabase limits batch size, let's chunk if necessary (e.g. 1000)
      // For now assuming < 1000 rows
      const { error: insertError } = await supabase
        .from('rankings')
        .insert(allRecords);

      if (insertError) throw insertError;

      setStep('success');
      setTimeout(() => {
        if (onImportSuccess) onImportSuccess();
      }, 1500);

    } catch (err: any) {
      console.error('Import error:', err);
      setErrorMsg('导入数据库失败: ' + err.message);
      setStep('preview');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
      <div className="bg-zinc-50 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 p-6 bg-white">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-3xl font-fill-1">upload_file</span>
            <h2 className="text-zinc-900 tracking-tight text-2xl font-bold leading-tight">批量导入 (动态表头)</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center gap-2">
              <span className="material-symbols-outlined">error</span>
              {errorMsg}
            </div>
          )}

          {step === 'upload' && (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-zinc-200 bg-white/50 px-6 py-12 hover:border-primary hover:bg-white transition-all cursor-pointer group"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange}
                accept=".csv,.xls,.xlsx"
              />
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <span className="material-symbols-outlined text-primary text-4xl">cloud_upload</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <p className="text-zinc-900 text-lg font-bold">点击上传 Excel 文件</p>
                <p className="text-zinc-500 text-sm">系统将自动识别所有表头并生成对应列</p>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-zinc-900">数据预览 ({parsedRows.length} 行)</h3>
                <div className="flex gap-2">
                  <button onClick={() => setStep('upload')} className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 rounded-lg">重新上传</button>
                  <button onClick={handleImport} className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 shadow-sm">确认导入</button>
                </div>
              </div>
              
              <div className="border border-zinc-200 rounded-xl overflow-auto max-h-[500px]">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-zinc-50 border-b border-zinc-200 sticky top-0 z-10">
                    <tr>
                      {headers.map((h, i) => (
                        <th key={i} className="px-4 py-3 font-bold text-zinc-500 bg-zinc-50 border-r border-zinc-100 last:border-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {parsedRows.slice(0, 20).map((row, idx) => (
                      <tr key={idx}>
                        {headers.map((h, i) => (
                          <td key={i} className="px-4 py-2 text-zinc-900 border-r border-zinc-100 last:border-0">
                            {row[h] !== undefined ? row[h] : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!roundId && (
                <div className="p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm border border-yellow-100">
                   请先在主界面选择一个赛程。
                </div>
              )}
            </div>
          )}

          {step === 'uploading' && (
             <div className="flex flex-col items-center justify-center py-12">
              <span className="material-symbols-outlined text-4xl text-primary animate-spin mb-4">progress_activity</span>
              <p className="text-zinc-900 font-bold text-lg">正在导入...</p>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl text-green-600">check_circle</span>
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">导入成功!</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkImportModal;
