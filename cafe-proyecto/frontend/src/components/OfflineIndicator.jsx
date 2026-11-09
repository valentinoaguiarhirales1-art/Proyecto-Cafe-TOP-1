import { useEffect, useState } from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { checkConnection, djangoCatalogEnabled } from '../api';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [reconnected, setReconnected] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState('');

  useEffect(() => {
    let reconnectTimer;
    const handleOffline = () => {
      window.clearTimeout(reconnectTimer);
      setReconnected(false);
      setIsOnline(false);
      setCheckMessage('');
    };
    const handleOnline = () => {
      setIsOnline(true);
      setReconnected(true);
      setCheckMessage('');
      reconnectTimer = window.setTimeout(() => setReconnected(false), 7000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.clearTimeout(reconnectTimer);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const retryConnection = async () => {
    setChecking(true);
    setCheckMessage('');
    try {
      if (!navigator.onLine) throw new Error('El dispositivo no tiene conexión.');
      await checkConnection();
      if (!navigator.onLine) throw new Error('La conexión se interrumpió durante la comprobación.');
      setIsOnline(true);
      setReconnected(true);
      setCheckMessage('Conectamos con el servidor del catálogo. Otros servicios podrían seguir sin estar disponibles.');
      window.dispatchEvent(new Event('cafe-retry-data'));
    } catch (error) {
      console.error('No se pudo conectar con el servidor:', error);
      setCheckMessage('Todavía no podemos conectar con el servidor del catálogo. Revisa tu conexión y vuelve a intentar; si usas una dirección local, comprueba que el servidor esté encendido.');
    } finally {
      setChecking(false);
    }
  };

  if (isOnline && !reconnected) return null;

  return (
    <aside
      className="fixed left-2 right-2 top-[4.75rem] z-[60] mx-auto max-w-3xl rounded-2xl border border-amber-300/40 bg-cafe-dark/95 p-4 text-cafe-cream shadow-2xl backdrop-blur-xl sm:left-4 sm:right-4 sm:flex sm:items-center sm:justify-between sm:gap-4"
      role={isOnline ? 'status' : 'alert'}
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {isOnline
          ? <Wifi size={20} className="mt-0.5 shrink-0 text-green-400" aria-hidden="true" />
          : <WifiOff size={20} className="mt-0.5 shrink-0 text-amber-300" aria-hidden="true" />}
        <div>
          <p className="font-semibold">{isOnline ? 'La conexión volvió' : 'No hay conexión a internet'}</p>
          <p className="mt-1 text-xs leading-relaxed text-cafe-brown">
            {isOnline
              ? 'La red está disponible. Comprueba si el servidor del catálogo responde para actualizar el contenido.'
              : djangoCatalogEnabled
                ? 'El menú de Django y las funciones de la cuenta requieren conexión. Revisa el Wi-Fi o los datos móviles.'
                : 'Puedes consultar el menú guardado, pero iniciar sesión, hacer pedidos y usar las herramientas del personal requiere internet. Revisa el Wi-Fi o los datos móviles.'}
          </p>
          {checkMessage && <p className="mt-2 text-xs text-cafe-cream" role="status">{checkMessage}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={retryConnection}
        disabled={checking}
        className="btn-outline mt-3 flex w-full items-center justify-center gap-2 px-4 py-2 text-xs disabled:opacity-60 sm:mt-0 sm:w-auto sm:shrink-0"
      >
        <RefreshCw size={14} aria-hidden="true" /> {checking ? 'Comprobando…' : 'Comprobar conexión'}
      </button>
    </aside>
  );
}
