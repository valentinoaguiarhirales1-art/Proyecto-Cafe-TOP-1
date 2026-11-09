import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

export default function RuntimeErrorNotice() {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = (event) => {
      if (event.target && event.target !== window) return;
      console.error('Error inesperado en la página:', event.error || event.message);
      setHasError(true);
    };
    const handleRejection = (event) => {
      console.error('Una tarea de la página no pudo completarse:', event.reason);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  if (!hasError) return null;

  return (
    <aside className="fixed bottom-4 left-2 right-2 z-[70] mx-auto max-w-xl rounded-2xl border border-red-400/40 bg-cafe-dark/95 p-4 text-cafe-cream shadow-2xl backdrop-blur-xl sm:left-4 sm:right-4" role="alert">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Una parte de la página tuvo un problema</p>
          <p className="mt-1 text-xs leading-relaxed text-cafe-brown">Vuelve a intentarlo. Si no se corrige, recarga la app o cierra y vuelve a abrir la página.</p>
          <button type="button" onClick={() => window.location.reload()} className="btn-primary mt-3 flex items-center gap-2 px-4 py-2 text-xs">
            <RefreshCw size={14} aria-hidden="true" /> Recargar
          </button>
        </div>
        <button type="button" onClick={() => setHasError(false)} className="rounded-full p-2 text-cafe-brown hover:bg-white/10 hover:text-cafe-cream" aria-label="Cerrar aviso">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
