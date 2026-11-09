import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { bookDjangoEvent, bookEvent, djangoAuthEnabled, djangoEventsEnabled, getMyDjangoEventBookings, getPublicEvents } from '../api';
import { CalendarDays, MapPin, Ticket } from 'lucide-react';
import RecoveryNotice from '../components/RecoveryNotice';

const defaultEvents = [
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
    category: 'Festival Temático / Música',
    attendees: []
  },
  {
    _id: 'event-cata-chiapas',
    title: 'Cata de café: Chiapas y Etiopía',
    description: 'Prueba dos cafés de origen y conoce sus distintos sabores.',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    time: '18:30 hrs',
    location: 'Terraza Principal - Sucursal Roma',
    capacity: 15,
    price: 250,
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    category: 'Cata de Café',
    attendees: []
  },
  {
    _id: 'event-jazz-coldbrew',
    title: 'Noche de jazz y café frío',
    description: 'Música en vivo, café frío y postres en la terraza.',
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    time: '20:00 hrs',
    location: 'Patio Central - Sucursal Centro Histórico',
    capacity: 35,
    price: 180,
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    category: 'Música Acústica / Jazz',
    attendees: []
  }
];

export default function EventsPage({ onLoginClick }) {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [seats, setSeats] = useState({});
  const [bookingId, setBookingId] = useState('');
  const [message, setMessage] = useState('');
  const [bookings, setBookings] = useState([]);
  const [bookingsError, setBookingsError] = useState('');
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const bookingsRequest = useRef(0);

  const loadBookings = async () => {
    if (!user || !djangoEventsEnabled || !djangoAuthEnabled) return;
    const requestId = ++bookingsRequest.current;
    setBookingsLoading(true);
    setBookingsError('');
    try {
      const { data } = await getMyDjangoEventBookings(user.id);
      if (!Array.isArray(data)) throw new Error('La respuesta de reservas no es válida.');
      if (requestId === bookingsRequest.current) setBookings(data);
    } catch (requestError) {
      if (requestId !== bookingsRequest.current) return;
      setBookings([]);
      setBookingsError(requestError.response?.data?.error || 'No pudimos consultar tus reservas. Revisa la conexión y vuelve a intentarlo.');
    } finally {
      if (requestId === bookingsRequest.current) setBookingsLoading(false);
    }
  };

  const loadEvents = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await getPublicEvents();
      setEvents(djangoEventsEnabled ? data : data && data.length > 0 ? data : defaultEvents);
    } catch (requestError) {
      console.error('No se pudieron cargar los eventos:', requestError);
      setEvents(djangoEventsEnabled ? [] : defaultEvents);
      setError(djangoEventsEnabled ? 'No pudimos consultar los eventos de Django. Revisa la conexión y vuelve a intentarlo.' : 'No pudimos consultar los eventos actuales. La información de ejemplo puede no estar vigente; revisa tu conexión antes de reservar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEvents(); }, []);
  useEffect(() => {
    setBookings([]);
    setBookingsError('');
    if (user && djangoEventsEnabled && djangoAuthEnabled) loadBookings();
    return () => { bookingsRequest.current++; };
  }, [user?.id]);

  const reserve = async (event) => {
    if (djangoEventsEnabled && !djangoAuthEnabled) {
      setMessage('Para reservar eventos de Django activa también la cuenta Django de prueba.');
      return;
    }
    if (!djangoEventsEnabled && djangoAuthEnabled) {
      setMessage('Las reservas de eventos todavía requieren una cuenta de Express y no están disponibles en el modo de prueba Django.');
      return;
    }
    if (!user) {
      onLoginClick();
      return;
    }
    setBookingId(event._id);
    setMessage('');
    try {
      const quantity = Math.min(Number(seats[event._id] || 1), event.availableSeats ?? 4);
      const result = djangoEventsEnabled ? await bookDjangoEvent(event._id, quantity, user.id) : await bookEvent(event._id, quantity);
      setMessage(result.data.message);
      await loadEvents();
      if (djangoEventsEnabled) await loadBookings();
    } catch (bookingError) {
      setMessage(bookingError.response?.data?.error || (bookingError.isAxiosError ? 'No se pudo confirmar la reserva. Consulta al personal antes de volver a intentarlo para evitar reservas duplicadas.' : bookingError.message));
    } finally {
      setBookingId('');
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 max-w-6xl mx-auto">
      <header className="text-center mb-12">
        <p className="section-subtitle">Próximas experiencias</p>
        <h1 className="section-title">Eventos <span className="text-cafe-caramel">en vivo</span></h1>
        <p className="text-cafe-brown max-w-xl mx-auto">Catas, música, noches temáticas y talleres para disfrutar alrededor del café.</p>
        {djangoEventsEnabled && <p className="text-cafe-brown max-w-xl mx-auto mt-2">Prueba Django: reservar aparta lugares, pero no realiza ningún cobro. No se pueden cancelar desde esta página.</p>}
      </header>

      {error && <RecoveryNotice title="No pudimos actualizar los eventos" message={error} onRetry={loadEvents} />}
      {message && <p className="text-center text-cafe-gold mb-6" role="status">{message}</p>}
      {djangoEventsEnabled && djangoAuthEnabled && user && (
        <section className="glass-dark p-5 mb-8" aria-labelledby="event-bookings-heading">
          <h2 id="event-bookings-heading" className="font-serif text-xl text-cafe-cream">Mis reservas de eventos</h2>
          {bookingsLoading ? <p className="text-cafe-brown mt-2">Consultando reservas…</p> : bookingsError ? (
            <div className="mt-2 text-sm text-red-400" role="alert">
              <p>{bookingsError}</p><button className="underline mt-2" onClick={loadBookings}>Reintentar</button>
            </div>
          ) : bookings.length === 0 ? <p className="text-cafe-brown mt-2">Aún no tienes reservas de eventos en Django.</p> : (
            <ul className="mt-3 space-y-2 text-sm text-cafe-cream">
              {bookings.map(booking => <li key={booking.id}>
                {booking.event} · {new Date(booking.date).toLocaleDateString('es-MX')} · {booking.time} · {booking.location} · {booking.seats} {booking.seats === 1 ? 'lugar' : 'lugares'}
              </li>)}
            </ul>
          )}
        </section>
      )}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }, (_, index) => <div key={index} className="card-cafe h-64 shimmer" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 text-cafe-brown">
          <CalendarDays size={40} className="mx-auto mb-4 text-cafe-caramel" aria-hidden="true" />
          <p className="text-xl font-serif text-cafe-cream">Próximamente nuevos eventos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event, index) => {
            const bookedSeats = (event.attendees || []).reduce((sum, attendee) => sum + attendee.seats, 0);
            const availableSeats = Math.max(0, event.availableSeats ?? event.capacity - bookedSeats);
            const maxSeats = Math.min(4, availableSeats);
            return (
              <article key={event._id} className="card-cafe image-art-card group overflow-hidden" style={{ animationDelay: `${index * 70}ms` }}>
                <div className="image-art-frame relative h-52 overflow-hidden">
                  <img src={event.imageUrl} alt={event.title} className="image-art-image w-full h-full object-cover" loading="lazy" />
                  <span className="absolute top-3 left-3 bg-cafe-caramel text-cafe-dark text-xs font-bold px-3 py-1 rounded-full">{event.category}</span>
                  <span className="absolute top-3 right-3 glass-dark text-cafe-cream text-xs px-2 py-1">{availableSeats} lugares</span>
                </div>
                <div className="p-5">
                  <h2 className="font-serif text-xl text-cafe-cream mb-2">{event.title}</h2>
                  <p className="text-cafe-brown text-sm mb-4 leading-relaxed">{event.description}</p>
                  <p className="text-cafe-caramel text-sm font-medium flex items-center gap-1"><CalendarDays size={14} aria-hidden="true" /> {new Date(event.date).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'long' })} · {event.time}</p>
                  <p className="text-cafe-brown text-xs mt-1 flex items-center gap-1"><MapPin size={14} aria-hidden="true" /> {event.location}</p>
                  <p className="text-cafe-caramel font-bold text-lg mt-3">${event.price} <span className="text-xs text-cafe-brown font-normal">por persona</span></p>
                  <div className="flex gap-2 mt-4">
                    <select
                      className="input-cafe w-auto"
                      aria-label={`Lugares para ${event.title}`}
                      value={Math.min(Number(seats[event._id] || 1), maxSeats || 1)}
                      disabled={availableSeats === 0}
                      onChange={(change) => setSeats((current) => ({ ...current, [event._id]: change.target.value }))}
                    >
                      {Array.from({ length: Math.min(4, availableSeats || 1) }, (_, countIndex) => countIndex + 1).map((count) => (
                        <option key={count} value={count}>{count} {count === 1 ? 'lugar' : 'lugares'}</option>
                      ))}
                    </select>
                    <button
                      className="btn-outline flex-1 text-sm py-2"
                      onClick={() => reserve(event)}
                      disabled={availableSeats === 0 || bookingId === event._id}
                    >
                      {bookingId === event._id ? 'Reservando...' : availableSeats === 0 ? 'Agotado' : <><Ticket size={15} aria-hidden="true" /> Reservar lugar</>}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
