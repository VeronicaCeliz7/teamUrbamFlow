const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    clerkUserId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    nombre: { type: String },
    apellido: { type: String },
    edad: { type: Number },
    telefono: { type: String },
    direccion: { type: String },
    ciudad: { type: String },
    localidad: { type: String },
    provincia: { type: String },
    pais: { type: String },

    clienteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', default: null },
    clienteNombre: { type: String, default: null },

    rol: {
        type: String,
        enum: ['user', 'admin', 'moderador', 'operador', 'superadmin', 'ciudadano'],
        default: 'user'
    },

    activo: { type: Boolean, default: true },
    ultimoAcceso: { type: Date },

    preferencias: {
        notificaciones: { type: Boolean, default: true },
        idioma: { type: String, default: 'es' }
    },

    esDemo: { type: Boolean, default: false },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

UserSchema.index({ rol: 1 });
UserSchema.index({ clienteId: 1 });
UserSchema.index({ esDemo: 1 });

module.exports = mongoose.model('User', UserSchema);