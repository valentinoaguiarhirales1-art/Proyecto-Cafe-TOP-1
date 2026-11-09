import { useEffect, useState } from 'react';
import { djangoPromotionsEnabled, getPublicPromotions } from '../api';
import RecoveryNotice from '../components/RecoveryNotice';

const defaultPromotions = [
  {
    _id: 'promo-spooky-vampire',
    title: 'Combo de calabaza y chocolate',
    description: 'Latte con especias, pastel de chocolate y una galleta de temporada.',
    originalPrice: 210,
    comboPrice: 165,
    imageUrl: '/images/vampire-sonic.jpg',
    badge: 'De temporada',
    itemsIncluded: ['1 Latte Pumpkin Spice Especial (16 oz)', '1 Rebanada Red Velvet Sangrienta', '1 Galleta / Dulce de Murciélago']
  },
  {
    _id: 'promo-friends-trio',
    title: 'Combo para compartir',
    description: 'Espresso doble, sundae de vainilla con cereza y malteada.',
    originalPrice: 285,
    comboPrice: 220,
    imageUrl: '/images/cafe-moments-trio.jpg',
    badge: 'Para compartir',
    itemsIncluded: ['1 Espresso Doble Velocidad', '1 Copa Sundae Secreto de Shadow', '1 Malteada Levitante de Silver']
  },
  {
    _id: 'promo-pareja',
    title: 'Combo para dos',
    description: 'Dos lattes y dos croissants.',
    originalPrice: 234,
    comboPrice: 185,
    imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80',
    badge: 'Ahorra $49 MXN',
    itemsIncluded: ['2 Lattes Artesanales (16 oz)', '2 Croissants de Mantequilla']
  }
];

export default function PromotionsPage({ onNavigate }) {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPromotions = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await getPublicPromotions();
      setPromotions(djangoPromotionsEnabled ? data : data && data.length > 0 ? data : defaultPromotions);
    } catch (requestError) {
      console.error('No se pudieron cargar las promociones:', requestError);
      setPromotions(djangoPromotionsEnabled ? [] : defaultPromotions);
      setError(djangoPromotionsEnabled ? 'No pudimos consultar las promociones de Django. Revisa la conexión y vuelve a intentarlo.' : 'No pudimos consultar las promociones actuales. Los combos de ejemplo pueden no estar vigentes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPromotions(); }, []);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 max-w-6xl mx-auto">
      <header className="text-center mb-12">
        <p className="section-subtitle">Combos de la casa</p>
        <h1 className="section-title">Promociones <span className="text-cafe-caramel">vigentes</span></h1>
        <p className="text-cafe-brown max-w-xl mx-auto">Consulta los productos incluidos y el precio publicado para cada combo.</p>
      </header>

      {error && <RecoveryNotice title="No pudimos actualizar las promociones" message={error} onRetry={loadPromotions} />}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 2 }, (_, index) => <div key={index} className="card-cafe h-64 shimmer" />)}
        </div>
      ) : promotions.length === 0 ? (
        <div className="text-center py-16 text-cafe-brown">No hay promociones activas por el momento.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {promotions.map((promotion, index) => (
            <article key={promotion._id} className="card-cafe image-art-card group overflow-hidden" style={{ animationDelay: `${index * 70}ms` }}>
              <div className="image-art-frame relative h-52 overflow-hidden">
                <img src={promotion.imageUrl} alt={promotion.title} className="image-art-image w-full h-full object-cover" loading="lazy" />
                <span className="absolute top-4 left-4 bg-cafe-caramel text-cafe-dark text-sm font-bold px-4 py-1.5 rounded-full">{promotion.badge}</span>
              </div>
              <div className="p-6">
                <h2 className="font-serif text-2xl text-cafe-cream mb-2">{promotion.title}</h2>
                <p className="text-cafe-brown text-sm mb-4">{promotion.description}</p>
                {promotion.itemsIncluded?.length > 0 && (
                  <ul className="text-sm text-cafe-cream/80 space-y-1 mb-5">
                    {promotion.itemsIncluded.map((item) => <li key={item}>• {item}</li>)}
                  </ul>
                )}
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-cafe-brown/60 line-through text-sm">${promotion.originalPrice} MXN</p>
                    <p className="text-cafe-caramel font-bold text-3xl">${promotion.comboPrice} <span className="text-sm text-cafe-brown font-normal">MXN</span></p>
                  </div>
                  <button className="btn-primary text-sm px-4 py-2" onClick={() => onNavigate('menu')}>
                    Ver el menú
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
