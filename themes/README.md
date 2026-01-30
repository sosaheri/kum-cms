Theme convention

Overview
- Each theme lives under `themes/<name>/` and provides the HTML, CSS and optional JS needed to render a full site.
- The project root `index.html` is the CMS skeleton: it contains head assets and a mount point `#theme-root`. The loader inserts theme HTML into that element.

Required files
- `theme.css` — stylesheet for the theme.
- `partials/manifest.json` — ordered array of partial names (e.g. `["header","hero","features"]`).
- `partials/<name>.html` — the partial HTML fragments referenced in the manifest.

Optional files
- `index.html` — a complete static page inside the theme folder. The loader will fetch this file and use its `<body>` if present and non-empty; this is useful for a standalone preview of the theme.
- `theme.js` — an ES module that the loader will import dynamically if present (used to initialize menus, listeners, or theme-specific behaviors). Prefer this over inline scripts inside partials.

How the loader works (summary)
1. `lib/framework/core.js` reads the active theme from the `SITE_CONFIG` you pass into `Core.init()` (or from `Core.setTheme(name)` at runtime).
2. It attempts to fetch `themes/<name>/index.html`. If the file exists and its `<body>` contains content, that HTML is injected into `#theme-root` and used as the page.
3. If the theme `index.html` is absent or has an empty body, the loader fetches `themes/<name>/partials/manifest.json` and then fetches each `partials/<partial>.html` in order, appending their HTML into `#theme-root`.
4. The loader updates the `#theme-stylesheet` link to `themes/<name>/theme.css` so styles come from the active theme.
5. If `themes/<name>/theme.js` exists, the loader imports it as an ES module (so the theme can run initialization code safely).

Best practices and notes
- Prefer partials + `theme.js` instead of inline `<script>` tags inside partials. Inline scripts won't execute when injected via `innerHTML`.
- Keep images and static assets inside `themes/<name>/assets/` and reference them with relative paths (`assets/img.png`).
- Test themes using a local HTTP server (e.g., `python -m http.server 9090`) because `fetch()` requires HTTP.

Quick start: create a new theme from `default`
1. Copy the `themes/default/` folder to `themes/mytheme/`.
2. Edit `themes/mytheme/theme.css` to change colors, variables and layout rules.
3. Edit or add partials in `themes/mytheme/partials/` and update `partials/manifest.json` to reflect the desired order.
4. (Optional) Add `themes/mytheme/theme.js` with an ES module that initializes interactive behavior (menu toggles, dropdowns, modal handlers). Example minimal `theme.js`:

```javascript
// themes/mytheme/theme.js
document.addEventListener('DOMContentLoaded', () => {
  const hb = document.getElementById('hamburger');
  const nav = document.getElementById('main-nav');
  if (hb && nav) hb.addEventListener('click', () => nav.classList.toggle('active'));
});
```

5. (Optional) Create `themes/mytheme/index.html` for a full preview build — the loader will prefer this file if its `<body>` is non-empty.
6. Update the active theme in `js/config.js` by setting `theme: 'mytheme'` and reload the site, or call `Core.setTheme('mytheme')` from the console.

How to test quickly
1. From the project root run:

```bash
python -m http.server 9090
```

2. Open `http://localhost:9090` in a browser, open DevTools → Network and Console, and verify the loader fetches `themes/<name>/partials/manifest.json` and the partials, and that `#theme-root` receives the HTML.

If something breaks
- Check DevTools → Network for 404s when fetching `manifest.json`, partials or `theme.css`.
- Check Console for `templates.loadTheme:` and `Theme ... partials mounted:` debug lines added to help diagnosis.
- If a theme needs complex scripts, put them in `theme.js` (module) so they execute reliably.

Contributing
- When editing a theme, prefer small, focused partials. Keep the manifest order explicit and stable.
- Document any theme-specific initialization in `themes/<name>/README.md` if the theme requires special steps.

Standalone build (`build-standalone`)
-----------------------------------
The repository includes a helper script to produce a self-contained preview of a theme called `build-standalone`.

- What it does:
  - Assembles the theme partials (or uses `themes/<name>/index.html` if present) into a single HTML file.
  - Inlines `lib/framework/core.css` and `themes/<name>/theme.css` into a `<style>` tag so no external CSS files are required.
  - Inlines the JSON files from the project's `data/` folder into a small runtime shim that intercepts `fetch()` for requests matching `data/*.json`. This lets the page run without separate JSON files.

- Use cases:
  - Produce a portable preview of a theme to send to designers or clients.
  - Deploy a static, standalone HTML preview on any static host without requiring the mini-CMS runtime server.
  - Quick local verification when building themes (no partials/manifest fetches at runtime).

- How to run:

```bash
# from project root
node scripts/build-standalone.js default
# Output: themes/default/index-standalone.html
```

- Notes & limitations:
  - The script inlines CSS and data but does not currently inline or bundle the JavaScript modules (`js/*.js` or `lib/framework/*.js`). The assembled HTML will still load your app scripts as normal, but data and CSS are embedded to avoid network fetches for those resources.
  - If you need a 100% JS-bundled single file (including module resolution), consider using a bundler (esbuild/rollup) configured to produce a single ESM bundle — I can add an optional esbuild-based flow if you want.



