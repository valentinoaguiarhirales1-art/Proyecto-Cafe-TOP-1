import { useEffect, useState } from 'react';
import { getDjangoProfile, updateDjangoProfile } from '../api';
import { useAuth } from '../context/AuthContext';
import RecoveryNotice from '../components/RecoveryNotice';

export default function DjangoProfile({ onNavigate }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await getDjangoProfile(user.id);
      setProfile(data);
      setForm({ name: data.name || '', phone: data.phone || '' });
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No pudimos consultar tu perfil. Revisa la conexión y vuelve a intentarlo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user.id]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const { data } = await updateDjangoProfile(user.id, form);
      setProfile(data);
      setForm({ name: data.name, phone: data.phone });
      setMessage('Cambios guardados.');
    } catch (requestError) {
      const fields = requestError.response?.data?.fields;
      const details = fields ? Object.values(fields).flat().join(' ') : '';
      setMessage([requestError.response?.data?.error || 'No pudimos guardar los cambios. Revisa la conexión e inténtalo de nuevo.', details].filter(Boolean).join(' '));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-3xl mx-auto glass-dark p-6">
        <h1 className="section-title">Mi cuenta de <span className="text-cafe-caramel">Django</span></h1>
        {loading ? <p className="text-cafe-brown mt-4">Cargando perfil…</p> : error ? (
          <RecoveryNotice title="No se pudo cargar tu perfil" message={error} onRetry={load} />
        ) : profile && <>
          <p className="text-cafe-cream mt-4">Usuario: {profile.username}</p>
          <p className="text-cafe-cream mt-2">Correo: {profile.email || 'No registrado'}</p>
          <form onSubmit={save} className="mt-5 space-y-4">
            <label className="block text-cafe-cream">Nombre
              <input className="input-cafe mt-1" value={form.name} maxLength={150} required onChange={event => setForm({ ...form, name: event.target.value })} />
            </label>
            <label className="block text-cafe-cream">Teléfono (opcional)
              <input className="input-cafe mt-1" value={form.phone} maxLength={30} onChange={event => setForm({ ...form, phone: event.target.value })} />
            </label>
            <button type="submit" className="btn-primary disabled:opacity-60" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
            {message && <p className="text-cafe-cream text-sm" role="status">{message}</p>}
          </form>
          <p className="text-cafe-brown mt-4">Esta cuenta de prueba es independiente de Express. Las fotos y los puntos aún no están disponibles en Django.</p>
          <button className="btn-outline mt-5" onClick={() => onNavigate('orders')}>Ver mis pedidos de Django</button>
        </>}
      </div>
    </div>
  );
}
