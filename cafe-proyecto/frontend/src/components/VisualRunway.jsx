import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Ghost, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const artworks = ['01.webp', '02.webp', '03.webp', '04.webp', '05.webp'];

export default function VisualRunway() {
  const { t } = useLanguage();
  const [active, setActive] = useState(0);
  const [storyOpen, setStoryOpen] = useState(false);
  const trackRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(min-width: 768px)').matches) return;

    const activeCard = trackRef.current?.querySelector(`[data-runway-index="${active}"]`);
    activeCard?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [active]);

  const move = (direction) => {
    setActive((current) => (current + direction + artworks.length) % artworks.length);
    setStoryOpen(true);
  };

  return (
    <section id="visual-runway" className="visual-runway relative overflow-hidden py-20 sm:py-24" aria-labelledby="visual-runway-title">
      <div className="visual-runway-glow absolute inset-0 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10">
          <div className="max-w-2xl">
            <p className="section-subtitle flex items-center gap-2">
              <Sparkles size={16} className="text-cafe-caramel" />
              {t('runway_eyebrow')}
            </p>
            <h2 id="visual-runway-title" className="section-title">
              {t('runway_title')}
            </h2>
            <p className="text-cafe-brown max-w-xl text-sm sm:text-base mt-2">
              {t('runway_description')}
            </p>
            <p className="mt-4 flex items-center gap-2 text-sm italic text-cafe-cream/75">
              <span className="text-cafe-caramel" aria-hidden="true">✦</span>
              {t('runway_story')}
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <span className="font-mono text-sm tracking-widest text-cafe-cream/75" aria-live="polite">
              {String(active + 1).padStart(2, '0')} <span className="text-cafe-caramel">/</span> {String(artworks.length).padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={() => move(-1)}
              className="runway-control"
              aria-label={t('runway_previous')}
            >
              <ArrowLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              className="runway-control"
              aria-label={t('runway_next')}
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        <div ref={trackRef} className="runway-track flex gap-4 overflow-x-auto px-4 pb-8 pt-5 md:grid md:grid-cols-5 md:gap-5 md:overflow-visible md:px-0">
          {artworks.map((image, index) => (
            <button
              key={image}
              type="button"
              data-runway-index={index}
              onClick={() => {
                setActive(index);
                setStoryOpen(true);
              }}
              aria-label={`${t('runway_artwork')} ${index + 1}: ${t(`runway_story_title_${index + 1}`)}`}
              aria-pressed={active === index}
              className={`runway-card runway-card--${index} group relative w-[72vw] max-w-[280px] shrink-0 overflow-hidden rounded-[1.4rem] border text-left transition-all duration-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cafe-caramel md:w-auto md:max-w-none md:min-w-0 md:flex-1 ${active === index ? 'is-active border-cafe-caramel/80 shadow-[0_24px_70px_rgba(219,142,63,0.28)] md:-translate-y-3 md:scale-[1.04]' : 'border-white/10 opacity-75 hover:opacity-100 md:translate-y-3'}`}
            >
              <img
                src={`/images/runway/${image}`}
                alt=""
                loading="lazy"
                decoding="async"
                className="aspect-[4/5] w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
              />
              <span className="runway-card-glow" aria-hidden="true" />
              <span className="runway-card-caption">
                <Ghost size={14} aria-hidden="true" />
                {t(`runway_story_title_${index + 1}`)}
              </span>
              <span className="runway-card-shade absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-white/5" aria-hidden="true" />
              <span className="absolute bottom-4 left-4 font-mono text-sm tracking-[0.2em] text-white/90">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-cafe-caramel via-cafe-gold to-cafe-caramel opacity-0 transition-opacity duration-300 group-[.is-active]:opacity-100" aria-hidden="true" />
            </button>
          ))}
        </div>

        <div
          className={`runway-story-panel ${storyOpen ? 'is-open' : ''}`}
          aria-live="polite"
          aria-atomic="true"
          aria-hidden={!storyOpen}
        >
          <div className="runway-story-ornament" aria-hidden="true">
            <BookOpen size={22} />
          </div>
          <div key={active} className="runway-story-content min-w-0 flex-1">
            <p className="runway-story-kicker">{t('runway_story_kicker')}</p>
            <h3 className="runway-story-title">{t(`runway_story_title_${active + 1}`)}</h3>
            <p className="runway-story-copy">{t(`runway_story_text_${active + 1}`)}</p>
          </div>
          <span className="runway-story-star" aria-hidden="true">✦</span>
        </div>

        <nav className="runway-dots" aria-label={t('runway_pagination')}>
          {artworks.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => {
                setActive(index);
                setStoryOpen(true);
              }}
              aria-label={`${t('runway_artwork')} ${index + 1}`}
              aria-current={active === index ? 'true' : undefined}
              className={`runway-dot ${active === index ? 'is-active' : ''}`}
            />
          ))}
        </nav>
        <p className="mt-4 text-center text-xs tracking-[0.18em] text-cafe-brown">
          {t('runway_hint')}
        </p>
      </div>
    </section>
  );
}
