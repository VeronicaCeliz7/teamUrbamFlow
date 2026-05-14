require('dotenv').config();
const mongoose = require('mongoose');
const { createClerkClient } = require('@clerk/clerk-sdk-node');

// Definir el esquema de usuario (solo para este script)
const UserSchema = new mongoose.Schema({
    clerkUserId: String,
    email: String,
    nombre: String,
    apellido: String,
    ultimoAcceso: Date,
    activo: Boolean
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
        let yaExistentes = 0;
        
        for (const clerkUser of clerkUsers) {
            // Verificar si ya existe en MongoDB
            const existe = await User.findOne({ clerkUserId: clerkUser.id });
            
            if (!existe) {
                const email = clerkUser.emailAddresses[0]?.emailAddress || 'sin-email';
                const nombre = clerkUser.firstName || '';
                const apellido = clerkUser.lastName || '';
                
                const nuevoUser = new User({
                    clerkUserId: clerkUser.id,
                    email: email,
                    nombre: nombre,
                    apellido: apellido,
                    ultimoAcceso: new Date(),
                    activo: true
                });
                
                await nuevoUser.save();
                console.log(`✅ Sincronizado: ${email} (${clerkUser.id})`);
                sincronizados++;
            } else {
                console.log(`⏭️ Ya existe: ${existe.email}`);
                yaExistentes++;
            }
        }
        
        console.log('\n🎉 ========== RESUMEN ==========');
        console.log(`📊 Total usuarios en Clerk: ${clerkUsers.length}`);
        console.log(`✅ Usuarios ya existían: ${yaExistentes}`);
        console.log(`🆕 Usuarios sincronizados: ${sincronizados}`);
        console.log('===============================\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

syncMissingUsers();