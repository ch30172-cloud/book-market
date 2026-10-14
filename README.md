# Sefer Hozer — ספר חוזר

A small Hebrew, RTL second-hand book classifieds board for Israel's Haredi community. Next.js App Router, TypeScript, Tailwind, Prisma, sharp. Buyers contact sellers directly: no payments, shipping or chat.

## Local setup

Requires Node.js 22+ and npm. SQLite development needs no database server.

```sh
npm install
cp .env.example .env
```

On PowerShell use `Copy-Item .env.example .env`. Run `node scripts/configure-local.mjs` to generate random local secrets, or set `ADMIN_PASSWORD` to a unique password and set **both** `SESSION_SECRET` and `OTP_SECRET` to different random values of at least 32 characters. The script preserves existing custom secrets. Read your generated admin password from the local `.env` file. Set `APP_URL` to the exact origin used in the browser (including port).

```sh
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000. Twenty Hebrew demo listings use original illustrated placeholder covers and non-real demo phone numbers. Remove demo listings before launch. Seed is non-destructive and skips an existing database. SQLite lives at `prisma/dev.db`; processed WebP files live in `storage/` and are served only for public, current listings (authenticated admins can also inspect pending images).

## Everyday flows

- Browse `/`, search with GET parameters, filter, paginate and view `/listing/[id]` without JavaScript.
- Submit `/post` with 1–3 photos. Request SMS or voice for kosher/landline phones. In development, the **server console** logs a 6-digit mock OTP. Enter it at the secret verification link.
- After verification, save `/manage/[token]`. It is the seller's credential; anyone holding it can edit, extend, mark sold, or remove the listing. There is no recovery mechanism in this MVP.
- Phone reveal is a rate-limited POST returning a small, uncached Hebrew document with phone, `tel:` and WhatsApp links. No JavaScript is required. Phone numbers and management tokens are absent from public listing projections and initial HTML/RSC. There are no public list APIs or sitemap.
- `/admin`: log in with `ADMIN_PASSWORD`, filter listings, approve/remove/mark sold, handle reports, and block phones. Blocking also removes current listings. Unverified, expired, removed or blocked listings cannot be approved.

JavaScript adds local image previews only to essential forms. Preview is optional; HTML forms upload normally without it. There are no external fonts, scripts, analytics, image requests, CDNs or other page resources. The WhatsApp link intentionally navigates to an external service **only when selected**. System fonts only. Layout decoration is local CSS/SVG; sample covers are clearly labeled illustrations, not real photographs.

## Settings

See `.env.example` for all settings. `REQUIRE_ADMIN_APPROVAL=true` keeps verified listings pending until approval. Configurable JSON keyword matches also force pending, including after edits. `SHABBAT_NOTICE` displays a banner without blocking posting. `CONTACT_PHONE` configures the contact page. `STORAGE_DIR` selects the disk directory; `ImageStorage` in `lib/storage.ts` is the S3 replacement boundary. Never expose this directory directly through a public static server.

`OTP_PROVIDER=mock` logs codes for development. Production refuses mock unless `ALLOW_MOCK_OTP=true` is deliberately set for a private demonstration. Before public launch implement `IsraeliProvider.sendSms` and `.sendVoiceCall` in `lib/otp.ts` using your chosen provider's documented API and `ISRAEL_SMS_API_URL` / `ISRAEL_SMS_API_KEY`. The real provider is an explicit fail-closed stub; it never pretends a message was sent. Codes are HMAC-bound to a listing, last ten minutes, allow five attempts, and can be consumed once. Resend replaces the previous code. Voice and SMS share limits.

Wanted-book requests store keywords and phone only. They do not send notifications; the UI makes this clear.

## Checks

```sh
npm test
npm run typecheck
npm run build
npm run test:smoke
```

The database integration suite uses a temporary SQLite database (`npm run test:integration`), covering actual OTP issue/verify/replay, attempt limits, blocking, moderation, rate limiting and expiry. Unit tests cover normalization, code binding, mock transports and expiry boundaries. After building and configuring local secrets, `npm run test:smoke` creates an isolated SQLite database and upload directory, starts a temporary production server and exercises real HTML/HTTP forms, image conversion, OTP, privacy, moderation, reports and admin/seller controls. Both suites clean up their temporary data without modifying the development database.

## Lifecycle job

```sh
npm run expire
```

Run daily using cron or Windows Task Scheduler in the project directory with the environment configured. The script expires active/pending listings and logs a one-time reminder hook three days before expiry, without logging phone or management links. It also prunes old OTP/rate-limit records. Public queries immediately hide expired listings even if the job has not run. Extending renews for 30 days from the current time. Sold/removed listings do not reappear.

## Docker Compose + PostgreSQL

The two schema files differ only by datasource provider. App code and model fields are identical. Run `node scripts/sync-postgres-schema.mjs` after model edits to keep them aligned. SQLite data is not automatically transferred to PostgreSQL.

1. Configure `.env` with real random secrets, a strong `POSTGRES_PASSWORD` (URL-safe characters), public HTTPS `APP_URL`, and a completed real OTP provider. Do not publish mock verification.
2. Build and initialize a fresh database:

```sh
docker compose build
docker compose up -d db
docker compose run --rm app npx prisma db push --schema prisma/schema.postgres.prisma
# Optional private demo only:
docker compose run --rm app npm run db:seed
docker compose up -d app
```

`db push` initializes the MVP schema. Before evolving a populated production database, create and review Prisma migrations in staging rather than using destructive schema pushes. Never use `--accept-data-loss` on production.

3. Put an HTTPS reverse proxy in front of `127.0.0.1:3000`. The app runs as the unprivileged `node` user; images and Postgres persist in named volumes. Back up **both** volumes. Scale a single app instance for local-disk storage; replace storage with S3 before scaling across hosts.
4. Schedule `docker compose exec -T app npm run expire` daily. Monitor job failures and provider delivery errors.

Docker isn't required for local development. To use PostgreSQL outside Docker, set its connection URL, run `npm run db:postgres`, then `npx prisma db push --schema prisma/schema.postgres.prisma`. To switch back, restore the SQLite URL and run `npm run db:generate`.

## Deployment boundaries and safety

- Set proxy request body limits to **17MB** (e.g. nginx `client_max_body_size 17m`). Each decoded image is limited to 40 million pixels and each file to 5MB. sharp validates format, applies rotation, resizes to at most 1000px wide / 1400px high, converts to WebP and strips metadata. Failed uploads are cleaned up. Removal denies image access immediately; seller deletion also removes files.
- Set `TRUST_PROXY=true` **only** when your sole reachable reverse proxy overwrites `X-Forwarded-For` with the real client address. Direct Node requests otherwise share a conservative `local` IP bucket. Never accept user-supplied forwarding headers from the public Internet.
- Database fixed-window limits: posting 10/IP/hour and 10/phone/day, OTP 3/phone/hour and 10/IP/hour, verification 30/IP/hour, reveal 20/IP/hour and 5/listing/IP/hour, admin login 5/IP/15 minutes, reports 5/IP/hour, wanted requests 3/IP/day. Fixed-window edges can allow adjacent-window bursts. Verification enforces the 10 current verified active/pending listing cap transactionally.
- Signed HttpOnly, SameSite=Strict admin cookies expire in eight hours and are Secure in production. Rotate `SESSION_SECRET` to revoke sessions. Protect the origin with HTTPS and restrict administrative access at the proxy if needed.
- Mutation endpoints reject foreign origins and cross-site fetches. No-Origin legacy browsers remain supported; SameSite cookies and unguessable management credentials protect privileged operations. React escapes text; field lengths, enums, integer prices, phone patterns, and uploads are validated server-side.
- Phone reveal throttling reduces scraping; it is not a guarantee against a determined distributed scraper. Contact details are intentionally accessible after a buyer requests them.
- Configured keyword files must contain a JSON string array; errors fail closed. Do not commit `.env`, databases, upload data or management links. Mock codes are the only intentional development-only OTP logs.

## Structure

`app/` pages and POST endpoints; `components/` server UI and optional image preview; `lib/` business rules, Prisma, OTP, sessions, moderation and storage; `prisma/` SQLite/Postgres schemas and seed; `config/` keyword list; `scripts/` daily expiry; `tests/` unit/integration checks. Keep business logic out of client components.
