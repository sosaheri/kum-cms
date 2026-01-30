import { fetchCollection, saveCollection } from './data.js';
import { initEmail, sendEmailForm } from './email.js';
import { render, loadTheme } from './templates.js';

export const Core = {
    async init(config) {
        this.config = config;
        console.debug('Core.init - config.theme =', config && config.theme);
        // --- Intentar cargar el theme activo: index -> partials -> fallback ---
        try {
            if (config && config.theme) {
                const loaded = await this._tryLoadThemeIndex(config.theme);
                console.debug('_tryLoadThemeIndex returned', loaded, 'for', config.theme);
                if (!loaded) {
                    // no hay index específico, intentar cargar partials
                    const manifest = await loadTheme(config.theme || 'default');
                    // ensure theme stylesheet points to selected theme
                    const themeLink = document.getElementById('theme-stylesheet');
                    if (themeLink) themeLink.href = `themes/${config.theme}/theme.css`;
                    // ensamblar partials en el theme root según orden del manifest
                    let root = document.getElementById('theme-root');
                    if (!root) {
                        root = document.createElement('div');
                        root.id = 'theme-root';
                        document.body.appendChild(root);
                    }
                    root.innerHTML = '';
                    if (manifest && manifest.length) {
                        for (const name of manifest) {
                            const p = await import('./templates.js').then(m => m.getPartial(name));
                            if (p) root.insertAdjacentHTML('beforeend', p);
                        }
                        console.debug('Theme', config.theme, 'partials mounted:', manifest);
                    } else {
                        console.warn('No manifest or partials for theme', config.theme);
                    }

                    // try to load optional theme script (check existence first to avoid 404 noise)
                    try {
                        const scriptUrl = `${location.origin}/themes/${config.theme}/theme.js`;
                        const head = await fetch(scriptUrl, { method: 'HEAD' });
                        if (head.ok) {
                            await import(/* webpackIgnore: true */ scriptUrl);
                            console.debug('Loaded theme script:', scriptUrl);
                        } else {
                            console.debug('No theme script found at', scriptUrl);
                        }
                    } catch (e) { console.debug('HEAD check for theme script failed', e); }
                }
            } else {
                await loadTheme('default');
            }
        } catch (e) {
            console.warn('No se pudo cargar partials/index del theme:', e);
            this._showThemeFallback('Error cargando theme. Revisa la consola.');
        }

        // If nothing was mounted into the theme-root, try to fallback to the default theme
        try {
            const root = document.getElementById('theme-root');
            if (!root || !root.innerHTML.trim()) {
                console.debug('No theme content mounted, attempting default fallback');
                const fallbackIndex = await this._tryLoadThemeIndex('default');
                if (!fallbackIndex) {
                    const fallbackManifest = await loadTheme('default');
                    if (fallbackManifest && fallbackManifest.length) {
                        let r = document.getElementById('theme-root');
                        if (!r) {
                            r = document.createElement('div'); r.id = 'theme-root'; document.body.appendChild(r);
                        }
                        r.innerHTML = '';
                        for (const name of fallbackManifest) {
                            const p = await import('./templates.js').then(m => m.getPartial(name));
                            if (p) r.insertAdjacentHTML('beforeend', p);
                        }
                        console.debug('Default theme partials mounted as fallback:', fallbackManifest);
                    } else {
                        this._showThemeFallback('No default theme available.');
                    }
                }
            }
        } catch (e) {
            console.warn('Error during fallback load:', e);
        }

        // --- Fondo Animado (Tu lógica original) ---
        this.initBG();

        // --- Observer (Tu lógica original) ---
        this.initObserver();

        // --- Menú (Tu lógica original) ---
        this.initMenu();

        // --- Carga de Colecciones Dinámicas (JSON) ---
        await this.loadCollections();

        // --- EmailJS ---
        if (this.config.emailKey) initEmail(this.config.emailKey);
        this.initForm();

        // Modal: close when clicking outside content
        const modal = document.getElementById('project-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal();
                }
            });
        }
    },

    initBG() {
        const cvs = document.getElementById('bg-canvas');
        if(!cvs) return;
        const ctx = cvs.getContext('2d');
        let dots = [];
        const resize = () => {
            cvs.width = window.innerWidth;
            cvs.height = window.innerHeight;
            dots = Array.from({length: 40}, () => ({
                x: Math.random()*cvs.width,
                y: Math.random()*cvs.height,
                vx: (Math.random()-0.5)*0.4,
                vy: (Math.random()-0.5)*0.4
            }));
        };
        const animate = () => {
            ctx.clearRect(0,0,cvs.width,cvs.height);
            ctx.fillStyle = "rgba(56,189,248,0.15)";
            dots.forEach(d => {
                ctx.beginPath(); ctx.arc(d.x, d.y, 2, 0, Math.PI*2); ctx.fill();
                d.x += d.vx; d.y += d.vy;
                if(d.x > cvs.width || d.x < 0) d.vx *= -1;
                if(d.y > cvs.height || d.y < 0) d.vy *= -1;
            });
            requestAnimationFrame(animate);
        };
        resize(); animate(); window.onresize = resize;
    },

    initObserver() {
        const obs = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if(e.isIntersecting) {
                    e.target.classList.add('active-slide');
                    const id = e.target.getAttribute('id');
                    document.querySelectorAll('.nav-container a').forEach(l => 
                        l.classList.toggle('active-nav', l.getAttribute('href') === `#${id}`)
                    );
                }
            });
        }, { threshold: 0.2 });
        document.querySelectorAll('section').forEach(s => obs.observe(s));
    },

    initMenu() {
        const hb = document.getElementById('hamburger');
        const nav = document.getElementById('main-nav');
        if(hb && nav) hb.onclick = () => nav.classList.toggle('active');
    },

    async _tryLoadThemeIndex(name) {
        if (!name) return false;
        try {
            const res = await fetch(`themes/${name}/index.html`);
            if (!res.ok) { console.debug('_tryLoadThemeIndex fetch not ok', res.status, name); return false; }
            const text = await res.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');

            // Replace document title if provided
            const t = doc.querySelector('title');
            if (t) document.title = t.innerText;

            // If the fetched index.html has an empty body, ignore it and fall back to partials
            const bodyHtml = (doc.body && doc.body.innerHTML) ? doc.body.innerHTML.trim() : '';
            if (!bodyHtml) { console.debug('_tryLoadThemeIndex: fetched index has empty body for', name); return false; }

            // Keep/ensure the theme stylesheet link has the id 'theme-stylesheet'
            const themeLink = document.getElementById('theme-stylesheet');
            if (themeLink) themeLink.href = `themes/${name}/theme.css`;
            else {
                const l = document.createElement('link');
                l.id = 'theme-stylesheet';
                l.rel = 'stylesheet';
                l.href = `themes/${name}/theme.css`;
                document.head.appendChild(l);
            }

            // Insert fetched body into theme root instead of replacing the whole body
            let root = document.getElementById('theme-root');
            if (!root) {
                root = document.createElement('div');
                root.id = 'theme-root';
                document.body.appendChild(root);
            }
            root.innerHTML = doc.body.innerHTML;

            console.debug('_tryLoadThemeIndex: mounted index.html body for', name);

            // If the theme provided inline <script> tags in body, they won't execute when injected as HTML.
            // We avoid auto-executing arbitrary scripts for safety; theme authors should provide partials instead.

            // Try to load optional theme script (themes/<name>/theme.js) as a module
            try {
                const scriptUrl = `${location.origin}/themes/${name}/theme.js`;
                await import(/* webpackIgnore: true */ scriptUrl);
                console.debug('Loaded theme script:', scriptUrl);
            } catch (e) { console.debug('No theme.js module loaded for', name, e); }

            return true;
        } catch (e) {
            return false;
        }
    },

    _showThemeFallback(message) {
        let root = document.getElementById('theme-root');
        if (!root) {
            root = document.createElement('div');
            root.id = 'theme-root';
            document.body.appendChild(root);
        }
        // If already has content, keep it. Otherwise show a small banner explaining the issue.
        if (!root.innerHTML.trim()) {
            const b = document.createElement('div');
            b.id = 'theme-fallback';
            b.style.cssText = 'padding:12px;background:#fee; color:#611; border:1px solid #fbb; font-weight:700; text-align:center;';
            b.innerText = message || 'No se pudo cargar el theme. Aplicando fallback.';
            root.appendChild(b);
        }
    },

    async loadCollections() {
        if (!this.config.collections) return;
        for (const col of this.config.collections) {
            const container = document.getElementById(col.containerId);
            if (!container) continue;
            try {
                const data = await fetchCollection(col.jsonPath);
                data.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'grid-card-item';
                    div.innerHTML = render(col.template, item);
                    div.onclick = () => this.openModal(item, col.modalTemplate);
                    container.appendChild(div);
                });
            } catch (e) { 
                console.error("Error cargando colección:", col.jsonPath, e);
                // Fallback: usar datos embebidos en la configuración si están disponibles
                if (col.fallback && Array.isArray(col.fallback)) {
                    col.fallback.forEach(item => {
                        const div = document.createElement('div');
                        div.className = 'grid-card-item';
                        div.innerHTML = render(col.template, item);
                        div.onclick = () => this.openModal(item, col.modalTemplate);
                        container.appendChild(div);
                    });
                }
            }
        }
    },

    openModal(data, templateFn) {
        const modal = document.getElementById('project-modal');
        const inner = document.getElementById('modal-content-inner');
        if(modal && inner) {
            inner.innerHTML = templateFn(data);
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    },

    initForm() {
        const form = document.getElementById('devsec-contact-form');
        if(!form) return;
        form.onsubmit = (e) => {
            e.preventDefault();
            const feedback = document.getElementById('form-feedback');
            const btn = document.getElementById('btn-submit');
            
            btn.innerText = "ENVIANDO...";
            btn.disabled = true;
            // Use email module wrapper which checks for EmailJS availability
            sendEmailForm(this.config.emailService, this.config.emailTemplate, form)
                .then(() => {
                    feedback.innerText = "¡Mensaje enviado con éxito!";
                    form.reset();
                })
                .catch(() => {
                    feedback.innerText = "Error al enviar. Intenta de nuevo.";
                })
                .finally(() => {
                    btn.innerText = "ENVIAR CONSULTA";
                    btn.disabled = false;
                });
        };
    }
,
    async setTheme(name) {
        if (!name) return;
        // Try to load an index first (full theme page). If not present, load partials and mount.
        try {
            const loadedIndex = await this._tryLoadThemeIndex(name);
            if (!loadedIndex) {
                const manifest = await loadTheme(name);
                const themeLink = document.getElementById('theme-stylesheet');
                if (themeLink) themeLink.href = `themes/${name}/theme.css`;
                let root = document.getElementById('theme-root');
                if (!root) {
                    root = document.createElement('div');
                    root.id = 'theme-root';
                    document.body.appendChild(root);
                }
                root.innerHTML = '';
                if (manifest && manifest.length) {
                    for (const nm of manifest) {
                        const p = await import('./templates.js').then(m => m.getPartial(nm));
                        if (p) root.insertAdjacentHTML('beforeend', p);
                    }
                    console.debug('Core.setTheme mounted partials for', name, manifest);
                }
                // try to load optional theme script
                try {
                    const scriptUrl = `${location.origin}/themes/${name}/theme.js`;
                    const head = await fetch(scriptUrl, { method: 'HEAD' });
                    if (head.ok) {
                        await import(/* webpackIgnore: true */ scriptUrl);
                        console.debug('Loaded theme script:', scriptUrl);
                    } else {
                        console.debug('No theme script found at', scriptUrl);
                    }
                } catch (e) { /* ignore network errors */ }
            }
            this.config = this.config || {};
            this.config.theme = name;
        } catch (e) {
            console.warn('Error switching theme to', name, e);
        }
    }
};
export function closeModal() {
    const modal = document.getElementById('project-modal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Expose for inline handlers and legacy code
if (typeof window !== 'undefined') window.closeModal = closeModal;
// Expose Core API globally for console/runtime usage
if (typeof window !== 'undefined') window.Core = Core;

export default Core;