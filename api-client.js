// api-client.js — SmallBiz Advisor API Client
// Thin fetch wrapper with automatic Bearer token injection from Auth.getToken().
// Must be loaded AFTER auth.js and BEFORE app.js.

const ApiClient = (() => {
    const BASE = window.ADVISOR_API_URL || 'http://localhost:8000';

    async function request(method, path, body) {
        const headers = { 'Content-Type': 'application/json' };
        const token = (typeof Auth !== 'undefined') ? Auth.getToken() : null;
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${BASE}${path}`, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            const msg = err.message || err.detail?.message || res.statusText;
            throw Object.assign(new Error(msg), { status: res.status, data: err });
        }

        // 204 No Content — return null
        if (res.status === 204) return null;

        return res.json();
    }

    return {
        get:    (path)        => request('GET',    path),
        post:   (path, body)  => request('POST',   path, body),
        delete: (path)        => request('DELETE', path),
    };
})();
