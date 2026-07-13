
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type LanguageContextType = {
  currentLanguage: string;
  changeLanguage: (language: string) => void;
  languages: { code: string; name: string }[];
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'en');

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' }
  ];

  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
    setCurrentLanguage(language);
    // Optionally save the language preference to localStorage
    localStorage.setItem('preferredLanguage', language);
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage, languages }}>
      {children}
    </LanguageContext.Provider>
  );
};
