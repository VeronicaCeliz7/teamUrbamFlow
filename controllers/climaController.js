const VILLA_MARIA = {
  ciudad: 'Villa María',
  provincia: 'Córdoba',
  pais: 'Argentina',
  latitud: -32.4108,
  longitud: -63.2436
};

function calcularRiesgoClimatico({
  lluvia24h,
  vientoMaxKmh,
  temperaturaMax,
  temperaturaMin
}) {
  const alertas = [];
  const incidentes_probables = [];
  let score = 0;

  if (lluvia24h >= 50) {
    score += 40;
    alertas.push('Lluvia intensa: riesgo alto de anegamientos, baches y problemas de drenaje.');
    incidentes_probables.push('agua', 'bache', 'microbasural');
  } else if (lluvia24h >= 20) {
    score += 25;
    alertas.push('Lluvia moderada: posible incremento de baches, agua acumulada y reclamos de calzada.');
    incidentes_probables.push('agua', 'bache');
  } else if (lluvia24h >= 5) {
    score += 10;
    alertas.push('Lluvia leve: monitorear puntos bajos y zonas con antecedentes de acumulación de agua.');
    incidentes_probables.push('agua');
  }

  if (vientoMaxKmh >= 70) {
    score += 35;
    alertas.push('Viento fuerte: riesgo de caída de ramas, cables, postes y problemas de alumbrado.');
    incidentes_probables.push('alumbrado', 'inseguridad', 'otro');
  } else if (vientoMaxKmh >= 45) {
    score += 20;
    alertas.push('Ráfagas moderadas: monitorear arbolado, cartelería, cableado y luminarias.');
    incidentes_probables.push('alumbrado');
  }

  if (temperaturaMax >= 38) {
    score += 20;
    alertas.push('Temperatura extrema: posible sobrecarga eléctrica y mayor presión sobre servicios urbanos.');
    incidentes_probables.push('alumbrado', 'agua');
  }

  if (temperaturaMin <= 0) {
    score += 15;
    alertas.push('Temperatura bajo cero: riesgo de heladas, calzada resbaladiza y afectación de cañerías.');
    incidentes_probables.push('agua', 'bache');
  }

  let riesgo_general = 'bajo';

  if (score >= 70) {
    riesgo_general = 'critico';
  } else if (score >= 45) {
    riesgo_general = 'alto';
  } else if (score >= 20) {
    riesgo_general = 'medio';
  }

  return {
    riesgo_general,
    score,
    alertas: alertas.length
      ? alertas
      : ['Sin alertas climáticas relevantes para las próximas 24 horas.'],
    incidentes_probables: [...new Set(incidentes_probables)]
  };
}

async function obtenerPronosticoOpenMeteo() {
  const url = new URL('https://api.open-meteo.com/v1/forecast');

  url.searchParams.set('latitude', VILLA_MARIA.latitud);
  url.searchParams.set('longitude', VILLA_MARIA.longitud);
  url.searchParams.set('hourly', 'temperature_2m,precipitation,wind_speed_10m');
  url.searchParams.set('forecast_days', '2');
  url.searchParams.set('timezone', 'America/Argentina/Cordoba');

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Open-Meteo error: ${errorText}`);
  }

  return response.json();
}

function resumirPronostico24h(data) {
  const hourly = data.hourly || {};

  const temperaturas = hourly.temperature_2m || [];
  const precipitaciones = hourly.precipitation || [];
  const vientos = hourly.wind_speed_10m || [];

  const primeras24Temperaturas = temperaturas.slice(0, 24);
  const primeras24Precipitaciones = precipitaciones.slice(0, 24);
  const primeros24Vientos = vientos.slice(0, 24);

  const lluvia24h = primeras24Precipitaciones.reduce(
    (acc, valor) => acc + Number(valor || 0),
    0
  );

  const vientoMaxKmh = Math.max(...primeros24Vientos.map((v) => Number(v || 0)));
  const temperaturaMax = Math.max(...primeras24Temperaturas.map((t) => Number(t || 0)));
  const temperaturaMin = Math.min(...primeras24Temperaturas.map((t) => Number(t || 0)));

  return {
    lluvia24h: Number(lluvia24h.toFixed(1)),
    vientoMaxKmh: Number(vientoMaxKmh.toFixed(1)),
    temperaturaMax: Number(temperaturaMax.toFixed(1)),
    temperaturaMin: Number(temperaturaMin.toFixed(1))
  };
}

const obtenerPronostico = async (req, res) => {
  try {
    const data = await obtenerPronosticoOpenMeteo();
    const resumen = resumirPronostico24h(data);

    return res.json({
      ok: true,
      fuente: 'Open-Meteo',
      ubicacion: VILLA_MARIA,
      ventana: 'proximas_24h',
      pronostico: resumen,
      unidades: {
        lluvia24h: 'mm',
        vientoMaxKmh: 'km/h',
        temperaturaMax: '°C',
        temperaturaMin: '°C'
      }
    });
  } catch (error) {
    console.error('Error obteniendo pronóstico:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'No se pudo obtener el pronóstico climático.',
      error: error.message
    });
  }
};

const obtenerRiesgoClimatico = async (req, res) => {
  try {
    const data = await obtenerPronosticoOpenMeteo();
    const resumen = resumirPronostico24h(data);
    const riesgo = calcularRiesgoClimatico(resumen);

    return res.json({
      ok: true,
      fuente: 'Open-Meteo',
      ubicacion: VILLA_MARIA,
      ventana: 'proximas_24h',
      pronostico: resumen,
      prediccion_urbana: riesgo
    });
  } catch (error) {
    console.error('Error obteniendo riesgo climático:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'No se pudo calcular el riesgo climático urbano.',
      error: error.message
    });
  }
};

module.exports = {
  obtenerPronostico,
  obtenerRiesgoClimatico
};