import { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useLanguage } from './context/LanguageContext';
import Navbar from './components/Navbar';
import CartDrawer from './components/CartDrawer';
import BaristaChat from './components/BaristaChat';
import AuthModal from './components/AuthModal';
import HolidayDecorations from './components/HolidayDecorations';
import OfflineIndicator from './components/OfflineIndicator';
import RuntimeErrorNotice from './components/RuntimeErrorNotice';
import MusicPlayer from './components/MusicPlayer';
import Home from './pages/Home';
import OrdersPage from './pages/OrdersPage';
import ProfilePage from './pages/ProfilePage';
import DjangoProfile from './pages/DjangoProfile';
import { djangoAuthEnabled } from './api';
import Admin from './pages/Admin';
import EventsPage from './pages/EventsPage';
import PromotionsPage from './pages/PromotionsPage';
import ReservationsPage from './pages/ReservationsPage';
import TeamPage from './pages/TeamPage';
import AboutPage from './pages/AboutPage';
import { House, Images, Coffee } from 'lucide-react';

export default function App() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState('home');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user && ['profile', 'orders', 'admin'].includes(currentPage)) {
      setCurrentPage('home');
    }
  }, [user, currentPage]);

  const navigate = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (page) => {
    if (page === 'menu') {
      if (currentPage !== 'home') {
        setCurrentPage('home');
        window.setTimeout(() => {
          document.getElementById('menu-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else {
        document.getElementById('menu-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    navigate(page);
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    handleNavigate('menu');
  };

  const scrollToSection = (sectionId) => {
    if (currentPage !== 'home') {
      setCurrentPage('home');
      window.setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return;
    }

    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openAuth = () => setShowAuthModal(true);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home onNavigate={handleNavigate} onLoginClick={openAuth} searchTerm={searchTerm} onSearchChange={setSearchTerm} />;
      case 'events':
        return <EventsPage onLoginClick={openAuth} />;
      case 'promotions':
        return <PromotionsPage onNavigate={handleNavigate} />;
      case 'reservations':
        return <ReservationsPage />;
      case 'team':
        return <TeamPage />;
      case 'about':
        return <AboutPage />;
      case 'orders':
        return user ? <OrdersPage /> : null;
      case 'profile':
        return user ? (djangoAuthEnabled ? <DjangoProfile onNavigate={handleNavigate} /> : <ProfilePage onNavigate={handleNavigate} />) : null;
      case 'admin':
        return user && ['admin', 'codueno', 'gerente'].includes(user.role) ? <Admin /> : null;
      default:
        return <Home onNavigate={handleNavigate} onLoginClick={openAuth} searchTerm={searchTerm} onSearchChange={setSearchTerm} />;
    }
  };

  return (
    <div className="holiday-page relative isolate min-h-screen">
      <HolidayDecorations />
      <div className="holiday-atmosphere" aria-hidden="true" />
      <Navbar onLoginClick={openAuth} currentPage={currentPage} onNavigate={handleNavigate} onSearch={handleSearch} />
      <OfflineIndicator />
      <RuntimeErrorNotice />
      {currentPage === 'home' && (
        <aside className="holiday-side-nav hidden lg:flex" aria-label={t('side_nav_label')}>
          <button type="button" onClick={() => scrollToSection('home-hero')} aria-label={t('side_nav_home')} title={t('side_nav_home')}>
            <House size={16} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => scrollToSection('visual-runway')} aria-label={t('side_nav_gallery')} title={t('side_nav_gallery')}>
            <Images size={16} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => scrollToSection('menu-section')} aria-label={t('side_nav_menu')} title={t('side_nav_menu')}>
            <Coffee size={16} aria-hidden="true" />
          </button>
        </aside>
      )}
      <main className="relative z-10">{renderPage()}</main>
      <CartDrawer onLoginClick={openAuth} onNavigate={handleNavigate} />
      <BaristaChat onNavigate={handleNavigate} onSearch={handleSearch} />
      <MusicPlayer />
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}
