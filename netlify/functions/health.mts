import { json, methodGuard } from '../../server/access.js';
export default async (req: Request) => methodGuard(req) ?? json({ status: 'ok', service: 'kostpro' });
export const config = { path: '/api/health' };
