# Produla

Produla is a React 19 + Vite application with Supabase-backed artist profiles, releases, audio, and marketplace features, plus an Electron desktop build.

## Cloudflare Pages deployment

Connect this repository to **Cloudflare Pages** using Git integration and configure:

| Setting | Value |
| --- | --- |
| Framework preset | React (Vite) |
| Production branch | `main` |
| Root directory | `/` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js | `22` (selected by `.node-version`) |

Do not set `VITE_BASE_PATH` for Cloudflare Pages. Cloudflare serves the site from the domain root, and `vite.config.js` explicitly uses `/` when the `CF_PAGES` build variable is present.

The `public/_redirects` file enables the single-page-app fallback so direct visits and refreshes on client-side URLs serve `index.html`.

Cloudflare Pages installs dependencies from `package.json`. The previous lockfile was generated for a different app (it listed `better-auth`, omitted this project's Supabase and Electron dependencies, and did not match `package.json`), so it has been removed rather than allowing clean Pages builds to install from a stale dependency graph.

## GitHub Pages

The GitHub Pages workflow builds the same app with `VITE_BASE_PATH=/Produla.com/`, because GitHub Pages hosts this repository under a project subpath. Keep this setting separate from Cloudflare Pages.

## Local development

```sh
npm install
npm run dev
```

## Windows desktop build

```sh
npm install
npm run desktop
```
