const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'El nombre es obligatorio'] 
    },
    email: { 
        type: String, 
        required: [true, 'El correo electrónico es obligatorio'], 
        unique: true,
        lowercase: true,
        trim: true
    },
    password: { 
        type: String, 
        required: [true, 'La contraseña es obligatoria'],
        minlength: [6, 'La contraseña debe tener mínimo 6 caracteres']
    },
    phone: {
        type: String,
        default: ''
    },
    role: { 
        type: String, 
        enum: [
            'client',        // Cliente regular
            'barista',       // Barista / Empleado general
            'atencion',      // Atención al cliente
            'encargado',     // Encargado de barra
            'subgerente',    // Subgerente de sucursal
            'gerente',       // Gerente general de sucursal
            'supervisor',    // Supervisor regional
            'codueno',       // Co-dueño / Inversionista
            'admin'          // Dueño fundador (Acceso total)
        ], 
        default: 'client' 
    },
    // Datos confidenciales de colaborador (Solo si es promovido)
    employeeData: {
        curp: { type: String, default: '' },
        hiredAt: { type: Date },
        salary: { type: Number, default: 0 },
        branchAssigned: { type: String, default: 'Matriz' },
        experienceYears: { type: Number, min: 0, max: 60, default: 0 },
        isRecentGraduate: { type: Boolean, default: false },
        publicProfileConsent: { type: Boolean, default: false },
        publicProfile: { type: Boolean, default: false },
        profileBio: { type: String, maxlength: 240, default: '' }
    },
    avatar: {
        type: String,
        default: '/images/default-avatar.svg'
    },
    // --- CLUB DE LEALTAD (Inspirado en Club Cinépolis) ---
    loyalty: {
        points: { 
            type: Number, 
            default: 50 // Bono de 50 puntos de bienvenida por registrarse
        },
        tier: { 
            type: String, 
            enum: ['Bronce', 'Plata', 'Oro VIP'], 
            default: 'Bronce' 
        },
        totalOrders: {
            type: Number,
            default: 0
        }
    }
}, { 
    timestamps: true 
});

// Encriptar contraseña antes de guardar en base de datos
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Método auxiliar para comparar contraseñas en el login
UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
