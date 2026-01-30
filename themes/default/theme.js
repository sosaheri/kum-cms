// Dev helper: append cache-busting query to brand image to avoid stale cached PNGs
document.addEventListener('DOMContentLoaded', () => {
	try {
		const img = document.querySelector('.brand-img');
		if (!img) return;
		// Only add parameter when served from same origin (avoid altering external URLs)
		const src = img.getAttribute('src') || img.src;
		if (!src || src.startsWith('http') && new URL(src).origin !== location.origin) return;
		const url = new URL(src, location.href);
		url.searchParams.set('_cb', Date.now());
		img.src = url.href;
		console.debug('theme.js: applied cache-bust to brand-img', img.src);
	} catch (e) { console.debug('theme.js error', e); }
});

