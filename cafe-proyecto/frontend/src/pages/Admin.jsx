import { useState, useEffect } from 'react';
import { getAllOrders, updateOrderStatus, getAnalytics, getProducts, createProduct, updateProductAvailability, deleteProduct, getPromotions, createPromotion, getAllUsers, getEvents, createEvent, getReservations, updateReservationStatus, djangoReservationsEnabled, djangoCheckoutEnabled, djangoCatalogEnabled, djangoPromotionsEnabled, djangoEventsEnabled } from '../api';
import { useAuth } from '../context/AuthContext';
import { BarChart3, Package, Users, Coffee, Plus, Trash2, ChefHat, TrendingUp, Star, Power, Palette, Shield, RefreshCw } from 'lucide-react';
import SiteEditorTab from './SiteEditorTab';
import RecoveryNotice from '../components/RecoveryNotice';

const TABS = ['comandas','productos','promociones','eventos','reservas','usuarios','analiticas','apariencia'];
const getRequestMessage = (error, fallback) => error.response?.data?.error || fallback;

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('comandas');

  if (!user || !['admin','codueno','gerente'].includes(user.role)) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center text-center px-4">
        <div className="animate-fade-in">
          <Shield size={40} className="mx-auto mb-4 text-cafe-caramel" aria-hidden="true" />
          <h2 className="font-serif text-2xl text-cafe-cream">Acceso Restringido</h2>
          <p className="text-cafe-brown mt-2">Solo disponible para administración de la cafetería.</p>
        </div>
      </div>
    );
  }

  const tabLabel = { comandas:'Comandas', productos:'Productos', promociones:'Combos', eventos:'Eventos', reservas:'Reservas', usuarios:'Usuarios', analiticas:'Analíticas', apariencia:'Apariencia' };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 animate-fade-in">
          <p className="section-subtitle">Panel de Control</p>
          <h1 className="section-title">Admin <span className="text-cafe-caramel">Dashboard</span></h1>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-cafe-brown/30 pb-2">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${tab === t ? 'bg-cafe-caramel text-cafe-dark' : 'text-cafe-brown hover:text-cafe-cream'}`}>
              {tabLabel[t]}
            </button>
          ))}
        </div>

        {tab === 'comandas'   && <>
          {djangoCheckoutEnabled && <div className="glass-dark p-5 mb-4 text-cafe-cream" role="status">Este tablero solo muestra pedidos de Express. Los pedidos de prueba de Django se gestionan en el panel del personal de Django, con una cuenta y permisos de Django.</div>}
          <ComandasTab />
        </>}
        {tab === 'productos'  && <>
          {djangoCatalogEnabled && <div className="glass-dark p-5 mb-4 text-cafe-cream" role="status">Este apartado modifica productos de Express. El catálogo de prueba de Django se gestiona por separado en su panel del personal.</div>}
          <ProductosTab />
        </>}
        {tab === 'promociones'&& <>
          {djangoPromotionsEnabled && <div className="glass-dark p-5 mb-4 text-cafe-cream" role="status">Este apartado modifica promociones de Express. Las promociones mostradas al público se gestionan por separado en la administración Django.</div>}
          <PromocionesTab />
        </>}
        {tab === 'eventos'    && <>
          {djangoEventsEnabled && <div className="glass-dark p-5 mb-4 text-cafe-cream" role="status">Este apartado modifica eventos de Express. Los eventos públicos de Django y sus reservas se gestionan por separado en la administración Django.</div>}
          <EventosTab />
        </>}
        {tab === 'reservas'   && (djangoReservationsEnabled ? (
          <div className="glass-dark p-5 text-cafe-cream" role="status">
            Las nuevas solicitudes se guardan en Django, no en este panel. Para gestionarlas,
            inicia sesión en el panel del personal de Django con los permisos correspondientes.
            Las solicitudes anteriores siguen en la base de datos de Express.
          </div>
        ) : <ReservasTab />)}
        {tab === 'usuarios'   && <UsuariosTab />}
        {tab === 'analiticas' && <AnaliticasTab />}
        {tab === 'apariencia' && <SiteEditorTab />}
      </div>
    </div>
  );
}

/* ---- COMANDAS (Tablero Kanban de Cocina) ---- */
function ComandasTab() {
  const [orders, setOrders]   = useState([]);
  const [filter, setFilter]   = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingOrder, setUpdatingOrder] = useState('');
  const statuses = ['Pendiente','En preparación','Listo para entrega','Entregado','Cancelado'];
  const statusColor = { 'Pendiente':'border-yellow-500','En preparación':'border-blue-500','Listo para entrega':'border-green-500','Entregado':'border-cafe-caramel','Cancelado':'border-red-500' };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getAllOrders(filter ? { status: filter } : {});
      setOrders(response.data);
    } catch (loadError) {
      setError(getRequestMessage(loadError, 'No se pudieron cargar las comandas.'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [filter]);

  const changeStatus = async (id, status) => {
    setUpdatingOrder(id);
    try {
      await updateOrderStatus(id, status);
      await load();
    } catch (updateError) {
      setError(getRequestMessage(updateError, 'No se pudo actualizar la comanda.'));
    } finally {
      setUpdatingOrder('');
    }
  };

  return (
    <div>
      {/* Filtro */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setFilter('')} className={`px-3 py-1.5 rounded-full text-xs font-medium ${!filter ? 'bg-cafe-caramel text-cafe-dark':'border border-cafe-brown/40 text-cafe-brown hover:border-cafe-caramel'}`}>Todos</button>
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium ${filter===s ? 'bg-cafe-caramel text-cafe-dark':'border border-cafe-brown/40 text-cafe-brown hover:border-cafe-caramel'}`}>{s}</button>
        ))}
      </div>

      {error && <div className="flex flex-wrap items-center justify-between gap-3 mb-4 text-red-400 text-sm" role="alert"><span>{error}</span><button onClick={load} className="btn-outline text-xs py-1.5 flex items-center gap-1"><RefreshCw size={13}/> Reintentar</button></div>}
      {loading ? (
        <p className="text-center py-12 text-cafe-brown">Cargando comandas…</p>
      ) : orders.length === 0 && !error ? (
        <div className="text-center py-16 text-cafe-brown"><ChefHat size={40} className="mx-auto mb-3 opacity-40"/><p>No hay comandas activas</p></div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div key={order._id} className={`glass-dark border-l-4 ${statusColor[order.status] || 'border-cafe-brown'} p-4 animate-fade-in`}>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <div>
                  <span className="text-cafe-cream font-bold">#{order._id.slice(-6).toUpperCase()}</span>
                  <span className="text-cafe-brown text-xs ml-2">{order.orderType}</span>
                  {order.tableNumber && <span className="text-cafe-caramel text-xs ml-2">Mesa #{order.tableNumber}</span>}
                  <p className="text-cafe-brown/60 text-xs">{order.user?.name} · {new Date(order.createdAt).toLocaleTimeString('es-MX')}</p>
                </div>
                <div className="text-right">
                  <p className="text-cafe-caramel font-bold">${order.totalPrice} MXN</p>
                  <p className="text-cafe-brown/60 text-xs">{order.branch}</p>
                </div>
              </div>
              <div className="text-cafe-brown text-sm mb-3">
                {order.orderItems.map((i,idx) => (
                  <p key={idx}>• {i.qty}x <strong className="text-cafe-cream">{i.name}</strong> {i.selectedSize && `(${i.selectedSize})`} {i.selectedMilk && `· ${i.selectedMilk}`} {i.selectedExtras?.length > 0 && `· ${i.selectedExtras.join(', ')}`} {i.notes && <em className="text-cafe-brown/60"> — {i.notes}</em>}</p>
                ))}
              </div>
              {/* Cambiar estado */}
              <div className="flex flex-wrap gap-2">
                {statuses.filter(s => s !== order.status).map(s => (
                  <button key={s} onClick={() => changeStatus(order._id, s)} disabled={updatingOrder === order._id}
                    className="px-3 py-1 bg-cafe-dark/60 border border-cafe-brown/30 rounded-lg text-xs text-cafe-brown hover:text-cafe-cream hover:border-cafe-caramel transition-colors">
                    {updatingOrder === order._id ? 'Guardando…' : `→ ${s}`}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- PRODUCTOS ---- */
function ProductosTab() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name:'', price:'', description:'', category:'Bebidas', imageUrl:'' });
  const [adding, setAdding] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [savingAvailability, setSavingAvailability] = useState({});
  const [loadError, setLoadError] = useState('');
  const cats = ['Bebidas','Frappes','Desayunos','Lunch','Reposteria','Alimentos','Café en Grano'];

  const load = async () => {
    setLoadingProducts(true);
    setLoadError('');
    try {
      const response = await getProducts();
      setProducts(response.data);
    } catch (error) {
      setLoadError(getRequestMessage(error, 'No se pudo cargar el catálogo.'));
    } finally {
      setLoadingProducts(false);
    }
  };
  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try { await createProduct({ ...form, price: Number(form.price) }); setAdding(false); setForm({ name:'',price:'',description:'',category:'Bebidas',imageUrl:'' }); load(); }
    catch(err) { alert(err.response?.data?.error || 'Error al crear'); }
  };
  const toggleAvailability = async (product) => {
    setSavingAvailability((current) => ({ ...current, [product._id]: true }));
    try {
      const response = await updateProductAvailability(product._id, !product.isAvailable);
      setProducts((current) => current.map((item) => item._id === product._id ? response.data : item));
    } catch (error) {
      alert(error.response?.data?.error || 'No se pudo cambiar la disponibilidad del artículo');
    } finally {
      setSavingAvailability((current) => ({ ...current, [product._id]: false }));
    }
  };
  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar producto?')) return;
    try {
      await deleteProduct(id);
      await load();
    } catch (error) {
      alert(error.response?.data?.error || 'No se pudo eliminar el producto');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h3 className="font-serif text-xl text-cafe-cream">Catálogo ({products.length})</h3>
          <p className="text-xs text-cafe-brown mt-1">Disponibles: {products.filter((product) => product.isAvailable).length} · Pausados: {products.filter((product) => !product.isAvailable).length}</p>
        </div>
        <button onClick={() => setAdding(!adding)} className="btn-primary text-sm py-2 flex items-center gap-1"><Plus size={14}/> Nuevo</button>
      </div>

      {loadError && <div className="flex flex-wrap items-center justify-between gap-3 mb-4 text-red-400 text-sm" role="alert"><span>{loadError}</span><button onClick={load} className="btn-outline text-xs py-1.5 flex items-center gap-1"><RefreshCw size={13}/> Reintentar</button></div>}

      {adding && (
        <form onSubmit={handleAdd} className="glass-dark p-5 mb-5 animate-slide-up space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className="input-cafe" placeholder="Nombre del café" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required />
            <input className="input-cafe" placeholder="Precio base MXN" type="number" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} required />
            <select className="input-cafe" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
              {cats.map(c => <option key={c}>{c}</option>)}
            </select>
            <input className="input-cafe" placeholder="URL de imagen (opcional)" value={form.imageUrl} onChange={e=>setForm({...form,imageUrl:e.target.value})} />
          </div>
          <textarea className="input-cafe" rows={2} placeholder="Descripción del producto" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required />
          <div className="flex gap-3">
            <button type="submit" className="btn-primary text-sm py-2">Guardar Producto</button>
            <button type="button" onClick={() => setAdding(false)} className="btn-outline text-sm py-2">Cancelar</button>
          </div>
        </form>
      )}

      {loadingProducts ? (
        <p className="text-center py-12 text-cafe-brown">Cargando catálogo…</p>
      ) : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(p => (
          <div key={p._id} className={`card-cafe p-4 ${!p.isAvailable ? 'opacity-50' : ''}`}>
            <div className="flex gap-3">
              <img src={p.imageUrl} alt={p.name} className="w-16 h-16 object-cover rounded-lg flex-shrink-0"/>
              <div className="flex-1 min-w-0">
                <p className="text-cafe-cream font-semibold text-sm leading-tight">{p.name}</p>
                <p className="text-cafe-caramel font-bold">${p.price}</p>
                <p className="text-cafe-brown/60 text-xs">{p.category}</p>
              </div>
              <button onClick={() => handleDelete(p._id)} className="text-red-400/60 hover:text-red-400 transition-colors p-1">
                <Trash2 size={16}/>
              </button>
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-cafe-brown/20">
              <span className={`text-xs font-semibold ${p.isAvailable ? 'text-green-400' : 'text-red-400'}`}>
                {p.isAvailable ? 'Disponible para compra' : 'No disponible'}
              </span>
              <button
                type="button"
                onClick={() => toggleAvailability(p)}
                disabled={savingAvailability[p._id]}
                className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 disabled:opacity-50 ${p.isAvailable ? 'border border-red-400/40 text-red-300 hover:bg-red-900/20' : 'border border-green-400/40 text-green-300 hover:bg-green-900/20'}`}
                aria-label={`${p.isAvailable ? 'Deshabilitar' : 'Habilitar'} ${p.name}`}
              >
                <Power size={14} />
                {savingAvailability[p._id] ? 'Guardando…' : p.isAvailable ? 'Deshabilitar' : 'Habilitar'}
              </button>
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
}

/* ---- PROMOCIONES ---- */
function PromocionesTab() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title:'', description:'', originalPrice:'', comboPrice:'', badge:'', imageUrl:'', itemsIncluded:'' });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getPromotions();
      setPromos(response.data);
    } catch (loadError) {
      setError(getRequestMessage(loadError, 'No se pudieron cargar los combos.'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await createPromotion({ ...form, originalPrice: Number(form.originalPrice), comboPrice: Number(form.comboPrice), itemsIncluded: form.itemsIncluded.split(',').map(s=>s.trim()) });
      setAdding(false); load();
    } catch(err) { alert(err.response?.data?.error || 'Error'); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h3 className="font-serif text-xl text-cafe-cream">Combos ({promos.length})</h3>
        <button onClick={() => setAdding(!adding)} className="btn-primary text-sm py-2 flex items-center gap-1"><Plus size={14}/> Nuevo Combo</button>
      </div>
      {error && <div className="flex flex-wrap items-center justify-between gap-3 mb-4 text-red-400 text-sm" role="alert"><span>{error}</span><button onClick={load} className="btn-outline text-xs py-1.5 flex items-center gap-1"><RefreshCw size={13}/> Reintentar</button></div>}
      {adding && (
        <form onSubmit={handleAdd} className="glass-dark p-5 mb-5 animate-slide-up space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className="input-cafe" placeholder="Título del combo" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required />
            <input className="input-cafe" placeholder="Badge (Ej: Ahorra 20%)" value={form.badge} onChange={e=>setForm({...form,badge:e.target.value})} />
            <input className="input-cafe" placeholder="Precio original" type="number" value={form.originalPrice} onChange={e=>setForm({...form,originalPrice:e.target.value})} required />
            <input className="input-cafe" placeholder="Precio combo" type="number" value={form.comboPrice} onChange={e=>setForm({...form,comboPrice:e.target.value})} required />
            <input className="input-cafe col-span-2" placeholder="URL de imagen (opcional)" value={form.imageUrl} onChange={e=>setForm({...form,imageUrl:e.target.value})} />
          </div>
          <textarea className="input-cafe" rows={2} placeholder="Descripción" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required />
          <input className="input-cafe" placeholder="Items incluidos (separados por coma)" value={form.itemsIncluded} onChange={e=>setForm({...form,itemsIncluded:e.target.value})} />
          <div className="flex gap-3">
            <button type="submit" className="btn-primary text-sm py-2">Guardar Combo</button>
            <button type="button" onClick={() => setAdding(false)} className="btn-outline text-sm py-2">Cancelar</button>
          </div>
        </form>
      )}
      {loading && <p className="text-center py-10 text-cafe-brown">Cargando combos…</p>}
      {!loading && !error && promos.length === 0 && <p className="text-center py-10 text-cafe-brown">Todavía no hay combos publicados.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {promos.map(p => (
          <div key={p._id} className="card-cafe p-4 flex gap-3">
            <img src={p.imageUrl || 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=200&q=60'} alt={p.title} className="w-20 h-20 object-cover rounded-lg flex-shrink-0"/>
            <div>
              <span className="text-cafe-caramel text-xs font-bold">{p.badge}</span>
              <p className="text-cafe-cream font-semibold">{p.title}</p>
              <p className="text-cafe-brown/60 line-through text-xs">${p.originalPrice}</p>
              <p className="text-cafe-caramel font-bold">${p.comboPrice} MXN</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- EVENTOS ---- */
function EventosTab() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title:'', description:'', date:'', time:'18:00 hrs', location:'Terraza Principal', capacity:20, price:0, category:'Cata de Café' });
  const cats = ['Cata de Café','Música Acústica / Jazz','Taller de Barismo','Especial'];

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getEvents();
      setEvents(response.data);
    } catch (loadError) {
      setError(getRequestMessage(loadError, 'No se pudieron cargar los eventos.'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try { await createEvent({ ...form, capacity: Number(form.capacity), price: Number(form.price) }); setAdding(false); load(); }
    catch(err) { alert(err.response?.data?.error || 'Error'); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h3 className="font-serif text-xl text-cafe-cream">Cartelera ({events.length})</h3>
        <button onClick={() => setAdding(!adding)} className="btn-primary text-sm py-2 flex items-center gap-1"><Plus size={14}/> Nuevo Evento</button>
      </div>
      {error && <div className="flex flex-wrap items-center justify-between gap-3 mb-4 text-red-400 text-sm" role="alert"><span>{error}</span><button onClick={load} className="btn-outline text-xs py-1.5 flex items-center gap-1"><RefreshCw size={13}/> Reintentar</button></div>}
      {adding && (
        <form onSubmit={handleAdd} className="glass-dark p-5 mb-5 animate-slide-up space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className="input-cafe" placeholder="Título del evento" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required />
            <select className="input-cafe" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{cats.map(c=><option key={c}>{c}</option>)}</select>
            <input className="input-cafe" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} required />
            <input className="input-cafe" placeholder="Hora (ej: 19:00 hrs)" value={form.time} onChange={e=>setForm({...form,time:e.target.value})} />
            <input className="input-cafe" placeholder="Lugar" value={form.location} onChange={e=>setForm({...form,location:e.target.value})} />
            <div className="grid grid-cols-2 gap-2">
              <input className="input-cafe" placeholder="Cupo" type="number" value={form.capacity} onChange={e=>setForm({...form,capacity:e.target.value})} />
              <input className="input-cafe" placeholder="Precio $" type="number" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} />
            </div>
          </div>
          <textarea className="input-cafe" rows={2} placeholder="Descripción del evento" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required />
          <div className="flex gap-3">
            <button type="submit" className="btn-primary text-sm py-2">Publicar Evento</button>
            <button type="button" onClick={() => setAdding(false)} className="btn-outline text-sm py-2">Cancelar</button>
          </div>
        </form>
      )}
      {loading && <p className="text-center py-10 text-cafe-brown">Cargando eventos…</p>}
      {!loading && !error && events.length === 0 && <p className="text-center py-10 text-cafe-brown">Todavía no hay eventos publicados.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {events.map(ev => (
          <div key={ev._id} className="card-cafe p-4">
            <span className="text-cafe-caramel text-xs font-semibold uppercase">{ev.category}</span>
            <p className="text-cafe-cream font-semibold mt-1">{ev.title}</p>
            <p className="text-cafe-brown text-xs">{new Date(ev.date).toLocaleDateString('es-MX')} · {ev.time}</p>
            <p className="text-cafe-brown/60 text-xs">{ev.location}</p>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-cafe-brown">Cupo: {ev.attendees?.length || 0}/{ev.capacity}</span>
              <span className="text-cafe-caramel font-bold text-sm">${ev.price}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- RESERVAS DE MESA ---- */
function ReservasTab() {
  const [reservations, setReservations] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await getReservations();
      setReservations(data);
      setError('');
    } catch (requestError) {
      setError(getRequestMessage(requestError, 'No se pudieron cargar las reservaciones.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const changeStatus = async (id, status) => {
    setLoadingId(id);
    try {
      await updateReservationStatus(id, status);
      await load();
    } catch (requestError) {
      setError(getRequestMessage(requestError, 'No se pudo cambiar el estado.'));
    } finally {
      setLoadingId('');
    }
  };

  return (
    <div>
      <h3 className="font-serif text-xl text-cafe-cream mb-5">Solicitudes de reservación</h3>
      <p className="text-cafe-brown text-sm mb-4">El sitio no envía avisos automáticos: revisa las solicitudes y contacta manualmente a cada cliente para confirmar.</p>
      {error && <div className="flex flex-wrap items-center justify-between gap-3 mb-4 text-red-400 text-sm" role="alert"><span>{error}</span><button onClick={load} className="btn-outline text-xs py-1.5 flex items-center gap-1"><RefreshCw size={13}/> Reintentar</button></div>}
      {loading ? (
        <p className="text-center py-10 text-cafe-brown">Cargando reservaciones…</p>
      ) : reservations.length === 0 && !error ? (
        <p className="text-cafe-brown text-center py-10">Aún no hay solicitudes.</p>
      ) : (
        <div className="space-y-3">
          {reservations.map((reservation) => (
            <article key={reservation._id} className="glass-dark p-4">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="font-semibold text-cafe-cream">{reservation.name} · {reservation.partySize} {reservation.partySize === 1 ? 'persona' : 'personas'}</p>
                  <p className="text-sm text-cafe-brown">{reservation.email} · {reservation.phone}</p>
                  <p className="text-sm text-cafe-caramel mt-1">
                    {new Date(reservation.date).toLocaleDateString('es-MX')} · {reservation.time}
                  </p>
                  {reservation.notes && <p className="text-xs text-cafe-brown mt-2">{reservation.notes}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs ${reservation.status === 'Confirmada' ? 'text-green-400' : reservation.status === 'Rechazada' ? 'text-red-400' : 'text-cafe-gold'}`}>{reservation.status}</span>
                  <select
                    className="input-cafe py-2 text-xs"
                    aria-label={`Estado de la reserva de ${reservation.name}`}
                    value={reservation.status}
                    disabled={loadingId === reservation._id}
                    onChange={(event) => changeStatus(reservation._id, event.target.value)}
                  >
                    {['Pendiente', 'Confirmada', 'Rechazada'].map((status) => <option key={status}>{status}</option>)}
                  </select>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- USUARIOS ---- */
function UsuariosTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const roleBadge = { client:'text-cafe-brown', barista:'text-blue-400', encargado:'text-indigo-400', gerente:'text-purple-400', admin:'text-cafe-gold', codueno:'text-yellow-400' };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getAllUsers();
      setUsers(response.data);
    } catch (loadError) {
      setError(getRequestMessage(loadError, 'No se pudieron cargar los usuarios.'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h3 className="font-serif text-xl text-cafe-cream">Usuarios Registrados ({users.length})</h3>
        <button onClick={load} disabled={loading} className="btn-outline text-sm py-2 flex items-center gap-1.5"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> Actualizar</button>
      </div>
      {error && <p className="text-red-400 text-sm mb-4" role="alert">{error}</p>}
      {loading && <p className="text-center py-10 text-cafe-brown">Cargando usuarios…</p>}
      {!loading && !error && users.length === 0 && <p className="text-center py-10 text-cafe-brown">No hay usuarios registrados.</p>}
      <div className="space-y-2">
        {users.map(u => (
          <div key={u._id} className="glass-dark p-4 flex items-center gap-4">
            <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover border border-cafe-brown/40"/>
            <div className="flex-1 min-w-0">
              <p className="text-cafe-cream font-medium text-sm truncate">{u.name}</p>
              <p className="text-cafe-brown/60 text-xs truncate">{u.email}</p>
            </div>
            <div className="text-right text-xs">
              <p className={`font-semibold capitalize ${roleBadge[u.role] || 'text-cafe-brown'}`}>{u.role}</p>
              <p className="text-cafe-gold">⭐ {u.loyalty?.points || 0} pts</p>
              <p className="text-cafe-brown/50">{u.loyalty?.tier}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- ANALÍTICAS ---- */
function AnaliticasTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getAnalytics();
      setData(response.data);
    } catch (loadError) {
      setError(getRequestMessage(loadError, 'No se pudieron cargar las analíticas.'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  if (loading && !data) return <p className="text-center py-12 text-cafe-brown">Cargando analíticas…</p>;
  if (error && !data) {
    return <div className="text-center py-12"><p className="text-red-400 mb-4" role="alert">{error}</p><button onClick={load} className="btn-outline text-sm py-2 flex items-center gap-1.5 mx-auto"><RefreshCw size={14}/> Reintentar</button></div>;
  }
  if (!data) {
    return <RecoveryNotice title="No se pudieron mostrar las analíticas" message="La respuesta llegó vacía. Recarga esta sección o vuelve a intentarlo en unos momentos." onRetry={load} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {error && <p className="text-red-400 text-sm" role="alert">{error}</p>}
      <div className="flex justify-end"><button onClick={load} disabled={loading} className="btn-outline text-sm py-2 flex items-center gap-1.5"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> Actualizar</button></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Ingresos totales', value: `$${data.totalRevenue.toLocaleString()} MXN`, icon: TrendingUp },
          { label: 'Pedidos', value: data.totalOrders, icon: Package },
          { label: 'Promedio por pedido', value: `$${data.averageTicket} MXN`, icon: Star },
        ].map(stat => (
          <div key={stat.label} className="glass-dark p-5 text-center rounded-2xl">
            <stat.icon size={24} className="mx-auto mb-2 text-cafe-caramel" aria-hidden="true" />
            <p className="font-serif text-2xl text-cafe-caramel font-bold">{stat.value}</p>
            <p className="text-cafe-brown text-sm mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
      <div className="glass-dark p-5 rounded-2xl">
        <h3 className="font-serif text-lg text-cafe-cream mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-cafe-caramel"/> Ventas por Sucursal</h3>
        {Object.entries(data.salesByBranch).map(([branch, amount]) => (
          <div key={branch} className="flex justify-between items-center py-2 border-b border-cafe-brown/20">
            <span className="text-cafe-cream text-sm">{branch}</span>
            <span className="text-cafe-caramel font-bold">${Math.round(amount).toLocaleString()} MXN</span>
          </div>
        ))}
      </div>
    </div>
  );
}
