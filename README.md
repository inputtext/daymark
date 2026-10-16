# Daymark — InsForge Todo App

A polished, responsive full-stack todo app powered by **React + Vite + Tailwind CSS 3.4 + InsForge**. Demo mode works without a backend; production mode uses InsForge authentication and per-user PostgreSQL persistence with row-level security.

## Features

- Sign up, sign in, email-code verification and sign out through `@insforge/sdk`
- Create, edit, delete and complete tasks
- Task title, notes, priority and due date
- Today/overdue, upcoming, completed and all-task views
- Search, priority filtering, smart sorting and progress tracking
- Light/dark theme, responsive design, keyboard shortcuts (`N`, `/`, `Ctrl/Cmd+K`)
- Built-in **demo mode** using localStorage, without a backend
- Offline Smart Task Entry: try `Submit assignment tomorrow !high` and press **Apply** to accept the extracted date and priority (no external AI API)
- Backend with PostgreSQL row-level security (users cannot read each other's tasks)

## Local preview

Install [Node.js 20+](https://nodejs.org/), then:

```bash
npm install
npm run dev
```

Open the localhost URL printed by Vite and click **Explore the demo**. The demo persists tasks only in that browser.

## Connect InsForge

1. Sign into [InsForge](https://insforge.dev/) and get an authenticated CLI session.
2. Create an InsForge project from the app root (or link an existing one):

   ```bash
   npx @insforge/cli login
   npx @insforge/cli create
   # For an existing project, use: npx @insforge/cli link
   ```

   **Important:** To preserve this source tree when creating a new project, select the **empty** template if prompted. The CLI creates `.insforge/project.json`. Non-interactive creation requires your organization ID and e.g.:

   ```bash
   npx @insforge/cli create --json --name daymark --org-id YOUR_ORG_ID --region ap-southeast --template empty
   ```

3. The tracked database migration is `migrations/20261016150709_create-tasks.sql`. Apply it if it has not already been applied to the linked backend:

   ```bash
   npx @insforge/cli db migrations list
   npx @insforge/cli db migrations up --all
   ```

   The CLI reporting **no pending local migrations** is normal when the migration has already been applied. Verify the table with `npx @insforge/cli db query "SELECT to_regclass('public.tasks') AS tasks_table;"` if necessary.

4. Copy `.env.example` to `.env` and replace the placeholders:

   ```env
   VITE_INSFORGE_URL=https://YOUR-APPKEY.ap-southeast.insforge.app
   VITE_INSFORGE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
   ```

   Get the URL from `.insforge/project.json` (`oss_host`); get the public anon key with `npx @insforge/cli secrets get ANON_KEY`.

   **Never** put the InsForge full-access admin/API key into client-side Vite variables.

5. Run `npm run dev` again and create an account. When verification is enabled, use the email code or verification link. Tasks will now be persisted to InsForge with RLS.

## Publish on InsForge

After the above backend setup succeeds:

```bash
npm run build
npx @insforge/cli deployments env set VITE_INSFORGE_URL https://YOUR-APPKEY.ap-southeast.insforge.app
npx @insforge/cli deployments env set VITE_INSFORGE_ANON_KEY YOUR_PUBLIC_ANON_KEY
npx @insforge/cli deployments env list
npx @insforge/cli deployments deploy .
```

The deploy command returns the live URL. Hosting uses the project **source directory**, not `dist/`. SPA rewrites are already configured in `vercel.json`. Configure InsForge auth redirect settings if required for your deployed domain.

## Testing

```bash
npm test
npm run build
```

`npm test` runs Node's built-in unit tests for task search, filters, date groups, stats and demo data. Account operations require a live InsForge project for integration testing.

## Files

- `src/App.jsx` — auth screens, dashboard and task management
- `src/lib/insforge.js` — InsForge client setup
- `src/lib/tasks.js` — task sorting/filtering/date utilities
- `src/styles.css` — responsive visual design and dark mode
- `migrations/20261016150709_create-tasks.sql` — database, grants and RLS policies
- `src/lib/smartTask.js` — no-API natural-language task parsing
- `tests/smartTask.test.mjs` — deterministic smart-entry tests
- `vercel.json` — SPA hosting rewrites

## Security notes

Task rows are owned by the authenticated InsForge user. The SQL migration grants table access to `authenticated`, revokes access from `anon`, and uses owner-only RLS policies on SELECT, INSERT, UPDATE and DELETE. The app never exposes an admin/service key to the browser. Browser demo data is **not** uploaded to cloud and should not be used to store sensitive tasks.

## Offline Smart Task Entry

In **New task**, type a title containing a supported marker, for example:

- `Submit assignment tomorrow !high`
- `Plan presentation next week !medium`
- `Buy groceries in 3 days !low`

Daymark shows a non-destructive suggestion preview. Click **Apply** to fill in the task title, calendar due date, and priority; review or edit the fields before saving. Pressing **Add task** without applying suggestions saves exactly what you typed. The parser runs locally, in both demo and signed-in mode, and does not use AI inference or network requests. It does not parse times of day, weekday names, hashtags, or free-form dates yet.
