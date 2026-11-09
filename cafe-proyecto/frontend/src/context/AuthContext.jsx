import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { djangoAccountAction, djangoAuthEnabled, getDjangoSession } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    if (djangoAuthEnabled) return null;
    try { return JSON.parse(localStorage.getItem('cafeUser')); }
    catch { return null; }
  });
  const [sessionLoading, setSessionLoading] = useState(djangoAuthEnabled);
  const [sessionError, setSessionError] = useState('');
  const sessionRequest = useRef(0);

  const refreshSession = async () => {
    const requestId = ++sessionRequest.current;
    setSessionLoading(true);
    setSessionError('');
    try {
      const { data } = await getDjangoSession();
      if (requestId !== sessionRequest.current) return;
      setUser(data.user ? { ...data.user, backend: 'django' } : null);
    } catch (error) {
      if (requestId !== sessionRequest.current) return;
      console.error('No se pudo consultar la sesión de Django:', error);
      setSessionError('No pudimos comprobar tu sesión de Django. Revisa la conexión y vuelve a intentarlo.');
    } finally {
      if (requestId === sessionRequest.current) setSessionLoading(false);
    }
  };

  useEffect(() => {
    if (djangoAuthEnabled) refreshSession();
  }, []);

  const login = (userData) => {
    if (djangoAuthEnabled) throw new Error('La cuenta de Express no se puede usar en el modo Django.');
    localStorage.setItem('cafeUser', JSON.stringify(userData));
    setUser(userData);
  };

  const loginDjango = async (action, data) => {
    const response = await djangoAccountAction(action, data);
    sessionRequest.current++;
    setUser({ ...response.data.user, backend: 'django' });
    setSessionLoading(false);
    setSessionError('');
  };

  const logout = async () => {
    if (djangoAuthEnabled) {
      await djangoAccountAction('logout', {}, user.id);
      setUser(null);
      setSessionError('');
      return;
    }
    localStorage.removeItem('cafeUser');
    setUser(null);
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'codueno' || user?.role === 'gerente';
  const isStaff = ['barista','atencion','encargado','subgerente','gerente','supervisor','codueno','admin'].includes(user?.role);

  return (
    <AuthContext.Provider value={{ user, login, loginDjango, logout, isAdmin, isStaff, sessionLoading, sessionError, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
