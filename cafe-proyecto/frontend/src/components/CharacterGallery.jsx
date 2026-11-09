import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Images, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const artworks = [
  {
    src: '/images/gallery/sonic-shadow.webp',
    alt: 'Sonic y Shadow juntos',
    title: 'Sonic y Shadow',
    category: 'sonic',
  },
  {
    src: '/images/gallery/tails-knuckles.webp',
    alt: 'Tails y Knuckles',
    title: 'Tails y Knuckles',
    category: 'friends',
  },
  {
    src: '/images/gallery/halloween-friends.webp',
    alt: 'Personajes reunidos en una escena de Halloween',
    title: 'Noche de Halloween',
    category: 'halloween',
  },
  {
    src: '/images/gallery/shadow-rouge-halloween.webp',
    alt: 'Shadow y Rouge con disfraces de Halloween',
    title: 'Shadow y Rouge',
    category: 'halloween',
  },
  {
    src: '/images/gallery/sonic-friends-stickers.webp',
    alt: 'Colección de personajes de Sonic',
    title: 'La pandilla completa',
    category: 'friends',
  },
];

const filters = ['all', 'sonic', 'friends', 'halloween'];

export default function CharacterGallery() {
  const { t } = useLanguage();
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeArtwork, setActiveArtwork] = useState(null);
  const closeButtonRef = useRef(null);

  const visibleArtworks = artworks
    .map((artwork, index) => ({ ...artwork, index }))
    .filter((artwork) => activeFilter === 'all' || artwork.category === activeFilter);

  const moveArtwork = (direction) => {
    setActiveArtwork((current) => (current + direction + artworks.length) % artworks.length);
  };

  useEffect(() => {
    if (activeArtwork === null) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setActiveArtwork(null);
      if (event.key === 'ArrowLeft') moveArtwork(-1);
      if (event.key === 'ArrowRight') moveArtwork(1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeArtwork]);

  const selectedArtwork = activeArtwork === null ? null : artworks[activeArtwork];

  return (
    <section id="character-gallery" className="px-4 py-20 sm:py-24" aria-labelledby="character-gallery-title">
      <div className="mx-auto max-w-7xl">
        <div className="mb-9 text-center">
          <p className="section-subtitle flex items-center justify-center gap-2">
            <Images size={16} aria-hidden="true" />
            {t('gallery_eyebrow')}
          </p>
          <h2 id="character-gallery-title" className="section-title">
            {t('gallery_title')}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-cafe-brown sm:text-base">
            {t('gallery_description')}
          </p>
        </div>

        <div className="mb-7 flex flex-wrap justify-center gap-2" role="group" aria-label={t('gallery_filters')}>
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              aria-pressed={activeFilter === filter}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cafe-caramel ${
                activeFilter === filter
                  ? 'border-cafe-caramel bg-cafe-caramel text-cafe-dark'
                  : 'border-cafe-brown/40 bg-cafe-espresso/70 text-cafe-cream hover:border-cafe-caramel hover:text-cafe-caramel'
              }`}
            >
              {t(`gallery_filter_${filter}`)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleArtworks.map((artwork) => (
            <button
              key={artwork.src}
              type="button"
              onClick={() => setActiveArtwork(artwork.index)}
              aria-label={`${t('gallery_open')} ${artwork.title}`}
              className="image-art-card group relative overflow-hidden rounded-2xl border border-cafe-caramel/20 bg-cafe-espresso text-left shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-cafe-caramel/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cafe-caramel"
            >
              <div className="image-art-frame relative aspect-[4/3] overflow-hidden">
                <img
                  src={artwork.src}
                  alt={artwork.alt}
                  loading="lazy"
                  decoding="async"
                  className="image-art-image h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" aria-hidden="true" />
                <span className="absolute bottom-4 left-4 right-4 font-serif text-lg font-semibold text-white">
                  {artwork.title}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedArtwork && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-3 backdrop-blur-sm sm:p-8"
          onClick={(event) => {
            if (event.target === event.currentTarget) setActiveArtwork(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={selectedArtwork.title}
            className="relative flex max-h-full w-full max-w-5xl flex-col items-center"
          >
            <div className="mb-3 flex w-full items-center justify-between gap-4">
              <h3 className="font-serif text-lg text-cafe-cream sm:text-2xl">{selectedArtwork.title}</h3>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setActiveArtwork(null)}
                aria-label={t('gallery_close')}
                className="rounded-full border border-white/20 bg-black/50 p-2 text-white transition hover:border-cafe-caramel hover:text-cafe-caramel focus-visible:outline focus-visible:outline-2 focus-visible:outline-cafe-caramel"
              >
                <X size={22} />
              </button>
            </div>
            <div className="relative flex min-h-0 w-full items-center justify-center">
              <button
                type="button"
                onClick={() => moveArtwork(-1)}
                aria-label={t('gallery_previous')}
                className="absolute left-2 z-10 rounded-full border border-white/20 bg-black/60 p-2 text-white transition hover:text-cafe-caramel sm:left-4"
              >
                <ArrowLeft size={22} />
              </button>
              <img
                src={selectedArtwork.src}
                alt={selectedArtwork.alt}
                className="max-h-[78vh] max-w-full rounded-xl object-contain shadow-2xl"
              />
              <button
                type="button"
                onClick={() => moveArtwork(1)}
                aria-label={t('gallery_next')}
                className="absolute right-2 z-10 rounded-full border border-white/20 bg-black/60 p-2 text-white transition hover:text-cafe-caramel sm:right-4"
              >
                <ArrowRight size={22} />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
