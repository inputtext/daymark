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

3. Create a migration via the CLI:

   ```bash
   npx @insforge/cli db migrations new create_tasks
   ```

   Copy the contents of `migrations/001_create_tasks.sql` into the **newly created migration file** printed by the command. Then run:

   ```bash
   npx @insforge/cli db migrations up --all
   ```

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
- `migrations/001_create_tasks.sql` — database, grants and RLS policies
- `vercel.json` — SPA hosting rewrites

## Security notes

Task rows are owned by the authenticated InsForge user. The SQL migration grants table access to `authenticated`, revokes access from `anon`, and uses owner-only RLS policies on SELECT, INSERT, UPDATE and DELETE. The app never exposes an admin/service key to the browser. Browser demo data is **not** uploaded to cloud and should not be used to store sensitive tasks.
