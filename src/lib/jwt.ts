export function isTokenExpired(token: string): boolean {
  try {
    const payload = token.split('.')[1];
    const { exp } = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (!exp) return false;
    return Date.now() / 1000 > exp;
  } catch {
    return true;
  }
}
