
import React, { useState, useEffect } from 'react';
import { Driver } from '../types';

interface EditDriverModalProps {
  driver: Driver;
  onClose: () => void;
  onSave: (updatedDriver: Driver) => void;
}

const EditDriverModal: React.FC<EditDriverModalProps> = ({ driver, onClose, onSave }) => {
  // We need to manage state for all fields. 
  // Since we have a mix of standard fields and dynamic 'rawData', we'll flatten them for the form.
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize form data from driver
    const initialData: Record<string, any> = { ...driver.rawData }; // Start with dynamic fields
    
    // Add standard fields if they are not in rawData (or override if they are essentially the same)
    // Actually, 'rank' and 'points' are often in rawData too, but we should prioritize standard fields for the ID
    if (!initialData['rank']) initialData['rank'] = driver.rank;
    if (!initialData['points']) initialData['points'] = driver.points;
    
    // Ensure we have at least the keys we want to edit.
    setFormData(initialData);
  }, [driver]);

  const handleChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
        // Construct the updated driver object
        // We need to figure out what are standard fields and what are rawData
        // For simplicity, we update EVERYTHING in rawData, and also update the standard fields 'rank' and 'points'
        
        const updatedRawData = { ...formData };
        
        // Convert rank and points to numbers for the standard fields
        const newRank = Number(formData['rank']) || Number(formData['Rank']) || Number(formData['RANK']) || 999;
        const newPoints = Number(formData['points']) || Number(formData['Points']) || Number(formData['POINTS']) || 0;

        const updatedDriver: Driver = {
            ...driver,
            rank: newRank,
            points: newPoints,
            rawData: updatedRawData
        };

        await onSave(updatedDriver);
        onClose();
    } catch (err) {
        console.error(err);
        alert('保存失败');
    } finally {
        setLoading(false);
    }
  };

  // Determine which keys to show. We sort them to put Rank/Points/Name first.
  const sortedKeys = Object.keys(formData).sort((a, b) => {
      const priority = ['rank', '排名', 'name', '姓名', '车手', 'points', '积分'];
      const idxA = priority.findIndex(p => a.toLowerCase().includes(p));
      const idxB = priority.findIndex(p => b.toLowerCase().includes(p));
      
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
  });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-zinc-200 p-6 bg-white">
          <h2 className="text-zinc-900 text-xl font-bold">修改车手信息</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            {sortedKeys.map(key => (
                <div key={key} className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase">{key}</label>
                    <input 
                        type="text" 
                        value={formData[key] || ''}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/50 text-sm"
                    />
                </div>
            ))}
        </form>

        <div className="p-6 border-t border-zinc-100 bg-zinc-50 flex justify-end gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-zinc-600 hover:bg-zinc-200 rounded-lg text-sm font-bold transition-colors"
                type="button"
            >
                取消
            </button>
            <button 
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-zinc-900/10 disabled:opacity-50"
            >
                {loading ? '保存中...' : '保存修改'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default EditDriverModal;
