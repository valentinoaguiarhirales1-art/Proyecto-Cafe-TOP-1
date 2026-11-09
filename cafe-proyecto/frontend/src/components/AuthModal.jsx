import { useState } from 'react';
import { djangoAuthEnabled, loginUser, registerUser } from '../api';
import { useAuth } from '../context/AuthContext';
import { X, Eye, EyeOff, Coffee } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function AuthModal({ onClose }) {
  const { login, loginDjango, sessionLoading, sessionError, refreshSession } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (djangoAuthEnabled) {
        if (sessionLoading || sessionError) throw new Error('Primero comprueba la conexión de la sesión de Django.');
        await loginDjango(mode, mode === 'login'
          ? { email: form.email, password: form.password }
          : { username: form.username, email: form.email, password1: form.password, password2: form.password });
      } else {
        const fn = mode === 'login' ? loginUser : registerUser;
        const { data } = await fn(form);
        login(data);
      }
      if (mode === 'register') {
        confetti({ particleCount: 80, spread: 60, colors: ['#c67c3f','#d4a017','#f5e6c8'] });
      }
      onClose();
    } catch (err) {
      const fields = err.response?.data?.fields;
      const details = fields ? Object.values(fields).flat().join(' ') : '';
      const message = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg
        || (err.isAxiosError ? 'No se pudo conectar con el servidor. Revisa la conexión y vuelve a intentarlo.' : err.message)
        || 'No se pudo iniciar sesión. Vuelve a intentarlo.';
      setError([message, details].filter(Boolean).join(' '));
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass-dark w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-cafe-brown/30">
          <div className="flex items-center gap-2">
            <Coffee className="text-cafe-caramel" size={24} />
            <h2 className="font-serif text-2xl text-cafe-cream">
              {mode === 'login' ? 'Bienvenido de vuelta' : 'Únete al Club'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-cafe-brown/30 rounded-full"><X size={18} className="text-cafe-brown"/></button>
        </div>

        <div className="p-6">
          {mode === 'register' && !djangoAuthEnabled && (
            <div className="mb-5 bg-cafe-caramel/10 border border-cafe-caramel/30 rounded-xl p-3 text-center">
              <p className="text-cafe-caramel text-sm font-medium">Al registrarte, recibes <strong>50 puntos</strong> de bienvenida.</p>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && !djangoAuthEnabled && (
              <div>
                <label className="text-cafe-cream/80 text-sm block mb-1">Nombre completo</label>
                <input name="name" className="input-cafe" placeholder="Valentino Aguilar" value={form.name} onChange={handle} required />
              </div>
            )}
            {djangoAuthEnabled && mode === 'register' && <div>
              <label className="text-cafe-cream/80 text-sm block mb-1">Nombre de usuario de Django</label>
              <input name="username" className="input-cafe" value={form.username} onChange={handle} required autoComplete="username" />
            </div>}
            <div>
              <label className="text-cafe-cream/80 text-sm block mb-1">Correo electrónico</label>
              <input name="email" type="email" className="input-cafe" placeholder="tucorreo@ejemplo.com" value={form.email} onChange={handle} required />
            </div>
            <div className="relative">
              <label className="text-cafe-cream/80 text-sm block mb-1">Contraseña</label>
              <input name="password" type={showPass ? 'text' : 'password'} className="input-cafe pr-10" placeholder={djangoAuthEnabled ? 'Al menos 8 caracteres' : 'Mínimo 6 caracteres'} value={form.password} onChange={handle} required />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-9 text-cafe-brown hover:text-cafe-caramel">
                {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
            {mode === 'register' && !djangoAuthEnabled && (
              <div>
                <label className="text-cafe-cream/80 text-sm block mb-1">Teléfono (opcional)</label>
                <input name="phone" className="input-cafe" placeholder="+52 55 1234 5678" value={form.phone} onChange={handle} />
              </div>
            )}

            {error && <p className="text-red-400 text-sm text-center bg-red-900/20 rounded-lg p-2">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full text-center mt-2 disabled:opacity-60">
              {loading ? 'Cargando...' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          </form>
          {djangoAuthEnabled && <p className="mt-3 text-xs text-cafe-brown">Cuenta de prueba de Django: es independiente de tu cuenta de Express y todavía no incluye puntos.</p>}
          {djangoAuthEnabled && sessionError && <button type="button" className="btn-outline mt-3" onClick={refreshSession}>Reintentar conexión de sesión</button>}

          {/* Acceso Rápido para Valentino / Admin */}
          <div className="mt-4 pt-3 border-t border-cafe-brown/30 text-center">
            
          </div>

          <div className="mt-3 text-center">
            <p className="text-cafe-brown text-sm">
              {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
              <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                className="text-cafe-caramel hover:text-cafe-gold ml-1 font-medium transition-colors">
                {mode === 'login' ? 'Regístrate gratis' : 'Inicia sesión'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
