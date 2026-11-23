const Reporte = require("../models/Reporte");
const User = require("../models/User");
const Cliente = require("../models/Cliente");

// ==============================================
// GET /api/bi/health
// ==============================================
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

// ==============================================
// GET /api/bi/dashboard
// ==============================================
const getBiDashboard = async (req, res) => {
  try {
    const totalReportes = await Reporte.countDocuments();
    const totalUsuarios = await User.countDocuments();
    const totalClientes = await Cliente.countDocuments();

    const reportesPorEstado = await Reporte.aggregate([
      { $group: { _id: "$estado", cantidad: { $sum: 1 } } },
      { $project: { _id: 0, estado: "$_id", cantidad: 1 } },
      { $sort: { cantidad: -1 } }
    ]);

    const reportesPorPrioridad = await Reporte.aggregate([
      { $group: { _id: "$prioridad", cantidad: { $sum: 1 } } },
      { $project: { _id: 0, prioridad: "$_id", cantidad: 1 } },
      { $sort: { cantidad: -1 } }
    ]);

    const reportesPorCategoriaIA = await Reporte.aggregate([
      { $group: { _id: "$categoria_asignada_por_ia", cantidad: { $sum: 1 } } },
      { $project: { _id: 0, categoria: { $ifNull: ["$_id", "Sin categoría IA"] }, cantidad: 1 } },
      { $sort: { cantidad: -1 } }
    ]);

    const reportesResueltos = await Reporte.countDocuments({ estado: "resuelto" });
    const tasaResolucion = totalReportes > 0 ? (reportesResueltos / totalReportes) * 100 : 0;

    const reportesConIA = await Reporte.countDocuments({ ia_procesado: true });
    const coberturaIA = totalReportes > 0 ? (reportesConIA / totalReportes) * 100 : 0;

    const reportesConGeo = await Reporte.countDocuments({
      latitud: { $ne: null },
      longitud: { $ne: null }
    });
    const coberturaGeo = totalReportes > 0 ? (reportesConGeo / totalReportes) * 100 : 0;

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
          reportesResueltos,
          tasaResolucion: Number(tasaResolucion.toFixed(2)),
          coberturaIA: Number(coberturaIA.toFixed(2)),
          coberturaGeo: Number(coberturaGeo.toFixed(2)),
        },
        reportesPorEstado,
        reportesPorPrioridad,
        reportesPorCategoriaIA,
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

// ==============================================
// GET /api/bi/incidentes (TABLA DE HECHOS)
// ==============================================
const getBiIncidentes = async (req, res) => {
  try {
    const incidentes = await Reporte.find()
      .select(
        "_id titulo columna_unica " +
        "categoria_asignada_por_ia " +
        "estado prioridad prioridad_score " +
        "fecha_hora fecha_resolucion fecha_asignacion_operador " +
        "fecha_en_proceso fecha_pendiente fecha_rechazado " +
        "usuarioId usuarioNombre " +
        "operadorAsignadoId operadorNombre " +  // ← CAMPO ORIGINAL
        "clienteId clienteNombre " +
        "direccion localidad provincia pais " +
        "latitud longitud " +
        "ia_procesado ai_priority_score " +
        "esDemo createdAt updatedAt"
      )
      .sort({ fecha_hora: -1 })
      .limit(10000);

    // 🔧 TRANSFORMAR: Agregar operadorAsignadoNombre con el valor de operadorNombre
    const dataTransformada = incidentes.map(incidente => {
      // Convertir a objeto plano
      const obj = incidente.toObject ? incidente.toObject() : incidente;
      
      // Si existe operadorNombre, crear operadorAsignadoNombre con el mismo valor
      if (obj.operadorNombre !== undefined && obj.operadorNombre !== null) {
        obj.operadorAsignadoNombre = obj.operadorNombre;
      }
      
      return obj;
    });

    return res.status(200).json({
      success: true,
      scope: "urbanflow.bi.read",
      access: "read_only",
      total: dataTransformada.length,
      data: dataTransformada,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error al obtener incidentes BI",
      error: error.message,
    });
  }
};

// ==============================================
// GET /api/bi/usuarios (DIMENSIÓN)
// ==============================================
const getBiUsuarios = async (req, res) => {
  try {
    const filtro = {};
    if (req.query.esDemo === "true") filtro.esDemo = true;
    if (req.query.esDemo === "false") filtro.esDemo = { $ne: true };

    const usuarios = await User.find(filtro)
      .select(
        "clerkUserId email nombre apellido rol activo municipio " +
        "esDemo ultimoAcceso createdAt updatedAt"
      )
      .sort({ createdAt: -1 })
      .limit(5000);

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

// ==============================================
// GET /api/bi/clientes (DIMENSIÓN)
// ==============================================
const getBiClientes = async (req, res) => {
  try {
    const clientes = await Cliente.find()
      .select(
        "_id nombre tipo localidad provincia pais direccion " +
        "latitud longitud " +
        "activo esDemo createdAt updatedAt"
      )
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

// ==============================================
// GET /api/bi/estados (DIMENSIÓN)
// ==============================================
const getBiEstados = async (req, res) => {
  try {
    const estados = [
      { id: 1, estado: "en_proceso", descripcion: "En proceso" },
      { id: 2, estado: "resuelto", descripcion: "Resuelto" },
      { id: 3, estado: "pendiente", descripcion: "Pendiente" },
      { id: 4, estado: "rechazado", descripcion: "Rechazado" }
    ];

    return res.status(200).json({
      success: true,
      scope: "urbanflow.bi.read",
      access: "read_only",
      total: estados.length,
      data: estados,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error al obtener estados BI",
      error: error.message,
    });
  }
};

// ==============================================
// GET /api/bi/categorias (DIMENSIÓN)
// ==============================================
const getBiCategorias = async (req, res) => {
  try {
    const categorias = await Reporte.distinct("categoria_asignada_por_ia");
    const data = categorias
      .filter(c => c)
      .map((categoria, index) => ({
        id: index + 1,
        categoria: categoria,
      }));

    return res.status(200).json({
      success: true,
      scope: "urbanflow.bi.read",
      access: "read_only",
      total: data.length,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error al obtener categorías BI",
      error: error.message,
    });
  }
};

// ==============================================
// GET /api/bi/asignaciones (INCIDENTES POR OPERADOR)
// ==============================================
const getBiAsignaciones = async (req, res) => {
  try {
    const matchStage = { operadorAsignadoId: { $ne: null } };
    if (req.query.esDemo === "true") matchStage.esDemo = true;
    if (req.query.esDemo === "false") matchStage.esDemo = { $ne: true };

    const asignaciones = await Reporte.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$operadorAsignadoId",
          totalAsignados: { $sum: 1 },
          enProceso: { $sum: { $cond: [{ $eq: ["$estado", "en_proceso"] }, 1, 0] } },
          pendientes: { $sum: { $cond: [{ $eq: ["$estado", "pendiente"] }, 1, 0] } },
          resueltos: { $sum: { $cond: [{ $eq: ["$estado", "resuelto"] }, 1, 0] } },
          rechazados: { $sum: { $cond: [{ $eq: ["$estado", "rechazado"] }, 1, 0] } }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "clerkUserId",
          as: "operador"
        }
      },
      { $unwind: { path: "$operador", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          operadorId: "$_id",
          operadorNombre: { $concat: ["$operador.nombre", " ", "$operador.apellido"] },
          esDemo: "$operador.esDemo",
          totalAsignados: 1,
          enProceso: 1,
          pendientes: 1,
          resueltos: 1,
          rechazados: 1
        }
      },
      { $sort: { totalAsignados: -1 } }
    ]);

    const data = asignaciones.map(item => ({
      operadorId: item.operadorId || null,
      operadorNombre: item.operadorNombre || "Sin asignar",
      esDemo: item.esDemo === true,
      totalAsignados: item.totalAsignados || 0,
      enProceso: item.enProceso || 0,
      pendientes: item.pendientes || 0,
      resueltos: item.resueltos || 0,
      rechazados: item.rechazados || 0
    }));

    return res.status(200).json({
      success: true,
      scope: "urbanflow.bi.read",
      access: "read_only",
      total: data.length,
      data: data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error al obtener asignaciones BI",
      error: error.message,
    });
  }
};

// ==============================================
// EXPORTAR TODOS LOS CONTROLADORES
// ==============================================
module.exports = {
  getBiHealth,
  getBiDashboard,
  getBiIncidentes,
  getBiUsuarios,
  getBiClientes,
  getBiEstados,
  getBiCategorias,
  getBiAsignaciones,
};