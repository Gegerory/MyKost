import { currentUser } from '../../server/session.js';
import { json, managerAccess, methodGuard } from '../../server/access.js';
export default async (req: Request) => {
 try {
  const methodError = methodGuard(req);
  if (methodError) return methodError;
  const user = await currentUser(req);
  const denied = managerAccess(user);
  if (denied) return denied;
  return json({ id: user!.id, name: user!.name ?? 'Pengelola', email: user!.email, roles: (user!.roles ?? []).filter(r => ['Manager', 'SuperAdmin'].includes(r)) });
 } catch { return json({ error: 'Layanan akun belum tersedia. Silakan coba kembali.' }, 503); }
};
export const config = { path: '/api/me' };
