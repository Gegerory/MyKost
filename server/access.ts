export type User = { id: string; roles?: string[]; appMetadata?: { is_active?: boolean }; userMetadata?: unknown };
export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
export function managerAccess(user: User | null): Response | null {
  if (!user) return json({ error: 'Silakan masuk untuk melanjutkan.' }, 401);
  if (user.appMetadata?.is_active === false || !(user.roles ?? []).some(role => role === 'Manager' || role === 'SuperAdmin')) {
    return json({ error: 'Akses hanya untuk Manager atau Super Admin aktif.' }, 403);
  }
  return null;
}
export function methodGuard(req: Request) {
  return req.method !== 'GET' ? new Response(null, { status: 405, headers: { Allow: 'GET', 'Cache-Control': 'no-store' } }) : null;
}
