import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createDjangoOrder, createOrder, djangoAuthEnabled, djangoCheckoutEnabled } from '../api';
import { cartBackend, djangoOrderItems } from '../utils/cartBackend';
import { X, ShoppingCart, Trash2, Plus, Minus, Coffee, LoaderCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function CartDrawer({ onLoginClick, onNavigate }) {
  const { items, removeItem, updateQuantity, clearCart, total, count, isOpen, setIsOpen } = useCart();
  const { user, sessionLoading, sessionError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [djangoResult, setDjangoResult] = useState(null);
  const [orderType, setOrderType] = useState('Para llevar');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const hasOfflineProducts = items.some(item => item.isOfflineProduct);
  const backend = cartBackend(items);
  const isDjango = backend === 'django';
  const canCheckout = isOnline && !hasOfflineProducts && backend !== 'mixed' && (!isDjango || djangoCheckoutEnabled);
  const closeCart = () => {
    setIsOpen(false);
    if (djangoResult) {
      setSuccess(false);
      setDjangoResult(null);
    }
  };

  useEffect(() => {
    const updateConnection = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    return () => {
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
    };
  }, []);

  const handleCheckout = async () => {
    if (!canCheckout) return;
    if (djangoAuthEnabled && (sessionLoading || sessionError)) {
      alert('Primero comprueba tu sesión de Django desde el menú superior.');
      return;
    }
    if (djangoAuthEnabled && !isDjango) {
      alert('Este producto pertenece a Express y no se puede pedir con una cuenta de Django.');
      return;
    }
    if (djangoAuthEnabled && !user) { setIsOpen(false); onLoginClick(); return; }
    if (!isDjango && !user) { setIsOpen(false); onLoginClick(); return; }
    setLoading(true);
    try {
      const orderItems = isDjango ? djangoOrderItems(items) : items.map(i => ({
        name: i.name, qty: i.qty, price: i.finalPrice,
        product: i._id, selectedSize: i.selectedSize,
        selectedMilk: i.selectedMilk, selectedExtras: i.selectedExtras, notes: i.notes
      }));
      if (isDjango) {
        const response = await createDjangoOrder({ orderItems, orderType }, djangoAuthEnabled ? user.id : undefined);
        setDjangoResult(response.data);
      } else {
        await createOrder({ orderItems, totalPrice: total, orderType });
      }
      confetti({ particleCount: 120, spread: 80, colors: ['#c67c3f','#d4a017','#f5e6c8'] });
      setSuccess(true);
      clearCart();
      if (!isDjango) setTimeout(() => { setSuccess(false); setIsOpen(false); onNavigate('orders'); }, 2500);
    } catch (err) {
      alert('Error al procesar pedido: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeCart} />
      <div className="relative flex h-[100dvh] min-h-0 w-full max-w-md flex-col bg-cafe-espresso shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-cafe-brown/30">
          <div className="flex items-center gap-2">
            <ShoppingCart className="text-cafe-caramel" size={22} />
            <h2 className="font-serif text-xl text-cafe-cream">Tu Pedido</h2>
            {count > 0 && <span className="bg-cafe-caramel text-cafe-dark text-xs font-bold px-2 py-0.5 rounded-full">{count}</span>}
          </div>
          <button onClick={closeCart} className="p-2 hover:bg-cafe-brown/30 rounded-full transition-colors">
            <X size={20} className="text-cafe-cream" />
          </button>
        </div>

        {success ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
            <Coffee size={48} className="text-cafe-caramel mb-4" aria-hidden="true" />
            {djangoResult ? <>
              <h3 className="font-serif text-2xl text-cafe-cream mb-2">Pedido de prueba registrado</h3>
              <p className="text-cafe-brown">Total calculado por Django: ${djangoResult.totalPrice}. Pago pendiente en mostrador; no se ha cobrado.</p>
              {djangoAuthEnabled
                ? <button className="text-cafe-gold underline mt-3" onClick={() => { closeCart(); onNavigate('orders'); }}>Consultar mis pedidos de Django</button>
                : <a className="text-cafe-gold underline mt-3" href="/catalogo-django" target="_blank" rel="noreferrer">Consultar pedidos de Django</a>}
              <button className="btn-outline mt-4" onClick={closeCart}>Cerrar</button>
            </> : <>
              <h3 className="font-serif text-2xl text-cafe-cream mb-2">¡Pedido Confirmado!</h3>
              <p className="text-cafe-brown">Tu barista ya está preparando tu café con amor.</p>
              <p className="text-cafe-gold mt-2 text-sm">Puntos acumulados en tu cuenta</p>
            </>}
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Coffee size={42} className="text-cafe-caramel mb-4 animate-float" aria-hidden="true" />
            <p className="text-cafe-brown font-serif text-lg">Tu carrito está vacío</p>
            <p className="text-cafe-brown/60 text-sm mt-1">Explora nuestro menú exquisito</p>
            <button onClick={() => setIsOpen(false)} className="btn-primary mt-5 text-sm">Ver Menú</button>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
              {items.map(item => (
                <div key={item.cartId} className="flex gap-3 bg-cafe-dark/40 rounded-xl p-3">
                  <img src={item.imageUrl} alt={item.name} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-cafe-cream text-sm leading-tight">{item.name}</p>
                    {item.selectedSize && <p className="text-xs text-cafe-brown">{item.selectedSize}</p>}
                    {item.selectedMilk && <p className="text-xs text-cafe-brown">{item.selectedMilk}</p>}
                    {item.selectedExtras?.length > 0 && <p className="text-xs text-cafe-gold">{item.selectedExtras.join(', ')}</p>}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-cafe-caramel font-bold text-sm">${item.finalPrice * item.qty}</span>
                      <div className="flex items-center gap-2">
                        <button aria-label={`Quitar una unidad de ${item.name}`} onClick={() => updateQuantity(item.cartId, -1)} className="p-1 rounded-full hover:bg-cafe-brown/30">
                          <Minus size={13} className="text-cafe-cream" />
                        </button>
                        <span className="text-cafe-brown text-xs">x{item.qty}</span>
                        <button aria-label={`Agregar una unidad de ${item.name}`} disabled={item.qty >= 50} onClick={() => updateQuantity(item.cartId, 1)} className="p-1 rounded-full hover:bg-cafe-brown/30 disabled:opacity-40">
                          <Plus size={13} className="text-cafe-cream" />
                        </button>
                        <button onClick={() => removeItem(item.cartId)} className="p-1 hover:text-red-400 transition-colors">
                          <Trash2 size={14} className="text-cafe-brown" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tipo de pedido */}
            <div className="px-4 py-3 border-t border-cafe-brown/20">
              <p className="text-cafe-cream text-sm font-medium mb-2">Modalidad:</p>
              <div className="flex gap-2">
                {['Para llevar', 'En mesa'].map(t => (
                  <button key={t} onClick={() => setOrderType(t)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${orderType === t ? 'bg-cafe-caramel text-cafe-dark' : 'border border-cafe-brown/40 text-cafe-brown hover:border-cafe-caramel'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Total y botón */}
            <div className="p-5 border-t border-cafe-brown/30 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-cafe-brown">Total del pedido</span>
                <span className="text-cafe-caramel font-bold text-2xl">${total} <span className="text-xs text-cafe-brown font-normal">MXN</span></span>
              </div>
              {user && !isDjango && !djangoAuthEnabled && <p className="text-cafe-gold text-xs text-right">Sumarás ~{Math.floor(total/10)} puntos con esta compra</p>}
              {isDjango && <p className="text-amber-300 text-xs">Prueba Django: necesitas una cuenta Django independiente. No hay puntos ni pago en línea. El total definitivo lo calcula el servidor. {!djangoAuthEnabled && <a className="underline" href="/catalogo-django" target="_blank" rel="noreferrer">Abrir acceso Django</a>}</p>}
              {backend === 'mixed' && <p className="text-amber-300 text-xs" role="alert">El carrito contiene productos de catálogos distintos. Vacíalo y agrega productos de un solo catálogo.</p>}
              {!isOnline && <p className="text-amber-300 text-xs" role="status">Sin conexión: puedes revisar tu carrito, pero para confirmar el pedido necesitas internet.</p>}
              {isOnline && hasOfflineProducts && (
                <div className="text-amber-300 text-xs space-y-2" role="status">
                  <p>Este menú se cargó sin conexión. Actualízalo antes de enviar el pedido.</p>
                  <button onClick={() => { clearCart(); window.location.reload(); }} className="underline underline-offset-2">Actualizar menú</button>
                </div>
              )}
              <button onClick={handleCheckout} disabled={loading || !canCheckout}
                className="btn-primary w-full text-center disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? <><LoaderCircle size={16} className="inline animate-spin mr-2" />Procesando...</> : !canCheckout ? 'No se puede enviar este carrito' : isDjango || user ? 'Confirmar pedido' : 'Inicia sesión para pedir'}
              </button>
              <button onClick={clearCart} className="w-full text-center text-cafe-brown/60 text-xs hover:text-cafe-brown transition-colors">
                Vaciar carrito
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
