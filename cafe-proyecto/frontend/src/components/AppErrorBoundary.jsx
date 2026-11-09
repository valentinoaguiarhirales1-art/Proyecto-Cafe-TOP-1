import { Component } from 'react';
import { House, RefreshCw, TriangleAlert } from 'lucide-react';

export default class AppErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('La aplicación encontró un error al mostrar la página:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-cafe-dark px-4 py-10 text-cafe-cream">
        <section className="glass-dark w-full max-w-xl p-6 text-center sm:p-10" role="alert">
          <TriangleAlert size={42} className="mx-auto mb-4 text-amber-300" aria-hidden="true" />
          <h1 className="font-serif text-2xl sm:text-3xl">Algo salió mal</h1>
          <p className="mt-3 text-sm leading-relaxed text-cafe-brown">
            La página tuvo un problema y no pudo mostrarse. Prueba a recargarla. Si vuelve a pasar, cierra la app o la pestaña, comprueba tu conexión y ábrela de nuevo.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button type="button" onClick={() => window.location.reload()} className="btn-primary flex items-center justify-center gap-2 text-sm">
              <RefreshCw size={15} aria-hidden="true" /> Recargar página
            </button>
            <a href="/" className="btn-outline flex items-center justify-center gap-2 text-sm">
              <House size={15} aria-hidden="true" /> Ir al inicio
            </a>
          </div>
          <p className="mt-5 text-xs text-cafe-brown/80">
            En móvil, cierra y vuelve a abrir la app. En computadora, recarga la pestaña o ábrela otra vez en el navegador.
          </p>
        </section>
      </main>
    );
  }
}
