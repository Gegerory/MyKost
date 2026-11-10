import { currentUser } from '../../server/session.js';
import { json, managerAccess, methodGuard } from '../../server/access.js';
export default async (req: Request) => {
 try {
  const methodError = methodGuard(req);
  if (methodError) return methodError;
  const denied = managerAccess(await currentUser(req));
  if (denied) return denied;
  return json({ code: 'DATA_NOT_CONNECTED', error: 'Modul data operasional belum terhubung. Ringkasan tersedia setelah skema dan modul terkait selesai.' }, 503);
 } catch { return json({ error: 'Layanan akun belum tersedia. Silakan coba kembali.' }, 503); }
};
export const config = { path: '/api/manager/dashboard' };
