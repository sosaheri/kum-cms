// Data layer: client-side helpers for fetching collections.
export async function fetchCollection(path) {
    // Normalize path: allow passing either '/api/collections/name' or relative file paths like 'data/foo.json'
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Fetch error ${res.status} for ${path}`);
    return res.json();
}

// saveCollection: attempts to call a server API. If no API exists, rejects so callers know it's read-only.
export async function saveCollection(name, items) {
    const apiPath = `/api/collections/${encodeURIComponent(name)}`;
    const res = await fetch(apiPath, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items)
    });
    if (!res.ok) throw new Error(`Save failed ${res.status}`);
    return res.json();
}

// For future: add helpers for markdown parsing or local fallback storage.
