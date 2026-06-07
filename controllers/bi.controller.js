const Reporte = require("../models/Reporte");
const User = require("../models/User");
const Cliente = require("../models/Cliente");

// GET /api/bi/health
const getBiHealth = async (req, res) => {
  return res.status(200).json({
    success: true,
    service: "UrbanFlow BI API",
    scope: "urbanflow.bi.read",
    access: "read_only",
    method: "GET",
    status: "OK",
    message: "Endpoint BI disponible para Power BI",
    timestamp: new Date().toISOString(),
  });
};

// GET /api/bi/dashboard
const getBiDashboard = async (req, res) => {
  try {
    const totalReportes = await Reporte.countDocuments();
    const totalUsuarios = await User.countDocuments();
    const totalClientes = await Cliente.countDocuments();

    const reportesPorEstado = await Reporte.aggregate([
      {
        $group: {
          _id: "$estado",
          cantidad: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          estado: "$_id",
          cantidad: 1,
        },
      },
      {
        $sort: {
          cantidad: -1,
        },
      },
    ]);

    const reportesPorPrioridad = await Reporte.aggregate([
      {
        $group: {
          _id: "$prioridad",
          cantidad: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          prioridad: "$_id",
          cantidad: 1,
        },
      },
      {
        $sort: {
          cantidad: -1,
        },
      },
    ]);

    const reportesPorCategoriaIA = await Reporte.aggregate([
      {
        $group: {
          _id: "$categoria_asignada_por_ia",
          cantidad: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          categoria: {
            $ifNull: ["$_id", "Sin categoría IA"],
          },
          cantidad: 1,
        },
      },
      {
        $sort: {
          cantidad: -1,
        },
      },
    ]);

    const reportesPorMunicipio = await Reporte.aggregate([
      {
        $group: {
          _id: "$municipio",
          cantidad: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          municipio: {
            $cond: [
              { $eq: ["$_id", ""] },
              "Sin municipio",
              "$_id",
            ],
          },
          cantidad: 1,
        },
      },
      {
        $sort: {
          cantidad: -1,
        },
      },
    ]);

    const reportesDuplicados = await Reporte.countDocuments({
      posible_duplicado: true,
    });

    const reportesProcesadosIA = await Reporte.countDocuments({
      ia_procesado: true,
    });

    return res.status(200).json({
      success: true,
      scope: "urbanflow.bi.read",
      access: "read_only",
      source: "MongoDB Atlas",
      data: {
        resumenGeneral: {
          totalClientes,
          totalUsuarios,
          totalReportes,
          reportesDuplicados,
          reportesProcesadosIA,
        },
        reportesPorEstado,
        reportesPorPrioridad,
        reportesPorCategoriaIA,
        reportesPorMunicipio,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error al obtener dashboard BI",
      error: error.message,
    });
  }
};

// GET /api/bi/incidentes
const getBiIncidentes = async (req, res) => {
  try {
    const incidentes = await Reporte.find()
      .select(
        "titulo columna_unica municipio clienteNombre operadorAsignadoNombre direccion localidad provincia pais latitud longitud categoria_asignada_por_ia ia_procesado prioridad estado posible_duplicado fecha_hora createdAt updatedAt"
      )
      .sort({ createdAt: -1 })
      .limit(1000);

    return res.status(200).json({
      success: true,
      scope: "urbanflow.bi.read",
      access: "read_only",
      total: incidentes.length,
      data: incidentes,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error al obtener incidentes BI",
      error: error.message,
    });
  }
};

// GET /api/bi/usuarios
const getBiUsuarios = async (req, res) => {
  try {
    const usuarios = await User.find()
      .select("clerkUserId email nombre role clienteId createdAt updatedAt")
      .sort({ createdAt: -1 })
      .limit(1000);

    return res.status(200).json({
      success: true,
      scope: "urbanflow.bi.read",
      access: "read_only",
      total: usuarios.length,
      data: usuarios,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error al obtener usuarios BI",
      error: error.message,
    });
  }
};

// GET /api/bi/clientes
const getBiClientes = async (req, res) => {
  try {
    const clientes = await Cliente.find()
      .select("nombre tipo localidad provincia pais activo createdAt updatedAt")
      .sort({ createdAt: -1 })
      .limit(1000);

    return res.status(200).json({
      success: true,
      scope: "urbanflow.bi.read",
      access: "read_only",
      total: clientes.length,
      data: clientes,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error al obtener clientes BI",
      error: error.message,
    });
  }
};

module.exports = {
  getBiHealth,
  getBiDashboard,
  getBiIncidentes,
  getBiUsuarios,
  getBiClientes,
};