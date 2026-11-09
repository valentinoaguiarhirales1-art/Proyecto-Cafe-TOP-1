import { useState } from 'react';
import { CalendarDays, CheckCircle, Clock3 } from 'lucide-react';
import { createReservation } from '../api';

const localDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ReservationsPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    partySize: '2',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createReservation({ ...form, partySize: Number(form.partySize) });
      setSubmitted(true);
    } catch (requestError) {
      const fieldErrors = requestError.response?.data?.fields;
      setError(requestError.response?.data?.errors?.[0]?.msg
        || (fieldErrors && Object.values(fieldErrors).flat().join(' '))
        || requestError.response?.data?.error
        || 'No se pudo enviar la solicitud. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-10">
          <p className="section-subtitle flex justify-center items-center gap-2"><CalendarDays size={15} /> Tu visita</p>
          <h1 className="section-title">Reserva <span className="text-cafe-caramel">una mesa</span></h1>
          <p className="text-cafe-brown max-w-xl mx-auto">
            Envíanos tus datos y el horario que prefieres. La solicitud quedará pendiente hasta que el equipo confirme la disponibilidad.
          </p>
        </header>

        {submitted ? (
          <div className="glass-dark p-8 text-center" role="status">
            <CheckCircle size={44} className="text-green-400 mx-auto mb-4" />
            <h2 className="font-serif text-2xl text-cafe-cream mb-2">¡Recibimos tu solicitud!</h2>
            <p className="text-cafe-brown">La reserva aún no está confirmada. El equipo revisará la disponibilidad y deberá contactarte con los datos que compartiste.</p>
            <button className="btn-outline mt-6" onClick={() => { setSubmitted(false); setForm({ name: '', email: '', phone: '', date: '', time: '', partySize: '2', notes: '' }); }}>
              Hacer otra solicitud
            </button>
          </div>
        ) : (
          <form className="glass-dark p-6 sm:p-8 space-y-5" onSubmit={submit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="text-sm text-cafe-cream/80">
                Nombre
                <input className="input-cafe mt-1" name="name" value={form.name} onChange={update} maxLength="100" required />
              </label>
              <label className="text-sm text-cafe-cream/80">
                Correo electrónico
                <input className="input-cafe mt-1" type="email" name="email" value={form.email} onChange={update} maxLength="254" required />
              </label>
              <label className="text-sm text-cafe-cream/80">
                Teléfono
                <input className="input-cafe mt-1" type="tel" name="phone" value={form.phone} onChange={update} maxLength="30" required />
              </label>
              <label className="text-sm text-cafe-cream/80">
                Personas
                <select className="input-cafe mt-1" name="partySize" value={form.partySize} onChange={update}>
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((number) => (
                    <option key={number} value={number}>{number} {number === 1 ? 'persona' : 'personas'}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-cafe-cream/80">
                Fecha
                <input className="input-cafe mt-1" type="date" name="date" min={localDate(new Date(Date.now() + 86400000))} value={form.date} onChange={update} required />
              </label>
              <label className="text-sm text-cafe-cream/80">
                Hora preferida
                <input className="input-cafe mt-1" type="time" name="time" value={form.time} onChange={update} required />
              </label>
            </div>
            <label className="block text-sm text-cafe-cream/80">
              Notas (opcional)
              <textarea className="input-cafe mt-1" name="notes" rows="3" maxLength="500" value={form.notes} onChange={update} placeholder="¿Alguna preferencia o detalle que debamos saber?" />
            </label>
            {error && <p className="text-red-400 text-sm" role="alert">{error}</p>}
            <div className="flex items-start gap-2 text-xs text-cafe-brown">
              <Clock3 size={15} className="mt-0.5 shrink-0" />
              <p>Enviar este formulario no confirma la mesa. Espera la respuesta del equipo antes de acudir.</p>
            </div>
            <button className="btn-primary w-full sm:w-auto" type="submit" disabled={loading}>
              {loading ? 'Enviando solicitud…' : 'Solicitar reservación'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
