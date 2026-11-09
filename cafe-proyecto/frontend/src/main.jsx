import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import DjangoCatalog from './pages/DjangoCatalog.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'
import { initScrollReveal } from './utils/scrollReveal.js'
import { initInteractiveEffects } from './utils/interactiveEffects.js'

initScrollReveal();
initInteractiveEffects();

// El service worker es para producción; en desarrollo puede guardar módulos de Vite obsoletos.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('/sw.js').then((reg) => {
    reg.update();
  }).catch((error) => {
    console.error('No se pudo registrar el Service Worker de Café Exquisito:', error);
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <LanguageProvider>
            {window.location.pathname === '/catalogo-django' ? <DjangoCatalog /> : <App />}
          </LanguageProvider>
        </CartProvider>
      </AuthProvider>
    </AppErrorBoundary>
  </React.StrictMode>
)
