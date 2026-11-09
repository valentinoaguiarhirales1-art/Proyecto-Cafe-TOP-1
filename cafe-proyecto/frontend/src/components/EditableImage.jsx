/**
 * EditableImage — Wrapper que permite al admin cambiar cualquier imagen del sitio
 * con un solo clic. Solo visible si el usuario tiene rol admin/codueno/gerente.
 *
 * Props:
 *   settingKey   — clave única para guardar en SiteSettings (ej: "hero_image")
 *   src          — URL de la imagen actual
 *   alt          — texto alternativo
 *   className    — clases CSS adicionales para el <img>
 *   wrapperClass — clases CSS adicionales para el contenedor
 *   children     — contenido adicional sobre la imagen (overlays, badges, etc.)
 *   onUpdate     — callback(newUrl) después de guardar exitosamente
 */

import { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Camera, Loader2 } from 'lucide-react';
import { upsertSiteSetting } from '../api';

export default function EditableImage({
  settingKey,
  src,
  alt = '',
  className = '',
  wrapperClass = '',
  children,
  onUpdate,
}) {
  const { isAdmin } = useAuth();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [hover, setHover] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await upsertSiteSetting(settingKey, formData);
      onUpdate?.(res.data.value);
    } catch (err) {
      alert('No se pudo subir la imagen: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div
      className={`relative ${wrapperClass}`}
      onMouseEnter={() => isAdmin && setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <img src={src} alt={alt} className={className} />

      {children}

      {/* Overlay de edición — solo para admins */}
      {isAdmin && (hover || uploading) && (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          title="Cambiar imagen"
          className="absolute inset-0 flex flex-col items-center justify-center gap-2
                     bg-cafe-dark/70 backdrop-blur-sm text-cafe-cream
                     transition-opacity duration-200 cursor-pointer z-20
                     rounded-[inherit]"
        >
          {uploading ? (
            <>
              <Loader2 size={28} className="animate-spin text-cafe-caramel" />
              <span className="text-xs font-medium">Subiendo…</span>
            </>
          ) : (
            <>
              <Camera size={28} className="text-cafe-caramel" />
              <span className="text-xs font-semibold bg-cafe-caramel text-cafe-dark px-3 py-1 rounded-full">
                Cambiar imagen
              </span>
            </>
          )}
        </button>
      )}

      {/* Input oculto */}
      {isAdmin && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      )}
    </div>
  );
}
