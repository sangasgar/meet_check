export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const ACCESS_TOKEN_KEY = 'accessToken';

// Достаёт e-mail из payload JWT (подпись не проверяется — это задача API).
export function decodeJwtEmail(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as {
      email?: unknown;
    };
    return typeof json.email === 'string' ? json.email : null;
  } catch {
    return null;
  }
}
