import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { UIProvider } from './context/UIContext';
import AppContent from './AppContent';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <UIProvider>
        <AppContent />
      </UIProvider>
    </ThemeProvider>
  );
};

export default App;
