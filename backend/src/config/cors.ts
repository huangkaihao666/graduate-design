const DEFAULT_CORS_ORIGINS = ['http://localhost:5173', 'http://localhost:5174'];

export const getCorsOrigins = () => {
  const configuredOrigins = process.env.CORS_ORIGIN;
  if (!configuredOrigins) return DEFAULT_CORS_ORIGINS;

  return configuredOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};
