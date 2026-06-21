// auth.js — SmallBiz Advisor Auth Layer
// No framework. Vanilla JS. Manages JWT in memory (not localStorage for security).
// Must be loaded BEFORE api-client.js and BEFORE app.js.

const Auth = (() => {
    const API_BASE = window.ADVISOR_API_URL || 'http://localhost:8000';

    // In-memory only — never persisted to localStorage or sessionStorage.
    let _token = null;
    let _user = null;
    const _listeners = [];

    function _notify() {
        _listeners.forEach(cb => {
            try { cb({ loggedIn: !!_token, user: _user }); } catch (e) { /* ignore */ }
        });
    }

    async function signup(email, password, businessName) {
        const res = await fetch(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, business_name: businessName }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const msg = data.message || data.detail?.message || 'Signup failed.';
            throw Object.assign(new Error(msg), { status: res.status, data });
        }
        // Auto-confirm environments return a session token immediately — log the user in.
        if (data.access_token) {
            _token = data.access_token;
            _user = { id: data.user_id, email: data.email };
            _notify();
        }
        return data;
    }

    async function login(email, password) {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const msg = data.message || data.detail?.message || 'Login failed.';
            throw Object.assign(new Error(msg), { status: res.status, data });
        }
        _token = data.access_token;
        _user = data.user;
        _notify();
        return data;
    }

    async function logout() {
        if (!_token) return;
        try {
            await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${_token}`,
                },
            });
        } catch (e) {
            // Best-effort — always clear local state
        }
        _token = null;
        _user = null;
        _notify();
    }

    async function getMe() {
        if (!_token) return null;
        const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${_token}` },
        });
        if (!res.ok) return null;
        return res.json();
    }

    function getToken() { return _token; }
    function getUser() { return _user; }
    function isLoggedIn() { return !!_token; }

    // Observer pattern — app.js uses this to react to auth state changes.
    function onAuthChange(callback) {
        _listeners.push(callback);
    }

    return { signup, login, logout, getMe, getToken, getUser, isLoggedIn, onAuthChange };
})();

// ── Auth UI helpers (used by index.html onclick attributes) ───────────────────

let _authMode = 'login'; // 'login' | 'signup'

function showAuthModal(mode) {
    _authMode = mode || 'login';
    _setAuthMode(_authMode);
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.remove('hidden');
    // Clear previous errors
    const errEl = document.getElementById('authError');
    if (errEl) { errEl.textContent = ''; errEl.classList.add('hidden'); }
    document.getElementById('authEmail')?.focus();
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.add('hidden');
}

function toggleAuthMode() {
    _authMode = _authMode === 'login' ? 'signup' : 'login';
    _setAuthMode(_authMode);
}

function _setAuthMode(mode) {
    const title = document.getElementById('authModalTitle');
    const businessRow = document.getElementById('businessNameRow');
    const submitBtn = document.getElementById('authSubmitBtn');
    const switchText = document.getElementById('authSwitchText');
    const switchLink = document.querySelector('.switch-link a');

    if (mode === 'signup') {
        if (title) title.textContent = 'Create Account';
        if (businessRow) businessRow.style.display = '';
        if (submitBtn) submitBtn.textContent = 'Create Account';
        if (switchText) switchText.textContent = 'Already have an account?';
        if (switchLink) switchLink.textContent = 'Log in';
    } else {
        if (title) title.textContent = 'Login';
        if (businessRow) businessRow.style.display = 'none';
        if (submitBtn) submitBtn.textContent = 'Login';
        if (switchText) switchText.textContent = "Don't have an account?";
        if (switchLink) switchLink.textContent = 'Sign up free';
    }
}

async function handleAuthSubmit(event) {
    event.preventDefault();
    const email = document.getElementById('authEmail')?.value?.trim() || '';
    const password = document.getElementById('authPassword')?.value || '';
    const businessName = document.getElementById('authBusinessName')?.value?.trim() || '';
    const errEl = document.getElementById('authError');
    const submitBtn = document.getElementById('authSubmitBtn');

    if (errEl) { errEl.textContent = ''; errEl.classList.add('hidden'); }
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Please wait...'; }

    try {
        if (_authMode === 'signup') {
            const result = await Auth.signup(email, password, businessName);
            closeAuthModal();
            if (Auth.isLoggedIn()) {
                // Auto-confirmed (Docker/local dev) — session is live, proceed immediately.
                refreshAuthUI();
            } else {
                // Email confirmation required — tell the user to check their inbox.
                if (errEl) {
                    errEl.textContent = 'Account created! Check your email to confirm, then log in.';
                    errEl.style.color = 'var(--green)';
                    errEl.classList.remove('hidden');
                }
            }
        } else {
            await Auth.login(email, password);
            closeAuthModal();
            refreshAuthUI();
        }
    } catch (err) {
        if (errEl) {
            errEl.textContent = err.message || 'An error occurred. Please try again.';
            errEl.style.color = '';
            errEl.classList.remove('hidden');
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = _authMode === 'signup' ? 'Create Account' : 'Login';
        }
    }
}

function refreshAuthUI() {
    const authControls = document.getElementById('authControls');
    const userMenu = document.getElementById('userMenu');
    const userEmailDisplay = document.getElementById('userEmailDisplay');
    const historyPanel = document.getElementById('historyPanel');
    const guestCta = document.getElementById('guestCta');
    const assessment = document.getElementById('assessment');
    const results = document.getElementById('results');

    if (Auth.isLoggedIn()) {
        if (authControls) authControls.style.display = 'none';
        if (userMenu) userMenu.style.display = 'flex';
        if (userEmailDisplay) userEmailDisplay.textContent = Auth.getUser()?.email || '';
        if (historyPanel) historyPanel.style.display = 'block';
        if (guestCta) guestCta.style.display = 'none';
        if (assessment) assessment.style.display = 'block';
        if (typeof loadAssessmentHistory === 'function') loadAssessmentHistory();
    } else {
        if (authControls) authControls.style.display = 'flex';
        if (userMenu) userMenu.style.display = 'none';
        if (historyPanel) historyPanel.style.display = 'none';
        if (guestCta) guestCta.style.display = 'block';
        if (assessment) assessment.style.display = 'none';
        if (results) results.style.display = 'none';
        const historyList = document.getElementById('historyList');
        if (historyList) historyList.innerHTML = '';
    }
}

// Close modal on overlay click
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeAuthModal();
        });
    }
    // Initialize UI state
    refreshAuthUI();
});
