const OpenAI = require('openai');

const deepseek = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com'
});

const categoriasPermitidas = [
    'bache',
    'alumbrado',
    'basura',
    'agua',
    'semaforo',
    'inseguridad',
    'vereda',
    'ruido',
    'animal_suelto',
    'microbasural',
    'otro'
];

const prioridadesPermitidas = [
    'baja',
    'media',
    'alta',
    'critica'
];

function normalizarTexto(texto) {
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function clasificacionFallback(texto, motivo = 'fallback-demo') {
    const textoNormalizado = normalizarTexto(texto);

    let categoria = 'otro';
    let prioridad = 'media';
    let riesgo = 'operativo';
    let accion_sugerida = 'Revisar el incidente y derivarlo al área correspondiente.';
    const etiquetas = [];

    if (
        textoNormalizado.includes('agua') ||
        textoNormalizado.includes('perdida') ||
        textoNormalizado.includes('fuga') ||
        textoNormalizado.includes('caño') ||
        textoNormalizado.includes('cano')
    ) {
        categoria = 'agua';
        prioridad = 'alta';
        riesgo = 'deterioro de calzada o afectación del servicio';
        accion_sugerida = 'Derivar al área de agua y saneamiento para inspección urgente.';
        etiquetas.push('agua', 'fuga', 'servicio-publico');
    }

    if (
        textoNormalizado.includes('bache') ||
        textoNormalizado.includes('pozo') ||
        textoNormalizado.includes('calle rota') ||
        textoNormalizado.includes('calzada')
    ) {
        categoria = 'bache';
        prioridad = prioridad === 'alta' ? 'critica' : 'alta';
        riesgo = 'riesgo vial';
        accion_sugerida = 'Priorizar reparación vial y señalizar preventivamente la zona.';
        etiquetas.push('bache', 'seguridad-vial', 'calzada');
    }

    if (
        textoNormalizado.includes('basura') ||
        textoNormalizado.includes('residuos') ||
        textoNormalizado.includes('olor') ||
        textoNormalizado.includes('microbasural')
    ) {
        categoria = textoNormalizado.includes('microbasural') ? 'microbasural' : 'basura';
        prioridad = 'media';
        riesgo = 'riesgo sanitario';
        accion_sugerida = 'Derivar a higiene urbana para retiro y control del foco.';
        etiquetas.push('basura', 'higiene-urbana', 'riesgo-sanitario');
    }

    if (
        textoNormalizado.includes('luz') ||
        textoNormalizado.includes('alumbrado') ||
        textoNormalizado.includes('lampara') ||
        textoNormalizado.includes('luminaria')
    ) {
        categoria = 'alumbrado';
        prioridad = 'media';
        riesgo = 'baja visibilidad y percepción de inseguridad';
        accion_sugerida = 'Derivar al área de alumbrado público para revisión técnica.';
        etiquetas.push('alumbrado', 'luminaria', 'seguridad');
    }

    if (
        textoNormalizado.includes('semaforo') ||
        textoNormalizado.includes('semáforo')
    ) {
        categoria = 'semaforo';
        prioridad = 'critica';
        riesgo = 'riesgo vial alto';
        accion_sugerida = 'Intervenir de forma urgente por riesgo de siniestros viales.';
        etiquetas.push('semaforo', 'transito', 'urgente');
    }

    if (
        textoNormalizado.includes('escuela') ||
        textoNormalizado.includes('hospital') ||
        textoNormalizado.includes('avenida') ||
        textoNormalizado.includes('ruta')
    ) {
        prioridad = prioridad === 'media' ? 'alta' : prioridad;
        etiquetas.push('zona-sensible');
    }

    const etiquetasUnicas = [...new Set(etiquetas)];

    return {
        ok: true,
        proveedor: motivo,
        modelo: 'fallback-local-urbanflow',
        advertencia:
            'La clasificación fue generada por reglas locales porque la API externa de IA no respondió correctamente.',
        input: {
            texto
        },
        ia: {
            categoria,
            prioridad,
            resumen: `Incidente clasificado como ${categoria} con prioridad ${prioridad}.`,
            etiquetas: etiquetasUnicas.length > 0 ? etiquetasUnicas : ['revision-manual'],
            riesgo,
            accion_sugerida
        }
    };
}

function normalizarRespuestaIA(ia) {
    const categoria = categoriasPermitidas.includes(ia.categoria)
        ? ia.categoria
        : 'otro';

    const prioridad = prioridadesPermitidas.includes(ia.prioridad)
        ? ia.prioridad
        : 'media';

    return {
        categoria,
        prioridad,
        resumen: ia.resumen || 'Resumen no disponible.',
        etiquetas: Array.isArray(ia.etiquetas) ? ia.etiquetas : [],
        riesgo: ia.riesgo || 'No determinado',
        accion_sugerida: ia.accion_sugerida || 'Revisión manual del incidente.'
    };
}

const clasificarIncidente = async (req, res) => {
    const { texto } = req.body;

    if (!texto || texto.trim().length < 5) {
        return res.status(400).json({
            ok: false,
            mensaje: 'Debe enviar un texto válido para clasificar.'
        });
    }

    if (!process.env.DEEPSEEK_API_KEY) {
        return res.status(200).json(
            clasificacionFallback(texto, 'fallback-demo-sin-api-key')
        );
    }

    try {
        const prompt = `
Sos el motor de inteligencia urbana de UrbanFlow.

Tu tarea es clasificar incidentes urbanos reportados por ciudadanos.

Categorías permitidas:
${categoriasPermitidas.join(', ')}

Prioridades permitidas:
${prioridadesPermitidas.join(', ')}

Analizá el siguiente incidente:
"${texto}"

Respondé SOLO en JSON válido, sin markdown, sin explicación adicional.

Formato obligatorio:
{
  "categoria": "una_categoria_permitida",
  "prioridad": "una_prioridad_permitida",
  "resumen": "resumen claro y breve del incidente",
  "etiquetas": ["etiqueta1", "etiqueta2", "etiqueta3"],
  "riesgo": "riesgo operativo principal",
  "accion_sugerida": "acción recomendada para el gestor"
}
`;

        const completion = await deepseek.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
                {
                    role: 'system',
                    content: 'Respondés siempre JSON válido para sistemas backend. No uses markdown.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.2,
            max_tokens: 500
        });

        const rawContent = completion.choices?.[0]?.message?.content;

        if (!rawContent) {
            return res.status(200).json(
                clasificacionFallback(texto, 'fallback-demo-respuesta-vacia')
            );
        }

        let ia;

        try {
            ia = JSON.parse(rawContent);
        } catch {
            return res.status(200).json(
                clasificacionFallback(texto, 'fallback-demo-json-invalido')
            );
        }

        return res.json({
            ok: true,
            proveedor: 'DeepSeek',
            modelo: 'deepseek-chat',
            input: {
                texto
            },
            ia: normalizarRespuestaIA(ia)
        });
    } catch (error) {
        return res.status(200).json({
            ...clasificacionFallback(texto, 'fallback-demo-error-api'),
            error_api: error.message
        });
    }
};

module.exports = {
    clasificarIncidente
};