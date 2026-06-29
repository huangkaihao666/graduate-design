const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

export const getApiBaseUrl = () =>
  trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || '/api/v1')

export const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${getApiBaseUrl()}${normalizedPath}`
}

export const getWebSocketUrl = () => {
  const configuredUrl = import.meta.env.VITE_WS_URL?.trim()
  if (configuredUrl) return trimTrailingSlash(configuredUrl)

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
  if (apiBaseUrl && /^https?:\/\//i.test(apiBaseUrl)) {
    try {
      return new URL(apiBaseUrl).origin
    } catch {
      // Fall through to local development default.
    }
  }

  return import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin
}
