# Harsh Hardware

Owner bills from a phone call. Delivery staff collect cash or a credit signature. Invoice PDFs and signatures dump to Google Drive.

The live app is **Next.js** in `web/` (Vercel + Neon Postgres + Google Drive). The old FastAPI + Vite app in `backend/` and `frontend/` is only for local history.

## Logins

| Who | Username | Password |
|---|---|---|
| Owner | `admin` | `admin123` |
| Delivery staff | `staff` | `staff123` |

Change these after first login (or set `ADMIN_PASS` / `STAFF_PASS` before seeding).

## Local (Next.js)

1. Create a Neon database at [console.neon.tech](https://console.neon.tech) (free). Copy the **pooled** and **direct** connection strings.
2. In Google Cloud Console, create an OAuth client type **Web application** (the Desktop client in `backend/gdrive-oauth-client.json` will not work on Vercel). Add redirect URI `http://localhost:3000/api/auth/google/callback`.
3. Configure env:

```bash
cd web
cp .env.example .env
# fill DATABASE_URL, DIRECT_URL, JWT_SECRET, ENCRYPTION_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
```

4. Push schema, seed accounts, copy the old SQLite shop if you have one:

```bash
npm install
npx prisma generate
npm run db:push
npm run db:seed
npm run migrate:sqlite   # copies backend/harsh.db → Neon
npm run dev
```

Open **http://localhost:3000**. Sign in as admin → Settings → Connect Google Drive.

## Deploy on Vercel (`parsechaandsons@gmail.com`)

Sign in to [vercel.com](https://vercel.com) with **parsechaandsons@gmail.com**. This machine cannot log into that Gmail.

1. Push this project to GitHub (or GitLab) under that Google account.
2. In Vercel: **Add New… → Project** → import the repo.
3. Set **Root Directory** to `web`.
4. Framework: Next.js. Region: Mumbai (`bom1`) is already in `web/vercel.json`.
5. Environment variables (Production + Preview):

| Name | Value |
|---|---|
| `DATABASE_URL` | Neon **pooled** URL |
| `DIRECT_URL` | Neon **direct** (unpooled) URL |
| `JWT_SECRET` | long random string |
| `ENCRYPTION_KEY` | another long random string |
| `NEXT_PUBLIC_APP_URL` | `https://YOUR-PROJECT.vercel.app` (update after first deploy if the URL changes) |
| `GOOGLE_CLIENT_ID` | Web application client ID |
| `GOOGLE_CLIENT_SECRET` | Web application secret |
| `ADMIN_USER` / `ADMIN_PASS` | owner login |
| `STAFF_USER` / `STAFF_PASS` | staff login |

6. Deploy. Then from your laptop (once), with the same env in `web/.env`:

```bash
cd web
npx prisma db push
npx tsx prisma/seed.ts
npx tsx scripts/migrate-sqlite.ts
```

7. In Google Cloud, add the production redirect URI: `https://YOUR-PROJECT.vercel.app/api/auth/google/callback` (and the JS origin `https://YOUR-PROJECT.vercel.app`).
8. Open the live site → admin → Settings → Connect Google Drive (use the shop Google account).
9. On phones: Chrome (Android) **Install app**, or Safari (iPhone) **Share → Add to Home Screen**. Needs internet; bills are not offline.

## Phone PWA

Installable (icon, full screen, no browser chrome). Not an offline POS.

## Try this path

1. Sign in as **admin**.
2. Open **Stock** — sample SKUs after seed. Optional: import `web/public/sample_inventory.csv`.
3. Open **Billing**. Name a shop, add items, generate the bill.
4. Sign in as **staff**, open today’s receipt, collect cash or take a credit signature.
5. Admin: **Invoices** to print, **Credit** to settle dues. PDFs land in Drive under `Harsh Hardware/invoices/…`.
