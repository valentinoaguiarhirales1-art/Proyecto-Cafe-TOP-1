import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { djangoCheckoutEnabled, updateProductWithImage } from '../api';
import { Plus, Coffee, Camera, Loader2 } from 'lucide-react';

const tierColors = { 'Bebidas': 'text-cafe-caramel', 'Frappes': 'text-sky-300', 'Reposteria': 'text-pink-400', 'Alimentos': 'text-green-400', 'Desayunos': 'text-orange-300', 'Lunch': 'text-emerald-300', 'Café en Grano': 'text-amber-400' };

export default function ProductCard({ product, products = [] }) {
  const { addItem } = useCart();
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const fileInputRef = useRef(null);
  const [currentImage, setCurrentImage] = useState(product.imageUrl);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [size, setSize] = useState(product.customization?.sizes?.[0]?.name || '');
  const [milk, setMilk] = useState(product.customization?.milkOptions?.[0]?.name || '');
  const [extras, setExtras] = useState([]);
  const [suggestedItems, setSuggestedItems] = useState([]);
  const [notes, setNotes] = useState('');

  const hasSizes = product.customization?.sizes?.length > 0;
  const hasMilk = product.customization?.milkOptions?.length > 0;
  const hasExtras = product.customization?.extras?.length > 0;

  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await updateProductWithImage(product._id, formData);
      if (res.data?.imageUrl) {
        setCurrentImage(res.data.imageUrl);
      }
    } catch (err) {
      alert('Error cambiando imagen: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const calcPrice = () => {
    let total = product.price;
    if (hasSizes) {
      const selectedSize = product.customization.sizes.find(option => option.name === size);
      if (selectedSize) total += selectedSize.extraPrice;
    }
    if (hasMilk) {
      const selectedMilk = product.customization.milkOptions.find(option => option.name === milk);
      if (selectedMilk) total += selectedMilk.extraPrice;
    }
    extras.forEach(name => {
      const selectedExtra = product.customization.extras.find(option => option.name === name);
      if (selectedExtra) total += selectedExtra.extraPrice;
    });
    return total;
  };

  const getSuggestionPrice = (item) => item.price + (item.customization?.sizes?.[0]?.extraPrice || 0);

  const toggleExtra = (name) => {
    setExtras(current => current.includes(name)
      ? current.filter(extra => extra !== name)
      : [...current, name]);
  };

  const isBeverage = ['Bebidas', 'Frappes'].includes(product.category);
  const pairCategories = isBeverage
    ? ['Desayunos', 'Lunch', 'Reposteria']
    : ['Bebidas', 'Frappes', 'Desayunos', 'Lunch', 'Reposteria'];
  const suggestionCategories = isBeverage
    ? pairCategories
    : ['Desayunos', 'Lunch', 'Reposteria', 'Frappes', 'Bebidas'];
  const eligibleSuggestions = products.filter(item => item._id !== product._id
    && item.isAvailable
    && pairCategories.includes(item.category));
  const preferredNames = ['Bebidas', 'Frappes'].includes(product.category)
    ? ['Galletas', 'Brownie', 'Rol de Canela']
    : ['Café Americano', 'Jugo de Naranja'];
  const suggestions = [];
  preferredNames.forEach(name => {
    const item = eligibleSuggestions.find(suggestion => suggestion.name === name);
    if (item && !suggestions.some(suggestion => suggestion._id === item._id)) suggestions.push(item);
  });
  suggestionCategories.forEach(category => {
    if (suggestions.length >= 4) return;
    const item = eligibleSuggestions.find(suggestion => suggestion.category === category
      && !suggestions.some(selected => selected._id === suggestion._id));
    if (item) suggestions.push(item);
  });
  eligibleSuggestions.forEach(item => {
    if (suggestions.length < 4 && !suggestions.some(suggestion => suggestion._id === item._id)) suggestions.push(item);
  });

  const selectedSuggestionsTotal = suggestions
    .filter(item => suggestedItems.includes(item._id))
    .reduce((total, item) => total + getSuggestionPrice(item), 0);
  const addToCartTotal = calcPrice() + selectedSuggestionsTotal;

  const handleAdd = () => {
    addItem({ ...product, imageUrl: currentImage }, { size, milk, extras, notes, finalPrice: calcPrice() });
    suggestions
      .filter(item => suggestedItems.includes(item._id))
      .forEach(item => {
        const defaultSize = item.customization?.sizes?.[0];
        addItem(item, {
          size: defaultSize?.name || '',
          finalPrice: item.price + (defaultSize?.extraPrice || 0)
        });
      });
    setShowModal(false);
    setSuggestedItems([]);
  };

  const toggleSuggestion = (id) => {
    setSuggestedItems(current => current.includes(id)
      ? current.filter(itemId => itemId !== id)
      : current.length < 3 ? [...current, id] : current);
  };

  const showCustomize = () => setShowModal(true);

  return (
    <>
      <div className="card-cafe image-art-card group relative">
        <div className="image-art-frame relative overflow-hidden aspect-[4/3]">
          <img src={currentImage} alt={currentImage === '/images/producto-sin-foto.svg' ? `Fotografía pendiente: ${product.name}` : product.name} loading="lazy" decoding="async" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="image-art-image w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-cafe-dark/80 to-transparent" />
          <span className={`absolute top-3 left-3 text-xs font-semibold uppercase tracking-wider ${tierColors[product.category] || 'text-cafe-caramel'}`}>
            {product.category === 'Reposteria' ? 'Repostería' : product.category}
          </span>
          {!product.isAvailable && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white font-semibold text-sm">{t('unavailable')}</span>
            </div>
          )}

          {/* Botón flotante para cambiar foto (Solo Admin) */}
          {isAdmin && !product.isDjangoPreview && (
            <div className="absolute top-3 right-3 z-10">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageFile}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                disabled={uploadingImage}
                title="Cambiar foto de este producto"
                className="p-1.5 rounded-full bg-cafe-dark/80 hover:bg-cafe-caramel text-cafe-cream hover:text-cafe-dark border border-cafe-caramel/40 transition shadow-lg flex items-center justify-center"
              >
                {uploadingImage ? <Loader2 size={13} className="animate-spin text-cafe-caramel" /> : <Camera size={13} />}
              </button>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-serif text-cafe-cream text-lg leading-tight mb-1">{product.name}</h3>
          <p className="text-cafe-brown text-xs leading-relaxed mb-3 line-clamp-2">{product.description}</p>
          <div className="flex items-center justify-between">
            <span className="text-cafe-caramel font-bold text-xl">${product.price} <span className="text-xs text-cafe-brown font-normal">MXN</span></span>
            <button
              disabled={!product.isAvailable || (product.isDjangoPreview && !djangoCheckoutEnabled)}
              onClick={(event) => { event.stopPropagation(); showCustomize(); }}
              className={`flex items-center gap-1 text-sm px-3 py-2 rounded-full font-semibold transition-all duration-200 ${product.isAvailable && (!product.isDjangoPreview || djangoCheckoutEnabled) ? 'bg-cafe-caramel text-cafe-dark hover:bg-cafe-gold hover:scale-105' : 'bg-cafe-brown/30 text-cafe-brown cursor-not-allowed'}`}>
              <Plus size={16} /> {product.isDjangoPreview && !djangoCheckoutEnabled ? 'Solo consulta' : t('btn_add')}
            </button>
          </div>
          {hasSizes && (
            <p className="text-cafe-brown/70 text-xs mt-2 flex items-center gap-1">
              <Coffee size={10} /> {product.customization.sizes.map(option => `${option.name} $${product.price + option.extraPrice}`).join(' · ')}
            </p>
          )}
        </div>
      </div>

      {showModal && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-4" onClick={() => setShowModal(false)}>
          <div className="glass-dark flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl animate-slide-up" onClick={event => event.stopPropagation()}>
            <div className="image-art-frame relative h-36 shrink-0 overflow-hidden sm:h-40">
              <img src={currentImage} alt={product.name} loading="lazy" decoding="async" className="image-art-image w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-cafe-dark to-transparent" />
              <h2 className="absolute bottom-3 left-4 font-serif text-cafe-cream text-xl">{product.name}</h2>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
              <p className="text-cafe-brown text-sm">{product.description}</p>

              {hasSizes && (
                <div>
                  <p className="text-cafe-cream font-semibold text-sm mb-2">Tamaño</p>
                  <div className="flex flex-wrap gap-2">
                    {product.customization.sizes.map(option => (
                      <button key={option.name} onClick={() => setSize(option.name)}
                        type="button"
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${size === option.name ? 'bg-cafe-caramel text-cafe-dark' : 'border border-cafe-brown/50 text-cafe-cream hover:border-cafe-caramel'}`}>
                        {option.name} · ${product.price + option.extraPrice}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {hasMilk && (
                <div>
                  <p className="text-cafe-cream font-semibold text-sm mb-2">Tipo de leche</p>
                  <div className="flex flex-wrap gap-2">
                    {product.customization.milkOptions.map(option => (
                      <button key={option.name} onClick={() => setMilk(option.name)}
                        type="button"
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${milk === option.name ? 'bg-cafe-caramel text-cafe-dark' : 'border border-cafe-brown/50 text-cafe-cream hover:border-cafe-caramel'}`}>
                        {option.name} {option.extraPrice > 0 && `+$${option.extraPrice}`}
                      </button>
                    ))}
                  </div>
                </div>,
                document.body
              )}

              <section className="border-t border-cafe-brown/30 pt-4">
                <p className="text-cafe-cream font-semibold text-sm mb-2">Extras para tu pedido</p>
                {hasExtras ? (
                  <div className="flex flex-wrap gap-2">
                    {product.customization.extras.map(extra => (
                      <button key={extra.name} onClick={() => toggleExtra(extra.name)}
                        type="button"
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${extras.includes(extra.name) ? 'bg-cafe-gold text-cafe-dark' : 'border border-cafe-brown/50 text-cafe-cream hover:border-cafe-gold'}`}>
                        {extra.name} {extra.extraPrice > 0 ? `+$${extra.extraPrice}` : '(sin costo)'}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-cafe-brown text-xs">No hay extras con costo para este producto; puedes dejar una indicación en las notas.</p>
                )}
              </section>

              <section className="border-t border-cafe-brown/30 pt-4">
                <p className="text-cafe-cream font-semibold text-sm mb-1">¿Te gustaría acompañarlo con algo más?</p>
                <p className="text-cafe-brown text-xs mb-3">Elige hasta 3 productos; se agregan por separado a tu pedido.</p>
                <div className="space-y-2">
                  {suggestions.map(item => (
                    <button key={item._id} onClick={() => toggleSuggestion(item._id)}
                      type="button"
                      aria-pressed={suggestedItems.includes(item._id)}
                      className={`w-full flex items-center gap-3 rounded-xl p-2 text-left transition-colors ${suggestedItems.includes(item._id) ? 'bg-cafe-caramel/20 ring-1 ring-cafe-caramel' : 'bg-cafe-dark/40 hover:bg-cafe-dark/70'}`}>
                      <img src={item.imageUrl} alt="" className="w-11 h-11 object-cover rounded-lg" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-cafe-cream text-xs font-medium truncate">{item.name}</span>
                        <span className="block text-cafe-brown text-xs">
                          {item.customization?.sizes?.[0] && `${item.customization.sizes[0].name} · `}
                          ${getSuggestionPrice(item)} MXN
                        </span>
                      </span>
                      <span className="text-cafe-caramel text-sm">{suggestedItems.includes(item._id) ? '✓' : '+'}</span>
                    </button>
                  ))}
                </div>
              </section>

              <div>
                <p className="text-cafe-cream font-semibold text-sm mb-2">Notas especiales</p>
                <input className="input-cafe text-sm" placeholder="Ej: poco caliente, sin azúcar..." value={notes} onChange={event => setNotes(event.target.value)} />
              </div>

            </div>
            <div className="shrink-0 space-y-3 border-t border-cafe-brown/30 bg-cafe-espresso/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur sm:p-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-cafe-cream text-sm font-semibold">Total a agregar</p>
                  <p className="text-cafe-brown text-xs">
                    Producto ${calcPrice()} {selectedSuggestionsTotal > 0 && `· acompañamientos $${selectedSuggestionsTotal}`}
                  </p>
                </div>
                <p className="shrink-0 text-cafe-caramel text-2xl font-bold" aria-live="polite">
                  ${addToCartTotal} <span className="text-xs font-normal text-cafe-brown">MXN</span>
                </p>
              </div>
              <button type="button" onClick={handleAdd} className="btn-primary w-full">
                Agregar al carrito · ${addToCartTotal} MXN
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
