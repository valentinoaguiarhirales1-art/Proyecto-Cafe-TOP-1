import { useState, useEffect } from 'react';
import { djangoAuthEnabled, getMyDjangoOrders, getMyOrders } from '../api';
import { adaptDjangoOrders } from '../utils/djangoOrders';
import { useAuth } from '../context/AuthContext';
import { Package, Clock, CheckCircle, ChefHat, XCircle, Coffee, Search, X } from 'lucide-react';
import RecoveryNotice from '../components/RecoveryNotice';

const statusIcon = {
  'Pendiente':           <Clock size={16} className="text-yellow-400"/>,
  'En preparación':      <ChefHat size={16} className="text-blue-400"/>,
  'Listo para entrega':  <Coffee size={16} className="text-green-400"/>,
  'Entregado':           <CheckCircle size={16} className="text-cafe-caramel"/>,
  'Cancelado':           <XCircle size={16} className="text-red-400"/>,
};

const statusColor = {
  'Pendiente':           'border-yellow-500/40 bg-yellow-900/10',
  'En preparación':      'border-blue-500/40 bg-blue-900/10',
  'Listo para entrega':  'border-green-500/40 bg-green-900/10',
  'Entregado':           'border-cafe-caramel/40 bg-cafe-caramel/5',
  'Cancelado':           'border-red-500/40 bg-red-900/10',
};

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await (djangoAuthEnabled ? getMyDjangoOrders(user.id) : getMyOrders());
      setOrders(djangoAuthEnabled ? adaptDjangoOrders(data) : data);
    } catch (requestError) {
      console.error('No se pudieron cargar los pedidos:', requestError);
      setError(requestError.response?.data?.error || 'No pudimos consultar tus pedidos. Revisa tu conexión y vuelve a intentarlo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, []);

  const normalizeSearch = (value) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();
  const normalizedSearch = normalizeSearch(searchTerm.trim());
  const filteredOrders = orders.filter(order => {
    const searchableText = [
      order._id,
      order.status,
      order.orderType,
      order.branch,
      order.totalPrice,
      new Date(order.createdAt).toLocaleDateString('es-MX'),
      ...(order.orderItems || []).flatMap(item => [
        item.name, item.selectedSize, item.selectedMilk, item.notes, ...(item.selectedExtras || []),
      ]),
    ].filter(Boolean).join(' ');
    return normalizeSearch(searchableText).includes(normalizedSearch);
  });

  if (loading) return (
    <div className="min-h-screen pt-20 flex items-center justify-center">
      <Coffee size={40} className="mx-auto text-cafe-caramel animate-float" aria-hidden="true" />
    </div>
  );

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 animate-fade-in">
          <p className="section-subtitle flex items-center gap-2"><Package size={14}/> Tu historial</p>
          <h1 className="section-title">Mis <span className="text-cafe-caramel">Pedidos</span></h1>
        </div>

        {error ? (
          <RecoveryNotice
            title="No se pudieron cargar tus pedidos"
            message={`${error} Tus pedidos no se han borrado; solo no pudimos mostrarlos ahora.`}
            onRetry={loadOrders}
          />
        ) : orders.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <Coffee size={48} className="mx-auto mb-4 text-cafe-caramel animate-float" aria-hidden="true" />
            <p className="font-serif text-xl text-cafe-cream">Aún no tienes pedidos</p>
            <p className="text-cafe-brown mt-2">Cuando pidas un café, aparecerá aquí.</p>
          </div>
        ) : (
          <>
            <label className="relative mb-5 block">
              <Search size={18} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-cafe-brown" />
              <input
                type="search"
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Buscar por producto, fecha o estado..."
                aria-label="Buscar en mis pedidos"
                className="input-cafe w-full pl-10 pr-11"
              />
              {searchTerm && (
                <button type="button" onClick={() => setSearchTerm('')} aria-label="Limpiar búsqueda"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-cafe-brown hover:bg-cafe-brown/20 hover:text-cafe-cream">
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </label>
            {filteredOrders.length === 0 ? (
              <div role="status" className="rounded-2xl border border-cafe-brown/30 bg-cafe-dark/40 py-10 text-center">
                <p className="font-serif text-lg text-cafe-cream">No encontré pedidos con “{searchTerm}”</p>
                <p className="mt-2 text-sm text-cafe-brown">Prueba con el nombre de un producto, la fecha o el estado.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map(order => (
              <div key={order._id} className={`card-cafe border ${statusColor[order.status] || ''} animate-slide-up`}>
                <div className="p-5">
                  {/* Header del pedido */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-cafe-cream font-semibold text-sm">Pedido #{order._id.slice(-6).toUpperCase()}</p>
                      <p className="text-cafe-brown/60 text-xs">{new Date(order.createdAt).toLocaleString('es-MX')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusIcon[order.status]}
                      <span className="text-cafe-cream text-sm font-medium">{order.status}</span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-2 border-t border-cafe-brown/20 pt-3">
                    {order.orderItems.map((item, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div>
                          <span className="text-cafe-cream text-sm">{item.qty}x {item.name}</span>
                          {item.selectedSize && <span className="text-cafe-brown text-xs ml-2">({item.selectedSize})</span>}
                          {item.selectedMilk && <span className="text-cafe-brown text-xs ml-1">· {item.selectedMilk}</span>}
                          {item.selectedExtras?.length > 0 && <span className="text-cafe-brown text-xs ml-1">· {item.selectedExtras.join(', ')}</span>}
                          {item.notes && <p className="text-cafe-brown/60 text-xs italic">Nota: {item.notes}</p>}
                        </div>
                        <span className="text-cafe-caramel text-sm font-medium">${item.price * item.qty}</span>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-cafe-brown/20">
                    <div className="flex gap-3 text-xs text-cafe-brown">
                      <span>{order.orderType}</span>
                      {order.branch && <span>· {order.branch}</span>}
                    </div>
                    <div className="text-right">
                      <p className="text-cafe-caramel font-bold text-lg">${order.totalPrice} MXN</p>
                      {order.legacyPayment && <p className="text-cafe-brown text-xs">Registro de Express: {order.legacyPayment.isPaid ? 'pagado' : 'pago no registrado'}{order.legacyPayment.branch ? ` · ${order.legacyPayment.branch}` : ''}</p>}
                      {order.pointsEarned > 0 && <p className="text-cafe-gold text-xs">+{order.pointsEarned} puntos ganados ⭐</p>}
                    </div>
                  </div>
                </div>
              </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
