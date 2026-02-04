
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@moza.com';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Frontend Restriction: Only allow the specific admin email
    if (email !== ADMIN_EMAIL) {
      setError(`系统访问受限：仅允许管理员账号 (${ADMIN_EMAIL}) 登录`);
      setIsLoading(false);
      return;
    }

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onLogin();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('注册成功！请直接登录。');
        setMode('login');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-zinc-950 min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background with Track Image */}
      <div className="absolute inset-0 z-0">
        <div 
          className="w-full h-full bg-center bg-no-repeat bg-cover opacity-30 scale-105" 
          style={{ backgroundImage: `url('https://picsum.photos/id/122/1920/1080')` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-zinc-950"></div>
      </div>

      <div className="relative z-10 w-full max-w-[480px] px-6">
        <div className="bg-zinc-900/90 border border-zinc-800/50 backdrop-blur-xl rounded-2xl p-10 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <h1 className="text-white tracking-tight text-[28px] font-bold leading-tight text-center">
              MOZA 赛事管理系统{mode === 'login' ? '登录' : '注册'}
            </h1>
            <p className="text-zinc-400 text-sm mt-3 opacity-80 font-medium">
              {mode === 'login' ? '欢迎回来，请输入您的管理员凭据' : '创建新的管理员账户'}
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                {error}
              </div>
            )}
            
            <div className="flex flex-col gap-2">
              <label className="flex flex-col">
                <p className="text-zinc-400 text-sm font-medium leading-normal pb-2">邮箱</p>
                <div className="flex w-full items-stretch rounded-lg group relative">
                  <input 
                    className="form-input flex w-full min-w-0 flex-1 rounded-lg text-white focus:outline-0 focus:ring-1 focus:ring-primary border border-zinc-700/50 bg-zinc-800/40 focus:border-primary h-12 placeholder:text-zinc-500/50 pl-[15px] pr-[45px] text-base font-normal transition-all" 
                    placeholder="name@example.com" 
                    required 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <div className="absolute right-[15px] top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-all pointer-events-none">
                    <span className="material-symbols-outlined text-xl">mail</span>
                  </div>
                </div>
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex flex-col">
                <p className="text-zinc-400 text-sm font-medium leading-normal pb-2">密码</p>
                <div className="flex w-full items-stretch rounded-lg group relative">
                  <input 
                    className="form-input flex w-full min-w-0 flex-1 rounded-lg text-white focus:outline-0 focus:ring-1 focus:ring-primary border border-zinc-700/50 bg-zinc-800/40 focus:border-primary h-12 placeholder:text-zinc-500/50 pl-[15px] pr-[45px] text-base font-normal transition-all" 
                    placeholder="请输入您的密码" 
                    required 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <div className="absolute right-[15px] top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-all cursor-pointer hover:text-white">
                    <span className="material-symbols-outlined text-xl">visibility</span>
                  </div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-x-2 cursor-pointer group">
                <input 
                  className="h-4 w-4 rounded border-zinc-700 border-2 bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-0 transition-colors" 
                  type="checkbox"
                />
                <span className="text-zinc-400 text-sm font-normal group-hover:text-white transition-colors">记住我</span>
              </label>
              <button 
                type="button"
                className="text-primary text-sm font-medium hover:underline"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              >
                {mode === 'login' ? '没有账号？去注册' : '已有账号？去登录'}
              </button>
            </div>

            <button 
              className="w-full bg-primary hover:bg-primary/90 active:scale-[0.98] text-zinc-950 font-bold h-12 rounded-lg shadow-lg shadow-primary/20 transition-all text-base disabled:opacity-50 disabled:cursor-not-allowed" 
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? '处理中...' : (mode === 'login' ? '立即登录' : '立即注册')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
