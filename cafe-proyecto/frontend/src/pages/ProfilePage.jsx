import { useState, useEffect, useRef } from 'react';
import { getProfile, updateProfile, updateProfileWithAvatar, getMyOrders } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Coffee,
  Edit3,
  Star,
  Award,
  Package,
  Save,
  X,
  Shield,
  Camera,
  Crown,
  Code2,
  CheckCircle2,
  Upload,
  Loader2,
  RefreshCw
} from 'lucide-react';

const tierConfig = {
  'Bronce': { next: 'Plata', nextAt: 300, color: 'text-amber-400', bar: 'bg-amber-600' },
  'Plata':  { next: 'Oro VIP', nextAt: 700, color: 'text-slate-300', bar: 'bg-slate-400' },
  'Oro VIP':{ next: null, nextAt: null, color: 'text-yellow-300', bar: 'bg-yellow-500' },
};

const AVATAR_PRESETS = [
  { label: 'Silueta clásica', url: '/images/default-avatar.svg' },
  { label: 'Corona', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=ValentinoRoyal&backgroundColor=2e1b10' },
  { label: 'Barista', url: 'https://api.dicebear.com/7.x/identicon/svg?seed=BaristaSupreme&backgroundColor=1f140e' },
  { label: 'Formas', url: 'https://api.dicebear.com/7.x/shapes/svg?seed=CafeExquisito&backgroundColor=150c08' },
];

export default function ProfilePage({ onNavigate }) {
  const { user, login } = useAuth();
  const [profile, setProfile] = useState(null);
  const [orders, setOrders]   = useState([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({});
  const [saving, setSaving]   = useState(false);
  const [tab, setTab]         = useState('perfil');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  const cleanAvatarUrl = (url) => {
    if (!url || url.includes('unsplash.com')) {
      return '/images/default-avatar.svg';
    }
    return url;
  };

  const loadProfile = async () => {
    setProfileLoading(true);
    setProfileError('');
    try {
      const { data } = await getProfile();
      const cleanData = {
        ...data,
        avatar: cleanAvatarUrl(data.avatar)
      };
      setProfile(cleanData);
      setForm({
        name: cleanData.name,
        phone: cleanData.phone || '',
        avatar: cleanData.avatar
      });
    } catch (error) {
      setProfileError(error.response?.data?.error || 'No se pudo cargar tu perfil. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setProfileLoading(false);
    }
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    setOrdersError('');
    try {
      const { data } = await getMyOrders();
      setOrders(data || []);
    } catch (error) {
      setOrdersError(error.response?.data?.error || 'No se pudieron cargar tus pedidos. Inténtalo de nuevo.');
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    loadOrders();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await updateProfile(form);
      const cleanData = {
        ...data,
        avatar: cleanAvatarUrl(data.avatar)
      };
      login(cleanData);
      setProfile(cleanData);
      setEditing(false);
    } catch(e) {
      alert(e.response?.data?.error || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await updateProfileWithAvatar(formData);
      const cleanData = {
        ...res.data,
        avatar: cleanAvatarUrl(res.data.avatar)
      };
      login(cleanData);
      setProfile(cleanData);
      setForm(prev => ({ ...prev, avatar: cleanData.avatar }));
      setShowAvatarModal(false);
    } catch (err) {
      alert('Error subiendo foto de perfil: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const selectPreset = async (url) => {
    setUploadingAvatar(true);
    try {
      const { data } = await updateProfile({ avatar: url });
      const cleanData = {
        ...data,
        avatar: cleanAvatarUrl(data.avatar)
      };
      login(cleanData);
      setProfile(cleanData);
      setForm(prev => ({ ...prev, avatar: cleanData.avatar }));
      setShowAvatarModal(false);
    } catch (err) {
      alert('Error cambiando avatar: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen pt-20 flex flex-col items-center justify-center gap-4 px-4 text-center">
        {profileLoading ? (
          <>
            <Coffee size={40} className="mx-auto text-cafe-caramel animate-float" aria-hidden="true" />
            <p className="text-cafe-brown">Cargando perfil…</p>
          </>
        ) : (
          <>
            <p className="text-red-400" role="alert">{profileError || 'No se pudo cargar tu perfil.'}</p>
            <button onClick={loadProfile} className="btn-outline text-sm py-2 flex items-center gap-2">
              <RefreshCw size={14} /> Reintentar
            </button>
          </>
        )}
      </div>
    );
  }

  const tier = profile.loyalty?.tier || 'Bronce';
  const tc = tierConfig[tier] || tierConfig.Bronce;
  const points = profile.loyalty?.points || 0;
  const progress = tc.nextAt ? Math.min((points / tc.nextAt) * 100, 100) : 100;
  const isAdmin = profile.role === 'admin' || profile.role === 'codueno';
  const isValentino = isAdmin || profile.email?.toLowerCase().includes('valentino') || profile.name?.toLowerCase().includes('valentino');

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">

        {/* HEADER DE PERFIL */}
        <div className="glass-dark p-6 mb-6 animate-fade-in relative overflow-hidden border border-cafe-caramel/30 rounded-3xl shadow-2xl">
          {/* Resplandor dorado de fondo para administradores */}
          {isAdmin && (
            <div className="absolute top-0 right-0 w-80 h-80 bg-cafe-gold/10 rounded-full blur-3xl pointer-events-none" />
          )}

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10">
            
            {/* Foto de Perfil Anónima & Botón de Cambio */}
            <div className="relative group">
              <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-cafe-caramel shadow-2xl bg-cafe-dark flex items-center justify-center">
                <img
                  src={cleanAvatarUrl(profile.avatar)}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = '/images/default-avatar.svg'; }}
                />
              </div>

              {/* Botón flotante para cambiar foto */}
              <button
                type="button"
                onClick={() => setShowAvatarModal(true)}
                title="Cambiar foto de perfil"
                className="absolute bottom-0 right-0 bg-cafe-caramel text-cafe-dark hover:bg-cafe-gold p-2 rounded-full shadow-lg transition transform hover:scale-110 flex items-center justify-center border-2 border-cafe-dark"
              >
                <Camera size={15} />
              </button>

              <span className="absolute -top-2 -left-2 text-2xl">{tc.icon}</span>
            </div>

            {/* Datos Principales */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1 justify-center sm:justify-start">
                <h1 className="font-serif text-3xl text-cafe-cream font-bold">{profile.name}</h1>
                
                {/* Rango Especial si es Admin */}
                {isAdmin && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500/30 to-yellow-500/20 text-yellow-300 border border-yellow-400/50 shadow-md">
                    <Crown size={13} className="text-yellow-300 animate-pulse" />
                    Rango: Administrador Supremo
                  </span>
                )}
              </div>

              <p className="text-cafe-brown text-sm">{profile.email}</p>

              <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start items-center">
                <span className={`badge-tier ${tier === 'Oro VIP' ? 'tier-oro' : tier === 'Plata' ? 'tier-plata' : 'tier-bronce'}`}>
                  {tc.icon} {tier}
                </span>
                <span className="badge-tier bg-cafe-dark border border-cafe-brown/40 text-cafe-caramel">
                  ⭐ {points} pts
                </span>
                {profile.role !== 'client' && (
                  <span className="badge-tier bg-cafe-gold/20 border border-cafe-gold/40 text-cafe-gold flex items-center gap-1">
                    <Shield size={11}/> {profile.role}
                  </span>
                )}
                <button
                  onClick={() => setShowAvatarModal(true)}
                  className="text-xs text-cafe-caramel hover:text-cafe-gold underline ml-1"
                >
                  Cambiar avatar
                </button>
              </div>
            </div>

            <button
              onClick={() => setEditing(!editing)}
              className="btn-outline text-sm py-2 px-4 flex items-center gap-1.5 self-center sm:self-start"
            >
              {editing ? <><X size={14}/> Cancelar</> : <><Edit3 size={14}/> Editar Datos</>}
            </button>
          </div>

          {/* Barra de progreso de nivel */}
          {tc.nextAt && (
            <div className="mt-5 pt-5 border-t border-cafe-brown/20">
              <div className="flex justify-between text-xs text-cafe-brown mb-1">
                <span>{tier}</span>
                <span>{points} / {tc.nextAt} puntos para {tc.next}</span>
              </div>
              <div className="h-2 bg-cafe-dark rounded-full overflow-hidden">
                <div className={`h-full ${tc.bar} rounded-full transition-all duration-1000`} style={{width:`${progress}%`}}/>
              </div>
            </div>
          )}
        </div>

        {/* Información del proyecto */}
        {isValentino && (
          <div className="glass-dark p-6 mb-6 rounded-3xl border-2 border-yellow-500/40 bg-gradient-to-br from-cafe-espresso/90 via-[#24150c] to-cafe-dark shadow-2xl relative overflow-hidden animate-slide-up">
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-cafe-brown/30 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-cafe-dark shadow-lg">
                  <Code2 size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-widest text-amber-300 font-bold">Sobre el proyecto</span>
                  </div>
                  <h2 className="font-serif text-2xl text-cafe-cream font-bold">
                    Café Exquisito
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cafe-brown/20 text-cafe-cream border border-cafe-brown/30">
                  Proyecto en desarrollo
                </span>
              </div>
            </div>

            <p className="text-cafe-cream/90 text-sm leading-relaxed mb-4">
              Este sitio fue creado por <strong>Valentino</strong>. Incluye menú, pedidos, reservas y un panel para actualizar el contenido.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-cafe-brown/20 text-xs">
              <div className="p-2.5 rounded-xl bg-cafe-dark/50 border border-white/5 text-center">
                <p className="text-cafe-gold font-bold">Sitio</p>
                <p className="text-cafe-brown text-[11px]">Web y aplicación</p>
              </div>
              <div className="p-2.5 rounded-xl bg-cafe-dark/50 border border-white/5 text-center">
                <p className="text-cafe-gold font-bold">Funciones</p>
                <p className="text-cafe-brown text-[11px]">Menú y pedidos</p>
              </div>
              <div className="p-2.5 rounded-xl bg-cafe-dark/50 border border-white/5 text-center">
                <p className="text-cafe-gold font-bold">Idiomas</p>
                <p className="text-cafe-brown text-[11px]">8 opciones</p>
              </div>
              <div className="p-2.5 rounded-xl bg-cafe-dark/50 border border-white/5 text-center">
                <p className="text-cafe-gold font-bold">Autor</p>
                <p className="text-cafe-brown text-[11px]">Valentino</p>
              </div>
            </div>
          </div>
        )}

        {/* TABS */}
        <div className="flex border-b border-cafe-brown/30 mb-6">
          {['perfil', 'pedidos', 'empleado'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium capitalize transition-colors ${tab === t ? 'text-cafe-caramel border-b-2 border-cafe-caramel font-semibold' : 'text-cafe-brown hover:text-cafe-cream'}`}
            >
              {t === 'perfil' ? 'Mi información' : t === 'pedidos' ? `Mis pedidos (${orders.length})` : 'Estado de colaborador'}
            </button>
          ))}
        </div>

        {/* TAB: PERFIL */}
        {tab === 'perfil' && (
          <div className="glass-dark p-6 animate-fade-in space-y-5 rounded-2xl border border-cafe-brown/30">
            <div>
              <label className="text-cafe-cream/80 text-sm block mb-1">Nombre Completo</label>
              {editing ? (
                <input
                  className="input-cafe"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              ) : (
                <p className="text-cafe-cream font-medium text-lg">{profile.name}</p>
              )}
            </div>

            <div>
              <label className="text-cafe-cream/80 text-sm block mb-1">Teléfono</label>
              {editing ? (
                <input
                  className="input-cafe"
                  placeholder="+52 55 ..."
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />
              ) : (
                <p className="text-cafe-cream font-medium">{profile.phone || 'No registrado'}</p>
              )}
            </div>

            <div>
              <label className="text-cafe-cream/80 text-sm block mb-1">Avatar de Perfil</label>
              <div className="flex items-center gap-3">
                <img
                  src={cleanAvatarUrl(form.avatar || profile.avatar)}
                  alt="Avatar"
                  className="w-12 h-12 rounded-full object-cover border-2 border-cafe-caramel bg-cafe-dark"
                />
                <button
                  type="button"
                  onClick={() => setShowAvatarModal(true)}
                  className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5"
                >
                  <Camera size={14} /> Cambiar Foto / Elegir Avatar Anónimo
                </button>
              </div>
            </div>

            {editing && (
              <div className="pt-3 border-t border-cafe-brown/30">
                <button
                  onClick={save}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  <Save size={16}/> {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB: PEDIDOS */}
        {tab === 'pedidos' && (
          <div className="space-y-3 animate-fade-in">
            {ordersError && <div className="flex flex-wrap items-center justify-between gap-3 text-red-400 text-sm" role="alert"><span>{ordersError}</span><button onClick={loadOrders} className="btn-outline text-xs py-1.5 flex items-center gap-1"><RefreshCw size={13}/> Reintentar</button></div>}
            {ordersLoading ? (
              <p className="text-center py-12 text-cafe-brown">Cargando pedidos…</p>
            ) : orders.length === 0 && !ordersError ? (
              <div className="text-center py-16 glass-dark rounded-2xl border border-cafe-brown/30">
                <p className="text-cafe-brown font-serif text-lg">Aún no tienes pedidos registrados</p>
                <p className="text-xs text-cafe-brown/70 mt-1">Explora nuestro menú gourmet y realiza tu primer pedido.</p>
                <button onClick={() => onNavigate('menu')} className="btn-primary text-xs py-2 px-4 mt-4">
                  Ir al menú
                </button>
              </div>
            ) : orders.map(order => (
              <div key={order._id} className="glass-dark p-4 rounded-xl border border-cafe-brown/30 hover:border-cafe-caramel/50 transition">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-cafe-cream text-sm font-semibold">#{order._id.slice(-6).toUpperCase()}</span>
                  <span className="text-cafe-caramel font-bold">${order.totalPrice} MXN</span>
                </div>
                <p className="text-cafe-brown text-xs">{order.orderItems.map(i=>`${i.qty}x ${i.name}`).join(' · ')}</p>
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-cafe-brown/60">{new Date(order.createdAt).toLocaleDateString('es-MX')}</span>
                  <span className="text-xs text-cafe-gold font-semibold">+{order.pointsEarned || 0} pts ⭐</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB: COLABORADOR */}
        {tab === 'empleado' && (
          <div className="glass-dark p-6 animate-fade-in rounded-2xl border border-cafe-brown/30">
            {profile.role !== 'client' ? (
              <div className="text-center py-6">
                <Award size={40} className="mx-auto mb-3 text-cafe-caramel" aria-hidden="true" />
                <h3 className="font-serif text-xl text-cafe-cream mb-1">Colaborador Activo de Café Exquisito</h3>
                <p className="text-cafe-caramel font-semibold capitalize text-lg">Rol: {profile.role}</p>
                {isAdmin && (
                  <p className="text-yellow-300 text-xs font-bold mt-1">Acceso a la administración y edición del sitio</p>
                )}
                {profile.employeeData?.branchAssigned && (
                  <p className="text-cafe-brown text-sm mt-2">{profile.employeeData.branchAssigned}</p>
                )}
                {profile.employeeData?.hiredAt && (
                  <p className="text-cafe-brown text-sm">Miembro desde: {new Date(profile.employeeData.hiredAt).toLocaleDateString('es-MX')}</p>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <Coffee size={40} className="mx-auto mb-3 text-cafe-caramel" aria-hidden="true" />
                <h3 className="font-serif text-xl text-cafe-cream mb-2">¿Quieres formar parte del equipo?</h3>
                <p className="text-cafe-brown text-sm mb-5">Consulta las vacantes abiertas y envía tu solicitud.</p>
                <button onClick={() => onNavigate('team')} className="btn-primary">Ver equipo y contratación</button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* MODAL PARA CAMBIAR FOTO DE PERFIL / AVATAR */}
      {showAvatarModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowAvatarModal(false)}
        >
          <div
            className="glass-dark max-w-md w-full rounded-2xl p-6 border border-cafe-caramel/40 shadow-2xl animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-cafe-brown/30 pb-3 mb-4">
              <h3 className="font-serif text-lg text-cafe-cream flex items-center gap-2">
                <Camera size={18} className="text-cafe-caramel" /> Cambiar Foto de Perfil
              </h3>
              <button
                onClick={() => setShowAvatarModal(false)}
                className="text-cafe-brown hover:text-cafe-cream p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Opción 1: Subir imagen desde la computadora */}
            <div className="mb-6">
              <p className="text-xs text-cafe-cream font-semibold uppercase tracking-wider mb-2">1. Subir imagen desde tu computadora</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-sm"
              >
                {uploadingAvatar ? (
                  <><Loader2 size={16} className="animate-spin" /> Subiendo imagen...</>
                ) : (
                  <><Upload size={16} /> Seleccionar archivo de imagen</>
                )}
              </button>
              <p className="text-[11px] text-cafe-brown mt-1">Soporta JPG, PNG, WEBP o SVG.</p>
            </div>

            {/* Opción 2: Elegir un avatar anónimo predeterminado */}
            <div>
              <p className="text-xs text-cafe-cream font-semibold uppercase tracking-wider mb-2">2. O elige un avatar anónimo oficial:</p>
              <div className="grid grid-cols-2 gap-2.5">
                {AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset.url}
                    onClick={() => selectPreset(preset.url)}
                    disabled={uploadingAvatar}
                    className="p-3 rounded-xl border border-cafe-brown/40 hover:border-cafe-caramel/80 bg-cafe-dark/60 hover:bg-cafe-dark flex flex-col items-center gap-2 transition group"
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      className="w-12 h-12 rounded-full object-cover border border-cafe-caramel/50 group-hover:scale-105 transition"
                    />
                    <span className="text-xs text-cafe-cream font-medium text-center">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-cafe-brown/20 text-center">
              <button
                onClick={() => setShowAvatarModal(false)}
                className="text-xs text-cafe-brown hover:text-cafe-cream"
              >
                Cerrar ventana
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
