import { useState, useEffect } from 'react';
import { djangoCatalogEnabled, djangoCheckoutEnabled, djangoPromotionsEnabled, djangoEventsEnabled, getHomeProducts, getPublicPromotions, getPublicEvents, getPublicSiteSettings } from '../api';
import ProductCard from '../components/ProductCard';
import VisualRunway from '../components/VisualRunway';
import CharacterGallery from '../components/CharacterGallery';
import photoCredits from '../data/photoCredits.json';
import { defaultProducts } from '../data/defaultProducts';
import { homeFallback, seasonalCards } from '../utils/homeContent';
import RecoveryNotice from '../components/RecoveryNotice';
import { useLanguage } from '../context/LanguageContext';
import { ChevronDown, Calendar, Gift, Sparkles, Zap, Award, Coffee, Heart, CheckCircle2, Search, MapPin, Clock3, Phone } from 'lucide-react';

const categories = ['Todos', 'Bebidas', 'Frappes', 'Desayunos', 'Lunch', 'Reposteria'];

const defaultHomePromotions = [
  {
    _id: 'promo-spooky-vampire',
    title: 'Combo de calabaza y chocolate',
    description: 'Latte con especias, pastel de chocolate y una galleta de temporada.',
    originalPrice: 210,
    comboPrice: 165,
    imageUrl: '/images/vampire-sonic.jpg',
    badge: 'De temporada'
  },
  {
    _id: 'promo-friends-trio',
    title: 'Combo para compartir',
    description: 'Espresso doble, sundae de vainilla con cereza y malteada.',
    originalPrice: 285,
    comboPrice: 220,
    imageUrl: '/images/cafe-moments-trio.jpg',
    badge: 'Para compartir'
  }
];

const defaultHomeEvents = [
  {
    _id: 'event-halloween-fest',
    title: 'Noche de otoño y disfraces',
    description: 'Una noche de música, café de olla y concurso de disfraces.',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    time: '19:30 hrs',
    location: 'Patio Central - Sucursal Centro Histórico',
    capacity: 50,
    price: 195,
    imageUrl: '/images/halloween-party.jpg',
    category: 'Música y disfraces'
  },
  {
    _id: 'event-jazz-coldbrew',
    title: 'Noche de jazz y café frío',
    description: 'Música en vivo, café frío y postres en la terraza.',
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    time: '20:00 hrs',
    location: 'Patio Central - Sucursal Roma',
    capacity: 35,
    price: 180,
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    category: 'Música en vivo'
  }
];

export default function Home({ onNavigate, onLoginClick, searchTerm, onSearchChange }) {
  const { t } = useLanguage();
  const [products, setProducts]         = useState(() => homeFallback(djangoCatalogEnabled, defaultProducts));
  const [promotions, setPromotions]     = useState(() => homeFallback(djangoPromotionsEnabled, defaultHomePromotions));
  const [events, setEvents]             = useState(() => homeFallback(djangoEventsEnabled, defaultHomeEvents));
  const [loading, setLoading]           = useState(true);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [activeFriend, setActiveFriend] = useState('shadow');
  const [siteSettings, setSiteSettings] = useState({});
  const [loadError, setLoadError] = useState('');
  const { showEvent, showPromotion, showSection } = seasonalCards(djangoEventsEnabled, djangoPromotionsEnabled);

  // Helper para obtener valor de configuración del sitio con fallback traducido
  const ss = (key, fallback) => siteSettings[key] || fallback;

  const loadHomeData = async () => {
    setLoading(true);
    setLoadError('');
    let requestFailed = false;
    const withFallback = (request, fallback, section) => request
      .then(response => response)
      .catch(error => {
        console.error(`No se pudo cargar ${section}:`, error);
        requestFailed = true;
        return { data: fallback };
      });

    try {
      const [productsResponse, promotionsResponse, eventsResponse, settingsResponse] = await Promise.all([
        withFallback(getHomeProducts(), homeFallback(djangoCatalogEnabled, defaultProducts), 'el menú'),
        withFallback(getPublicPromotions(), homeFallback(djangoPromotionsEnabled, defaultHomePromotions), 'las promociones'),
        withFallback(getPublicEvents(), homeFallback(djangoEventsEnabled, defaultHomeEvents), 'los eventos'),
        withFallback(getPublicSiteSettings(), {}, 'la configuración del sitio'),
      ]);
      if (djangoCatalogEnabled || productsResponse.data?.length > 0) setProducts(productsResponse.data);
      setPromotions(djangoPromotionsEnabled ? promotionsResponse.data : promotionsResponse.data?.length > 0 ? promotionsResponse.data : defaultHomePromotions);
      setEvents(djangoEventsEnabled ? eventsResponse.data : eventsResponse.data?.length > 0 ? eventsResponse.data : defaultHomeEvents);
      setSiteSettings(settingsResponse.data || {});
      if (requestFailed) {
        setLoadError('No pudimos actualizar todo el contenido. Revisa tu conexión y vuelve a intentarlo para consultar la información más reciente.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHomeData();
    window.addEventListener('cafe-retry-data', loadHomeData);
    return () => window.removeEventListener('cafe-retry-data', loadHomeData);
  }, []);

  const categoryLabels = {
    'Todos': t('cat_all'),
    'Bebidas': t('cat_beverages'),
    'Frappes': t('cat_frappes'),
    'Desayunos': t('cat_breakfast'),
    'Lunch': t('cat_lunch'),
    'Reposteria': t('cat_bakery'),
    'Alimentos': t('cat_food'),
    'Café en Grano': t('cat_coffee_beans'),
  };

  const getCharData = (key) => ({
    sonic: {
      name: 'Sonic the Hedgehog',
      role: t('sonic_role'),
      badge: t('sonic_badge'),
      favorite: t('sonic_fav'),
      quote: t('sonic_quote'),
      accent: 'from-blue-600/30 via-blue-900/20 to-transparent border-blue-500/40 text-blue-300',
      tagColor: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
    },
    shadow: {
      name: 'Shadow the Hedgehog',
      role: t('shadow_role'),
      badge: t('shadow_badge'),
      favorite: t('shadow_fav'),
      quote: t('shadow_quote'),
      accent: 'from-red-600/30 via-red-900/20 to-transparent border-red-500/40 text-red-300',
      tagColor: 'bg-red-500/20 text-red-300 border-red-400/30',
    },
    silver: {
      name: 'Silver the Hedgehog',
      role: t('silver_role'),
      badge: t('silver_badge'),
      favorite: t('silver_fav'),
      quote: t('silver_quote'),
      accent: 'from-cyan-600/30 via-cyan-900/20 to-transparent border-cyan-500/40 text-cyan-300',
      tagColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30',
    }
  }[key] || {
    name: 'Sonic', role: '', badge: '', favorite: '', quote: '', accent: '', tagColor: ''
  });

  const normalizeSearch = (value) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();
  const normalizedSearch = normalizeSearch(searchTerm.trim());
  const filtered = products.filter((product) => {
    const matchesCategory = activeCategory === 'Todos' || product.category === activeCategory;
    const searchableText = normalizeSearch(`${product.name || ''} ${product.description || ''} ${product.category || ''}`);
    return matchesCategory && (!normalizedSearch || searchableText.includes(normalizedSearch));
  });

  return (
    <div className="min-h-screen">
      {loadError && (
        <div className="px-4 pt-20">
          <RecoveryNotice title="Algunas secciones no se actualizaron" message={loadError} onRetry={loadHomeData} />
        </div>
      )}

      {/* TEAM BANNER */}
      <section className="pt-20 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-cafe-caramel/30 bg-cafe-espresso/90 px-5 py-4">
          <div>
            <p className="text-cafe-cream font-serif text-lg">{t('team_banner_title')}</p>
            <p className="text-cafe-brown text-sm">{t('team_banner_desc')}</p>
          </div>
          <button onClick={() => onNavigate('team')} className="btn-outline text-sm py-2 whitespace-nowrap">
            {t('team_banner_btn')}
          </button>
        </div>
      </section>

      {/* HERO */}
      <section id="home-hero" className="relative min-h-[calc(100vh-5rem)] flex items-center justify-center overflow-hidden pt-8 pb-12">
        <div className="absolute inset-0 bg-hero-pattern bg-cover bg-center opacity-25 filter blur-xs" />
        <div className="absolute inset-0 hero-overlay" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Columna Izquierda: Textos y Botones */}
            <div className="lg:col-span-7 text-center lg:text-left animate-fade-in">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cafe-brown/30 border border-cafe-caramel/40 text-cafe-caramel text-xs uppercase tracking-widest mb-4">
                <span>{ss('hero_badge', t('hero_badge'))}</span>
              </div>
              <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl text-cafe-cream leading-tight mb-5">
                {ss('hero_title', t('hero_title_1'))}<br />
                <span className="text-cafe-caramel italic">{ss('hero_subtitle', t('hero_title_2'))}</span>
              </h1>
              <p className="text-cafe-cream/80 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 mb-8 font-light leading-relaxed">
                {ss('hero_description', t('hero_desc'))}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button onClick={() => onNavigate('menu')} className="btn-primary text-base sm:text-lg px-8 py-3.5 shadow-lg shadow-cafe-caramel/20">
                  {t('hero_btn_menu')}
                </button>
                <button onClick={() => onNavigate('events')} className="btn-outline text-base sm:text-lg px-8 py-3.5">
                  {t('hero_btn_events')}
                </button>
              </div>
            </div>

            {/* Columna Derecha: Ilustración Principal */}
            <div className="lg:col-span-5 flex justify-center animate-slide-up">
              <div className="relative group max-w-md w-full">
                <div className="absolute -inset-1 bg-gradient-to-r from-cafe-caramel via-cafe-gold to-cafe-brown rounded-3xl blur-md opacity-40 group-hover:opacity-75 transition duration-500" />

                <div className="image-art-frame relative rounded-3xl overflow-hidden border-2 border-cafe-caramel/50 bg-cafe-espresso shadow-2xl">
                  <img
                    src={ss('hero_image', '/images/hero-cafe.jpg')}
                    alt="Interior de Café Exquisito"
                    className="image-art-image w-full h-[320px] sm:h-[380px] object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-cafe-dark/90 via-transparent to-transparent" />
                  
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between glass-dark px-4 py-2.5 rounded-2xl border border-white/10">
                    <div>
                      <p className="text-cafe-cream font-serif text-sm font-semibold">{ss('hero_label_primary', t('hero_tag_primary'))}</p>
                      <p className="text-cafe-gold text-xs">{ss('hero_label_secondary', t('hero_tag_secondary'))}</p>
                    </div>
                    <Sparkles size={18} className="text-cafe-gold" aria-hidden="true" />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-bounce hidden sm:block">
          <ChevronDown size={28} className="text-cafe-caramel/60" />
        </div>
      </section>

      <VisualRunway />
      <CharacterGallery />

      {/* STATS */}
      <section className="py-16 bg-cafe-espresso">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { num: ss('stat_1_num', '44'), label: ss('stat_1_label', t('stat_drinks')) },
            { num: ss('stat_2_num', '2'), label: ss('stat_2_label', t('stat_branches')) },
            { num: ss('stat_3_num', '3'), label: ss('stat_3_label', t('stat_beans')) },
            { num: ss('stat_4_num', 'Al momento'), label: ss('stat_4_label', t('stat_craft')) },
          ].map(s => (
            <div key={s.label} className="animate-slide-up">
              <p className="font-serif text-2xl sm:text-4xl text-cafe-caramel font-bold">{s.num}</p>
              <p className="text-cafe-brown text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HISTORIAS EN LA BARRA: MOMENTOS EN CAFÉ EXQUISITO (Silver, Sonic & Shadow) */}
      <section className="py-20 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-12 animate-fade-in">
          <p className="section-subtitle flex items-center justify-center gap-2">
            <Sparkles size={16} className="text-cafe-caramel" /> {t('moments_subtitle')}
          </p>
          <h2 className="section-title">{t('moments_title_1')} <span className="text-cafe-caramel">{t('moments_title_2')}</span></h2>
          <p className="text-cafe-brown max-w-2xl mx-auto text-sm sm:text-base mt-2">
            {t('moments_desc')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center glass-dark p-6 sm:p-10 border border-cafe-caramel/30 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-80 h-80 bg-cafe-caramel/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-cafe-gold/10 rounded-full blur-3xl pointer-events-none" />

          {/* Columna Izquierda: Ilustración de Cómic */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div className="relative group w-full max-w-xl">
              <div className="absolute -inset-1 bg-gradient-to-r from-cafe-caramel via-cafe-gold to-cafe-brown rounded-3xl blur-md opacity-30 group-hover:opacity-60 transition duration-500" />
              <div className="relative rounded-2xl overflow-hidden border-2 border-cafe-caramel/40 bg-cafe-dark shadow-2xl">
                <img
                  src={ss('moments_image', '/images/cafe-moments-trio.jpg')}
                  alt="Personajes de Café Exquisito"
                  className="w-full h-auto max-h-[460px] object-cover object-top group-hover:scale-[1.02] transition-transform duration-700"
                />
                <div className="absolute top-3 left-3 glass-dark px-3 py-1.5 rounded-full text-xs font-semibold text-cafe-cream border border-white/10 flex items-center gap-1.5">
                  <Coffee size={12} className="text-cafe-caramel" /> {t('moments_table')}
                </div>
                <div className="absolute bottom-3 right-3 glass-dark px-3 py-1 rounded-full text-[11px] text-cafe-gold border border-cafe-gold/20">
                  {t('moments_art')}
                </div>
              </div>
            </div>
            <p className="text-cafe-brown text-xs mt-3 text-center italic">
              {t('moments_quote')}
            </p>
          </div>

          {/* Columna Derecha: Selector de Personajes */}
          <div className="lg:col-span-5 flex flex-col justify-center space-y-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-cafe-caramel font-semibold mb-3">
                {t('moments_choose')}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'sonic', label: 'Sonic' },
                  { key: 'shadow', label: 'Shadow' },
                  { key: 'silver', label: 'Silver' },
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => setActiveFriend(item.key)}
                    className={`py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 border ${activeFriend === item.key ? 'bg-cafe-caramel text-cafe-dark border-cafe-caramel shadow-lg scale-105' : 'bg-cafe-espresso/60 text-cafe-cream/80 border-cafe-brown/40 hover:border-cafe-caramel'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tarjeta de la Cita Activa */}
            {(() => {
              const char = getCharData(activeFriend);
              return (
                <div className={`p-6 rounded-2xl border bg-gradient-to-br ${char.accent} backdrop-blur-md shadow-xl transition-all duration-500 animate-fade-in`}>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-serif text-lg sm:text-xl text-cafe-cream font-bold flex items-center gap-2">
                        {char.name}
                      </h3>
                      <p className="text-xs text-cafe-brown/90">{char.role}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${char.tagColor}`}>
                      {char.badge}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-cafe-dark/60 border border-white/5 my-3 relative">
                    <p className="text-cafe-cream/90 text-sm italic leading-relaxed">
                      {char.quote}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] text-cafe-brown uppercase tracking-wider">{t('moments_favorite_label')}</p>
                      <p className="text-cafe-caramel text-xs sm:text-sm font-semibold">{char.favorite}</p>
                    </div>
                    <button
                      onClick={() => onNavigate('menu')}
                      className="btn-primary text-xs py-2 px-4 whitespace-nowrap self-start sm:self-auto"
                    >
                      {t('moments_order_btn')}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </section>

      {/* TECNOLOGÍA & CLUB: TAILS COFFEE LAB & FIDELIZACIÓN (Tails Tech & Thumbs Up) */}
      <section className="py-16 bg-cafe-espresso/60 border-y border-cafe-brown/20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 animate-fade-in">
            <p className="section-subtitle flex items-center justify-center gap-2">
              <Zap size={16} className="text-cafe-caramel" /> {t('tech_section_sub')}
            </p>
            <h2 className="section-title">{t('tech_section_title_1')} <span className="text-cafe-caramel">{t('tech_section_title_2')}</span></h2>
            <p className="text-cafe-brown max-w-xl mx-auto text-sm sm:text-base mt-2">
              {t('tech_section_desc')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Tarjeta 1: Tails Barista Tech */}
            <div className="card-cafe image-art-card p-6 flex flex-col justify-between group overflow-hidden border border-cafe-caramel/20 hover:border-cafe-caramel/50 transition-all duration-300">
              <div>
                <div className="relative h-56 rounded-2xl overflow-hidden mb-6 border border-cafe-caramel/30 bg-cafe-dark">
                  <img
                    src={ss('tails_tech_image', '/images/tails-tech.jpg')}
                    alt="Tails Barista Tech"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-cafe-dark/90 via-transparent to-transparent" />
                  <span className="absolute top-3 left-3 bg-cafe-caramel text-cafe-dark text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Zap size={12} /> {t('tech_badge')}
                  </span>
                  <span className="absolute bottom-3 left-3 text-xs text-cafe-cream font-medium">
                    {t('tech_calibration')}
                  </span>
                </div>

                <h3 className="font-serif text-2xl text-cafe-cream mb-2">{t('tech_title')}</h3>
                <p className="text-cafe-brown text-sm leading-relaxed mb-4">
                  {t('tech_desc')}
                </p>

                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-cafe-brown/20">
                  <div className="p-2 rounded-xl bg-cafe-dark/40">
                    <p className="text-cafe-caramel font-bold text-sm">Filtrada</p>
                    <p className="text-[10px] text-cafe-brown">{t('tech_water')}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-cafe-dark/40">
                    <p className="text-cafe-caramel font-bold text-sm">Al momento</p>
                    <p className="text-[10px] text-cafe-brown">{t('tech_shot')}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-cafe-dark/40">
                    <p className="text-cafe-caramel font-bold text-sm">Seleccionado</p>
                    <p className="text-[10px] text-cafe-brown">{t('tech_beans')}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onNavigate('menu')}
                className="btn-outline w-full mt-6 text-sm py-2.5 flex items-center justify-center gap-2"
              >
                <Coffee size={16} /> {t('tech_btn')}
              </button>
            </div>

            {/* Tarjeta 2: Tails Thumbs Up & Club de Puntos */}
            <div className="card-cafe image-art-card p-6 flex flex-col justify-between group overflow-hidden border border-cafe-gold/30 hover:border-cafe-gold/60 transition-all duration-300 relative">
              <div>
                <div className="relative h-56 rounded-2xl overflow-hidden mb-6 border border-cafe-gold/30 bg-cafe-dark">
                  <img
                    src={ss('tails_thumbsup_image', '/images/tails-thumbsup.jpg')}
                    alt="Tails Club Exquisito"
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-cafe-dark/90 via-transparent to-transparent" />
                  <span className="absolute top-3 left-3 bg-cafe-gold text-cafe-dark text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Award size={12} /> {t('club_satisfaction')}
                  </span>
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between glass-dark px-3 py-1.5 rounded-xl border border-white/10">
                    <span className="text-xs text-cafe-cream font-medium">{t('club_bonus_title')}</span>
                    <span className="text-xs text-cafe-gold font-bold">{t('club_bonus_pts')}</span>
                  </div>
                </div>

                <h3 className="font-serif text-2xl text-cafe-cream mb-2">{t('club_title')}</h3>
                <p className="text-cafe-brown text-sm leading-relaxed mb-4">
                  {t('club_desc')}
                </p>

                <div className="space-y-2 text-xs text-cafe-cream/80 pt-2 border-t border-cafe-brown/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />
                    <span>{t('club_bullet_1')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />
                    <span>{t('club_bullet_2')}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onLoginClick ? onLoginClick() : onNavigate('profile')}
                className="btn-primary w-full mt-6 text-sm py-2.5 flex items-center justify-center gap-2 shadow-lg shadow-cafe-gold/20"
              >
                <Sparkles size={16} /> {t('club_btn')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* MENÚ */}
      <section id="menu-section" className="py-20 px-4 max-w-7xl mx-auto">
        {djangoCatalogEnabled && <p className="mb-5 text-center text-cafe-cream" role="status">
          {djangoCheckoutEnabled
            ? 'Catálogo de prueba de Django: los pedidos requieren una cuenta Django independiente y se pagan en mostrador.'
            : 'Catálogo de prueba de Django: puedes consultar productos, pero los pedidos de esta vista aún no están disponibles.'}
        </p>}
        <div className="text-center mb-12 animate-fade-in">
          <p className="section-subtitle">{t('menu_subtitle')}</p>
          <h2 className="section-title">{t('menu_title_1')} <span className="text-cafe-caramel">{t('menu_title_2')}</span></h2>
          <p className="mt-2 text-sm text-cafe-brown">{t('menu_photos_illustrative')}</p>
        </div>

        <div className="mx-auto mb-8 flex max-w-2xl items-center gap-3 rounded-2xl border border-cafe-caramel/30 bg-cafe-espresso/80 px-4 shadow-lg shadow-black/10 focus-within:border-cafe-caramel">
          <Search size={19} className="shrink-0 text-cafe-caramel" aria-hidden="true" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t('search_menu_placeholder')}
            aria-label={t('search_menu_label')}
            className="min-w-0 flex-1 bg-transparent py-3 text-sm text-cafe-cream outline-none placeholder:text-cafe-brown"
          />
          {searchTerm && (
            <button type="button" onClick={() => onSearchChange('')} className="shrink-0 rounded-full px-3 py-1 text-xs text-cafe-caramel hover:bg-cafe-brown/20">
              {t('search_clear')}
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${activeCategory === cat ? 'bg-cafe-caramel text-cafe-dark' : 'border border-cafe-brown/40 text-cafe-brown hover:border-cafe-caramel hover:text-cafe-caramel'}`}>
              {categoryLabels[cat] || cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card-cafe h-72 shimmer" />
            ))}
          </div>
        ) : (
          filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((p, index) => (
                <div key={p._id} className="menu-card-stagger" style={{ '--image-card-delay': `${Math.min(index, 8) * 55}ms` }}>
                  <ProductCard product={p} products={products} />
                </div>
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-cafe-brown">{t('search_no_results')}</p>
          )
        )}
      </section>

      {/* FESTIVAL DE OTOÑO & SPOOKY SEASON */}
      {showSection && <section className="py-20 bg-gradient-to-b from-cafe-espresso via-[#1f1005] to-cafe-dark border-y border-cafe-brown/30 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-10 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-96 h-96 bg-purple-900/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-12 animate-fade-in">
            <p className="section-subtitle flex items-center justify-center gap-2 text-amber-400">
              {t('spooky_badge')}
            </p>
            <h2 className="section-title">{t('spooky_title_1')} <span className="text-cafe-caramel">{t('spooky_title_2')}</span></h2>
            <p className="text-cafe-brown max-w-2xl mx-auto text-sm sm:text-base mt-2">
              {t('spooky_desc')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Tarjeta 1: Gran Noche de Disfraces */}
            {showEvent && <div className={`${showPromotion ? 'lg:col-span-7' : 'lg:col-span-12'} card-cafe image-art-card p-6 flex flex-col justify-between group overflow-hidden border border-amber-600/30 hover:border-amber-500/60 shadow-2xl transition-all duration-300`}>
              <div>
                <div className="relative h-64 sm:h-72 rounded-2xl overflow-hidden mb-6 border border-amber-500/40 bg-cafe-dark">
                  <img
                    src={ss('halloween_party_image', '/images/halloween-party.jpg')}
                    alt="Festival de Disfraces"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-cafe-dark/90 via-cafe-dark/20 to-transparent" />
                  <span className="absolute top-3 left-3 bg-gradient-to-r from-amber-600 to-orange-500 text-cafe-dark text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                    {t('spooky_card1_badge')}
                  </span>
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between glass-dark px-3.5 py-2 rounded-xl border border-white/10">
                    <span className="text-xs text-cafe-cream font-medium">{t('spooky_card1_loc')}</span>
                    <span className="text-xs text-amber-300 font-bold">{t('spooky_card1_music')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    {t('spooky_card1_date')}
                  </span>
                  <span className="text-xs text-cafe-brown">{t('spooky_card1_limited')}</span>
                </div>

                <h3 className="font-serif text-2xl text-cafe-cream mb-2">{t('spooky_card1_title')}</h3>
                <p className="text-cafe-brown text-sm leading-relaxed mb-4">
                  {t('spooky_card1_desc')}
                </p>
              </div>

              <div className="pt-4 border-t border-cafe-brown/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-cafe-brown">{t('spooky_card1_price_label')}</p>
                  <p className="text-2xl font-bold text-cafe-caramel">$195 <span className="text-xs text-cafe-brown font-normal">{t('spooky_card1_price_sub')}</span></p>
                </div>
                <button
                  onClick={() => onNavigate('events')}
                  className="btn-primary text-sm py-2.5 px-6 w-full sm:w-auto shadow-lg shadow-amber-600/20"
                >
                  {t('spooky_card1_btn')}
                </button>
              </div>
            </div>}

            {/* Combo de temporada */}
            {showPromotion && <div className={`${showEvent ? 'lg:col-span-5' : 'lg:col-span-12'} card-cafe image-art-card p-6 flex flex-col justify-between group overflow-hidden border border-purple-800/40 hover:border-purple-500/60 shadow-2xl transition-all duration-300 relative`}>
              <div>
                <div className="relative h-64 sm:h-72 rounded-2xl overflow-hidden mb-6 border border-purple-500/40 bg-cafe-dark">
                  <img
                    src={ss('vampire_sonic_image', '/images/vampire-sonic.jpg')}
                    alt="Ilustración del combo de temporada"
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-cafe-dark/90 via-cafe-dark/10 to-transparent" />
                  <span className="absolute top-3 left-3 bg-gradient-to-r from-purple-700 to-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                    {t('spooky_card2_badge')}
                  </span>
                  <span className="absolute top-3 right-3 glass-dark text-amber-300 text-xs px-2.5 py-1 rounded-full border border-amber-400/20">
                    {t('spooky_card2_save')}
                  </span>
                </div>

                <h3 className="font-serif text-2xl text-cafe-cream mb-2">{t('spooky_card2_title')}</h3>
                <p className="text-cafe-brown text-sm leading-relaxed mb-4">
                  {t('spooky_card2_desc')}
                </p>

                <div className="space-y-1.5 text-xs text-cafe-cream/80 mb-4 bg-cafe-dark/40 p-3 rounded-xl border border-white/5">
                  <p className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-amber-400" /> Latte de calabaza (16 oz)</p>
                  <p className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-amber-400" /> Rebanada de pastel de chocolate</p>
                  <p className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-amber-400" /> Galleta de temporada</p>
                </div>
              </div>

              <div className="pt-4 border-t border-cafe-brown/20 flex items-center justify-between gap-4">
                <div>
                  <p className="text-cafe-brown/60 line-through text-xs">$210 MXN</p>
                  <p className="text-3xl font-bold text-cafe-caramel">$165 <span className="text-xs text-cafe-brown font-normal">MXN</span></p>
                  <p className="text-green-400 text-[11px] font-semibold">{t('spooky_card2_save')}</p>
                </div>
                <button
                  onClick={() => onNavigate('promotions')}
                  className="btn-primary text-sm py-2.5 px-6 shadow-lg shadow-purple-900/30"
                >
                  {t('spooky_card2_btn')}
                </button>
              </div>
            </div>}
          </div>
        </div>
      </section>}

      {/* COMBOS */}
      {promotions.length > 0 && (
        <section className="py-20 bg-cafe-espresso">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <p className="section-subtitle flex items-center justify-center gap-2"><Gift size={14}/> {t('nav_promotions')}</p>
              <h2 className="section-title">{t('menu_title_1')} <span className="text-cafe-caramel">{t('nav_promotions')}</span></h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {promotions.map(promo => (
                <div key={promo._id} className="card-cafe image-art-card group overflow-hidden">
                  <div className="image-art-frame relative h-48 overflow-hidden">
                    <img src={promo.imageUrl} alt={promo.title} loading="lazy" className="image-art-image w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-cafe-dark/80 to-transparent" />
                    <span className="absolute top-4 left-4 bg-cafe-caramel text-cafe-dark text-xs font-bold px-3 py-1 rounded-full">
                      {promo.badge}
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="font-serif text-xl text-cafe-cream mb-1">{promo.title}</h3>
                    <p className="text-cafe-brown text-sm mb-3">{promo.description}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-cafe-brown/50 line-through text-sm">${promo.originalPrice}</span>
                        <span className="text-cafe-caramel font-bold text-2xl ml-2">${promo.comboPrice}</span>
                        <span className="text-cafe-brown text-xs ml-1">MXN</span>
                      </div>
                      <button className="btn-primary text-sm py-2" onClick={() => onNavigate('promotions')}>
                        {t('moments_order_btn')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* EVENTOS */}
      {events.length > 0 && (
        <section className="py-20 px-4 max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="section-subtitle flex items-center justify-center gap-2"><Calendar size={14}/> {t('events_subtitle')}</p>
            <h2 className="section-title">{t('events_title_1')} <span className="text-cafe-caramel">{t('events_title_2')}</span></h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map(ev => (
              <div key={ev._id} className="card-cafe image-art-card group">
                <div className="image-art-frame relative h-40 overflow-hidden">
                  <img src={ev.imageUrl} alt={ev.title} loading="lazy" className="image-art-image w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-cafe-dark/90 to-transparent" />
                  <span className="absolute bottom-3 left-4 text-xs text-cafe-caramel font-semibold uppercase tracking-wider">{ev.category}</span>
                </div>
                <div className="p-5">
                  <h3 className="font-serif text-lg text-cafe-cream mb-2">{ev.title}</h3>
                  <p className="text-cafe-brown text-sm mb-3 line-clamp-2">{ev.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-cafe-caramel">{new Date(ev.date).toLocaleDateString(undefined, {day:'numeric', month:'short'})} · {ev.time}</p>
                      <p className="text-cafe-brown/70 text-xs mt-0.5">{ev.location}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-cafe-caramel font-bold">${ev.price}</p>
                      <p className="text-cafe-brown/60 text-xs">Cupo: {ev.capacity}</p>
                    </div>
                  </div>
                  <button className="btn-outline w-full mt-4 text-sm py-2" onClick={() => onNavigate('events')}>{t('events_btn_book')}</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* MOMENTOS ESPECIALES & FESTIVIDADES */}
      <section className="py-20 px-4 bg-gradient-to-b from-cafe-espresso/40 via-cafe-dark to-cafe-dark border-t border-cafe-brown/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 animate-fade-in">
            <p className="section-subtitle flex items-center justify-center gap-2">
              <Sparkles size={16} className="text-cafe-caramel" /> {t('festivals_subtitle')}
            </p>
            <h2 className="section-title">{t('festivals_title_1')} <span className="text-cafe-caramel">{t('festivals_title_2')}</span></h2>
            <p className="text-cafe-brown max-w-2xl mx-auto text-sm sm:text-base mt-2">
              {t('festivals_desc')}
            </p>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border-2 border-cafe-caramel/40 hover:border-cafe-caramel/80 transition-all duration-500 shadow-2xl">
            <div className="absolute -inset-1 bg-gradient-to-r from-cafe-caramel via-cafe-gold to-cafe-brown rounded-3xl blur-lg opacity-0 group-hover:opacity-20 transition duration-500" />
            
            <div className="relative">
              <img
                src={ss('cafe_halloween_image', '/images/cafe-halloween.jpg')}
                alt="Celebraciones Café Exquisito"
                className="w-full h-auto max-h-[600px] object-cover group-hover:scale-[1.01] transition-transform duration-700"
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-cafe-dark via-cafe-dark/60 to-transparent" />
              
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                <div className="glass-dark backdrop-blur-md rounded-2xl border border-cafe-caramel/40 p-6 max-w-2xl">
                  <div className="flex items-center gap-3 mb-3">
                    <Calendar size={28} className="text-cafe-caramel" aria-hidden="true" />
                    <div>
                      <p className="text-xs uppercase tracking-widest text-cafe-caramel font-semibold">{t('festivals_card_badge')}</p>
                      <h3 className="font-serif text-2xl text-cafe-cream">{t('festivals_card_title')}</h3>
                    </div>
                  </div>
                  
                  <p className="text-cafe-brown text-sm mb-4 leading-relaxed">
                    {t('festivals_card_desc')}
                  </p>
                  
                  <button
                    onClick={() => onNavigate('promotions')}
                    className="w-full sm:w-auto btn-primary py-3 px-8 text-sm font-semibold shadow-lg shadow-purple-900/50 flex items-center justify-center gap-2"
                  >
                    <Gift size={16} /> {t('festivals_btn')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Sparkles,
                title: t('fest_card1_title'),
                desc: t('fest_card1_desc')
              },
              {
                icon: Coffee,
                title: t('fest_card2_title'),
                desc: t('fest_card2_desc')
              },
              {
                icon: Calendar,
                title: t('fest_card3_title'),
                desc: t('fest_card3_desc')
              }
            ].map(({ icon: Icon, title, desc }, idx) => (
              <div key={idx} className="card-cafe p-6 border border-cafe-caramel/20 hover:border-cafe-caramel/50 transition-all duration-300 group">
                <Icon size={28} className="text-cafe-caramel mb-3" aria-hidden="true" />
                <h4 className="font-serif text-lg text-cafe-cream mb-2">{title}</h4>
                <p className="text-cafe-brown text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-cafe-dark border-t border-cafe-brown/20 py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src="/images/cafe-exquisito-logo.jpg" alt="Sonic y Shadow en Café Exquisito" className="h-9 w-12 rounded-lg border border-cafe-caramel/50 object-cover" />
            <p className="font-serif text-2xl text-cafe-cream">Café <span className="text-cafe-caramel">Exquisito</span></p>
          </div>
          <p className="text-cafe-brown text-sm">{t('footer_tagline')}</p>
          {(siteSettings.footer_address || siteSettings.footer_hours || siteSettings.footer_phone) && (
            <div className="mx-auto my-6 grid max-w-4xl gap-3 text-left sm:grid-cols-2 lg:grid-cols-3">
              {siteSettings.footer_address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(siteSettings.footer_address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="glass-dark flex items-start gap-3 p-4 text-sm text-cafe-cream transition hover:border-cafe-caramel/50"
                >
                  <MapPin size={18} className="mt-0.5 shrink-0 text-cafe-caramel" aria-hidden="true" />
                  <span><span className="mb-1 block font-semibold">{t('footer_location')}</span>{siteSettings.footer_address}</span>
                </a>
              )}
              {siteSettings.footer_hours && (
                <div className="glass-dark flex items-start gap-3 p-4 text-sm text-cafe-cream">
                  <Clock3 size={18} className="mt-0.5 shrink-0 text-cafe-caramel" aria-hidden="true" />
                  <span><span className="mb-1 block font-semibold">{t('footer_hours')}</span>{siteSettings.footer_hours}</span>
                </div>
              )}
              {siteSettings.footer_phone && (
                <a
                  href={`tel:${siteSettings.footer_phone.replace(/[^\d+]/g, '')}`}
                  className="glass-dark flex items-start gap-3 p-4 text-sm text-cafe-cream transition hover:border-cafe-caramel/50"
                >
                  <Phone size={18} className="mt-0.5 shrink-0 text-cafe-caramel" aria-hidden="true" />
                  <span><span className="mb-1 block font-semibold">{t('footer_phone')}</span>{siteSettings.footer_phone}</span>
                </a>
              )}
            </div>
          )}
          <div className="my-4 flex flex-wrap items-center justify-center gap-2">
            <div className="glass-dark px-4 py-1.5 rounded-full text-xs text-cafe-gold">
              <span>{t('footer_developed_by')} <strong className="text-cafe-cream">Valentino</strong></span>
            </div>
            <div className="glass-dark px-3.5 py-1.5 rounded-full text-xs text-cafe-caramel border border-cafe-caramel/30 flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              <span>{t('footer_version')} <strong>v2.5.0</strong></span>
            </div>
          </div>
          <details className="text-cafe-brown/50 text-[10px] max-w-3xl mx-auto mb-3">
            <summary className="cursor-pointer underline">Créditos de fotografías</summary>
            <p className="mt-2">
              Wikimedia Commons: <a className="underline" href="https://commons.wikimedia.org/wiki/File:Cheesecake_with_slice_cut_out.jpg" target="_blank" rel="noreferrer">“Cheesecake with slice cut out”</a>, Martin van Dam, <a className="underline" href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noreferrer">CC BY 2.0</a>;
              {' '}<a className="underline" href="https://commons.wikimedia.org/wiki/File:Kirschtorte_Landfrauenart.jpg" target="_blank" rel="noreferrer">“Kirschtorte Landfrauenart”</a>, Oxfordian Kissuth, <a className="underline" href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">CC BY-SA 3.0</a>;
              {' '}<a className="underline" href="https://commons.wikimedia.org/wiki/File:McDonald%E2%80%99s_Fried_Guava_Pie_(32114412553).jpg" target="_blank" rel="noreferrer">“McDonald’s Fried Guava Pie”</a>, theimpulsivebuy, <a className="underline" href="https://creativecommons.org/licenses/by-sa/2.0/" target="_blank" rel="noreferrer">CC BY-SA 2.0</a>;
              {' '}<a className="underline" href="https://commons.wikimedia.org/wiki/File:Apple_pie_slice.jpg" target="_blank" rel="noreferrer">“Apple pie slice”</a>, stuart_spivack, <a className="underline" href="https://creativecommons.org/licenses/by-sa/2.0/" target="_blank" rel="noreferrer">CC BY-SA 2.0</a>;
              {' '}<a className="underline" href="https://commons.wikimedia.org/wiki/File:Portada-chilaquiles-rojos.jpg" target="_blank" rel="noreferrer">“Portada-chilaquiles-rojos”</a>, Victorsmb, <a className="underline" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>;
              {' '}<a className="underline" href="https://commons.wikimedia.org/wiki/File:01_Chilaquiles_verdes_con_frijoles_chinos.jpg" target="_blank" rel="noreferrer">“01 Chilaquiles verdes con frijoles chinos”</a>, ismael villafranco, <a className="underline" href="https://creativecommons.org/licenses/by-sa/2.0/" target="_blank" rel="noreferrer">CC BY 2.0</a>;
              {' '}<a className="underline" href="https://commons.wikimedia.org/wiki/File:Enchiladas_de_pollo_Plato_Tipico.jpg" target="_blank" rel="noreferrer">“Enchiladas de pollo Plato Tipico”</a>, Encogua, <a className="underline" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>;
              {' '}<a className="underline" href="https://commons.wikimedia.org/wiki/File:Taro_and_Green_Tea_Milkshakes.jpg" target="_blank" rel="noreferrer">“Taro and Green Tea Milkshakes”</a>, karendotcom127, <a className="underline" href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noreferrer">CC BY 2.0</a>;
              {' '}<a className="underline" href="https://commons.wikimedia.org/wiki/File:COCONUT_MILKSHAKE.jpg" target="_blank" rel="noreferrer">“COCONUT MILKSHAKE”</a>, Yuvaqueen, <a className="underline" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>.
              {' '}<a className="underline" href="https://commons.wikimedia.org/wiki/File:Horchata,_my_drink_of_choice_in_Mexico_-_Merida_Yucatan_21_March_2021.jpg" target="_blank" rel="noreferrer">“Horchata, my drink of choice in Mexico”</a>, Sharon Hahn Darlin, <a className="underline" href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noreferrer">CC BY 2.0</a>.
              {' '}Flickr: <a className="underline" href="https://www.flickr.com/photos/57853375@N08/5409809821" target="_blank" rel="noreferrer">“Vanilla Caramel”</a>, joshwept, CC BY;
              {' '}<a className="underline" href="https://www.flickr.com/photos/38712296@N07/6315635857" target="_blank" rel="noreferrer">“Frappé chocolat-menthe”</a>, zigazou76, CC BY;
              {' '}<a className="underline" href="https://www.flickr.com/photos/18509346@N00/12264308164" target="_blank" rel="noreferrer">“Chocolate Banana Peanut Butter Milkshake”</a>, Unskinny Boppy, CC BY;
              {' '}<a className="underline" href="https://www.flickr.com/photos/10361931@N06/4269028564" target="_blank" rel="noreferrer">“Frappe choco drink in transparent glass with yellow straw”</a>, Horia Varlan, CC BY;
              {' '}<a className="underline" href="https://www.flickr.com/photos/69319106@N00/33758033" target="_blank" rel="noreferrer">“chai latte milkshake”</a>, numberstumper, CC BY-SA;
              {' '}<a className="underline" href="https://www.flickr.com/photos/10559879@N00/3922165163" target="_blank" rel="noreferrer">“Frappe - metrio, me gala”</a>, avlxyz, CC BY-SA;
              {' '}<a className="underline" href="https://www.flickr.com/photos/10559879@N00/3121354163" target="_blank" rel="noreferrer">“Frappe - metrio, me gala”</a>, avlxyz, CC BY-SA;
              {' '}<a className="underline" href="https://www.flickr.com/photos/10559879@N00/3121354163" target="_blank" rel="noreferrer">“Frappe - metrio, me gala”</a>, avlxyz, CC BY-SA;
              {' '}<a className="underline" href="https://www.flickr.com/photos/jfanaian/5415250438" target="_blank" rel="noreferrer">“Vanilla Milkshake @ Lori’s Diner”</a>, Jamal Fanaian, <a className="underline" href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noreferrer">CC BY 2.0</a>;
              {' '}<a className="underline" href="https://www.flickr.com/photos/75001512@N00/4395297220" target="_blank" rel="noreferrer">“pimento blt”</a>, Joelk75, CC BY;
              {' '}<a className="underline" href="https://www.flickr.com/photos/74105777@N00/78755315" target="_blank" rel="noreferrer">“Club sandwich”</a>, adactio, CC BY;
              {' '}<a className="underline" href="https://www.flickr.com/photos/7527824@N04/6747196155" target="_blank" rel="noreferrer">“Breakfast sandwich, egg with avocado”</a>, timquijano, CC BY;
              {' '}<a className="underline" href="https://www.flickr.com/photos/68691112@N00/4439103125" target="_blank" rel="noreferrer">“Caramel Eclairs”</a>, jamieanne, CC BY-ND.
            </p>
            <p className="mt-2">
              Wikimedia Commons (fotos por producto):{' '}
              {photoCredits.map((credit, index) => (
                <span key={credit.product}>
                  <a className="underline" href={credit.url} target="_blank" rel="noreferrer">“{credit.title}”</a>, {credit.artist}, {credit.licenseUrl ? <a className="underline" href={credit.licenseUrl} target="_blank" rel="noreferrer">{credit.license}</a> : credit.license}{credit.changes ? ` (${credit.changes})` : ''}
                  {index < photoCredits.length - 1 ? '; ' : '.'}
                </span>
              ))}
            </p>
          </details>
          <p className="text-cafe-brown/40 text-xs">© 2026 Café Exquisito. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
