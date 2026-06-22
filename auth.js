// auth.js — SmallBiz Advisor Auth Layer
// No framework. Vanilla JS. Manages JWT in memory (not localStorage for security).
// Must be loaded BEFORE api-client.js and BEFORE app.js.

const Auth = (() => {
    const API_BASE = window.ADVISOR_API_URL || 'http://localhost:8000';
    const SESSION_KEY = 'sb_access_token';

    // Primary store is in-memory. sessionStorage bridges cross-page navigation
    // (e.g. index.html → dream-builder.html). Cleared on logout and on tab close.
    let _token = sessionStorage.getItem(SESSION_KEY) || null;
    let _user = null;
    const _listeners = [];

    function _setToken(token, user) {
        _token = token;
        _user = user;
        if (token) {
            sessionStorage.setItem(SESSION_KEY, token);
        } else {
            sessionStorage.removeItem(SESSION_KEY);
        }
    }

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
            _setToken(data.access_token, { id: data.user_id, email: data.email });
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
        _setToken(data.access_token, data.user);
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
        _setToken(null, null);
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

    const forgotRow = document.getElementById('forgotPasswordRow');
    if (mode === 'signup') {
        if (title) title.textContent = 'Create Account';
        if (businessRow) businessRow.style.display = '';
        if (submitBtn) submitBtn.textContent = 'Create Account';
        if (switchText) switchText.textContent = 'Already have an account?';
        if (switchLink) switchLink.textContent = 'Log in';
        if (forgotRow) forgotRow.style.display = 'none';
    } else {
        if (title) title.textContent = 'Login';
        if (businessRow) businessRow.style.display = 'none';
        if (submitBtn) submitBtn.textContent = 'Login';
        if (switchText) switchText.textContent = "Don't have an account?";
        if (switchLink) switchLink.textContent = 'Sign up free';
        if (forgotRow) forgotRow.style.display = '';
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

// ── Forgot Password ────────────────────────────────────────────────────────────

function showForgotPasswordModal() {
    closeAuthModal();
    const modal = document.getElementById('forgotModal');
    if (modal) modal.classList.remove('hidden');
    document.getElementById('forgotEmail')?.focus();
}

function closeForgotModal() {
    const modal = document.getElementById('forgotModal');
    if (modal) modal.classList.add('hidden');
    const msg = document.getElementById('forgotMsg');
    if (msg) { msg.textContent = ''; msg.classList.add('hidden'); }
}

async function submitForgotPassword() {
    const email = document.getElementById('forgotEmail')?.value?.trim();
    const msg = document.getElementById('forgotMsg');
    if (!email) { if (msg) { msg.textContent = 'Please enter your email.'; msg.classList.remove('hidden'); } return; }
    try {
        await ApiClient.post('/auth/forgot-password', { email });
        if (msg) { msg.textContent = 'Reset link sent! Check your inbox.'; msg.style.color = 'var(--green)'; msg.classList.remove('hidden'); }
    } catch (err) {
        if (msg) { msg.textContent = err.message || 'Failed to send reset link.'; msg.style.color = ''; msg.classList.remove('hidden'); }
    }
}

// ── Account Settings ───────────────────────────────────────────────────────────

function showSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;
    // Pre-fill business name from profile if available
    const nameInput = document.getElementById('settingsBusinessName');
    if (nameInput && typeof _cachedProfile !== 'undefined' && _cachedProfile?.business_name) {
        nameInput.value = _cachedProfile.business_name;
    }
    ['settingsNameMsg', 'settingsPasswordMsg'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.textContent = ''; el.classList.add('hidden'); }
    });
    modal.classList.remove('hidden');
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.add('hidden');
}

async function saveSettingsName() {
    const name = document.getElementById('settingsBusinessName')?.value?.trim();
    const msg = document.getElementById('settingsNameMsg');
    if (!name) { if (msg) { msg.textContent = 'Business name cannot be empty.'; msg.classList.remove('hidden'); } return; }
    try {
        await ApiClient.patch('/profiles/me', { business_name: name });
        if (msg) { msg.textContent = 'Business name updated!'; msg.style.color = 'var(--green)'; msg.classList.remove('hidden'); }
        if (typeof checkTierAndShowUpgrade === 'function') checkTierAndShowUpgrade();
    } catch (err) {
        if (msg) { msg.textContent = err.message || 'Failed to update.'; msg.style.color = ''; msg.classList.remove('hidden'); }
    }
}

async function saveSettingsPassword() {
    const newPw = document.getElementById('settingsNewPassword')?.value || '';
    const confirm = document.getElementById('settingsConfirmPassword')?.value || '';
    const msg = document.getElementById('settingsPasswordMsg');
    if (newPw !== confirm) { if (msg) { msg.textContent = 'Passwords do not match.'; msg.classList.remove('hidden'); } return; }
    if (newPw.length < 8 || !/[A-Z]/.test(newPw) || !/[0-9]/.test(newPw)) {
        if (msg) { msg.textContent = 'Password must be 8+ chars with 1 uppercase and 1 number.'; msg.classList.remove('hidden'); }
        return;
    }
    try {
        await ApiClient.patch('/auth/change-password', { new_password: newPw });
        if (msg) { msg.textContent = 'Password changed successfully!'; msg.style.color = 'var(--green)'; msg.classList.remove('hidden'); }
        document.getElementById('settingsNewPassword').value = '';
        document.getElementById('settingsConfirmPassword').value = '';
    } catch (err) {
        if (msg) { msg.textContent = err.message || 'Failed to change password.'; msg.style.color = ''; msg.classList.remove('hidden'); }
    }
}

// ── Password Reset (from recovery email link) ──────────────────────────────────

let _recoveryToken = null;

function _checkRecoveryHash() {
    const hash = window.location.hash;
    if (!hash.includes('type=recovery')) return;
    const params = new URLSearchParams(hash.replace('#', ''));
    const token = params.get('access_token');
    if (!token) return;
    _recoveryToken = token;
    history.replaceState(null, '', window.location.pathname);
    const modal = document.getElementById('resetModal');
    if (modal) modal.classList.remove('hidden');
}

async function submitResetPassword() {
    const newPw = document.getElementById('resetNewPassword')?.value || '';
    const confirm = document.getElementById('resetConfirmPassword')?.value || '';
    const msg = document.getElementById('resetMsg');
    if (newPw !== confirm) { if (msg) { msg.textContent = 'Passwords do not match.'; msg.classList.remove('hidden'); } return; }
    if (newPw.length < 8 || !/[A-Z]/.test(newPw) || !/[0-9]/.test(newPw)) {
        if (msg) { msg.textContent = 'Password must be 8+ chars with 1 uppercase and 1 number.'; msg.classList.remove('hidden'); }
        return;
    }
    if (!_recoveryToken) { if (msg) { msg.textContent = 'Invalid or expired reset link.'; msg.classList.remove('hidden'); } return; }
    try {
        // Use the recovery token as Bearer to authenticate the change-password call
        const base = window.ADVISOR_API_URL || 'http://localhost:8000';
        const res = await fetch(`${base}/auth/change-password`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${_recoveryToken}` },
            body: JSON.stringify({ new_password: newPw }),
        });
        if (!res.ok) throw new Error('Failed to set password.');
        if (msg) { msg.textContent = 'Password set! You can now log in.'; msg.style.color = 'var(--green)'; msg.classList.remove('hidden'); }
        _recoveryToken = null;
        setTimeout(() => { document.getElementById('resetModal').classList.add('hidden'); showAuthModal('login'); }, 2000);
    } catch (err) {
        if (msg) { msg.textContent = err.message || 'Failed to set password.'; msg.style.color = ''; msg.classList.remove('hidden'); }
    }
}

// Close modals on overlay click
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeAuthModal();
        });
    }
    ['forgotModal', 'settingsModal'].forEach(id => {
        const m = document.getElementById(id);
        if (m) m.addEventListener('click', (e) => { if (e.target === m) m.classList.add('hidden'); });
    });
    _checkRecoveryHash();
    // Initialize UI state
    refreshAuthUI();
});
