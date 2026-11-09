import { useEffect, useState } from 'react';

async function request(path, options = {}) {
  const response = await fetch(`/django-api/${path}`, { credentials: 'same-origin', cache: 'no-store', ...options });
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Django no pudo procesar la solicitud. Recarga la página y vuelve a iniciar sesión.');
  }
  const data = await response.json();
  if (!response.ok) {
    const fields = data.fields ? Object.values(data.fields).flat().join(' ') : '';
    throw new Error([data.error || `Error ${response.status}`, fields].filter(Boolean).join(' '));
  }
  return data;
}

function ProductCard({ product, add }) {
  const options = product.customization || {};
  const sizes = Array.isArray(options.sizes) ? options.sizes : [];
  const milks = Array.isArray(options.milkOptions) ? options.milkOptions : [];
  const extras = Array.isArray(options.extras) ? options.extras : [];
  const [size, setSize] = useState('');
  const [milk, setMilk] = useState('');
  const [selectedExtras, setSelectedExtras] = useState([]);
  return (
    <li className="rounded-xl bg-white p-4 shadow-sm">
      {product.imageUrl && <img className="mb-3 h-40 w-full rounded-lg object-cover" src={product.imageUrl} alt="" />}
      <p className="text-sm text-amber-800">{product.category}</p>
      <h2 className="font-bold">{product.name}</h2>
      <p className="mt-1 text-sm">{product.description}</p>
      <p className="mt-2 font-semibold">Desde ${product.price}</p>
      {sizes.length > 0 && <label className="mt-2 block text-sm">Tamaño
        <select className="ml-2 border p-1" value={size} onChange={(e) => setSize(e.target.value)}>
          <option value="">Sin selección</option>
          {sizes.map((option) => <option key={option.name} value={option.name}>{option.name} (+${option.extraPrice || 0})</option>)}
        </select>
      </label>}
      {milks.length > 0 && <label className="mt-2 block text-sm">Leche
        <select className="ml-2 border p-1" value={milk} onChange={(e) => setMilk(e.target.value)}>
          <option value="">Sin selección</option>
          {milks.map((option) => <option key={option.name} value={option.name}>{option.name} (+${option.extraPrice || 0})</option>)}
        </select>
      </label>}
      {extras.map((option) => <label className="mt-2 block text-sm" key={option.name}>
        <input type="checkbox" checked={selectedExtras.includes(option.name)} onChange={(e) => setSelectedExtras(
          (current) => e.target.checked ? [...current, option.name] : current.filter((name) => name !== option.name)
        )} /> {option.name} (+${option.extraPrice || 0})
      </label>)}
      <button className="mt-3 rounded bg-amber-800 px-3 py-2 text-white" onClick={() => add({
        product: product.id, name: product.name, qty: 1, selectedSize: size, selectedMilk: milk, selectedExtras,
      })}>Agregar al pedido</button>
    </li>
  );
}

export default function DjangoCatalog() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [session, setSession] = useState(null);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [reservationsLoaded, setReservationsLoaded] = useState(false);
  const [mode, setMode] = useState('login');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      request('products', { signal: controller.signal }),
      request('session', { signal: controller.signal }),
    ]).then(([data, sessionData]) => {
      if (!Array.isArray(data)) throw new Error('La respuesta del catálogo no es válida');
      setProducts(data);
      setSession(sessionData);
      setStatus('ready');
    }).catch((error) => {
      if (error.name !== 'AbortError') {
        console.error('No se pudo cargar Django:', error);
        setStatus('error');
      }
    });
    return () => controller.abort();
  }, []);

  const submitAccount = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const data = new URLSearchParams(new FormData(event.currentTarget));
      const result = await request(mode, {
        method: 'POST', headers: { 'X-CSRFToken': session.csrfToken }, body: data,
      });
      setSession(result);
      setMessage(`Sesión iniciada como ${result.user.name}.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    setMessage('');
    try {
      setSession(await request('logout', {
        method: 'POST',
        headers: { 'X-CSRFToken': session.csrfToken, 'X-Expected-Django-User': String(session.user.id) },
      }));
      setOrders([]);
      setOrdersLoaded(false);
      setReservations([]);
      setReservationsLoaded(false);
      setMessage('Sesión de Django cerrada.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const submitOrder = async () => {
    setBusy(true);
    setMessage('');
    try {
      const result = await request('orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': session.csrfToken, 'X-Expected-Django-User': String(session.user.id) },
        body: JSON.stringify({ orderItems: cart }),
      });
      setCart([]);
      setMessage(`Pedido ${result._id} registrado por $${result.totalPrice}. Pago pendiente en mostrador.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const loadOrders = async () => {
    setBusy(true);
    setMessage('');
    try {
      setOrders(await request('my-orders', { headers: { 'X-Expected-Django-User': String(session.user.id) } }));
      setOrdersLoaded(true);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const loadReservations = async () => {
    setBusy(true);
    setMessage('');
    try {
      setReservations(await request('my-reservations', { headers: { 'X-Expected-Django-User': String(session.user.id) } }));
      setReservationsLoaded(true);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const submitReservation = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setMessage('');
    try {
      await request('reservations', {
        method: 'POST',
        headers: { 'X-CSRFToken': session.csrfToken, 'X-Expected-Django-User': String(session.user.id) },
        body: new URLSearchParams(new FormData(form)),
      });
      form.reset();
      setReservationsLoaded(false);
      setReservations([]);
      setMessage('Solicitud enviada. La cafetería debe confirmar la disponibilidad.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-amber-50 px-6 py-12 text-stone-800">
      <div className="mx-auto max-w-5xl">
        <a className="underline" href="/">Volver a Café Exquisito</a>
        <h1 className="mt-6 text-3xl font-bold">Catálogo de Django</h1>
        <p className="mt-2">Vista de prueba independiente. Las cuentas y pedidos son distintos a los de la página principal.</p>
        {status === 'loading' && <p className="mt-6" role="status">Cargando productos…</p>}
        {status === 'error' && <p className="mt-6" role="alert">No se pudo conectar con Django. Comprueba que el servidor esté encendido y vuelve a cargar la página.</p>}
        {status === 'ready' && <>
          {message && <p className="mt-4 rounded bg-white p-3" role="status">{message}</p>}
          <section className="mt-6 rounded-xl bg-white p-4">
            {session.user ? <>
              <p>Sesión Django: <strong>{session.user.name}</strong></p>
              <button className="mr-3 mt-2 underline" disabled={busy} onClick={signOut}>Cerrar sesión</button>
              <button className="mt-2 underline" disabled={busy} onClick={loadOrders}>Consultar mis pedidos</button>
              {ordersLoaded && orders.length === 0 && <p>Aún no tienes pedidos en Django.</p>}
              {orders.map((order) => <p key={order.id}>Pedido {order.id}: {order.status} — ${order.total}</p>)}
            </> : <>
              <h2 className="font-bold">{mode === 'login' ? 'Iniciar sesión en Django' : 'Crear cuenta en Django'}</h2>
              <form className="mt-2 flex flex-wrap gap-2" onSubmit={submitAccount}>
                <input className="border p-2" name="username" placeholder="Usuario" aria-label="Usuario" required />
                {mode === 'register' && <input className="border p-2" name="email" type="email" placeholder="Correo" aria-label="Correo" required />}
                <input className="border p-2" name={mode === 'login' ? 'password' : 'password1'} type="password" placeholder="Contraseña" aria-label="Contraseña" required />
                {mode === 'register' && <input className="border p-2" name="password2" type="password" placeholder="Repetir contraseña" aria-label="Repetir contraseña" required />}
                <button className="rounded bg-amber-800 px-3 text-white" disabled={busy}>{mode === 'login' ? 'Entrar' : 'Registrarme'}</button>
              </form>
              <button className="mt-3 underline" type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
                {mode === 'login' ? 'Crear cuenta' : 'Ya tengo cuenta'}
              </button>
            </>}
          </section>
          <section className="mt-6 rounded-xl bg-white p-4">
            <h2 className="font-bold">Pedido de prueba ({cart.length})</h2>
            {cart.map((item, index) => <p key={index} className="mt-2">
              {item.name} {item.selectedSize} {item.selectedMilk} {item.selectedExtras.join(', ')}
              <button className="ml-3 underline" onClick={() => setCart((current) => current.filter((_, i) => i !== index))}>Quitar</button>
            </p>)}
            <p className="mt-2 text-sm">El total se calcula en el servidor. No se realizará un cobro en línea.</p>
            <button className="mt-2 rounded bg-amber-800 px-3 py-2 text-white disabled:opacity-40"
              disabled={busy || !cart.length || !session.user} onClick={submitOrder}>Enviar pedido</button>
            {!session.user && <p className="mt-2 text-sm">Inicia sesión en Django para enviar el pedido.</p>}
          </section>
          {session.user && <section className="mt-6 rounded-xl bg-white p-4">
            <h2 className="font-bold">Solicitar una reserva</h2>
            <p className="mt-2 text-sm">La reserva queda pendiente hasta que el personal confirme la disponibilidad.</p>
            <form className="mt-3 flex flex-wrap gap-3" onSubmit={submitReservation}>
              <label>Fecha <input className="border p-2" name="date" type="date" required /></label>
              <label>Hora <input className="border p-2" name="time" type="time" required /></label>
              <label>Personas <input className="border p-2" name="party_size" type="number" min="1" max="20" defaultValue="2" required /></label>
              <label>Notas <input className="border p-2" name="notes" maxLength="500" /></label>
              <button className="rounded bg-amber-800 px-3 py-2 text-white disabled:opacity-40" disabled={busy}>Solicitar reserva</button>
            </form>
            <button className="mt-3 underline" type="button" disabled={busy} onClick={loadReservations}>Consultar mis reservas</button>
            {reservationsLoaded && reservations.length === 0 && <p>Aún no tienes reservas en Django.</p>}
            {reservations.map((reservation) => <p key={reservation.id}>
              {reservation.date} {reservation.time} — {reservation.partySize} personas — {reservation.status}
            </p>)}
          </section>}
          {products.length === 0 && <p className="mt-6">Aún no hay productos disponibles.</p>}
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => <ProductCard key={product.id} product={product} add={(item) => {
              if (cart.length >= 30) {
                setMessage('El pedido admite hasta 30 productos.');
                return;
              }
              setCart((current) => [...current, item]);
              setMessage(`${item.name} agregado al pedido.`);
            }} />)}
          </ul>
        </>}
      </div>
    </main>
  );
}
