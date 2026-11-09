import { House, RefreshCw, TriangleAlert } from 'lucide-react';

export default function RecoveryNotice({ title = 'No se pudo cargar esta sección', message, onRetry }) {
  const reload = () => window.location.reload();

  return (
    <section className="glass-dark mx-auto my-6 w-full max-w-2xl border border-red-400/30 p-5 text-center sm:p-7" role="alert">
      <TriangleAlert size={32} className="mx-auto mb-3 text-amber-300" aria-hidden="true" />
      <h2 className="font-serif text-xl text-cafe-cream">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-cafe-brown">
        {message || 'Revisa tu conexión e inténtalo otra vez. Si el problema continúa, cierra la página y vuelve a abrirla.'}
      </p>
      <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
        <button type="button" onClick={onRetry || reload} className="btn-primary flex items-center justify-center gap-2 text-sm">
          <RefreshCw size={15} aria-hidden="true" /> Intentar de nuevo
        </button>
        <a href="/" className="btn-outline flex items-center justify-center gap-2 text-sm">
          <House size={15} aria-hidden="true" /> Volver al inicio
        </a>
      </div>
    </section>
  );
}
