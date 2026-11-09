const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const StaffApplication = require('../models/StaffApplication');
const User = require('../models/User');

const publicStaffRoles = ['barista', 'atencion', 'encargado', 'subgerente', 'gerente', 'supervisor'];
const hashInvitation = (invitation) => crypto.createHash('sha256').update(invitation).digest('hex');

exports.employerLogin = async (req, res) => {
    const expectedKey = process.env.EMPLOYER_ACCESS_KEY;
    const providedKey = req.body.key;

    if (!expectedKey) {
        return res.status(503).json({ error: 'El acceso patronal no está configurado. Añade EMPLOYER_ACCESS_KEY al entorno privado del servidor.' });
    }
    if (Buffer.byteLength(expectedKey, 'utf8') < 32) {
        return res.status(503).json({ error: 'La clave patronal debe tener al menos 32 caracteres; configura una clave larga y aleatoria en el entorno privado.' });
    }
    if (typeof providedKey !== 'string' || !providedKey) {
        return res.status(400).json({ error: 'Ingresa la clave patronal' });
    }

    const expectedBuffer = Buffer.from(expectedKey);
    const providedBuffer = Buffer.from(providedKey);
    if (expectedBuffer.length !== providedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
        return res.status(401).json({ error: 'Clave patronal incorrecta' });
    }
    if (!process.env.JWT_SECRET) {
        return res.status(503).json({ error: 'La autenticación del servidor no está configurada' });
    }

    const token = jwt.sign(
        { scope: 'employer' },
        process.env.JWT_SECRET,
        { expiresIn: '30m', audience: 'cafe-employer', issuer: 'cafe-exquisito' }
    );
    return res.json({ token, expiresIn: 1800 });
};

exports.createApplication = async (req, res) => {
    try {
        const email = req.body.email.trim().toLowerCase();
        const existingApplication = await StaffApplication.findOne({
            email,
            status: { $in: ['pending', 'approved', 'accepted'] }
        });
        if (existingApplication) {
            return res.status(409).json({ error: 'Ya existe una solicitud activa o una cuenta de empleado con ese correo electrónico' });
        }
        const existingUser = await User.findOne({ email });
        if (existingUser && existingUser.role !== 'client') {
            return res.status(409).json({ error: 'Ese correo ya está vinculado a una cuenta del equipo' });
        }

        const application = await StaffApplication.create({
            name: req.body.name.trim(),
            email,
            phone: req.body.phone || '',
            requestedPosition: req.body.requestedPosition,
            experienceYears: req.body.experienceYears,
            isRecentGraduate: req.body.isRecentGraduate,
            publicProfileConsent: req.body.publicProfileConsent,
            profileBio: req.body.profileBio || ''
        });
        return res.status(201).json({
            message: 'Solicitud recibida. El acceso de empleado se habilitará solo después de la verificación patronal.',
            applicationId: application._id
        });
    } catch (error) {
        return res.status(400).json({ error: `No se pudo registrar la solicitud: ${error.message}` });
    }
};

exports.getPublicTeam = async (_req, res) => {
    try {
        const employees = await User.find({
            role: { $in: publicStaffRoles },
            'employeeData.publicProfile': true,
            'employeeData.publicProfileConsent': true
        }).select('name role employeeData.experienceYears employeeData.isRecentGraduate employeeData.profileBio');
        return res.json(employees.map((employee) => ({
            id: employee._id,
            name: employee.name,
            role: employee.role,
            experienceYears: employee.employeeData.experienceYears,
            isRecentGraduate: employee.employeeData.isRecentGraduate,
            bio: employee.employeeData.profileBio
        })));
    } catch (error) {
        return res.status(500).json({ error: `No se pudo cargar el equipo: ${error.message}` });
    }
};

exports.getApplications = async (_req, res) => {
    try {
        const applications = await StaffApplication.find({ status: { $in: ['pending', 'approved', 'rejected'] } })
            .select('-invitationHash')
            .sort({ createdAt: -1 });
        return res.json(applications);
    } catch (error) {
        return res.status(500).json({ error: `No se pudieron cargar las solicitudes: ${error.message}` });
    }
};

exports.setApplicationStatus = async (req, res) => {
    try {
        const application = await StaffApplication.findById(req.params.id);
        if (!application) {
            return res.status(404).json({ error: 'Solicitud de empleo no encontrada' });
        }
        if (application.status === 'accepted') {
            return res.status(409).json({ error: 'La solicitud ya fue resuelta o la cuenta ya fue activada' });
        }
        if (req.body.status === 'rejected') {
            application.status = 'rejected';
            application.invitationHash = '';
            application.invitationExpiresAt = null;
            await application.save();
            return res.json({ message: 'Solicitud rechazada' });
        }

        const invitation = crypto.randomBytes(32).toString('hex');
        application.status = 'approved';
        application.invitationHash = hashInvitation(invitation);
        application.invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await application.save();

        return res.json({
            message: 'Solicitud aprobada. Entrega este código al candidato; solo se mostrará ahora.',
            invitation,
            expiresAt: application.invitationExpiresAt
        });
    } catch (error) {
        return res.status(400).json({ error: `No se pudo actualizar la solicitud: ${error.message}` });
    }
};

exports.activateEmployeeAccount = async (req, res) => {
    const { invitation, email, password } = req.body;
    if (typeof invitation !== 'string' || !invitation || typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Ingresa el código de aprobación, correo y contraseña' });
    }

    try {
        const normalizedEmail = email.trim().toLowerCase();
        const application = await StaffApplication.findOne({
            email: normalizedEmail,
            status: 'approved',
            invitationHash: hashInvitation(invitation)
        });
        if (!application || !application.invitationExpiresAt || application.invitationExpiresAt <= new Date()) {
            return res.status(400).json({ error: 'El código no es válido, ya se utilizó o venció; solicita una nueva autorización al patrón' });
        }

        const assignedRole = {
            barista: 'barista',
            atencion: 'atencion',
            encargado: 'encargado'
        }[application.requestedPosition];
        let user = await User.findOne({ email: normalizedEmail });

        if (user) {
            if (user.role !== 'client' || !(await user.matchPassword(password))) {
                return res.status(409).json({ error: 'Ese correo ya tiene una cuenta. Ingresa su contraseña actual y vuelve a intentarlo.' });
            }
        } else {
            user = new User({
                name: application.name,
                email: normalizedEmail,
                password,
                phone: application.phone,
                role: 'client',
                loyalty: { points: 0 }
            });
        }

        user.role = assignedRole;
        user.employeeData = {
            ...user.employeeData?.toObject?.(),
            hiredAt: new Date(),
            experienceYears: application.experienceYears,
            isRecentGraduate: application.isRecentGraduate,
            publicProfileConsent: application.publicProfileConsent,
            publicProfile: application.publicProfileConsent,
            profileBio: application.profileBio,
            branchAssigned: user.employeeData?.branchAssigned || 'Matriz'
        };
        await user.save();

        application.status = 'accepted';
        application.invitationHash = '';
        application.invitationExpiresAt = null;
        application.acceptedUser = user._id;
        await application.save();

        return res.status(201).json({
            message: 'Cuenta de empleado activada. Ya puedes iniciar sesión con tu correo y contraseña.',
            email: user.email
        });
    } catch (error) {
        return res.status(400).json({ error: `No se pudo activar la cuenta: ${error.message}` });
    }
};

exports.getEmployees = async (_req, res) => {
    try {
        const employees = await User.find({ role: { $in: publicStaffRoles } })
            .select('name email role employeeData')
            .sort({ name: 1 });
        return res.json(employees.map((employee) => ({
            id: employee._id,
            name: employee.name,
            email: employee.email,
            role: employee.role,
            experienceYears: employee.employeeData?.experienceYears || 0,
            isRecentGraduate: employee.employeeData?.isRecentGraduate || false,
            publicProfileConsent: employee.employeeData?.publicProfileConsent || false,
            publicProfile: employee.employeeData?.publicProfile || false,
            profileBio: employee.employeeData?.profileBio || ''
        })));
    } catch (error) {
        return res.status(500).json({ error: `No se pudieron cargar los perfiles: ${error.message}` });
    }
};

exports.updateEmployeeProfile = async (req, res) => {
    const { experienceYears, isRecentGraduate, profileBio, publicProfile, consentConfirmed } = req.body;
    if (!Number.isInteger(experienceYears) || experienceYears < 0 || experienceYears > 60) {
        return res.status(400).json({ error: 'La experiencia debe ser un número entero entre 0 y 60 años' });
    }
    if (typeof isRecentGraduate !== 'boolean' || typeof publicProfile !== 'boolean') {
        return res.status(400).json({ error: 'Indica la condición de recién egresado y la visibilidad del perfil' });
    }
    if (publicProfile && consentConfirmed !== true) {
        return res.status(400).json({ error: 'Confirma que la persona autorizó publicar su perfil' });
    }

    try {
        const employee = await User.findOne({ _id: req.params.id, role: { $in: publicStaffRoles } });
        if (!employee) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }
        employee.employeeData = employee.employeeData || {};
        employee.employeeData.experienceYears = experienceYears;
        employee.employeeData.isRecentGraduate = isRecentGraduate;
        employee.employeeData.profileBio = typeof profileBio === 'string' ? profileBio.trim().slice(0, 240) : '';
        employee.employeeData.publicProfileConsent = publicProfile ? true : employee.employeeData.publicProfileConsent;
        employee.employeeData.publicProfile = publicProfile;
        await employee.save();

        return res.json({ message: 'Perfil actualizado', publicProfile: employee.employeeData.publicProfile });
    } catch (error) {
        return res.status(400).json({ error: `No se pudo actualizar el perfil: ${error.message}` });
    }
};
