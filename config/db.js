const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB Atlas');
        console.log(`📀 Base de datos: ${mongoose.connection.name || 'UrbanFlowBD'}`);
    } catch (error) {
        console.error('❌ Error de conexión a MongoDB:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;