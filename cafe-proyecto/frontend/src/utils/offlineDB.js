// IndexedDB Manager para Café Exquisito - Almacenamiento Offline
class OfflineDataManager {
  constructor() {
    this.dbName = 'CafeExquisitoDB';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('[IndexedDB] Error abriendo base de datos');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store para productos del menú
        if (!db.objectStoreNames.contains('productos')) {
          db.createObjectStore('productos', { keyPath: '_id' });
        }

        // Store para carrito
        if (!db.objectStoreNames.contains('carrito')) {
          const carritoStore = db.createObjectStore('carrito', { keyPath: '_id', autoIncrement: true });
          carritoStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store para órdenes/compras offline
        if (!db.objectStoreNames.contains('ordenes')) {
          const ordenesStore = db.createObjectStore('ordenes', { keyPath: 'id', autoIncrement: true });
          ordenesStore.createIndex('estado', 'estado', { unique: false });
          ordenesStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store para sincronización pendiente
        if (!db.objectStoreNames.contains('syncPending')) {
          db.createObjectStore('syncPending', { keyPath: 'id', autoIncrement: true });
        }

        // Store para configuración
        if (!db.objectStoreNames.contains('config')) {
          db.createObjectStore('config', { keyPath: 'key' });
        }
      };
    });
  }

  // PRODUCTOS
  async guardarProductos(productos) {
    if (!this.db) return;
    const list = Array.isArray(productos) ? productos : (productos?.data && Array.isArray(productos.data) ? productos.data : []);
    const tx = this.db.transaction('productos', 'readwrite');
    const store = tx.objectStore('productos');
    
    return new Promise((resolve, reject) => {
      // Limpiar primero
      store.clear();
      
      // Guardar nuevos
      list.forEach(prod => {
        if (prod && prod._id) {
          store.put(prod);
        }
      });

      tx.oncomplete = () => {
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async obtenerProductos() {
    if (!this.db) return [];
    const tx = this.db.transaction('productos', 'readonly');
    const store = tx.objectStore('productos');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async obtenerProductoPorId(id) {
    if (!this.db) return null;
    const tx = this.db.transaction('productos', 'readonly');
    const store = tx.objectStore('productos');

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // CARRITO
  async agregarAlCarrito(item) {
    if (!this.db) return;
    const tx = this.db.transaction('carrito', 'readwrite');
    const store = tx.objectStore('carrito');

    return new Promise((resolve, reject) => {
      const request = store.add({
        ...item,
        timestamp: Date.now()
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async obtenerCarrito() {
    if (!this.db) return [];
    const tx = this.db.transaction('carrito', 'readonly');
    const store = tx.objectStore('carrito');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async eliminarDelCarrito(id) {
    if (!this.db) return;
    const tx = this.db.transaction('carrito', 'readwrite');
    const store = tx.objectStore('carrito');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async limpiarCarrito() {
    if (!this.db) return;
    const tx = this.db.transaction('carrito', 'readwrite');
    const store = tx.objectStore('carrito');

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ÓRDENES
  async guardarOrden(orden) {
    if (!this.db) return;
    const tx = this.db.transaction('ordenes', 'readwrite');
    const store = tx.objectStore('ordenes');

    return new Promise((resolve, reject) => {
      const request = store.add({
        ...orden,
        timestamp: Date.now(),
        estado: 'pending' // pending, synced, error
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async obtenerOrdenes() {
    if (!this.db) return [];
    const tx = this.db.transaction('ordenes', 'readonly');
    const store = tx.objectStore('ordenes');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async obtenerOrdenesPendientes() {
    if (!this.db) return [];
    const tx = this.db.transaction('ordenes', 'readonly');
    const index = tx.objectStore('ordenes').index('estado');

    return new Promise((resolve, reject) => {
      const request = index.getAll('pending');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async actualizarOrden(id, data) {
    if (!this.db) return;
    const tx = this.db.transaction('ordenes', 'readwrite');
    const store = tx.objectStore('ordenes');

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const orden = getRequest.result;
        const updateRequest = store.put({ ...orden, ...data });
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // SINCRONIZACIÓN
  async registrarSyncPending(tipo, datos) {
    if (!this.db) return;
    const tx = this.db.transaction('syncPending', 'readwrite');
    const store = tx.objectStore('syncPending');

    return new Promise((resolve, reject) => {
      const request = store.add({
        tipo,
        datos,
        timestamp: Date.now(),
        intentos: 0
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async obtenerSyncPending() {
    if (!this.db) return [];
    const tx = this.db.transaction('syncPending', 'readonly');
    const store = tx.objectStore('syncPending');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async eliminarSyncPending(id) {
    if (!this.db) return;
    const tx = this.db.transaction('syncPending', 'readwrite');
    const store = tx.objectStore('syncPending');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // CONFIGURACIÓN
  async guardarConfig(key, value) {
    if (!this.db) return;
    const tx = this.db.transaction('config', 'readwrite');
    const store = tx.objectStore('config');

    return new Promise((resolve, reject) => {
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async obtenerConfig(key) {
    if (!this.db) return null;
    const tx = this.db.transaction('config', 'readonly');
    const store = tx.objectStore('config');

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  }

  // ESTADÍSTICAS
  async obtenerEstadisticas() {
    return {
      productos: (await this.obtenerProductos()).length,
      carrito: (await this.obtenerCarrito()).length,
      ordenes: (await this.obtenerOrdenes()).length,
      pendientes: (await this.obtenerOrdenesPendientes()).length
    };
  }
}

// Crear instancia global
const offlineDB = new OfflineDataManager();

export default offlineDB;
