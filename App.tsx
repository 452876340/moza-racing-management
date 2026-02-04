
import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import { ViewState } from './types';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('login');
  const [session, setSession] = useState<any>(null);
  const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@moza.com';

  const checkSession = (session: any) => {
    if (!session) {
      setView('login');
      return;
    }
    if (session.user.email !== ADMIN_EMAIL) {
      alert(`非管理员账号 (${session.user.email}) 禁止访问`);
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
    // Session is handled by onAuthStateChange
    // But we can force view change if needed
    setView('dashboard');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setView('login');
  };

  return (
    <div className="min-h-screen">
      {view === 'login' ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <Dashboard onLogout={handleLogout} />
      )}
    </div>
  );
};

export default App;
