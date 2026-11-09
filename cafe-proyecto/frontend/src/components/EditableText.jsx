/**
 * EditableText — Permite editar cualquier texto del sitio en línea (inline).
 * Solo visible para admins. Doble clic o clic en ícono de lápiz para editar.
 *
 * Props:
 *   settingKey   — clave única en SiteSettings (ej: "hero_title")
 *   value        — texto actual
 *   tag          — elemento HTML a renderizar ("h1","h2","p","span", etc.). Default: "p"
 *   className    — clases CSS del elemento
 *   onUpdate     — callback(newValue) después de guardar
 *   multiline    — si true usa textarea
 */

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Pencil, Check, X } from 'lucide-react';
import { upsertSiteSettingJson } from '../api';

export default function EditableText({
  settingKey,
  value,
  tag: Tag = 'p',
  className = '',
  onUpdate,
  multiline = false,
}) {
  const { isAdmin } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const save = async () => {
    if (draft === value) { setEditing(false); return; }
    setSaving(true);
    try {
      await upsertSiteSettingJson(settingKey, draft);
      onUpdate?.(draft);
      setEditing(false);
    } catch (err) {
      alert('No se pudo guardar: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => { setDraft(value); setEditing(false); };

  if (!isAdmin) {
    return <Tag className={className}>{value}</Tag>;
  }

  if (editing) {
    return (
      <div className="relative inline-flex flex-col gap-1 w-full">
        {multiline ? (
          <textarea
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={3}
            className={`${className} bg-cafe-dark/80 border border-cafe-caramel rounded-lg px-2 py-1 text-cafe-cream outline-none resize-y w-full`}
          />
        ) : (
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className={`${className} bg-cafe-dark/80 border border-cafe-caramel rounded-lg px-2 py-1 text-cafe-cream outline-none w-full`}
          />
        )}
        <div className="flex gap-1 mt-1">
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded">
            <Check size={12} /> {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button onClick={cancel}
            className="flex items-center gap-1 text-xs bg-cafe-dark border border-cafe-brown/40 text-cafe-cream px-2 py-1 rounded">
            <X size={12} /> Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <Tag
      className={`${className} group relative cursor-pointer`}
      title="Doble clic para editar"
      onDoubleClick={() => setEditing(true)}
    >
      {value}
      <button
        onClick={() => setEditing(true)}
        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity
                   bg-cafe-caramel text-cafe-dark rounded-full p-0.5 shadow-md z-10"
        title="Editar texto"
      >
        <Pencil size={11} />
      </button>
    </Tag>
  );
}
