import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Globe, ChevronDown, Check } from 'lucide-react';

export default function LanguageSelector({ compact = false }) {
  const { language, setLanguage, currentLangMeta, LANGUAGES } = useLanguage();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className={compact
          ? "w-full flex items-center justify-between px-4 py-2 text-sm text-cafe-cream hover:bg-cafe-brown/20 rounded-lg"
          : "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-cafe-cream/90 hover:text-cafe-caramel border border-cafe-brown/40 hover:border-cafe-caramel/60 bg-cafe-dark/40 transition-colors"}
        aria-expanded={open}
        title="Cambiar idioma / Change language"
      >
        <span className="flex items-center gap-1.5">
          <span className="text-sm">{currentLangMeta.flag}</span>
          <span className="text-xs">{currentLangMeta.label}</span>
        </span>
        <ChevronDown size={13} className={`transition-transform duration-200 text-cafe-brown ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-56 glass-dark rounded-xl shadow-2xl border border-cafe-caramel/40 py-1.5 z-50 animate-slide-up backdrop-blur-md">
          <div className="px-3 py-1.5 border-b border-cafe-brown/20 flex items-center gap-1.5 text-[11px] text-cafe-gold font-semibold uppercase tracking-wider">
            <Globe size={12} /> Selecciona tu idioma:
          </div>
          <div className="max-h-60 overflow-y-auto py-1 space-y-0.5">
            {LANGUAGES.map((lang) => {
              const active = lang.code === language;
              return (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                    active ? 'bg-cafe-caramel/20 text-cafe-caramel font-semibold' : 'text-cafe-cream hover:bg-cafe-brown/30'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">{lang.flag}</span>
                    <span>{lang.name}</span>
                  </span>
                  {active && <Check size={14} className="text-cafe-caramel shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
