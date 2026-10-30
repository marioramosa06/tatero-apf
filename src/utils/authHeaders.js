// Utility to add auth header if token exists
export function getAuthHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
