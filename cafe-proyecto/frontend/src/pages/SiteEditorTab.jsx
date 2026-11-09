/**
 * SiteEditorTab — Tab de "Apariencia del Sitio" para el Panel Admin.
 * Permite editar en el navegador:
 *   - Imágenes del Hero y de todas las secciones del Home
 *   - Textos principales (título hero, subtítulo, descripción, stats)
 *   - Logo
 *   - Productos (texto, precio, imagen)
 *   - Promociones (texto, precio, imagen)
 *   - Eventos (texto, imagen)
 */

import { useState, useEffect, useRef } from 'react';
import {
  getSiteSettings,
  djangoSettingsEnabled,
  upsertSiteSettings,
  upsertSiteSetting,
  updateProductWithImage,
  updateProduct,
  getProducts,
  updatePromotionWithImage,
  updatePromotion as updatePromotionAPI,
  getPromotions,
  djangoPromotionsEnabled,
  djangoEventsEnabled,
  updateEventWithImage,
  updateEvent as updateEventAPI,
  getEvents,
  deleteProduct,
  deletePromotion,
  deleteEvent,
} from '../api';
import {
  Image as ImageIcon,
  Type,
  Coffee,
  Gift,
  Calendar,
  Upload,
  Save,
  Loader2,
  RefreshCw,
  Camera,
  Trash2,
  Edit2,
  Plus,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

/* ─── Helper: imagen editable inline ─── */
function ImageEditor({ label, currentUrl, onUpload, onUrlChange }) {
  const ref = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [urlDraft, setUrlDraft] = useState(currentUrl || '');
  const [mode, setMode] = useState('upload'); // 'upload' | 'url'

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-cafe-brown font-semibold uppercase tracking-wide">{label}</p>

      {/* Preview */}
      {currentUrl && (
        <div className="relative group w-full h-32 rounded-xl overflow-hidden border border-cafe-brown/30 bg-cafe-dark">
          <img src={currentUrl} alt={label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-cafe-dark/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
            <Camera size={20} className="text-cafe-cream" />
          </div>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex gap-2 text-xs">
        <button
          onClick={() => setMode('upload')}
          className={`px-3 py-1 rounded-full border ${mode === 'upload' ? 'bg-cafe-caramel text-cafe-dark border-cafe-caramel' : 'border-cafe-brown/40 text-cafe-brown'}`}
        >
          Subir archivo
        </button>
        <button
          onClick={() => setMode('url')}
          className={`px-3 py-1 rounded-full border ${mode === 'url' ? 'bg-cafe-caramel text-cafe-dark border-cafe-caramel' : 'border-cafe-brown/40 text-cafe-brown'}`}
        >
          URL externa
        </button>
      </div>

      {mode === 'upload' ? (
        <div>
          <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <button
            onClick={() => ref.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-cafe-caramel/60 text-cafe-cream text-xs hover:bg-cafe-caramel/10 disabled:opacity-50"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? 'Subiendo…' : 'Seleccionar imagen'}
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlDraft}
            onChange={e => setUrlDraft(e.target.value)}
            placeholder="https://…"
            className="input-cafe flex-1 text-xs py-1.5"
          />
          <button
            onClick={() => { onUrlChange(urlDraft); }}
            className="px-3 py-1.5 bg-cafe-caramel text-cafe-dark text-xs rounded-lg font-semibold"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Sección colapsable ─── */
function Section({ icon: Icon, title, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="glass-dark rounded-2xl overflow-hidden border border-cafe-brown/20">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-cafe-brown/10 transition"
      >
        <span className="flex items-center gap-2 font-serif text-cafe-cream font-semibold">
          <Icon size={16} className="text-cafe-caramel" />
          {title}
        </span>
        {open ? <ChevronDown size={16} className="text-cafe-brown" /> : <ChevronRight size={16} className="text-cafe-brown" />}
      </button>
      {open && <div className="px-5 pb-5 space-y-4">{children}</div>}
    </div>
  );
}

/* ─── MAIN COMPONENT ─── */
export default function SiteEditorTab() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [localSettings, setLocalSettings] = useState({});
  const [products, setProducts] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [events, setEvents] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingPromo, setEditingPromo] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [savingItem, setSavingItem] = useState('');

  /* Default site settings keys */
  const defaultSettings = {
    hero_image: '/images/hero-cafe.jpg',
    hero_title: 'Café',
    hero_subtitle: 'Exquisito',
    hero_description: 'Café de origen, bebidas preparadas al momento y un espacio para conversar o tomar una pausa.',
    hero_badge: 'Cafetería de especialidad',
    hero_label_primary: 'En la barra',
    hero_label_secondary: 'Preparado artesanalmente',
    stat_1_num: '44',
    stat_1_label: 'Bebidas, tés y frappés',
    stat_2_num: '2',
    stat_2_label: 'Sucursales',
    stat_3_num: '3',
    stat_3_label: 'Tipos de grano',
    stat_4_num: 'Al momento',
    stat_4_label: 'Preparado al pedir',
    moments_image: '/images/cafe-moments-trio.jpg',
    tails_tech_image: '/images/tails-tech.jpg',
    tails_thumbsup_image: '/images/tails-thumbsup.jpg',
    halloween_party_image: '/images/halloween-party.jpg',
    vampire_sonic_image: '/images/vampire-sonic.jpg',
    cafe_halloween_image: '/images/cafe-halloween.jpg',
    logo_url: '/images/cafe-exquisito-logo.jpg',
    footer_phone: '',
    footer_address: 'Centro Histórico & Colonia Roma, CDMX',
    footer_hours: 'Lun–Vie 7:00–21:00 · Sáb–Dom 8:00–22:00',
  };

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [settingsRes, productsRes, promosRes, eventsRes] = await Promise.all([
        getSiteSettings(),
        getProducts(),
        getPromotions(),
        getEvents(),
      ]);
      const merged = { ...defaultSettings, ...settingsRes.data };
      setSettings(merged);
      setLocalSettings(merged);
      setProducts(productsRes.data);
      setPromotions(promosRes.data);
      setEvents(eventsRes.data);
    } catch (err) {
      console.error('Error cargando configuración:', err);
      setLoadError(err.response?.data?.error || 'No se pudo cargar el editor. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  /* Save text settings batch */
  const saveTextSettings = async () => {
    setSaving(true);
    try {
      await upsertSiteSettings(localSettings);
      setSettings({ ...localSettings });
      alert(djangoSettingsEnabled
        ? 'Configuración guardada en Express. La página pública usa los ajustes de Django.'
        : 'Configuración guardada. Los cambios se verán al recargar el sitio.');
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  /* Upload image for site setting */
  const handleImageUpload = async (key, file) => {
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await upsertSiteSetting(key, formData);
      const newUrl = res.data.value;
      setSettings(s => ({ ...s, [key]: newUrl }));
      setLocalSettings(s => ({ ...s, [key]: newUrl }));
    } catch (err) {
      alert('Error subiendo imagen: ' + (err.response?.data?.error || err.message));
    }
  };

  /* Apply URL for site setting */
  const handleImageUrl = async (key, url) => {
    try {
      await upsertSiteSettings({ [key]: url });
      setSettings(s => ({ ...s, [key]: url }));
      setLocalSettings(s => ({ ...s, [key]: url }));
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  const set = (key, val) => setLocalSettings(s => ({ ...s, [key]: val }));

  /* ── Product edit ── */
  const saveProduct = async () => {
    if (!editingProduct) return;
    setSavingItem('product');
    try {
      const { _file, ...rest } = editingProduct;
      if (_file) {
        const fd = new FormData();
        Object.entries(rest).forEach(([k, v]) => fd.append(k, v));
        fd.append('image', _file);
        await updateProductWithImage(editingProduct._id, fd);
      } else {
        await updateProduct(editingProduct._id, rest);
      }
      setEditingProduct(null);
      const r = await getProducts();
      setProducts(r.data);
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setSavingItem('');
    }
  };

  /* ── Promo edit ── */
  const savePromo = async () => {
    if (!editingPromo) return;
    setSavingItem('promo');
    try {
      const { _file, ...rest } = editingPromo;
      if (_file) {
        const fd = new FormData();
        Object.entries(rest).forEach(([k, v]) => v !== undefined && fd.append(k, String(v)));
        fd.append('image', _file);
        await updatePromotionWithImage(editingPromo._id, fd);
      } else {
        await updatePromotionAPI(editingPromo._id, rest);
      }
      setEditingPromo(null);
      const r = await getPromotions();
      setPromotions(r.data);
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setSavingItem('');
    }
  };

  /* ── Event edit ── */
  const saveEventItem = async () => {
    if (!editingEvent) return;
    setSavingItem('event');
    try {
      const { _file, ...rest } = editingEvent;
      if (_file) {
        const fd = new FormData();
        Object.entries(rest).forEach(([k, v]) => v !== undefined && fd.append(k, String(v)));
        fd.append('image', _file);
        await updateEventWithImage(editingEvent._id, fd);
      } else {
        await updateEventAPI(editingEvent._id, rest);
      }
      setEditingEvent(null);
      const r = await getEvents();
      setEvents(r.data);
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setSavingItem('');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-cafe-brown">
        <Loader2 size={36} className="animate-spin text-cafe-caramel" />
        <p>Cargando editor visual…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="glass-dark rounded-2xl p-8 text-center">
        {djangoSettingsEnabled && <p className="text-amber-300 mb-4" role="status">La página pública usa los ajustes de Django. Este editor solo guarda en Express.</p>}
        <p className="text-red-400 mb-4" role="alert">{loadError}</p>
        <button onClick={load} className="btn-outline text-sm py-2 flex items-center gap-1.5 mx-auto">
          <RefreshCw size={14} /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {djangoSettingsEnabled && <div className="glass-dark p-4 text-amber-300 text-sm" role="status">Este editor guarda los ajustes en Express. La página pública usa los ajustes de Django; edítalos en la administración de Django.</div>}

      {/* ── Cabecera ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-cafe-cream">Editor del sitio</h2>
          <p className="text-cafe-brown text-sm mt-1">Actualiza las imágenes y los textos que aparecen en la página.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-outline text-sm py-2 flex items-center gap-1.5">
            <RefreshCw size={14} /> Recargar
          </button>
          <button onClick={saveTextSettings} disabled={saving} className="btn-primary text-sm py-2 flex items-center gap-1.5">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Guardando…' : 'Guardar cambios de texto'}
          </button>
        </div>
      </div>

      {/* ── Sección: Logo ── */}
      <Section icon={ImageIcon} title="Logo del Sitio">
        <ImageEditor
          label="Logo (navbar y PWA)"
          currentUrl={settings.logo_url}
          onUpload={(file) => handleImageUpload('logo_url', file)}
          onUrlChange={(url) => handleImageUrl('logo_url', url)}
        />
      </Section>

      {/* ── Sección: Hero ── */}
      <Section icon={ImageIcon} title="Hero — Sección Principal">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ImageEditor
            label="Imagen principal del Hero"
            currentUrl={settings.hero_image}
            onUpload={(file) => handleImageUpload('hero_image', file)}
            onUrlChange={(url) => handleImageUrl('hero_image', url)}
          />
          <div className="space-y-3">
            <div>
              <label className="text-xs text-cafe-brown font-semibold uppercase tracking-wide block mb-1">Badge superior</label>
              <input className="input-cafe text-sm" value={localSettings.hero_badge || ''} onChange={e => set('hero_badge', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-cafe-brown font-semibold uppercase tracking-wide block mb-1">Título (línea 1)</label>
              <input className="input-cafe text-sm" value={localSettings.hero_title || ''} onChange={e => set('hero_title', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-cafe-brown font-semibold uppercase tracking-wide block mb-1">Título (línea 2 — en dorado)</label>
              <input className="input-cafe text-sm" value={localSettings.hero_subtitle || ''} onChange={e => set('hero_subtitle', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-cafe-brown font-semibold uppercase tracking-wide block mb-1">Descripción</label>
              <textarea className="input-cafe text-sm" rows={3} value={localSettings.hero_description || ''} onChange={e => set('hero_description', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-cafe-brown font-semibold uppercase tracking-wide block mb-1">Etiqueta flotante (texto principal)</label>
              <input className="input-cafe text-sm" value={localSettings.hero_label_primary || ''} onChange={e => set('hero_label_primary', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-cafe-brown font-semibold uppercase tracking-wide block mb-1">Etiqueta flotante (texto secundario)</label>
              <input className="input-cafe text-sm" value={localSettings.hero_label_secondary || ''} onChange={e => set('hero_label_secondary', e.target.value)} />
            </div>
          </div>
        </div>
      </Section>

      {/* ── Sección: Stats ── */}
      <Section icon={Type} title="Estadísticas (Sección de números)">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-2">
              <div>
                <label className="text-[11px] text-cafe-brown font-semibold uppercase block mb-1">Número #{i}</label>
                <input className="input-cafe text-sm" value={localSettings[`stat_${i}_num`] || ''} onChange={e => set(`stat_${i}_num`, e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] text-cafe-brown font-semibold uppercase block mb-1">Etiqueta #{i}</label>
                <input className="input-cafe text-sm" value={localSettings[`stat_${i}_label`] || ''} onChange={e => set(`stat_${i}_label`, e.target.value)} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Sección: Imágenes de Secciones ── */}
      <Section icon={ImageIcon} title="Imágenes de las Secciones">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { key: 'moments_image', label: 'Sección "Momentos Inolvidables" (Trio)' },
            { key: 'tails_tech_image', label: 'Sección Tecnología — Tails Tech' },
            { key: 'tails_thumbsup_image', label: 'Sección Club — Tails Thumbs Up' },
            { key: 'halloween_party_image', label: 'Festival de Otoño — Noche de Disfraces' },
            { key: 'vampire_sonic_image', label: 'Combo Spooky Vampire — Sonic Vampiro' },
            { key: 'cafe_halloween_image', label: 'Sección Momentos Especiales & Festividades' },
          ].map(({ key, label }) => (
            <ImageEditor
              key={key}
              label={label}
              currentUrl={settings[key]}
              onUpload={(file) => handleImageUpload(key, file)}
              onUrlChange={(url) => handleImageUrl(key, url)}
            />
          ))}
        </div>
      </Section>

      {/* ── Sección: Info de Contacto ── */}
      <Section icon={Type} title="Información de Contacto / Footer">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-cafe-brown font-semibold uppercase tracking-wide block mb-1">Teléfono</label>
            <input className="input-cafe text-sm" value={localSettings.footer_phone || ''} onChange={e => set('footer_phone', e.target.value)} placeholder="+52 55 1234 5678" />
          </div>
          <div>
            <label className="text-xs text-cafe-brown font-semibold uppercase tracking-wide block mb-1">Dirección / Sucursales</label>
            <input className="input-cafe text-sm" value={localSettings.footer_address || ''} onChange={e => set('footer_address', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-cafe-brown font-semibold uppercase tracking-wide block mb-1">Horario</label>
            <input className="input-cafe text-sm" value={localSettings.footer_hours || ''} onChange={e => set('footer_hours', e.target.value)} />
          </div>
        </div>
      </Section>

      {/* ── Sección: Productos ── */}
      <Section icon={Coffee} title={`Productos del Menú (${products.length})`}>
        <p className="text-xs text-cafe-brown">Selecciona un producto para cambiar su nombre, precio, descripción o imagen.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map(p => (
            <div key={p._id}>
              {editingProduct?._id === p._id ? (
                <ProductEditForm
                  item={editingProduct}
                  onChange={setEditingProduct}
                  onSave={saveProduct}
                  onCancel={() => setEditingProduct(null)}
                  saving={savingItem === 'product'}
                />
              ) : (
                <div className="card-cafe p-3 flex gap-3 items-center">
                  <img src={p.imageUrl} alt={p.name} className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-cafe-cream text-xs font-semibold truncate">{p.name}</p>
                    <p className="text-cafe-caramel text-xs font-bold">${p.price}</p>
                    <p className="text-cafe-brown/60 text-[11px]">{p.category}</p>
                  </div>
                  <button
                    onClick={() => setEditingProduct({ ...p, _file: null })}
                    className="text-cafe-caramel hover:text-cafe-gold p-1"
                    title="Editar producto"
                  >
                    <Edit2 size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* ── Sección: Promociones ── */}
      <Section icon={Gift} title={`Combos & Promociones (${promotions.length})`}>
        <p className="text-xs text-cafe-brown">Edita título, descripción, precios e imagen de cada combo.</p>
        {djangoPromotionsEnabled && <p className="text-amber-300 text-xs" role="status">Estas promociones son de Express. Las que ve el público se editan en la administración de Django.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {promotions.map(pr => (
            <div key={pr._id}>
              {editingPromo?._id === pr._id ? (
                <PromoEditForm
                  item={editingPromo}
                  onChange={setEditingPromo}
                  onSave={savePromo}
                  onCancel={() => setEditingPromo(null)}
                  saving={savingItem === 'promo'}
                />
              ) : (
                <div className="card-cafe p-3 flex gap-3 items-center">
                  <img
                    src={pr.imageUrl || 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=200&q=60'}
                    alt={pr.title}
                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-cafe-cream text-xs font-semibold truncate">{pr.title}</p>
                    <p className="text-cafe-caramel text-xs font-bold">${pr.comboPrice} MXN</p>
                    <p className="text-cafe-brown/60 text-[11px] line-through">${pr.originalPrice}</p>
                  </div>
                  <button onClick={() => setEditingPromo({ ...pr, _file: null })} className="text-cafe-caramel hover:text-cafe-gold p-1">
                    <Edit2 size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* ── Sección: Eventos ── */}
      <Section icon={Calendar} title={`Eventos (${events.length})`}>
        <p className="text-xs text-cafe-brown">Edita título, descripción, fecha e imagen de cada evento.</p>
        {djangoEventsEnabled && <p className="text-amber-300 text-xs" role="status">Estos eventos son de Express. Los que ve el público se editan en la administración de Django.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {events.map(ev => (
            <div key={ev._id}>
              {editingEvent?._id === ev._id ? (
                <EventEditForm
                  item={editingEvent}
                  onChange={setEditingEvent}
                  onSave={saveEventItem}
                  onCancel={() => setEditingEvent(null)}
                  saving={savingItem === 'event'}
                />
              ) : (
                <div className="card-cafe p-3 flex gap-3 items-center">
                  {ev.imageUrl && (
                    <img src={ev.imageUrl} alt={ev.title} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-cafe-cream text-xs font-semibold truncate">{ev.title}</p>
                    <p className="text-cafe-caramel text-xs">{new Date(ev.date).toLocaleDateString('es-MX')} · {ev.time}</p>
                    <p className="text-cafe-brown/60 text-[11px] truncate">{ev.location}</p>
                  </div>
                  <button onClick={() => setEditingEvent({ ...ev, _file: null })} className="text-cafe-caramel hover:text-cafe-gold p-1">
                    <Edit2 size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

    </div>
  );
}

/* ─── Formulario de edición de Producto ─── */
function ProductEditForm({ item, onChange, onSave, onCancel, saving }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(item.imageUrl);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    onChange(prev => ({ ...prev, _file: file }));
  };

  const cats = ['Bebidas', 'Frappes', 'Desayunos', 'Lunch', 'Reposteria', 'Alimentos', 'Café en Grano'];

  return (
    <div className="glass-dark border border-cafe-caramel/40 rounded-xl p-4 space-y-3 animate-fade-in">
      <p className="text-cafe-cream font-semibold text-sm">Editando: {item.name}</p>

      {/* Imagen */}
      <div className="relative group">
        <img src={preview} alt="preview" className="w-full h-32 object-cover rounded-lg" />
        <div
          onClick={() => fileRef.current?.click()}
          className="absolute inset-0 bg-cafe-dark/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer rounded-lg"
        >
          <Camera size={20} className="text-cafe-caramel" />
          <span className="text-xs text-cafe-cream ml-2">Cambiar foto</span>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      <input className="input-cafe text-sm" placeholder="Nombre" value={item.name} onChange={e => onChange(p => ({ ...p, name: e.target.value }))} />
      <input className="input-cafe text-sm" placeholder="Precio" type="number" value={item.price} onChange={e => onChange(p => ({ ...p, price: e.target.value }))} />
      <select className="input-cafe text-sm" value={item.category} onChange={e => onChange(p => ({ ...p, category: e.target.value }))}>
        {cats.map(c => <option key={c}>{c}</option>)}
      </select>
      <textarea className="input-cafe text-sm" rows={2} placeholder="Descripción" value={item.description || ''} onChange={e => onChange(p => ({ ...p, description: e.target.value }))} />

      <div className="flex gap-2">
        <button onClick={onSave} disabled={saving} className="btn-primary text-xs py-1.5 flex items-center gap-1 flex-1">
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button onClick={onCancel} className="btn-outline text-xs py-1.5 flex-1">Cancelar</button>
      </div>
    </div>
  );
}

/* ─── Formulario de edición de Promo ─── */
function PromoEditForm({ item, onChange, onSave, onCancel, saving }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(item.imageUrl);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    onChange(prev => ({ ...prev, _file: file }));
  };

  return (
    <div className="glass-dark border border-cafe-caramel/40 rounded-xl p-4 space-y-3 animate-fade-in">
      <p className="text-cafe-cream font-semibold text-sm">Editando combo</p>

      <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
        {preview && <img src={preview} alt="preview" className="w-full h-28 object-cover rounded-lg" />}
        <div className="absolute inset-0 bg-cafe-dark/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-lg">
          <Camera size={18} className="text-cafe-caramel" /><span className="text-xs text-cafe-cream ml-2">Cambiar foto</span>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      <input className="input-cafe text-sm" placeholder="Título" value={item.title || ''} onChange={e => onChange(p => ({ ...p, title: e.target.value }))} />
      <input className="input-cafe text-sm" placeholder="Badge (ej: Ahorra 20%)" value={item.badge || ''} onChange={e => onChange(p => ({ ...p, badge: e.target.value }))} />
      <div className="grid grid-cols-2 gap-2">
        <input className="input-cafe text-sm" placeholder="Precio original" type="number" value={item.originalPrice || ''} onChange={e => onChange(p => ({ ...p, originalPrice: e.target.value }))} />
        <input className="input-cafe text-sm" placeholder="Precio combo" type="number" value={item.comboPrice || ''} onChange={e => onChange(p => ({ ...p, comboPrice: e.target.value }))} />
      </div>
      <textarea className="input-cafe text-sm" rows={2} placeholder="Descripción" value={item.description || ''} onChange={e => onChange(p => ({ ...p, description: e.target.value }))} />

      <div className="flex gap-2">
        <button onClick={onSave} disabled={saving} className="btn-primary text-xs py-1.5 flex items-center gap-1 flex-1">
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button onClick={onCancel} className="btn-outline text-xs py-1.5 flex-1">Cancelar</button>
      </div>
    </div>
  );
}

/* ─── Formulario de edición de Evento ─── */
function EventEditForm({ item, onChange, onSave, onCancel, saving }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(item.imageUrl);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    onChange(prev => ({ ...prev, _file: file }));
  };

  const cats = ['Cata de Café', 'Música Acústica / Jazz', 'Taller de Barismo', 'Especial', 'Festival Temático / Música'];

  return (
    <div className="glass-dark border border-cafe-caramel/40 rounded-xl p-4 space-y-3 animate-fade-in">
      <p className="text-cafe-cream font-semibold text-sm">Editando evento</p>

      {preview && (
        <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
          <img src={preview} alt="preview" className="w-full h-28 object-cover rounded-lg" />
          <div className="absolute inset-0 bg-cafe-dark/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-lg">
            <Camera size={18} className="text-cafe-caramel" /><span className="text-xs text-cafe-cream ml-2">Cambiar foto</span>
          </div>
        </div>
      )}
      {!preview && (
        <div className="w-full h-16 border border-dashed border-cafe-brown/40 rounded-lg flex items-center justify-center cursor-pointer hover:border-cafe-caramel" onClick={() => fileRef.current?.click()}>
          <Camera size={18} className="text-cafe-caramel mr-2" /><span className="text-xs text-cafe-brown">Agregar foto</span>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      <input className="input-cafe text-sm" placeholder="Título" value={item.title || ''} onChange={e => onChange(p => ({ ...p, title: e.target.value }))} />
      <select className="input-cafe text-sm" value={item.category || ''} onChange={e => onChange(p => ({ ...p, category: e.target.value }))}>
        {cats.map(c => <option key={c}>{c}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <input className="input-cafe text-sm" type="date" value={item.date ? item.date.slice(0, 10) : ''} onChange={e => onChange(p => ({ ...p, date: e.target.value }))} />
        <input className="input-cafe text-sm" placeholder="Hora" value={item.time || ''} onChange={e => onChange(p => ({ ...p, time: e.target.value }))} />
      </div>
      <input className="input-cafe text-sm" placeholder="Lugar" value={item.location || ''} onChange={e => onChange(p => ({ ...p, location: e.target.value }))} />
      <textarea className="input-cafe text-sm" rows={2} placeholder="Descripción" value={item.description || ''} onChange={e => onChange(p => ({ ...p, description: e.target.value }))} />

      <div className="flex gap-2">
        <button onClick={onSave} disabled={saving} className="btn-primary text-xs py-1.5 flex items-center gap-1 flex-1">
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button onClick={onCancel} className="btn-outline text-xs py-1.5 flex-1">Cancelar</button>
      </div>
    </div>
  );
}
