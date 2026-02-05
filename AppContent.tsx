import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import { ViewState } from './types';
import { supabase } from './lib/supabase';
import { useUI } from './context/UIContext';

const AppContent: React.FC = () => {
  const [view, setView] = useState<ViewState>('login');
  const [session, setSession] = useState<any>(null);
  const { showToast } = useUI();
  const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@moza.com';

  const checkSession = (session: any) => {
    if (!session) {
      setView('login');
      return;
    }
    if (session.user.email !== ADMIN_EMAIL) {
      showToast(`非管理员账号 (${session.user.email}) 禁止访问`, 'error');
      supabase.auth.signOut();
      setView('login');
      return;
    }
    setSession(session);
    setView('dashboard');
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      checkSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = () => {
    setView('dashboard');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setView('login');
  };

  return (
    <div className="min-h-screen transition-colors duration-200 dark:bg-zinc-950 dark:text-white">
      {view === 'login' ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <Dashboard onLogout={handleLogout} />
      )}
    </div>
  );
};

export default AppContent;
