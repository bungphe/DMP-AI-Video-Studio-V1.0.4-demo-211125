import React, { createContext, useContext, useState } from 'react';
import { translations, Language } from '../utils/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default language set to 'vi' per user request
  const [language, setLanguage] = useState<Language>('vi'); 

  // Defensive translation function
  const t = (path: string): string => {
    try {
      const keys = path.split('.');
      let value: any = translations[language];
      for (const key of keys) {
        if (value && value[key]) {
          value = value[key];
        } else {
          // Fallback to English if Vietnamese key is missing
          if (language !== 'en') {
             let enValue: any = translations['en'];
             for(const enKey of keys) {
                if(enValue && enValue[enKey]) enValue = enValue[enKey];
                else return path;
             }
             return enValue as string;
          }
          return path;
        }
      }
      return value as string;
    } catch (e) {
      console.warn(`Translation error for key: ${path}`, e);
      return path;
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};