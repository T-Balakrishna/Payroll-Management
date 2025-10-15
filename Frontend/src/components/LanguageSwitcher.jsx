import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const currentLang = i18n.language || 'en';

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-200 text-gray-800 px-3 py-1 rounded-lg hover:bg-gray-300 transition-colors duration-200 font-medium flex items-center border border-gray-300 shadow-sm"
      >
        {currentLang === 'en' ? '🇬🇧 EN' : '🇮🇳 TA'} ▼
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
          <button
            onClick={() => changeLanguage('en')}
            className="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors duration-150 flex items-center"
          >
            🇬🇧 English
          </button>
          <button
            onClick={() => changeLanguage('ta')}
            className="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors duration-150 flex items-center"
          >
            🇮🇳 Tamil
          </button>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;