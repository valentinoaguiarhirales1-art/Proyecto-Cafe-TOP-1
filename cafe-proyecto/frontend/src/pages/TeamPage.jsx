import { useEffect, useState } from 'react';
import {
  activateEmployeeAccount,
  acceptDjangoStaffInvitation,
  createStaffApplication,
  djangoAuthEnabled,
  djangoStaffApplicationsEnabled,
  djangoTeamEnabled,
  employerLogin,
  getPublicTeam,
  getStaffApplications,
  getStaffEmployees,
  loginUser,
  updateStaffApplication,
  updateStaffEmployee
} from '../api';
import { useAuth } from '../context/AuthContext';
import { staffInvitationMode } from '../utils/staffInvitationMode';
import {
  BadgeCheck,
  Briefcase,
  Check,
  Clock3,
  Coffee,
  Copy,
  GraduationCap,
  KeyRound,
  LogIn,
  LogOut,
  ShieldCheck,
  UserCheck,
  UserX,
  Users
} from 'lucide-react';

const roleNames = {
  barista: 'Barista',
  atencion: 'Atención al cliente',
  encargado: 'Encargado de barra',
  subgerente: 'Subgerente',
  gerente: 'Gerente',
  supervisor: 'Supervisor'
};

const requirements = [
  'Gusto genuino por el café, el servicio y el trabajo en equipo.',
  'Actitud amable, comunicación clara y disposición para aprender.',
  'Compromiso con la higiene, la puntualidad y la calidad del servicio.',
  'Para barista o encargado: disponibilidad para capacitarse en recetas y operación de barra.',
  'La experiencia es bienvenida, pero también revisamos perfiles recién egresados y personas con ganas de crecer.'
];

const emptyApplication = {
  name: '',
  email: '',
  phone: '',
  requestedPosition: 'barista',
  experienceYears: '0',
  isRecentGraduate: false,
  publicProfileConsent: false,
  profileBio: ''
};

const isStaffRole = (role) => ['barista', 'atencion', 'encargado', 'subgerente', 'gerente', 'supervisor', 'codueno', 'admin'].includes(role);

export default function TeamPage() {
  const { user, login } = useAuth();
  const invitationMode = staffInvitationMode(djangoStaffApplicationsEnabled, djangoAuthEnabled);
  const [employees, setEmployees] = useState([]);
  const [teamError, setTeamError] = useState('');
  const [application, setApplication] = useState(emptyApplication);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [applicationError, setApplicationError] = useState('');
  const [applicationLoading, setApplicationLoading] = useState(false);
  const [activation, setActivation] = useState({ invitation: '', email: '', password: '' });
  const [activationMessage, setActivationMessage] = useState('');
  const [activationError, setActivationError] = useState('');
  const [activationLoading, setActivationLoading] = useState(false);
  const [employeeCredentials, setEmployeeCredentials] = useState({ email: '', password: '' });
  const [employeeLoginError, setEmployeeLoginError] = useState('');
  const [employerKey, setEmployerKey] = useState('');
  const [employerError, setEmployerError] = useState('');
  const [employerLoading, setEmployerLoading] = useState(false);
  const [employerSession, setEmployerSession] = useState(() => sessionStorage.getItem('employerSession') || '');
  const [applications, setApplications] = useState([]);
  const [staff, setStaff] = useState([]);
  const [employerDataError, setEmployerDataError] = useState('');
  const [lastInvitation, setLastInvitation] = useState(null);
  const [savingProfile, setSavingProfile] = useState({});
  const [copied, setCopied] = useState(false);

  const loadPublicTeam = async () => {
    try {
      const response = await getPublicTeam();
      setEmployees(response.data);
      setTeamError('');
    } catch (error) {
      setTeamError(error.response?.data?.error || 'No se pudo cargar la lista del equipo');
    }
  };

  const loadEmployerData = async () => {
    try {
      const [applicationResponse, staffResponse] = await Promise.all([
        getStaffApplications(),
        getStaffEmployees()
      ]);
      setApplications(applicationResponse.data);
      setStaff(staffResponse.data.map((employee) => ({ ...employee, consentConfirmed: employee.publicProfileConsent })));
      setEmployerDataError('');
    } catch (error) {
      if (error.response?.status === 401) {
        sessionStorage.removeItem('employerSession');
        setEmployerSession('');
      }
      setEmployerDataError(error.response?.data?.error || 'No se pudo cargar el panel patronal');
    }
  };

  useEffect(() => {
    loadPublicTeam();
  }, []);

  useEffect(() => {
    if (employerSession) loadEmployerData();
  }, [employerSession]);

  const submitApplication = async (event) => {
    event.preventDefault();
    setApplicationError('');
    setApplicationMessage('');
    setApplicationLoading(true);
    try {
      const response = await createStaffApplication({
        ...application,
        experienceYears: Number(application.experienceYears)
      });
      setApplicationMessage(response.data.message);
      setApplication(emptyApplication);
    } catch (error) {
      const fields = error.response?.data?.fields;
      const detail = fields && Object.values(fields).flat().join(' ');
      setApplicationError([error.response?.data?.error || 'No se pudo enviar la solicitud.', detail].filter(Boolean).join(' '));
    } finally {
      setApplicationLoading(false);
    }
  };

  const activateAccount = async (event) => {
    event.preventDefault();
    setActivationError('');
    setActivationMessage('');
    setActivationLoading(true);
    try {
      if (invitationMode === 'unavailable') {
        setActivationError('La aceptación de invitaciones no está disponible con esta configuración. Contacta al personal.');
        return;
      }
      if (invitationMode === 'django' && !user) {
        setActivationError('Inicia sesión con la cuenta Django del correo aprobado antes de continuar.');
        return;
      }
      const response = invitationMode === 'django'
        ? await acceptDjangoStaffInvitation(activation.invitation, user.id)
        : await activateEmployeeAccount(activation);
      setActivationMessage(response.data.message);
      setActivation({ invitation: '', email: activation.email, password: '' });
    } catch (error) {
      setActivationError(error.response?.data?.error || 'No se pudo activar la cuenta');
    } finally {
      setActivationLoading(false);
    }
  };

  const signInEmployee = async (event) => {
    event.preventDefault();
    setEmployeeLoginError('');
    if (djangoAuthEnabled) {
      setEmployeeLoginError('El acceso de empleados de Express no está disponible en el modo de prueba Django.');
      return;
    }
    try {
      const response = await loginUser(employeeCredentials);
      if (!isStaffRole(response.data.role)) {
        setEmployeeLoginError('Esta cuenta aún no tiene un puesto de empleado aprobado.');
        return;
      }
      login(response.data);
      setEmployeeCredentials({ email: '', password: '' });
    } catch (error) {
      setEmployeeLoginError(error.response?.data?.error || 'No se pudo iniciar sesión');
    }
  };

  const signInEmployer = async (event) => {
    event.preventDefault();
    setEmployerError('');
    setEmployerLoading(true);
    try {
      const response = await employerLogin(employerKey);
      sessionStorage.setItem('employerSession', response.data.token);
      setEmployerSession(response.data.token);
      setEmployerKey('');
    } catch (error) {
      setEmployerError(error.response?.data?.error || 'No se pudo validar la clave patronal');
    } finally {
      setEmployerLoading(false);
    }
  };

  const resolveApplication = async (applicationId, status) => {
    try {
      const response = await updateStaffApplication(applicationId, status);
      if (response.data.invitation) {
        setLastInvitation({ code: response.data.invitation, expiresAt: response.data.expiresAt });
      } else {
        setLastInvitation(null);
      }
      await loadEmployerData();
    } catch (error) {
      setEmployerDataError(error.response?.data?.error || 'No se pudo resolver la solicitud');
    }
  };

  const saveEmployeeProfile = async (employee) => {
    setSavingProfile((current) => ({ ...current, [employee.id]: true }));
    try {
      await updateStaffEmployee(employee.id, {
        experienceYears: Number(employee.experienceYears),
        isRecentGraduate: employee.isRecentGraduate,
        profileBio: employee.profileBio,
        publicProfile: employee.publicProfile,
        consentConfirmed: employee.consentConfirmed
      });
      await Promise.all([loadEmployerData(), loadPublicTeam()]);
    } catch (error) {
      setEmployerDataError(error.response?.data?.error || 'No se pudo guardar el perfil');
    } finally {
      setSavingProfile((current) => ({ ...current, [employee.id]: false }));
    }
  };

  const copyInvitation = async () => {
    if (!lastInvitation) return;
    try {
      await navigator.clipboard.writeText(lastInvitation.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      setEmployerDataError('No se pudo copiar automáticamente. Selecciona y copia el código de forma manual.');
    }
  };

  const signOutEmployer = () => {
    sessionStorage.removeItem('employerSession');
    setEmployerSession('');
    setApplications([]);
    setStaff([]);
    setLastInvitation(null);
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-12">
          <p className="section-subtitle">Personas que hacen cada taza especial</p>
          <h1 className="section-title">Nuestro <span className="text-cafe-caramel">Equipo Exquisito</span></h1>
          <p className="text-cafe-brown max-w-2xl mx-auto">
            Conoce a quienes ya forman parte del equipo y descubre cómo postularte para trabajar con nosotros.
          </p>
        </header>

        <section className="mb-16" aria-labelledby="team-members-heading">
          {(djangoTeamEnabled || djangoStaffApplicationsEnabled) && (
            <p className="glass-dark p-4 mb-5 text-amber-300 text-sm" role="status">
              {djangoTeamEnabled ? 'Los perfiles públicos se administran en Django. ' : 'Los perfiles públicos se administran en Express. '}
              {djangoStaffApplicationsEnabled
                ? 'Las solicitudes nuevas se revisan en el panel de personal de Django. El panel patronal de esta página es de Express y no recibe esas solicitudes.'
                : 'Las solicitudes, activaciones y el panel patronal de esta página funcionan con Express.'}
            </p>
          )}
          <div className="flex items-center justify-center gap-2 mb-6">
            <Users className="text-cafe-caramel" size={21} />
            <h2 id="team-members-heading" className="font-serif text-2xl text-cafe-cream">Empleados actuales</h2>
          </div>
          {teamError && (
            <div className="text-center mb-4" role="alert">
              <p className="text-red-400">{teamError}. Revisa la conexión y vuelve a intentarlo.</p>
              <button type="button" className="btn-outline text-sm mt-3" onClick={loadPublicTeam}>Reintentar</button>
            </div>
          )}
          {!teamError && employees.length === 0 ? (
            <div className="card-cafe p-8 text-center max-w-2xl mx-auto">
              <Users className="text-cafe-caramel mx-auto mb-3" size={30} />
              <p className="text-cafe-cream font-medium">Los perfiles verificados se publicarán aquí.</p>
              <p className="text-cafe-brown text-sm mt-2">La persona responsable puede publicar cada perfil después de confirmar la autorización de la persona.</p>
            </div>
          ) : !teamError && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {employees.map((employee) => (
                <article key={employee.id} className="card-cafe p-6">
                  <div className="w-12 h-12 rounded-full bg-cafe-caramel/15 text-cafe-caramel flex items-center justify-center mb-4">
                    <Coffee size={23} />
                  </div>
                  <p className="text-xs uppercase tracking-widest text-cafe-gold mb-2">{roleNames[employee.role] || employee.role}</p>
                  <h3 className="font-serif text-xl text-cafe-cream">{employee.name}</h3>
                  <p className="text-cafe-brown text-sm mt-2">
                    {employee.isRecentGraduate ? 'Recién egresado' : `${employee.experienceYears} ${employee.experienceYears === 1 ? 'año' : 'años'} de experiencia`}
                    {employee.isRecentGraduate && employee.experienceYears > 0 && ` · ${employee.experienceYears} ${employee.experienceYears === 1 ? 'año' : 'años'} de experiencia`}
                  </p>
                  {employee.bio && <p className="text-cafe-brown/80 text-sm mt-3">{employee.bio}</p>}
                  {employee.branch && <p className="text-cafe-brown/60 text-xs mt-3">{employee.branch}</p>}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mb-16" aria-labelledby="hiring-heading">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="card-cafe p-7">
              <div className="flex items-center gap-3 mb-5">
                <Briefcase className="text-cafe-caramel" size={25} />
                <div>
                  <p className="section-subtitle text-left mb-1">Crece con nosotros</p>
                  <h2 id="hiring-heading" className="font-serif text-2xl text-cafe-cream">Únete al equipo</h2>
                </div>
              </div>
              <p className="text-cafe-brown text-sm mb-5">Buscamos personas con entusiasmo por aprender y ofrecer una experiencia cálida, cuidada y de calidad.</p>
              <ul className="space-y-3">
                {requirements.map((requirement) => (
                  <li key={requirement} className="flex items-start gap-2 text-sm text-cafe-brown">
                    <BadgeCheck size={17} className="text-cafe-caramel shrink-0 mt-0.5" />
                    <span>{requirement}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 rounded-xl border border-cafe-caramel/20 bg-cafe-dark/40 p-4">
                <p className="text-cafe-cream text-sm font-semibold">Puestos para postularte</p>
                <p className="text-cafe-brown text-sm mt-1">Barista · Atención al cliente · Encargado de barra</p>
              </div>
            </div>

            <div className="card-cafe p-7">
              <h2 className="font-serif text-2xl text-cafe-cream mb-2">Solicita una oportunidad</h2>
              <p className="text-cafe-brown text-sm mb-5">{djangoStaffApplicationsEnabled
                ? 'Envía tu información para revisión. Una solicitud no crea una cuenta ni concede permisos.'
                : 'Envía tu información para revisión. No se crea acceso de empleado hasta que el patrón apruebe la solicitud.'}</p>
              <form onSubmit={submitApplication} className="space-y-3">
                <input className="input-cafe" placeholder="Nombre completo" value={application.name} onChange={(event) => setApplication({ ...application, name: event.target.value })} minLength={2} maxLength={100} required />
                <input className="input-cafe" type="email" placeholder={djangoStaffApplicationsEnabled ? 'Correo electrónico' : 'Correo electrónico (será tu usuario)'} value={application.email} onChange={(event) => setApplication({ ...application, email: event.target.value })} required />
                <input className="input-cafe" type="tel" placeholder="Teléfono (opcional)" value={application.phone} onChange={(event) => setApplication({ ...application, phone: event.target.value })} maxLength={30} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select className="input-cafe" value={application.requestedPosition} onChange={(event) => setApplication({ ...application, requestedPosition: event.target.value })}>
                    <option value="barista">Barista</option>
                    <option value="atencion">Atención al cliente</option>
                    <option value="encargado">Encargado de barra</option>
                  </select>
                  <label className="text-sm text-cafe-brown">
                    Años de experiencia
                    <input className="input-cafe mt-1" type="number" min="0" max="60" step="1" value={application.experienceYears} onChange={(event) => setApplication({ ...application, experienceYears: event.target.value })} required />
                  </label>
                </div>
                <label className="flex items-center gap-2 text-sm text-cafe-brown">
                  <input type="checkbox" checked={application.isRecentGraduate} onChange={(event) => setApplication({ ...application, isRecentGraduate: event.target.checked })} />
                  Soy recién egresado/a
                </label>
                <textarea className="input-cafe" rows={3} maxLength={240} placeholder="Cuéntanos brevemente sobre ti (opcional)" value={application.profileBio} onChange={(event) => setApplication({ ...application, profileBio: event.target.value })} />
                <label className="flex items-start gap-2 text-xs text-cafe-brown">
                  <input className="mt-0.5" type="checkbox" checked={application.publicProfileConsent} onChange={(event) => setApplication({ ...application, publicProfileConsent: event.target.checked })} />
                  <span>Autorizo que, si mi solicitud se aprueba, se muestre en esta página mi nombre, puesto, experiencia y descripción.</span>
                </label>
                {applicationError && <p role="alert" className="text-red-400 text-sm">{applicationError}</p>}
                {applicationMessage && <p role="status" className="text-green-400 text-sm">{applicationMessage}</p>}
                <button type="submit" disabled={applicationLoading} className="btn-primary w-full disabled:opacity-60">
                  {applicationLoading ? 'Enviando solicitud…' : 'Enviar solicitud de empleo'}
                </button>
              </form>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12" aria-label="Acceso del equipo">
          <div className="glass-dark p-6">
            <div className="flex items-center gap-2 mb-2">
              <LogIn className="text-cafe-caramel" size={20} />
              <h2 className="font-serif text-xl text-cafe-cream">¿Perteneces al Equipo Exquisito?</h2>
            </div>
            {user && isStaffRole(user.role) ? (
              <div className="mt-4">
                <p className="text-cafe-brown text-sm">Sesión iniciada como <strong className="text-cafe-cream">{user.name}</strong> · {roleNames[user.role] || user.role}</p>
                <p className="text-green-400 text-xs mt-2">Tu cuenta de empleado está verificada.</p>
              </div>
            ) : djangoAuthEnabled ? (
              <p className="text-cafe-brown text-sm mt-4">Para usar una cuenta Django, inicia sesión desde el acceso normal de la página. Los permisos de personal se conceden por separado.</p>
            ) : (
              <form onSubmit={signInEmployee} className="space-y-3 mt-4">
                <input className="input-cafe" type="email" autoComplete="username" placeholder="Correo electrónico / usuario" value={employeeCredentials.email} onChange={(event) => setEmployeeCredentials({ ...employeeCredentials, email: event.target.value })} required />
                <input className="input-cafe" type="password" autoComplete="current-password" placeholder="Contraseña" value={employeeCredentials.password} onChange={(event) => setEmployeeCredentials({ ...employeeCredentials, password: event.target.value })} required />
                {employeeLoginError && <p role="alert" className="text-red-400 text-sm">{employeeLoginError}</p>}
                <button type="submit" className="btn-outline w-full">Iniciar sesión de empleado</button>
                <p className="text-cafe-brown/70 text-xs">El acceso de empleado solo funciona después de que el patrón revise y apruebe tu solicitud.</p>
              </form>
            )}
            <div className="mt-6 pt-5 border-t border-cafe-brown/20">
              <h3 className="text-cafe-cream text-sm font-semibold flex items-center gap-2"><KeyRound size={15} className="text-cafe-caramel" /> {djangoStaffApplicationsEnabled ? 'Aceptar invitación' : 'Activar cuenta aprobada'}</h3>
              <p className="text-cafe-brown/70 text-xs mt-1 mb-3">{invitationMode === 'django'
                ? 'Inicia sesión con tu cuenta Django del correo aprobado e ingresa el código privado. El perfil quedará privado.'
                : invitationMode === 'unavailable'
                  ? 'Las solicitudes y las cuentas usan servicios distintos. La aceptación no está disponible; contacta al personal.'
                : 'Usa el código privado que te compartió el patrón. Si tu correo ya tiene una cuenta, ingresa su contraseña actual.'}</p>
              {invitationMode !== 'unavailable' &&
              <form onSubmit={activateAccount} className="space-y-3">
                <input className="input-cafe" placeholder="Código de aprobación" autoComplete="one-time-code" value={activation.invitation} onChange={(event) => setActivation({ ...activation, invitation: event.target.value })} required />
                {invitationMode === 'express' && <>
                <input className="input-cafe" type="email" placeholder="Correo electrónico aprobado" value={activation.email} onChange={(event) => setActivation({ ...activation, email: event.target.value })} required />
                <input className="input-cafe" type="password" minLength={6} autoComplete="new-password" placeholder="Contraseña (mínimo 6 caracteres)" value={activation.password} onChange={(event) => setActivation({ ...activation, password: event.target.value })} required />
                </>}
                {activationError && <p role="alert" className="text-red-400 text-sm">{activationError}</p>}
                {activationMessage && <p role="status" className="text-green-400 text-sm">{activationMessage}</p>}
                <button type="submit" disabled={activationLoading} className="btn-primary w-full disabled:opacity-60">
                  {activationLoading ? 'Procesando…' : djangoStaffApplicationsEnabled ? 'Aceptar invitación' : 'Crear acceso de empleado'}
                </button>
              </form>}
            </div>
          </div>

          <div className="glass-dark p-6">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="text-cafe-gold" size={20} />
              <h2 className="font-serif text-xl text-cafe-cream">Acceso patronal</h2>
            </div>
            <p className="text-cafe-brown text-sm">La clave patronal es independiente de las cuentas del personal y solo se valida en el servidor.</p>
            {djangoStaffApplicationsEnabled && <p className="text-cafe-brown text-xs mt-2">Este panel corresponde a Express. Las solicitudes de Django se gestionan en el panel de personal de Django.</p>}
            {!employerSession ? (
              <form onSubmit={signInEmployer} className="space-y-3 mt-4">
                <input className="input-cafe" type="password" autoComplete="current-password" placeholder="Clave patronal" value={employerKey} onChange={(event) => setEmployerKey(event.target.value)} required />
                {employerError && <p role="alert" className="text-red-400 text-sm">{employerError}</p>}
                <button type="submit" disabled={employerLoading} className="btn-primary w-full disabled:opacity-60">
                  {employerLoading ? 'Verificando…' : 'Entrar al panel patronal'}
                </button>
              </form>
            ) : (
              <div className="mt-4">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <p className="text-green-400 text-sm flex items-center gap-2"><ShieldCheck size={16} /> Sesión patronal activa</p>
                  <button type="button" onClick={signOutEmployer} className="text-cafe-brown hover:text-red-400 text-xs flex items-center gap-1"><LogOut size={14} /> Cerrar sesión</button>
                </div>
                {employerDataError && <p role="alert" className="text-red-400 text-sm mb-4">{employerDataError}</p>}
                {lastInvitation && (
                  <div className="rounded-xl border border-green-400/30 bg-green-900/10 p-4 mb-5">
                    <p className="text-green-300 text-sm font-semibold">Código de acceso de un solo uso</p>
                    <p className="text-cafe-brown text-xs mt-1">Compártelo directamente con la persona aprobada. Vence el {new Date(lastInvitation.expiresAt).toLocaleString('es-MX')}.</p>
                    <div className="flex gap-2 mt-3">
                      <input className="input-cafe font-mono text-xs" readOnly value={lastInvitation.code} aria-label="Código de activación emitido" />
                      <button type="button" onClick={copyInvitation} className="btn-outline px-3" aria-label="Copiar código">{copied ? <Check size={17} /> : <Copy size={17} />}</button>
                    </div>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-cafe-cream font-semibold mb-3 flex items-center gap-2"><Clock3 size={16} className="text-cafe-caramel" /> Solicitudes de empleo ({applications.length})</h3>
                  {applications.length === 0 ? <p className="text-cafe-brown text-sm">No hay solicitudes registradas.</p> : (
                    <div className="space-y-3">
                      {applications.map((candidate) => (
                        <article key={candidate._id} className="rounded-xl border border-cafe-brown/20 p-3">
                          <div className="flex flex-wrap justify-between gap-2">
                            <div>
                              <p className="text-cafe-cream font-medium">{candidate.name}</p>
                              <p className="text-cafe-brown text-xs">{candidate.email}{candidate.phone && ` · ${candidate.phone}`}</p>
                            </div>
                            <span className="text-cafe-gold text-xs">{roleNames[candidate.requestedPosition] || candidate.requestedPosition}</span>
                          </div>
                          <p className="text-cafe-brown text-xs mt-2">
                            {candidate.isRecentGraduate ? 'Recién egresado' : `${candidate.experienceYears} ${candidate.experienceYears === 1 ? 'año' : 'años'} de experiencia`}
                            {candidate.isRecentGraduate && candidate.experienceYears > 0 && ` · ${candidate.experienceYears} ${candidate.experienceYears === 1 ? 'año' : 'años'} de experiencia`}
                            {candidate.publicProfileConsent && ' · autorizó perfil público'}
                          </p>
                          {candidate.profileBio && <p className="text-cafe-brown/80 text-xs mt-2">{candidate.profileBio}</p>}
                          {candidate.status === 'approved' && <p className="text-green-400 text-xs mt-2">Aprobada · código vence {candidate.invitationExpiresAt ? new Date(candidate.invitationExpiresAt).toLocaleDateString('es-MX') : 'pronto'}</p>}
                          {candidate.status === 'rejected' && <p className="text-red-300 text-xs mt-2">Rechazada · puedes reconsiderar esta solicitud.</p>}
                          <div className="flex flex-wrap gap-2 mt-3">
                            <button type="button" onClick={() => resolveApplication(candidate._id, 'approved')} className="px-3 py-1.5 text-xs rounded-lg bg-green-800/40 text-green-300 border border-green-500/30 flex items-center gap-1">
                              <UserCheck size={14} /> {candidate.status === 'approved' ? 'Emitir nuevo código' : candidate.status === 'rejected' ? 'Reconsiderar y aprobar' : 'Aprobar y emitir código'}
                            </button>
                            {candidate.status === 'pending' && <button type="button" onClick={() => resolveApplication(candidate._id, 'rejected')} className="px-3 py-1.5 text-xs rounded-lg border border-red-500/30 text-red-300 flex items-center gap-1"><UserX size={14} /> Rechazar</button>}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-cafe-cream font-semibold mb-3 flex items-center gap-2"><Users size={16} className="text-cafe-caramel" /> Perfiles del equipo ({staff.length})</h3>
                  {staff.length === 0 ? <p className="text-cafe-brown text-sm">Los perfiles de empleados aparecerán aquí después de su activación.</p> : (
                    <div className="space-y-3">
                      {staff.map((employee) => (
                        <article key={employee.id} className="rounded-xl border border-cafe-brown/20 p-3">
                          <div className="flex justify-between gap-2">
                            <div>
                              <p className="text-cafe-cream text-sm font-medium">{employee.name}</p>
                              <p className="text-cafe-brown text-xs">{employee.email} · {roleNames[employee.role] || employee.role}</p>
                            </div>
                            <span className={employee.publicProfile ? 'text-green-400 text-xs' : 'text-cafe-brown text-xs'}>{employee.publicProfile ? 'Publicado' : 'Privado'}</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                            <label className="text-cafe-brown text-xs">Años de experiencia
                              <input className="input-cafe mt-1" type="number" min="0" max="60" value={employee.experienceYears} onChange={(event) => setStaff((current) => current.map((item) => item.id === employee.id ? { ...item, experienceYears: event.target.value } : item))} />
                            </label>
                            <label className="text-cafe-brown text-xs">Descripción pública
                              <input className="input-cafe mt-1" maxLength={240} value={employee.profileBio} onChange={(event) => setStaff((current) => current.map((item) => item.id === employee.id ? { ...item, profileBio: event.target.value } : item))} />
                            </label>
                          </div>
                          <label className="flex items-center gap-2 text-cafe-brown text-xs mt-3">
                            <input type="checkbox" checked={employee.isRecentGraduate} onChange={(event) => setStaff((current) => current.map((item) => item.id === employee.id ? { ...item, isRecentGraduate: event.target.checked } : item))} />
                            Recién egresado/a
                          </label>
                          <label className="flex items-start gap-2 text-cafe-brown text-xs mt-3">
                            <input type="checkbox" checked={employee.consentConfirmed} onChange={(event) => setStaff((current) => current.map((item) => item.id === employee.id ? { ...item, consentConfirmed: event.target.checked } : item))} />
                            <span>Confirmo que esta persona autorizó publicar su perfil</span>
                          </label>
                          <label className="flex items-center gap-2 text-cafe-brown text-xs mt-2">
                            <input type="checkbox" checked={employee.publicProfile} onChange={(event) => setStaff((current) => current.map((item) => item.id === employee.id ? { ...item, publicProfile: event.target.checked } : item))} />
                            Mostrar en la sección pública del equipo
                          </label>
                          <button type="button" onClick={() => saveEmployeeProfile(employee)} disabled={savingProfile[employee.id]} className="btn-outline text-xs py-1.5 mt-3 disabled:opacity-50">
                            {savingProfile[employee.id] ? 'Guardando…' : 'Guardar perfil'}
                          </button>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <p className="text-cafe-brown/60 text-xs mt-5 flex items-start gap-2"><GraduationCap size={15} className="shrink-0" /> Solo se concede acceso a quien tenga aprobación patronal. Los códigos de activación vencen en 7 días y solo se muestran al emitirlos.</p>
          </div>
        </section>

        <p className="text-center text-xs text-cafe-brown/60 flex justify-center items-center gap-2"><ShieldCheck size={14} /> El acceso patronal se configura de forma privada en el servidor; nunca uses ni compartas esa clave como código de empleado.</p>
      </div>
    </div>
  );
}
