require('dotenv').config();
const { createClerkClient } = require('@clerk/clerk-sdk-node');

async function checkUser() {
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    
    const users = await clerk.users.getUserList({
        emailAddress: ['gabrielfernandezlbz@gmail.com']
    });
    
    if (users.length > 0) {
        const user = users[0];
        console.log('📦 Usuario encontrado:');
        console.log('Email:', user.emailAddresses[0]?.emailAddress);
        console.log('publicMetadata:', JSON.stringify(user.publicMetadata, null, 2));
        
        const role = user.publicMetadata?.role || 
                     user.publicMetadata?.rol || 
                     'NO TIENE ROL';
        console.log('\n🎯 Rol:', role);
    } else {
        console.log('❌ Usuario no encontrado en Clerk');
    }
}

checkUser();