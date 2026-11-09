const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Token con vigencia de 365 días (Sesión permanente para el cliente)
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '365d' });
};

// @desc    Registrar un nuevo cliente con bono de bienvenida de puntos
// @route   POST /api/auth/register
exports.registerUser = async (req, res) => {
    const { name, email, password, phone } = req.body;

    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
        }

        const user = await User.create({
            name,
            email,
            password,
            phone: phone || '',
            role: 'client'
        });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            avatar: user.avatar,
            loyalty: user.loyalty,
            token: generateToken(user._id)
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar al usuario: ' + error.message });
    }
};

// @desc    Iniciar sesión
// @route   POST /api/auth/login
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                avatar: user.avatar,
                employeeData: user.employeeData,
                loyalty: user.loyalty,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ error: 'Credenciales inválidas (correo o contraseña incorrectos)' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error en el inicio de sesión: ' + error.message });
    }
};

// @desc    Obtener perfil del usuario logueado
// @route   GET /api/auth/profile
exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Error al consultar perfil: ' + error.message });
    }
};

// @desc    Actualizar perfil del usuario (nombre, teléfono, contraseña, avatar)
// @route   PUT /api/auth/profile
exports.updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            if (req.body.phone !== undefined) {
                user.phone = req.body.phone;
            }

            // Imagen subida como archivo
            if (req.file) {
                user.avatar = req.file.path.startsWith('http')
                    ? req.file.path
                    : `/uploads/${req.file.filename}`;
            } else if (req.body.avatar) {
                user.avatar = req.body.avatar;
            }

            if (req.body.password) {
                user.password = req.body.password;
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                role: updatedUser.role,
                avatar: updatedUser.avatar,
                employeeData: updatedUser.employeeData,
                loyalty: updatedUser.loyalty,
                token: generateToken(updatedUser._id)
            });
        } else {
            res.status(404).json({ error: 'Usuario no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar perfil: ' + error.message });
    }
};

// @desc    Obtener lista de todos los usuarios y colaboradores (Solo Admin)
// @route   GET /api/auth/users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Error al consultar usuarios: ' + error.message });
    }
};
