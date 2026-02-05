import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useUI } from '../context/UIContext';

interface ChangePasswordModalProps {
  onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onClose }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useUI();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      showToast('密码长度至少为 6 位', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showToast('两次输入的密码不一致', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      showToast('密码修改成功', 'success');
      onClose();
    } catch (err: any) {
      console.error('Password update error:', err);
      showToast('密码修改失败: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 p-6 bg-white dark:bg-zinc-900">
          <h2 className="text-zinc-900 dark:text-white text-xl font-bold">修改密码</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-zinc-500 uppercase">新密码</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/50 text-sm"
              placeholder="请输入新密码"
              required
            />
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-zinc-500 uppercase">确认新密码</label>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/50 text-sm"
              placeholder="请再次输入新密码"
              required
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              取消
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-bold text-white bg-brand-blue hover:bg-blue-600 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '保存中...' : '确认修改'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
