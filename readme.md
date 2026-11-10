# MyKost

MyKost provides a public room catalog, booking requests, house rules, complaints, and a React manager workspace at `/manager/`.

Accounts use MyKost usernames and passwords, shared between both pages. New users register with their full name, email, phone, username, password, and a Tenant or Manager role. Manager registration grants immediate access to the shared property's operational data, as requested by the owner. Registration cannot grant SuperAdmin access. Existing provider accounts are not automatically migrated; users create a MyKost account.

Accounts, salted scrypt password hashes, hashed session tokens, rate limits, bookings, complaints, and room statuses are persisted in Netlify Database through Drizzle. Raw passwords are never stored. Session cookies are HttpOnly and SameSite=Lax, with Secure on HTTPS; sessions expire after seven days. Mutations require the same origin. Login and registration are rate limited by IP and normalized username. Tenants only receive their own bookings and complaints; managers can process all requests. Booking approval claims a room atomically. Available/Maintenance status changes cannot override reserved or occupied rooms.

The old artifact runtime and external login are no longer used. Account recovery and migration from the previous login provider are not included.

The catalog's rooms, prices, and house rules are still explicitly marked development placeholders. The React workspace retains its foundation layout and links signed-in managers to the working operational panel at `/#manager`. Financial, invoice, laundry, messaging, and other dashboard modules remain unfinished; booking deadlines are displayed but no automated expiration job is included.

Run `npm install`, `npm run typecheck`, and `npm test`. Use `netlify dev --port 8889` for local HTTP checks. Schema definitions are in `db/schema.ts`; generated migrations in `netlify/database/migrations/` are applied by the platform during deployment. Do not apply them manually. The platform runs build validation.
