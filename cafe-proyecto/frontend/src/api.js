import axios from 'axios';
import { withCorrectProductImage, withCorrectPromotionImage } from './utils/productImages';
import { adaptDjangoProducts } from './utils/djangoProducts';
import { checkCatalogConnection } from './utils/catalogConnection';
import { djangoMenuRecommendation, getMentionedMenuItems } from './utils/djangoMenuAssistant';
import { djangoOrderSessionHeaders } from './utils/djangoOrderSession';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 20000,
});

export const djangoAuthEnabled = import.meta.env.VITE_DJANGO_AUTH === 'true';

API.interceptors.response.use((response) => {
  const url = response.config.url || '';
  const correctImage = /^\/products(?:\/|$)/.test(url) ? withCorrectProductImage
    : /^\/promotions(?:\/|$)/.test(url) ? withCorrectPromotionImage : null;
  if (correctImage) {
    response.data = Array.isArray(response.data)
      ? response.data.map(correctImage)
      : correctImage(response.data);
  }
  return response;
});

// Adjuntar token automáticamente si existe
API.interceptors.request.use((config) => {
  try {
    const user = djangoAuthEnabled ? null : JSON.parse(localStorage.getItem('cafeUser') || 'null');
    if (user?.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
  } catch (error) {
    console.error('No se pudo leer la sesión guardada:', error);
    try {
      localStorage.removeItem('cafeUser');
    } catch (storageError) {
      console.error('No se pudo limpiar la sesión guardada:', storageError);
    }
  }
  try {
    const employerSession = sessionStorage.getItem('employerSession');
    if (employerSession) {
      config.headers['X-Employer-Session'] = employerSession;
    }
  } catch (error) {
    console.error('No se pudo leer la sesión del personal:', error);
  }
  return config;
});

// Autenticación
export const loginUser      = (data) => API.post('/auth/login', data);
export const registerUser   = (data) => API.post('/auth/register', data);
export const getProfile     = ()     => API.get('/auth/profile');
export const updateProfile  = (data) => API.put('/auth/profile', data);
export const updateProfileWithAvatar = (formData) => API.put('/auth/profile', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getAllUsers     = ()     => API.get('/auth/users');

// Productos
export const getProducts    = (params) => API.get('/products', { params });
export const djangoCatalogEnabled = import.meta.env.VITE_DJANGO_CATALOG === 'true';
export const djangoCheckoutEnabled = djangoCatalogEnabled && import.meta.env.VITE_DJANGO_CHECKOUT === 'true';
export const getDjangoSession = () => axios.get('/django-api/session', { timeout: 20000 });
export const djangoAccountAction = async (action, data = {}, expectedUserId) => {
  const { data: session } = await getDjangoSession();
  return axios.post(`/django-api/${action}`, new URLSearchParams(data), {
    timeout: 20000,
    headers: { 'X-CSRFToken': session.csrfToken, ...(expectedUserId != null ? { 'X-Expected-Django-User': String(expectedUserId) } : {}) },
  });
};
export const getDjangoProfile = (userId) => axios.get('/django-api/profile', {
  timeout: 20000, headers: { 'X-Expected-Django-User': String(userId) },
});
export const updateDjangoProfile = async (userId, data) => {
  const { data: session } = await getDjangoSession();
  return axios.post('/django-api/profile', new URLSearchParams(data), {
    timeout: 20000,
    headers: { 'X-CSRFToken': session.csrfToken, 'X-Expected-Django-User': String(userId) },
  });
};
export const getHomeProducts = async () => {
  if (!djangoCatalogEnabled) return getProducts({ available: true });
  const response = await axios.get('/django-api/products', { timeout: 20000 });
  return { ...response, data: adaptDjangoProducts(response.data).map(withCorrectProductImage) };
};
export const checkConnection = () => checkCatalogConnection(djangoCatalogEnabled, axios, API);
export const getProductById = (id)     => API.get(`/products/${id}`);
export const createProduct  = (data)   => API.post('/products', data);
export const updateProduct  = (id, data) => API.put(`/products/${id}`, data);
export const updateProductAvailability = (id, isAvailable) => API.patch(`/products/${id}/availability`, { isAvailable });
export const deleteProduct  = (id)     => API.delete(`/products/${id}`);

// Equipo y contratación
export const djangoTeamEnabled = import.meta.env.VITE_DJANGO_TEAM === 'true';
export const getPublicTeam = async () => {
  if (!djangoTeamEnabled) return API.get('/staff/team');
  const response = await axios.get('/django-api/team', { timeout: 20000 });
  if (!Array.isArray(response.data)) throw new Error('La respuesta del equipo no es válida.');
  return response;
};
export const djangoStaffApplicationsEnabled = import.meta.env.VITE_DJANGO_STAFF_APPLICATIONS === 'true';
export const createStaffApplication = async (data) => {
  if (!djangoStaffApplicationsEnabled) return API.post('/staff/applications', data);
  const { data: session } = await getDjangoSession();
  const body = new URLSearchParams({
    name: data.name,
    email: data.email,
    phone: data.phone,
    requested_position: data.requestedPosition,
    experience_years: String(data.experienceYears),
    is_recent_graduate: String(data.isRecentGraduate),
    public_profile_consent: String(data.publicProfileConsent),
    profile_bio: data.profileBio,
  });
  return axios.post('/django-api/staff-applications', body, {
    timeout: 20000, headers: { 'X-CSRFToken': session.csrfToken },
  });
};
export const activateEmployeeAccount = (data) => API.post('/staff/activate', data);
export const acceptDjangoStaffInvitation = (code, userId) =>
  djangoAccountAction('accept-staff-invitation', { invitation: code }, userId);
export const employerLogin = (key) => API.post('/staff/employer/login', { key });
export const getStaffApplications = () => API.get('/staff/employer/applications');
export const updateStaffApplication = (id, status) => API.patch(`/staff/employer/applications/${id}`, { status });
export const getStaffEmployees = () => API.get('/staff/employer/employees');
export const updateStaffEmployee = (id, data) => API.put(`/staff/employer/employees/${id}`, data);

// Pedidos
export const createOrder    = (data)   => API.post('/orders', data);
export const createDjangoOrder = async (data, expectedUserId) => {
  const { data: session } = await getDjangoSession();
  return axios.post('/django-api/orders', data, {
    timeout: 20000,
    headers: djangoOrderSessionHeaders(session, expectedUserId),
  });
};
export const getMyOrders    = ()       => API.get('/orders/myorders');
export const getMyDjangoOrders = (userId) => axios.get('/django-api/my-orders', {
  timeout: 20000, headers: { 'X-Expected-Django-User': String(userId) },
});
export const getOrderById   = (id)     => API.get(`/orders/${id}`);
export const getAllOrders    = (params) => API.get('/orders', { params });
export const updateOrderStatus = (id, status) => API.put(`/orders/${id}/status`, { status });
export const getAnalytics   = ()       => API.get('/orders/analytics');

// Eventos
export const getEvents      = ()       => API.get('/events');
export const createEvent    = (data)   => API.post('/events', data);
export const bookEvent      = (id, seats) => API.post(`/events/${id}/book`, { seats });
export const djangoEventsEnabled = import.meta.env.VITE_DJANGO_EVENTS === 'true';
export const getPublicEvents = async () => {
  if (!djangoEventsEnabled) return getEvents();
  const response = await axios.get('/django-api/events', { timeout: 20000 });
  if (!Array.isArray(response.data)) throw new Error('La respuesta de eventos no es válida.');
  return response;
};
export const bookDjangoEvent = async (id, seats, userId) => {
  const { data: session } = await getDjangoSession();
  if (!session.user || session.user.id !== userId) throw new Error('La sesión de Django cambió. Recarga la página antes de reservar.');
  return axios.post(`/django-api/events/${id}/book`, { seats }, {
    timeout: 20000, headers: { 'X-CSRFToken': session.csrfToken, 'X-Expected-Django-User': String(userId) },
  });
};
export const getMyDjangoEventBookings = (userId) => axios.get('/django-api/my-event-bookings', {
  timeout: 20000, headers: { 'X-Expected-Django-User': String(userId) },
});

// Promociones
export const getPromotions  = ()       => API.get('/promotions');
export const djangoPromotionsEnabled = import.meta.env.VITE_DJANGO_PROMOTIONS === 'true';
export const getPublicPromotions = async () => {
  if (!djangoPromotionsEnabled) return getPromotions();
  const response = await axios.get('/django-api/promotions', { timeout: 20000 });
  if (!Array.isArray(response.data)) throw new Error('La respuesta de promociones no es válida.');
  return { ...response, data: response.data.map(withCorrectPromotionImage) };
};
export const createPromotion= (data)   => API.post('/promotions', data);
export const getReservations = () => API.get('/reservations');
export const djangoReservationsEnabled = import.meta.env.VITE_DJANGO_RESERVATIONS === 'true';
export const createReservation = async (data) => {
  if (!djangoReservationsEnabled) return API.post('/reservations', data);
  const { data: session } = await axios.get('/django-api/session', { timeout: 20000 });
  const form = new URLSearchParams({
    name: data.name,
    email: data.email,
    phone: data.phone,
    date: data.date,
    time: data.time,
    party_size: String(data.partySize),
    notes: data.notes,
  });
  return axios.post('/django-api/guest-reservations', form, {
    timeout: 20000,
    headers: { 'X-CSRFToken': session.csrfToken },
  });
};
export const updateReservationStatus = (id, status) => API.patch(`/reservations/${id}/status`, { status });

// Actualizar productos con imagen (FormData)
export const updateProductWithImage = (id, formData) =>
  API.put(`/products/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const createProductWithImage = (formData) =>
  API.post('/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

// Promociones — actualizar y eliminar
export const updatePromotion = (id, data) => API.put(`/promotions/${id}`, data);
export const updatePromotionWithImage = (id, formData) =>
  API.put(`/promotions/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deletePromotion = (id) => API.delete(`/promotions/${id}`);

// Eventos — actualizar y eliminar
export const updateEvent = (id, data) => API.put(`/events/${id}`, data);
export const updateEventWithImage = (id, formData) =>
  API.put(`/events/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteEvent = (id) => API.delete(`/events/${id}`);

// Configuración visual del sitio (SiteSettings)
export const getSiteSettings = () => API.get('/site-settings');
export const djangoSettingsEnabled = import.meta.env.VITE_DJANGO_SETTINGS === 'true';
export const getPublicSiteSettings = async () => {
  if (!djangoSettingsEnabled) return getSiteSettings();
  const response = await axios.get('/django-api/site-settings', { timeout: 20000 });
  if (!response.data || Array.isArray(response.data) || typeof response.data !== 'object'
      || Object.values(response.data).some(value => typeof value !== 'string')) {
    throw new Error('La respuesta de ajustes no es válida.');
  }
  return response;
};
export const upsertSiteSettings = (data) => API.post('/site-settings', data);
export const upsertSiteSetting = (key, formData) =>
  API.put(`/site-settings/${key}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const upsertSiteSettingJson = (key, value) =>
  API.put(`/site-settings/${key}`, { value });

// IA Barista Virtual
export const djangoChatEnabled = import.meta.env.VITE_DJANGO_CHAT === 'true';
export const askBarista = async (prompt, history = []) => {
  if (!djangoChatEnabled) return API.post('/ai/recommend', { prompt, history });
  const response = await axios.get('/django-api/products', { timeout: 20000 });
  const products = adaptDjangoProducts(response.data);
  const recommendation = djangoMenuRecommendation(prompt, products, history);
  return { data: { recommendation, actions: getMentionedMenuItems(recommendation, products) } };
};
export const generateDesc   = (data)   => API.post('/ai/describe', data);
