import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

type Theme = 'light' | 'dark';

type ThemeTransitionOrigin = {
  x: number;
  y: number;
  radius?: number;
};

interface ThemeContextType {
  theme: Theme;
  toggleTheme: (origin?: ThemeTransitionOrigin) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light');
  const isTransitioningRef = useRef(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('moza_theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('moza_theme', theme);
  }, [theme]);

  const toggleTheme = (origin?: ThemeTransitionOrigin) => {
    if (isTransitioningRef.current) {
      return;
    }

    const nextTheme = theme === 'light' ? 'dark' : 'light';
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const startViewTransition = document.startViewTransition?.bind(document);

    if (!origin || !startViewTransition || prefersReducedMotion) {
      setTheme(nextTheme);
      return;
    }

    isTransitioningRef.current = true;

    const root = document.documentElement;
    const startRadius = origin.radius ?? 0;
    const endRadius = Math.hypot(
      Math.max(origin.x, window.innerWidth - origin.x),
      Math.max(origin.y, window.innerHeight - origin.y),
    );
    const isExpanding = nextTheme === 'dark';
    const transitionClass = isExpanding ? 'theme-transition-expand' : 'theme-transition-contract';

    root.classList.add('theme-transitioning', transitionClass);

    let isCleanedUp = false;
    const cleanup = () => {
      if (isCleanedUp) {
        return;
      }
      isCleanedUp = true;
      root.classList.remove('theme-transitioning', transitionClass);
      isTransitioningRef.current = false;
    };

    const transition = startViewTransition(() => {
      flushSync(() => {
        setTheme(nextTheme);
      });
    });

    transition.ready
      .then(() => {
        const animation = document.documentElement.animate(
          {
            clipPath: isExpanding
              ? [
                  `circle(${startRadius}px at ${origin.x}px ${origin.y}px)`,
                  `circle(${endRadius}px at ${origin.x}px ${origin.y}px)`,
                ]
              : [
                  `circle(${endRadius}px at ${origin.x}px ${origin.y}px)`,
                  `circle(${startRadius}px at ${origin.x}px ${origin.y}px)`,
                ],
          },
          {
            duration: 650,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'both',
            pseudoElement: isExpanding ? '::view-transition-new(root)' : '::view-transition-old(root)',
          } as KeyframeAnimationOptions,
        );

        animation.finished.finally(cleanup);
      })
      .catch(() => {
        cleanup();
      });

    transition.finished.catch(() => {
      cleanup();
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
