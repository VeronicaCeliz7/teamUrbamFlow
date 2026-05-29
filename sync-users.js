require('dotenv').config();
const mongoose = require('mongoose');
const { createClerkClient } = require('@clerk/clerk-sdk-node');

// Definir el esquema de usuario con ROL
const UserSchema = new mongoose.Schema({
    clerkUserId: String,
    email: String,
    nombre: String,
    apellido: String,
    rol: { type: String, default: 'user' },     // ← NUEVO
    municipioId: { type: String, default: null }, // ← NUEVO (para moderadores)
    ultimoAcceso: Date,
    activo: { type: Boolean, default: true }
});

const User = mongoose.model('User', UserSchema);

async function syncMissingUsers() {
    try {
        console.log('🔄 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB');
        
        console.log('🔄 Obteniendo usuarios de Clerk...');
        const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
        const clerkUsers = await clerk.users.getUserList();
        
        console.log(`📊 Usuarios encontrados en Clerk: ${clerkUsers.length}`);
        
        let sincronizados = 0;
        let actualizados = 0;
        let yaExistentes = 0;
        
        for (const clerkUser of clerkUsers) {
            // Leer el rol desde publicMetadata de Clerk
            const clerkRole = clerkUser.publicMetadata?.role || 'user';
            const email = clerkUser.emailAddresses[0]?.emailAddress || 'sin-email';
            const nombre = clerkUser.firstName || '';
            const apellido = clerkUser.lastName || '';
            
            // Verificar si ya existe en MongoDB
            const existe = await User.findOne({ clerkUserId: clerkUser.id });
            
            if (!existe) {
                // CREAR nuevo usuario con rol
                const nuevoUser = new User({
                    clerkUserId: clerkUser.id,
                    email: email,
                    nombre: nombre,
                    apellido: apellido,
                    rol: clerkRole,           // ← ASIGNA EL ROL
                    ultimoAcceso: new Date(),
                    activo: true
                });
                
                await nuevoUser.save();
                console.log(`✅ CREADO: ${email} → rol: ${clerkRole}`);
                sincronizados++;
            } else {
                // ACTUALIZAR rol si cambió en Clerk
                if (existe.rol !== clerkRole) {
                    await User.updateOne(
                        { clerkUserId: clerkUser.id },
                        { 
                            $set: { 
                                rol: clerkRole,
                                nombre: nombre,
                                apellido: apellido,
                                ultimoAcceso: new Date()
                            } 
                        }
                    );
                    console.log(`🔄 ACTUALIZADO: ${email} → rol: ${clerkRole} (antes era ${existe.rol})`);
                    actualizados++;
                } else {
                    console.log(`⏭️ Sin cambios: ${email} → rol: ${clerkRole}`);
                    yaExistentes++;
                }
            }
        }
        
        console.log('\n🎉 ========== RESUMEN ==========');
        console.log(`📊 Total usuarios en Clerk: ${clerkUsers.length}`);
        console.log(`✅ Ya existían sin cambios: ${yaExistentes}`);
        console.log(`🆕 Nuevos sincronizados: ${sincronizados}`);
        console.log(`🔄 Actualizados (rol cambiado): ${actualizados}`);
        console.log('===============================\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

syncMissingUsers();