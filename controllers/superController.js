const Cliente = require('../models/Cliente');
const User = require('../models/User');
const Reporte = require('../models/Reporte');

const getSuperDashboard = async (req, res) => {
    try {
        const [
            totalClientes,
            totalUsuarios,
            totalCiudadanos,
            totalReportes,
            reportesPorEstado,
            reportesPorPrioridad,
            reportesPorCategoria,
            ultimosReportes
        ] = await Promise.all([
            Cliente.countDocuments(),
            User.countDocuments(),
            User.countDocuments({ rol: 'ciudadano' }),
            Reporte.countDocuments(),

            Reporte.aggregate([
                { $group: { _id: '$estado', total: { $sum: 1 } } },
                { $sort: { total: -1 } }
            ]),

            Reporte.aggregate([
                { $group: { _id: '$prioridad', total: { $sum: 1 } } },
                { $sort: { total: -1 } }
            ]),

            Reporte.aggregate([
                { $group: { _id: '$categoria_asignada_por_ia', total: { $sum: 1 } } },
                { $sort: { total: -1 } }
            ]),

            Reporte.find()
                .sort({ fecha_hora: -1 })
                .limit(10)
                .select('titulo clienteNombre estado prioridad categoria_asignada_por_ia localidad provincia pais fecha_hora createdAt')
        ]);

        res.json({
            ok: true,
            resumen: {
                totalClientes,
                totalUsuarios,
                totalCiudadanos,
                totalReportes
            },
            graficos: {
                reportesPorEstado,
                reportesPorPrioridad,
                reportesPorCategoria
            },
            ultimosReportes
        });
    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error al obtener dashboard de super usuario',
            error: error.message
        });
    }
};

const getSuperClientes = async (req, res) => {
    try {
        const clientes = await Cliente.find()
            .sort({ nombre: 1 });

        res.json({
            ok: true,
            total: clientes.length,
            clientes
        });
    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error al obtener clientes',
            error: error.message
        });
    }
};

const getSuperUsuarios = async (req, res) => {
    try {
        const usuarios = await User.find()
            .sort({ createdAt: -1 })
            .select('-__v');

        res.json({
            ok: true,
            total: usuarios.length,
            usuarios
        });
    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error al obtener usuarios',
            error: error.message
        });
    }
};

const getSuperReportes = async (req, res) => {
    try {
        const reportes = await Reporte.find()
            .sort({ fecha_hora: -1 })
            .limit(200)
            .select('-__v');

        res.json({
            ok: true,
            total: reportes.length,
            reportes
        });
    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error al obtener reportes',
            error: error.message
        });
    }
};

module.exports = {
    getSuperDashboard,
    getSuperClientes,
    getSuperUsuarios,
    getSuperReportes
};