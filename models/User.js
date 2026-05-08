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
    pais: { type: String },
    rol: { type: String, enum: ['user', 'admin', 'moderador'], default: 'user' },
    activo: { type: Boolean, default: true },
    ultimoAcceso: { type: Date },
    preferencias: {
        notificaciones: { type: Boolean, default: true },
        idioma: { type: String, default: 'es' }
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);