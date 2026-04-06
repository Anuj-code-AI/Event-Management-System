/* ════════════════════════════════════════════════════════════
   EVENTAURA — basic.js
   Shared auth utilities, auto-refresh, nav painting
   ════════════════════════════════════════════════════════════ */

/* ── Token storage ── */
function saveTokens(access, refresh) {
    localStorage.setItem('accessToken',  access);
    localStorage.setItem('refreshToken', refresh);
}
function getAccessToken()  { return localStorage.getItem('accessToken');  }
function getRefreshToken() { return localStorage.getItem('refreshToken'); }
function clearTokens()     { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); }

/* ── JWT decode (no verify — just read exp claim) ── */
function isTokenExpired(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // treat as expired 30 s early to avoid edge-case races
        return (payload.exp * 1000) < (Date.now() - 30_000);
    } catch { return true; }
}

/* ── Redirect to login ── */
function redirectToLogin() {
    clearTokens();
    window.location.href = '/login';
}

/* ── Silently refresh the access token using the refresh token ──
   Returns the new access token string, or null on failure.        */
async function tryRefresh() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) { redirectToLogin(); return null; }

    try {
        const res = await fetch('/api/v1/auth/refresh', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ refreshToken })
        });

        if (!res.ok) { redirectToLogin(); return null; }

        const data = await res.json();
        saveTokens(data.accessToken, data.refreshToken);
        return data.accessToken;
    } catch {
        redirectToLogin();
        return null;
    }
}

/* ════════════════════════════════════════════════════════════
   apiFetch — drop-in replacement for fetch() on protected APIs
   Automatically injects Authorization header and refreshes the
   token if it has expired before making the request.
   On a 401 response it will try one silent refresh and retry.
   ════════════════════════════════════════════════════════════ */
async function apiFetch(url, options = {}) {
    let token = getAccessToken();

    // Proactively refresh if token is missing or expired
    if (!token || isTokenExpired(token)) {
        token = await tryRefresh();
        if (!token) return null;   // redirectToLogin() already called
    }

    options.headers = {
        'Content-Type': 'application/json',
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    let res = await fetch(url, options);

    // 401 → try one silent refresh then retry once
    if (res.status === 401) {
        token = await tryRefresh();
        if (!token) return null;
        options.headers['Authorization'] = `Bearer ${token}`;
        res = await fetch(url, options);
    }

    return res;
}

/* ════════════════════════════════════════════════════════════
   AUTH NAV — fetch role, derive display role, paint sidebar
   + mobile drawer + header buttons
   ════════════════════════════════════════════════════════════ */

let __auth = { isLoggedIn: false, displayRole: null, userName: null };

function deriveDisplayRole(apiRole, status) {
    const role = String(apiRole || '').toUpperCase();
    if (role === 'ROLE_ADMIN') return 'ADMIN';
    if (status === 'APPROVED') return 'ORGANIZER';
    return 'USER';
}

function roleLabel(dr) {
    if (dr === 'ADMIN')     return 'Administrator';
    if (dr === 'ORGANIZER') return 'Organizer / Host';
    return 'Member';
}

function $id(id) { return document.getElementById(id); }
function _show(id, d = 'block') { const el = $id(id); if (el) el.style.display = d; }
function _hide(id)               { const el = $id(id); if (el) el.style.display = 'none'; }

function applyNav(cfg) {
    const { isLoggedIn, displayRole, userName } = __auth;
    const isAdmin = displayRole === 'ADMIN';
    const isOrg   = displayRole === 'ORGANIZER';

    if (isLoggedIn) {
        _show(cfg.userCard, 'block'); _hide(cfg.guestCard);
        const ne = $id(cfg.userName); if (ne) ne.textContent = userName;
        const re = $id(cfg.userRole); if (re) re.textContent = roleLabel(displayRole);
        _show(cfg.myAccount);
        if (isAdmin) _show(cfg.admin);
        if (isOrg || isAdmin) { if (cfg.navigation) _show(cfg.navigation); _show(cfg.host); }
        if (cfg.logout) _show(cfg.logout);
        _hide(cfg.footerGuest);
        _show(cfg.footerUser);
        _hide(cfg.guestNav);
    } else {
        _hide(cfg.userCard); _show(cfg.guestCard, 'block');
        _hide(cfg.myAccount); _hide(cfg.admin);
        if (cfg.navigation) _hide(cfg.navigation);
        _hide(cfg.host);
        if (cfg.logout) _hide(cfg.logout);
        _show(cfg.guestNav);
        _show(cfg.footerGuest); _hide(cfg.footerUser);
    }
}

function paintBothPanels(isLoggedIn) {
    _hide('mnSkeleton');
    _hide('psbSkeleton');

    if (!isLoggedIn) {
        _show('guestActions', 'flex');
        _hide('userActions');
    }

    // Mobile drawer
    applyNav({
        userCard:    'mnUserCard',
        guestCard:   'mnGuestCard',
        userName:    'mnUserName',
        userRole:    'mnUserRole',
        myAccount:   'mn-my-account',
        admin:       'mn-admin',
        navigation:  'mn-navigation',
        host:        'mn-host',
        logout:      null,
        guestNav:    'mn-guest-nav',
        footerGuest: 'mobileNavGuest',
        footerUser:  'mobileNavUser'
    });

    // Profile sidebar
    applyNav({
        userCard:    'psbUserCard',
        guestCard:   'psbGuestCard',
        userName:    'psbUserName',
        userRole:    'psbUserRole',
        myAccount:   'psb-my-account',
        admin:       'psb-admin',
        navigation:  'psb-navigation',
        host:        'psb-host',
        logout:      'psb-logout',
        guestNav:    'psb-guest-nav',
        footerGuest: 'psb-guest-nav',
        footerUser:  'psb-logout'
    });
}

async function loadAuthAndApplyNav() {
    const token = getAccessToken();

    if (!token) {
        __auth = { isLoggedIn: false, displayRole: null, userName: null };
        paintBothPanels(false);
        return;
    }

    // Show skeletons while the API call is in-flight
    _show('mnSkeleton');  _hide('mnGuestCard');
    _show('psbSkeleton'); _hide('psbGuestCard');
    // Optimistically show profile button
    _hide('guestActions');
    _show('userActions', 'flex');

    try {
        // Use apiFetch so the token is auto-refreshed if expired
        const res = await apiFetch('/api/v1/auth/roleOfMe');

        if (!res || !res.ok) {
            clearTokens();
            __auth = { isLoggedIn: false, displayRole: null, userName: null };
            paintBothPanels(false);
            return;
        }

        const data = await res.json();
        __auth = {
            isLoggedIn:  true,
            displayRole: deriveDisplayRole(data.role, data.status),
            userName:    data.name || 'User'
        };
        paintBothPanels(true);

    } catch (err) {
        console.error('[Auth] loadAuthAndApplyNav failed:', err);
        __auth = { isLoggedIn: false, displayRole: null, userName: null };
        paintBothPanels(false);
    }
}

/* ── Public logout ── */
function logout() {
    clearTokens();
    window.location.href = '/';
}

/* ── Mobile drawer wiring (runs after DOM ready) ── */
function initMobileNav() {
    const hamburgerBtn     = $id('hamburgerBtn');
    const mobileNav        = $id('mobileNav');
    const mobileNavOverlay = $id('mobileNavOverlay');
    const mobileNavClose   = $id('mobileNavClose');

    if (!hamburgerBtn) return;   // page doesn't have the drawer

    function openMobileNav() {
        mobileNav.classList.add('open');
        mobileNavOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        hamburgerBtn.setAttribute('aria-expanded', 'true');
        hamburgerBtn.classList.add('open');
    }
    function closeMobileNav() {
        mobileNav.classList.remove('open');
        mobileNavOverlay.classList.remove('open');
        document.body.style.overflow = '';
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        hamburgerBtn.classList.remove('open');
    }

    hamburgerBtn.addEventListener('click', openMobileNav);
    mobileNavClose.addEventListener('click', closeMobileNav);
    mobileNavOverlay.addEventListener('click', closeMobileNav);
    document.querySelectorAll('.mobile-nav-link').forEach(l => l.addEventListener('click', closeMobileNav));
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') { closeMobileNav(); closeProfileSidebar(); }
    });
}

/* ── Profile sidebar wiring ── */
function initProfileSidebar() {
    const btn = $id('profileSidebarBtn');
    if (!btn) return;

    function openProfileSidebar() {
        $id('profileSidebar').classList.add('open');
        $id('profileOverlay').classList.add('open');
        document.body.style.overflow = 'hidden';
        btn.setAttribute('aria-expanded', 'true');
    }
    function closeProfileSidebar() {
        $id('profileSidebar').classList.remove('open');
        $id('profileOverlay').classList.remove('open');
        document.body.style.overflow = '';
        btn.setAttribute('aria-expanded', 'false');
    }
    // expose globally so Escape handler can call it
    window.closeProfileSidebar = closeProfileSidebar;

    btn.addEventListener('click', openProfileSidebar);
    $id('profileSidebarClose').addEventListener('click', closeProfileSidebar);
    $id('profileOverlay').addEventListener('click', closeProfileSidebar);
}

/* ════════════════════════════════════════════════════════════
   CLOCK  (replaces clock.js — included here for convenience)
   ════════════════════════════════════════════════════════════ */
function startClock() {
    const el = $id('clock');
    if (!el) return;
    function tick() {
        const now = new Date();
        el.textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    }
    tick();
    setInterval(tick, 1000);
}

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', () => {
    startClock();
    initMobileNav();
    initProfileSidebar();
    loadAuthAndApplyNav();
});