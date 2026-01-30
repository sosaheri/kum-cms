// Templates wrapper with optional partials support.
// - `registerPartial(name, html)` to register a partial programmatically.
// - `loadTheme(themeName)` attempts to fetch `themes/<themeName>/partials/manifest.json`
//   which should list partial names (without extension). If present, those
//   partial files are fetched and cached.

const partials = {};

function interpolate(tpl, data) {
    return String(tpl).replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
        const parts = key.split('.');
        let v = data;
        for (const p of parts) {
            if (v == null) return '';
            v = v[p];
        }
        return v == null ? '' : v;
    });
}

export function registerPartial(name, content) {
    partials[name] = String(content || '');
}

export async function loadTheme(themeName = 'default') {
    const base = `themes/${themeName}/partials`;
    try {
        const res = await fetch(`${base}/manifest.json`);
        if (!res.ok) return null;
        const list = await res.json();
        const missing = [];
        await Promise.all(list.map(async (n) => {
            try {
                const r = await fetch(`${base}/${n}.html`);
                if (r.ok) partials[n] = await r.text();
                else missing.push(n);
            } catch (e) { missing.push(n); }
        }));
        if (missing.length) {
            console.warn(`templates.loadTheme: theme '${themeName}' missing partials: ${missing.join(', ')}`);
        } else {
            console.debug('templates.loadTheme:', themeName, 'loaded partials:', Object.keys(partials));
        }
        return list.filter(n => partials[n]);
    } catch (e) { /* manifest not found or network error — ignore */ }
    console.warn('templates.loadTheme: failed to load manifest for theme', themeName);
    return null;
}

export function getPartial(name) {
    return partials[name] || null;
}

export function render(templateFnOrName, data) {
    if (typeof templateFnOrName === 'function') return templateFnOrName(data);
    if (typeof templateFnOrName === 'string') {
        const tpl = partials[templateFnOrName];
        if (!tpl) return '';
        return interpolate(tpl, data || {});
    }
    return String(templateFnOrName || '');
}

export default { render, registerPartial, loadTheme };
