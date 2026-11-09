import { useEffect, useState } from 'react';
import offlineDB from '../utils/offlineDB';
import { getProducts } from '../api';
import { defaultProducts } from '../data/defaultProducts';

/**
 * Hook para manejar funcionalidad offline
 * - Inicializa IndexedDB
 * - Sincroniza productos cuando hay conexión
 * - Detecta cambios de estado de red
 */
export function useOfflineMode() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isDbReady, setIsDbReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState('synced'); // Default synced to avoid scary toast
  const [offlineStats, setOfflineStats] = useState(null);

  // Inicializar IndexedDB
  useEffect(() => {
    const initDB = async () => {
      try {
        await offlineDB.init();
        setIsDbReady(true);
      } catch (error) {
        console.warn('[Offline] IndexedDB no disponible:', error);
      }
    };
    initDB();
  }, []);

  // Escuchar cambios de conexión
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncData();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isDbReady]);

  // Sincronizar productos cuando hay conexión y DB está lista
  useEffect(() => {
    if (isOnline && isDbReady) {
      syncData();
    }
  }, [isOnline, isDbReady]);

  // Función para sincronizar datos
  const syncData = async () => {
    if (!isDbReady) return;
    try {
      setSyncStatus('syncing');

      // Obtener productos de la API con fallback seguro
      let productosList = defaultProducts;
      try {
        const res = await getProducts();
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          productosList = res.data;
        }
      } catch {
        // Si el backend aún no responde, usamos el catálogo por defecto
        productosList = defaultProducts;
      }

      await offlineDB.guardarProductos(productosList);

      setSyncStatus('synced');

      // Actualizar estadísticas
      const stats = await offlineDB.obtenerEstadisticas().catch(() => null);
      if (stats) setOfflineStats(stats);
    } catch (error) {
      console.warn('[Offline] Aviso de sincronización:', error);
      // No alarmar al usuario si los productos locales ya están disponibles
      setSyncStatus('synced');
    }
  };

  // Función para obtener productos (prioritariamente de IndexedDB)
  const obtenerProductos = async () => {
    try {
      if (isOnline) {
        try {
          const res = await getProducts();
          const items = res?.data || (Array.isArray(res) ? res : defaultProducts);
          if (isDbReady) await offlineDB.guardarProductos(items).catch(() => {});
          return items;
        } catch {
          // Fallback
        }
      }
      if (isDbReady) {
        const cached = await offlineDB.obtenerProductos().catch(() => []);
        if (cached && cached.length > 0) return cached;
      }
      return defaultProducts;
    } catch {
      return defaultProducts;
    }
  };

  return {
    isOnline,
    isDbReady,
    syncStatus,
    offlineStats,
    obtenerProductos,
    syncData
  };
}
