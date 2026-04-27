# Deploying lpg_gas_app on cPanel (Node.js + MySQL/MariaDB)

This guide walks you through deploying this Next.js 16 + Prisma application
on shared cPanel hosting using the built-in **Setup Node.js App** (Passenger)
feature and a **MySQL / MariaDB** database.

The instructions assume:

- cPanel ≥ 100 with **Setup Node.js App** (or **Application Manager**) enabled.
- Node.js **20.x** available in the cPanel Node version dropdown.
- The app will live on the **main domain** (`https://your-domain.com`).
- You're starting with an **empty database** (no data migration from
  the local PostgreSQL instance).

---

## 0. Prerequisites on your machine

```bash
# Install dependencies and produce a clean production build LOCALLY first.
npm install
npm run build
```

`npm run build` runs `prisma generate && next build`, producing:

- `node_modules/.prisma/client/` – generated Prisma client.
- `.next/` – the compiled Next.js production bundle.

Both are required on the server but the server will regenerate Prisma on
`npm install` (we wired up a `postinstall` hook for that).

---

## 1. Create the MySQL database in cPanel

1. cPanel → **Databases → MySQL Databases**.
2. **Create New Database** — give it a short name, e.g. `lpg_gas_app`.
   cPanel will prefix it with your account name → final name looks like
   `cpaneluser_lpg_gas_app`. Write that full name down.
3. **Add New User** — strong password, write it down. cPanel will prefix
   the username too: `cpaneluser_lpg`.
4. **Add User To Database** — grant **ALL PRIVILEGES**.
5. Open **phpMyAdmin** (cPanel → Databases → phpMyAdmin), select the new
   DB, click **Operations** → confirm the database collation is
   `utf8mb4_unicode_ci`. If it's something else, change it now (this
   is what makes our case-insensitive search work after dropping
   Prisma's `mode: 'insensitive'`).

Your connection string will be:

```
mysql://cpaneluser_lpg:URL_ENCODED_PASSWORD@localhost:3306/cpaneluser_lpg_gas_app
```

If the password contains `@`, `#`, `/`, `:`, `?`, `&`, `=`, `+`, `%`, or
spaces, **URL-encode** them:

| Character | Encoded |
|-----------|---------|
| `@`       | `%40`   |
| `#`       | `%23`   |
| `/`       | `%2F`   |
| `:`       | `%3A`   |
| `?`       | `%3F`   |
| `&`       | `%26`   |
| `+`       | `%2B`   |
| ` `       | `%20`   |

---

## 2. Upload the project to your account

You have three options. Pick whichever you can do.

### Option A — Git deploy (recommended)
1. cPanel → **Files → Git Version Control** → **Create**.
2. Pick a repo URL or use cPanel's local repo, set **Repository Path** to
   something like `/home/cpaneluser/repos/lpg_gas_app`. **Do not** point it
   directly at `public_html` — we want the app outside the document root.
3. After clone, you'll have the source on the server.

### Option B — Upload a zip via File Manager
1. Run locally:
   ```bash
   # Strip dev caches and the gigantic .next/dev folder before zipping
   npm run build
   # Then zip everything EXCEPT: .next/dev, node_modules, .git, *.backup, *.log
   ```
2. cPanel → **Files → File Manager** → upload zip → **Extract** into
   `/home/cpaneluser/lpg_gas_app/`.

### Option C — SFTP (FileZilla / WinSCP)
Same destination directory: `/home/cpaneluser/lpg_gas_app/`.

The final layout on the server should be:

```
/home/cpaneluser/lpg_gas_app/
├── .next/              ← from `npm run build` (you'll rebuild on server too)
├── prisma/
├── public/
├── scripts/
├── src/
├── server.js           ← cPanel Passenger entry point
├── next.config.ts
├── package.json
└── ...
```

> Do **NOT** upload `.env` or the local `.next/dev` folder. `.env` will be
> set inside cPanel's UI (step 4); `.next/dev` is a turbopack dev cache and
> can be 100s of MB.

---

## 3. Create the Node.js application in cPanel

1. cPanel → **Software → Setup Node.js App** → **Create Application**.
2. Fill in:

   | Field                          | Value                                                |
   |--------------------------------|------------------------------------------------------|
   | **Node.js version**            | `20.x` (latest 20 in the dropdown)                   |
   | **Application mode**           | `Production`                                         |
   | **Application root**           | `lpg_gas_app` (the folder we uploaded into)          |
   | **Application URL**            | your main domain (`your-domain.com`)                 |
   | **Application startup file**   | `server.js`                                          |
   | **Passenger log file**         | leave default                                        |

3. Click **Create**. cPanel creates a Node virtualenv and assigns a port.

---

## 4. Set environment variables

Still on the **Setup Node.js App** screen, scroll to **Environment
variables** and add:

| Name              | Value                                                                        |
|-------------------|------------------------------------------------------------------------------|
| `NODE_ENV`        | `production`                                                                 |
| `DATABASE_URL`    | `mysql://cpaneluser_lpg:URL_ENCODED_PASSWORD@localhost:3306/cpaneluser_lpg_gas_app` |
| `NEXTAUTH_SECRET` | a 64-char random string (see below)                                          |
| `NEXTAUTH_URL`    | `https://your-domain.com` (must match what users actually type)              |

Generate `NEXTAUTH_SECRET` locally **once** and paste it into cPanel:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Click **Save**, then **Restart** the app (the buttons are at the top of
the same page).

> Never commit these values to git. `.env` should remain absent on the
> server — Passenger reads them from the cPanel UI directly.

---

## 5. Install dependencies & build on the server

cPanel gives you a one-line command at the top of **Setup Node.js App**
that "enters" the Node virtualenv. It looks like:

```
source /home/cpaneluser/nodevenv/lpg_gas_app/20/bin/activate && cd /home/cpaneluser/lpg_gas_app
```

Run that, then:

```bash
# Install runtime deps (postinstall regenerates Prisma client automatically)
npm install --omit=dev

# Sync Prisma schema → MySQL  (creates all tables on a fresh DB)
npx prisma db push

# OR, if you prefer migrations history:
# npx prisma migrate deploy

# Seed the initial SUPER_ADMIN user — copy the printed password!
node scripts/create-admin-user.js

# (Optional) build on the server too — only needed if `.next/` wasn't
# uploaded or if any source changed during upload.
npm run build
```

If `npm install` fails on memory limits, increase the **Node.js process
memory** in the cPanel app screen, or run in two passes:

```bash
NODE_OPTIONS="--max-old-space-size=2048" npm install --omit=dev
```

---

## 6. Start / restart the app

In **Setup Node.js App**:

1. Click **Restart**.
2. Open **Stderr Log** / **Passenger log file** to confirm you see:

   ```
   > Next.js server ready on http://0.0.0.0:<PORT> (NODE_ENV=production)
   ```

If the log shows `prisma:warn The database url is invalid` or
`Error: P1001`, your `DATABASE_URL` is wrong (most often: missing
URL-encoding for the password).

---

## 7. Point the domain at the Node app

In most cPanel setups, **Setup Node.js App** automatically writes a
`.htaccess` file in `public_html` that proxies traffic to Passenger.

If your app shows the default cPanel page or "Index of /", check
`/home/cpaneluser/public_html/.htaccess`:

```apache
PassengerNodejs /home/cpaneluser/nodevenv/lpg_gas_app/20/bin/node
PassengerAppRoot /home/cpaneluser/lpg_gas_app
PassengerAppType node
PassengerStartupFile server.js
```

If those lines aren't there, edit/create the file with the values
**Setup Node.js App** shows in the "Detected configuration" section.

---

## 8. Enable HTTPS

1. cPanel → **Security → SSL/TLS Status**.
2. Tick your domain → **Run AutoSSL**. cPanel issues a free Let's
   Encrypt cert in 1–5 minutes.
3. cPanel → **Domains → Domains** → toggle **Force HTTPS Redirect** on.

After SSL is live, `NEXTAUTH_URL` (step 4) **must** start with `https://`
or login redirects will break.

---

## 9. Smoke test

Open the app in a browser:

| Endpoint                | Expected                              |
|-------------------------|---------------------------------------|
| `https://your-domain.com/`              | Landing/login page renders            |
| `https://your-domain.com/api/health`    | If the route exists, JSON `{ ok: true }` |
| Login with seeded admin | Successful → redirects to dashboard   |

Then:

1. Open Chrome DevTools → **Network** → log in. The session cookie
   `__Secure-next-auth.session-token` should be set with `Secure` and
   `HttpOnly` flags.
2. **Inventory → Cylinders** loads → confirms Prisma is reaching MySQL.
3. Search any text field — case insensitivity should still work
   thanks to the `utf8mb4_unicode_ci` collation we set in step 1.

---

## 10. Deploying updates

For every future deploy:

```bash
# locally:
git push                    # if using Git deploy
# or upload only changed files via File Manager / SFTP

# on the server, inside the Node venv:
git pull                    # if using Git deploy
npm install --omit=dev      # only if package.json changed
npx prisma db push          # only if prisma/schema.prisma changed
npm run build
```

Then click **Restart** in **Setup Node.js App**. Always restart after a
build — Passenger keeps the old `.next` cached otherwise.

---

## Troubleshooting

### "Application failed to start" / 503 from Passenger
- Check **Stderr Log** under Setup Node.js App.
- Most common: missing `.next/` (run `npm run build`), wrong `DATABASE_URL`,
  or wrong startup file (must be `server.js`, not `index.js`).

### `PrismaClientInitializationError: P1001 Can't reach database server`
- Wrong host, port, or credentials in `DATABASE_URL`.
- Double-check the password is URL-encoded.
- Confirm the user is granted ALL PRIVILEGES on the DB in cPanel
  → MySQL Databases.

### `Unknown collation: 'utf8mb4_0900_ai_ci'`
- Your cPanel server runs MariaDB, not MySQL 8. Re-export the schema
  with collation `utf8mb4_unicode_ci`:
  ```bash
  npx prisma db push --skip-generate
  ```
  After this Prisma writes columns with the DB's default collation, which
  matches what we set in step 1 (`utf8mb4_unicode_ci`). MariaDB-compatible.

### Sessions log out immediately
- `NEXTAUTH_URL` doesn't match the URL the user types (e.g. http vs
  https, or trailing slash).
- `NEXTAUTH_SECRET` is missing or changed between restarts (rotating
  the secret invalidates all existing sessions; do this only intentionally).

### `EACCES: permission denied, open '.next/...'`
- File ownership is wrong — files were uploaded as root or via SSH as a
  different user. Fix:
  ```bash
  chown -R cpaneluser:cpaneluser /home/cpaneluser/lpg_gas_app
  chmod -R u+rwX /home/cpaneluser/lpg_gas_app
  ```

### `MODULE_NOT_FOUND: Cannot find module '@prisma/client'`
- `postinstall` didn't run. From inside the Node venv:
  ```bash
  npx prisma generate
  ```
  Then **Restart** the app.

---

## Security checklist (already wired up in this repo)

- [x] HTTPS forced (cPanel AutoSSL + Force HTTPS Redirect).
- [x] `NEXTAUTH_SECRET` is a fresh 48-byte random value, stored only in
      cPanel env vars (never in git).
- [x] Strong DB password, URL-encoded in the connection string.
- [x] Database user has access to **only** this single database.
- [x] Security headers (CSP, HSTS, X-Frame-Options, …) configured in
      `next.config.ts`.
- [x] Auth proxy (`src/proxy.ts`) verifies JWTs and blocks unauthenticated
      traffic.
- [x] Rate limiting on login (`src/lib/rateLimit.ts` + `src/lib/auth.ts`).
- [ ] **You must rotate** the seeded admin password immediately after
      first login.
- [ ] Schedule daily DB backups in cPanel → **Files → Backup** or via
      **Backup Wizard**.

---

If you hit anything not listed here, capture the exact text from the
**Passenger log file** and the **Setup Node.js App** "Stderr Log" — those
two together pinpoint 95% of cPanel Node deploy issues.
