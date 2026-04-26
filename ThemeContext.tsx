import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes, getTheme, type Theme } from '../lib/themes';

interface ThemeContextType {
  theme: Theme;
  themeId: string;
  setThemeId: (id: string) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  colors: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState('modern-blue');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('@library_theme');
      const savedDarkMode = await AsyncStorage.getItem('@library_dark_mode');
      
      if (savedTheme) setThemeIdState(savedTheme);
      if (savedDarkMode) setIsDarkMode(savedDarkMode === 'true');
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setThemeId = async (id: string) => {
    setThemeIdState(id);
    try {
      await AsyncStorage.setItem('@library_theme', id);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const toggleDarkMode = async () => {
    const newValue = !isDarkMode;
    setIsDarkMode(newValue);
    try {
      await AsyncStorage.setItem('@library_dark_mode', String(newValue));
    } catch (error) {
      console.error('Error saving dark mode:', error);
    }
  };

  const baseTheme = getTheme(themeId);
  
  const colors: Theme = isDarkMode 
    ? {
        ...baseTheme,
        background: '#0f172a',
        cardBg: '#1e293b',
        text: '#f1f5f9',
        textSecondary: '#94a3b8',
        border: '#334155',
      }
    : baseTheme;

  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme: baseTheme, themeId, setThemeId, isDarkMode, toggleDarkMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
