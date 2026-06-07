const validatePowerBiApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  const scope = req.headers["x-scope"];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: "API Key requerida",
    });
  }

  if (apiKey !== process.env.POWERBI_API_KEY) {
    return res.status(403).json({
      success: false,
      message: "API Key inválida",
    });
  }

  if (scope !== process.env.POWERBI_SCOPE) {
    return res.status(403).json({
      success: false,
      message: "Scope inválido o insuficiente",
      requiredScope: "urbanflow.bi.read",
    });
  }

  next();
};

module.exports = {
  validatePowerBiApiKey,
};