import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { djangoAuthEnabled } from '../api';
import LanguageSelector from './LanguageSelector';
import { Download, LogOut, Menu, Search, ShoppingCart, User, X, Crown, Snowflake } from 'lucide-react';

const tierConfig = {
  Bronce: { class: 'tier-bronce' },
  Plata: { class: 'tier-plata' },
  'Oro VIP': { class: 'tier-oro' }
};

function InstallButton({ compact = false }) {
  const { t } = useLanguage();
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
    setInstalled(standalone);

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setShowHelp(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  if (installed) return null;

  const install = async () => {
    if (!installPrompt) {
      setShowHelp((current) => !current);
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice?.outcome === 'accepted') setInstalled(true);
    setInstallPrompt(null);
  };

  const isAppleMobile = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

  return (
    <div className="relative">
      <button
        className={compact
          ? 'flex items-center gap-2 px-4 py-2 text-sm text-cafe-gold hover:bg-cafe-brown/20 w-full'
          : 'flex items-center gap-1.5 text-xs text-cafe-gold hover:text-yellow-300'}
        onClick={install}
        aria-expanded={showHelp}
      >
        <Download size={15} /> {t('nav_install_app')}
      </button>
      {showHelp && (
        <div className="absolute right-0 top-full mt-2 z-50 w-72 glass-dark p-4 text-xs text-cafe-cream shadow-xl">
          {isAppleMobile
            ? 'En Safari, toca Compartir y elige “Añadir a pantalla de inicio”.'
            : 'Abre el menú del navegador y busca “Instalar aplicación” o “Instalar página como app”.'}
          <button className="block text-cafe-caramel mt-3" onClick={() => setShowHelp(false)}>Entendido</button>
        </div>
      )}
    </div>
  );
}

export default function Navbar({ onLoginClick, currentPage, onNavigate, onSearch }) {
  const { user, logout, isAdmin, sessionLoading, sessionError, refreshSession } = useAuth();
  const { count, setIsOpen } = useCart();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [logoutError, setLogoutError] = useState('');
  const signOut = async () => {
    setLogoutError('');
    try {
      await logout();
      setProfileOpen(false);
    } catch (error) {
      console.error('No se pudo cerrar la sesión:', error);
      setLogoutError('No se pudo cerrar la sesión. Revisa la conexión y vuelve a intentarlo.');
    }
  };
  const tier = user?.loyalty?.tier || 'Bronce';
  const tierStyle = tierConfig[tier] || tierConfig.Bronce;

  const navLinks = [
    { key: 'home', label: t('nav_home') },
    { key: 'menu', label: t('nav_menu') },
    { key: 'promotions', label: t('nav_promotions') },
    { key: 'events', label: t('nav_events') },
    { key: 'reservations', label: t('nav_reservations') },
    { key: 'team', label: t('nav_team') },
    { key: 'about', label: t('nav_about') }
  ];

  const navigate = (page) => {
    onNavigate(page);
    setMenuOpen(false);
    setProfileOpen(false);
    setSearchOpen(false);
  };

  const submitSearch = (event) => {
    event.preventDefault();
    onSearch(searchText.trim());
    setSearchOpen(false);
    setMenuOpen(false);
  };

  const getCleanAvatar = (url) => {
    if (!url || url.includes('unsplash.com')) {
      return '/images/default-avatar.svg';
    }
    return url;
  };

  return (
    <nav className="holiday-navbar fixed top-0 left-0 right-0 z-50 glass-dark border-b border-cafe-brown/30 rounded-none backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between min-h-16 gap-2 sm:gap-3">
          
          {/* Logo */}
          <button onClick={() => navigate('home')} className="flex items-center gap-2 shrink-0">
            <img src="/images/cafe-exquisito-logo.jpg" alt="Sonic y Shadow en Café Exquisito" className="h-10 w-14 rounded-lg border border-cafe-caramel/60 object-cover" />
            <span className="font-serif text-lg text-cafe-cream whitespace-nowrap hidden sm:inline">Café <span className="text-cafe-caramel">Exquisito</span></span>
          </button>

          {/* Links desktop */}
          <div className="hidden xl:flex items-center gap-2.5">
            {navLinks.map((link) => (
              <button
                key={link.key}
                onClick={() => navigate(link.key)}
                className={`text-xs font-medium transition-colors hover:text-cafe-caramel ${currentPage === link.key ? 'text-cafe-caramel' : 'text-cafe-cream/80'}`}
              >
                {link.label}
              </button>
            ))}
            {isAdmin ? (
              <button
                onClick={() => navigate('admin')}
                className="text-xs font-semibold px-3 py-1 rounded-full bg-cafe-caramel text-cafe-dark hover:bg-cafe-gold transition shadow-md flex items-center gap-1"
              >
                {t('nav_editor_admin')}
              </button>
            ) : (
              <button
                onClick={onLoginClick}
                className="text-xs font-medium px-2.5 py-1 rounded-full border border-cafe-brown/40 text-cafe-brown hover:text-cafe-caramel hover:border-cafe-caramel transition flex items-center gap-1"
                title="Acceso de edición para Valentino"
              >
                {t('nav_editor_mode')}
              </button>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Selector de idioma */}
            <LanguageSelector />

            <div className="hidden sm:block"><InstallButton /></div>

            <button
              type="button"
              onClick={() => setSearchOpen((open) => !open)}
              className="rounded-full p-2 text-cafe-cream transition hover:bg-cafe-brown/30 hover:text-cafe-gold"
              aria-label={t('search_open')}
              aria-expanded={searchOpen}
              aria-controls="navbar-search"
            >
              <Search size={19} />
            </button>
            
            <button onClick={() => setIsOpen(true)} className="relative p-2 hover:bg-cafe-brown/30 rounded-full" aria-label={`Abrir carrito, ${count} productos`}>
              <ShoppingCart size={20} className="text-cafe-cream" />
              {count > 0 && <span className="absolute -top-1 -right-1 bg-cafe-caramel text-cafe-dark text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{count}</span>}
            </button>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen((open) => !open)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-cafe-brown/30 border border-cafe-brown/30"
                >
                  <img
                    src={getCleanAvatar(user.avatar)}
                    onError={(e) => { e.target.src = '/images/default-avatar.svg'; }}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover border border-cafe-caramel bg-cafe-dark"
                  />
                  {!djangoAuthEnabled && <span className={`badge-tier ${tierStyle.class} hidden sm:flex`}>{tier}</span>}
                  {isAdmin && (
                    <span className="badge-tier bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 text-[11px] hidden md:flex items-center gap-1">
                      <Crown size={10} /> Admin
                    </span>
                  )}
                </button>
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-72 glass-dark shadow-2xl py-2 z-50 rounded-2xl border border-cafe-caramel/40">
                    <div className="px-4 py-3 border-b border-cafe-brown/30">
                      <p className="font-semibold text-cafe-cream flex items-center justify-between">
                        <span>{user.name}</span>
                        {isAdmin && <Crown size={14} className="text-yellow-400" />}
                      </p>
                      <p className="text-xs text-cafe-brown">{user.email}</p>
                      {!djangoAuthEnabled && <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5">
                        <span className="text-cafe-gold text-xs font-semibold">⭐ {user.loyalty?.points || 0} puntos</span>
                        {isAdmin ? (
                          <span className="text-[10px] font-bold text-yellow-300 bg-yellow-500/20 px-2 py-0.5 rounded-full border border-yellow-400/30">
                            Administración
                          </span>
                        ) : (
                          <span className="text-[10px] text-cafe-brown">{tier}</span>
                        )}
                      </div>}
                      {djangoAuthEnabled && <p className="text-xs text-cafe-brown mt-2">Cuenta de prueba Django</p>}
                    </div>
                    {isAdmin && (
                      <button onClick={() => navigate('admin')} className="w-full text-left px-4 py-2 text-sm text-cafe-gold hover:bg-cafe-brown/30 flex items-center gap-2 font-medium">
                        Panel de administración
                      </button>
                    )}
                    <button onClick={() => navigate('profile')} className="w-full text-left px-4 py-2 text-sm text-cafe-cream hover:bg-cafe-brown/30 flex items-center gap-2"><User size={14} /> Mi perfil</button>
                    <button onClick={() => navigate('orders')} className="w-full text-left px-4 py-2 text-sm text-cafe-cream hover:bg-cafe-brown/30">Mis pedidos</button>
                    <button onClick={signOut} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 flex items-center gap-2"><LogOut size={14} /> Cerrar sesión</button>
                    {logoutError && <p className="px-4 text-xs text-red-400" role="alert">{logoutError}</p>}
                  </div>
                )}
              </div>
            ) : (
              sessionError ? <button onClick={refreshSession} className="btn-outline text-xs py-2 px-3" title={sessionError}>Reintentar sesión</button> :
              <button onClick={onLoginClick} disabled={sessionLoading} className="btn-primary text-xs py-2 px-3 whitespace-nowrap disabled:opacity-60">{sessionLoading ? 'Comprobando sesión…' : t('nav_login')}</button>
            )}

            <button className="xl:hidden p-2 text-cafe-cream" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen}>
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {searchOpen && (
          <form id="navbar-search" onSubmit={submitSearch} role="search" className="absolute right-4 top-[calc(100%+0.6rem)] z-50 flex w-[min(22rem,calc(100vw-2rem))] items-center gap-2 rounded-2xl border border-cafe-caramel/40 bg-cafe-dark/95 p-2 shadow-2xl backdrop-blur-xl sm:right-6">
            <Search size={18} className="ml-2 shrink-0 text-cafe-caramel" aria-hidden="true" />
            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder={t('search_placeholder')}
              aria-label={t('search_label')}
              className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-cafe-cream outline-none placeholder:text-cafe-brown"
            />
            <button type="submit" className="rounded-xl bg-cafe-caramel px-3 py-2 text-xs font-semibold text-cafe-dark transition hover:bg-cafe-gold">
              {t('search_button')}
            </button>
          </form>
        )}

        {/* Menú móvil */}
        {menuOpen && (
          <div className="xl:hidden py-3 border-t border-cafe-brown/30 space-y-1">
            {navLinks.map((link) => (
              <button key={link.key} onClick={() => navigate(link.key)} className="block w-full text-left px-4 py-2 text-cafe-cream hover:text-cafe-caramel hover:bg-cafe-brown/20 text-sm">
                {link.label}
              </button>
            ))}
            {isAdmin ? (
              <button onClick={() => navigate('admin')} className="block w-full text-left px-4 py-2 text-cafe-gold font-semibold text-sm">{t('nav_editor_admin')}</button>
            ) : (
              <button onClick={onLoginClick} className="block w-full text-left px-4 py-2 text-cafe-caramel text-sm">{t('nav_editor_mode')}</button>
            )}
            <div className="px-4 py-2 border-t border-cafe-brown/20 pt-2">
              <LanguageSelector compact />
            </div>
            <div className="sm:hidden px-4"><InstallButton compact /></div>
          </div>
        )}
      </div>
      <div className="holiday-garland" aria-hidden="true">
        <Snowflake size={14} />
        <span />
        <span />
        <span />
        <span />
        <span />
        <Snowflake size={14} />
      </div>
    </nav>
  );
}
