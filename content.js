/**
 * Content Script
 * Runs on https://meet.google.com/*
 * Detects active meeting state and injects Control Panel.
 */



let panelRoot = null;
let shadow = null;

// Listener for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'SHOW_PANEL') {
        createPanel();
    }

    if (request.action === 'ping') {
        // Verify it's actually a meeting room (e.g. not the home page)
        const isMeetingRoom = window.location.pathname.length > 1 && window.location.pathname !== '/';

        sendResponse({
            action: 'pong',
            url: window.location.href,
            title: document.title,
            isMeeting: isMeetingRoom
        });
    }
});

function createPanel() {
    if (panelRoot) {
        return; // Already exists
    }

    // Host Element
    panelRoot = document.createElement('div');
    panelRoot.id = 'meeting-bot-root';
    Object.assign(panelRoot.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: '2147483647', // Max Z-Index
        fontFamily: "'Quicksand', sans-serif",
    });

    document.body.appendChild(panelRoot);
    shadow = panelRoot.attachShadow({ mode: 'open' });

    // Styles
    const style = document.createElement('style');
    style.textContent = `
        @font-face {
            font-family: 'Outfit';
            src: url('chrome-extension://__MSG_@@extension_id__/fonts/outfit.woff2') format('woff2');
            font-weight: 200 500;
            font-style: normal;
        }
        @font-face {
            font-family: 'Quicksand';
            src: url('chrome-extension://__MSG_@@extension_id__/fonts/quicksand.woff2') format('woff2');
            font-weight: 300 500;
            font-style: normal;
        }
        @font-face {
            font-family: 'Material Symbols Outlined';
            src: url('chrome-extension://__MSG_@@extension_id__/fonts/symbols.woff2') format('woff2');
            font-weight: 400;
            font-style: normal;
        }

        :host {
            --neural-deep: #05071a;
            --neural-purple: #4c1d95;
            --neural-blue: #1e3a8a;
            --neural-cyan: #06b6d4;
            --neural-pink: #ec4899;
            --neural-glow: #10b981;
            --text-main: rgba(255, 255, 255, 0.9);
            --text-muted: rgba(255, 255, 255, 0.6);
            --glass-bg: rgba(10, 15, 45, 0.6);
            --glass-border: rgba(255, 255, 255, 0.1);
        }

        * {
            box-sizing: border-box;
        }

        .container {
            width: 360px;
            background: var(--glass-bg);
            backdrop-filter: blur(25px);
            -webkit-backdrop-filter: blur(25px);
            border: 1px solid var(--glass-border);
            box-shadow: 0 0 40px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.05);
            border-radius: 40px 40px 40px 40px; /* Slightly less organic strictly for UI usability */
            color: var(--text-main);
            font-family: 'Quicksand', sans-serif;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            position: relative;
            transition: height 0.3s ease;
        }

        /* Decorative Blobs */
        .blob {
            position: absolute;
            border-radius: 50%;
            filter: blur(40px);
            opacity: 0.4;
            z-index: -1;
            pointer-events: none;
        }
        .blob-1 { top: -20px; left: -20px; width: 100px; height: 100px; background: var(--neural-blue); }
        .blob-2 { bottom: -20px; right: -20px; width: 120px; height: 120px; background: var(--neural-purple); }
        .blob-3 { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; background: var(--neural-cyan); opacity: 0.2; }

        .header {
            padding: 20px 24px 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .header-title-container {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .icon-box {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .icon-glow {
            position: absolute;
            width: 100%;
            height: 100%;
            background: var(--neural-cyan);
            filter: blur(10px);
            opacity: 0.5;
            border-radius: 50%;
        }

        .material-symbols-outlined {
            font-family: 'Material Symbols Outlined';
            font-weight: normal;
            font-style: normal;
            font-size: 24px;
            line-height: 1;
            letter-spacing: normal;
            text-transform: none;
            display: inline-block;
            white-space: nowrap;
            word-wrap: normal;
            direction: ltr;
        }

        .title-text {
            font-family: 'Outfit', sans-serif;
            font-weight: 300;
            font-size: 18px;
            letter-spacing: 0.5px;
            color: #fff;
        }

        .close-btn {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: var(--text-muted);
            transition: all 0.3s ease;
            background: rgba(255,255,255,0.05);
        }
        .close-btn:hover {
            background: rgba(255,255,255,0.1);
            color: #fff;
        }

        .content {
            padding: 10px 24px 24px;
        }

        .info-text {
            font-size: 13px;
            color: var(--text-muted);
            margin-bottom: 20px;
            font-style: italic;
            text-align: center;
        }

        .hidden { display: none !important; }

        /* Form Elements */
        .input-group {
            position: relative;
            margin-bottom: 16px;
        }

        input, select {
            width: 100%;
            padding: 14px 20px;
            background: rgba(5, 7, 26, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: var(--text-main);
            border-radius: 25px;
            font-family: 'Quicksand', sans-serif;
            font-size: 14px;
            outline: none;
            transition: all 0.3s ease;
            appearance: none;
        }

        input::placeholder {
            color: rgba(255,255,255,0.3);
        }

        input:focus, select:focus {
            border-color: var(--neural-cyan);
            box-shadow: 0 0 15px rgba(6, 182, 212, 0.2);
        }

        /* Custom Select Arrow */
        .select-wrapper {
            position: relative;
        }
        .select-wrapper::after {
            content: 'expand_more';
            font-family: 'Material Symbols Outlined';
            position: absolute;
            right: 16px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
            pointer-events: none;
        }

        .btn {
            width: 100%;
            padding: 12px;
            margin-top: 10px;
            background: rgba(5, 7, 26, 0.6);
            border: 1px solid rgba(16, 185, 129, 0.3); /* neural-glow */
            color: var(--neural-glow);
            border-radius: 25px;
            cursor: pointer;
            font-family: 'Outfit', sans-serif;
            font-weight: 500;
            font-size: 14px;
            letter-spacing: 1px;
            transition: all 0.3s ease;
            text-transform: uppercase;
            box-shadow: 0 0 15px rgba(16, 185, 129, 0.1);
        }

        .btn:hover {
            background: rgba(16, 185, 129, 0.1);
            border-color: var(--neural-glow);
            box-shadow: 0 0 25px rgba(16, 185, 129, 0.3);
            text-shadow: 0 0 5px var(--neural-glow);
        }

        .btn:disabled {
            border-color: #3c4043;
            color: #80868b;
            cursor: not-allowed;
            box-shadow: none;
        }

        .btn-connect {
            border-color: rgba(6, 182, 212, 0.4); /* Cyan border */
            color: var(--neural-cyan);
            box-shadow: 0 0 15px rgba(6, 182, 212, 0.1);
        }
        .btn-connect:hover {
            background: rgba(6, 182, 212, 0.1);
            border-color: var(--neural-cyan);
            box-shadow: 0 0 25px rgba(6, 182, 212, 0.3);
            text-shadow: 0 0 5px var(--neural-cyan);
        }

        .error {
            color: #fca5a5;
            font-size: 12px;
            margin-top: 10px;
            text-align: center;
            background: rgba(220, 38, 38, 0.1);
            padding: 8px;
            border-radius: 12px;
            border: 1px solid rgba(220, 38, 38, 0.2);
            animation: fadeIn 0.3s ease;
        }

        .status {
            margin-top: 16px;
            text-align: center;
            font-size: 14px;
            min-height: 24px;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .logout {
            background: none;
            border: none;
            color: rgba(255,255,255,0.4);
            font-size: 11px;
            cursor: pointer;
            margin-top: 20px;
            display: block;
            width: 100%;
            text-align: center;
            letter-spacing: 1px;
            text-transform: uppercase;
            transition: color 0.2s;
        }
        .logout:hover { color: var(--neural-pink); }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        /* Loading Spinner */
        .spinner {
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255,255,255,0.1);
            border-top-color: var(--neural-cyan);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
    `;
    shadow.appendChild(style);

    // HTML Structure
    const container = document.createElement('div');
    container.className = 'container';
    container.innerHTML = `
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
        <div class="blob blob-3"></div>

        <div class="header">
            <div class="header-title-container">
                <div class="icon-box">
                    <div class="icon-glow"></div>
                    <span class="material-symbols-outlined" style="color: var(--neural-cyan);">hub</span>
                </div>
                <h3 class="title-text">AI Companion</h3>
            </div>
            <div class="close-btn" id="close-btn">
                <span class="material-symbols-outlined" style="font-size: 20px;">close</span>
            </div>
        </div>

        <div class="content">
            <!-- Loading View -->
            <div id="view-loading" class="info-text">
                <div style="display: flex; justify-content: center; align-items: center; gap: 10px;">
                    <div class="spinner"></div> Init Neural Link...
                </div>
            </div>

            <!-- Login View -->
            <div id="view-login" class="hidden">
                <div class="info-text">Identify yourself to proceed.</div>
                <form id="login-form">
                    <div class="input-group">
                        <input type="email" id="email" placeholder="Neural ID (Email)" required />
                    </div>
                    <div class="input-group">
                        <input type="password" id="password" placeholder="Passcode" required />
                    </div>
                    <button type="submit" class="btn" id="login-submit-btn">Initialize Session</button>
                    <div class="error" id="login-error"></div>
                </form>
            </div>

            <!-- Main View -->
            <div id="view-main" class="hidden">
                <div class="info-text">Attune your focus: select neural stream.</div>
                
                <div class="select-wrapper">
                    <select id="project-select">
                        <option value="" disabled selected>Loading streams...</option>
                    </select>
                </div>

                <button id="connect-btn" class="btn btn-connect">Establish Connection</button>
                
                <div class="status" id="status-msg"></div>
                
                <button class="logout" id="logout-btn">Terminate Signal</button>
            </div>
        </div>
    `;
    shadow.appendChild(container);

    // Bind Events
    shadow.getElementById('close-btn').onclick = () => {
        document.body.removeChild(panelRoot);
        panelRoot = null;
    };

    setupLoginHandler();
    setupMainHandler();

    // Initial Check
    checkAuth();
}

// =====================
// AUTH & STATE LOGIC
// =====================

function checkAuth() {
    chrome.runtime.sendMessage({ action: 'checkAuth' }, (response) => {
        hideAllViews();
        if (response && response.isAuthenticated) {
            showMainView(response.user);
        } else {
            showLoginView();
        }
    });
}

function showLoginView() {
    shadow.getElementById('view-login').classList.remove('hidden');
}

function showMainView(user) {
    const view = shadow.getElementById('view-main');
    view.classList.remove('hidden');
    loadProjects();
}

function hideAllViews() {
    shadow.getElementById('view-loading').classList.add('hidden');
    shadow.getElementById('view-login').classList.add('hidden');
    shadow.getElementById('view-main').classList.add('hidden');
}

// =====================
// HANDLERS
// =====================

function setupLoginHandler() {
    const form = shadow.getElementById('login-form');
    const emailInput = shadow.getElementById('email');
    const passInput = shadow.getElementById('password');
    const errorDiv = shadow.getElementById('login-error');
    const submitBtn = shadow.getElementById('login-submit-btn');

    form.onsubmit = (e) => {
        e.preventDefault();
        errorDiv.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';

        chrome.runtime.sendMessage({
            action: 'login',
            email: emailInput.value,
            password: passInput.value
        }, (response) => {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';

            if (response && response.success) {
                hideAllViews();
                showMainView(response.user);
            } else {
                errorDiv.textContent = response.message || 'Login failed';
                errorDiv.style.display = 'block';
            }
        });
    };
}

function setupMainHandler() {
    const logoutBtn = shadow.getElementById('logout-btn');
    const connectBtn = shadow.getElementById('connect-btn');
    const projectSelect = shadow.getElementById('project-select');
    const statusMsg = shadow.getElementById('status-msg');

    logoutBtn.onclick = () => {
        chrome.runtime.sendMessage({ action: 'logout' }, () => {
            hideAllViews();
            showLoginView();
        });
    };

    connectBtn.onclick = () => {
        const customerId = projectSelect.value;
        if (!customerId) {
            statusMsg.textContent = 'Please select a project';
            statusMsg.style.color = '#f28b82';
            return;
        }

        connectBtn.disabled = true;
        connectBtn.textContent = 'Connecting...';
        statusMsg.textContent = 'Initiating bot...';
        statusMsg.style.color = '#8ab4f8';

        chrome.runtime.sendMessage({
            action: 'connectBot',
            customerId: customerId,
            meetUrl: window.location.href
        }, (response) => {
            if (response && response.success) {
                statusMsg.textContent = 'Bot Connected ✅';
                statusMsg.style.color = '#81c995'; // Google Green
                connectBtn.textContent = 'Connected';
            } else {
                connectBtn.disabled = false;
                connectBtn.textContent = 'Connect Bot';
                statusMsg.textContent = response.message || 'Connection failed';
                statusMsg.style.color = '#f28b82';
            }
        });
    };
}

function loadProjects() {
    const select = shadow.getElementById('project-select');
    chrome.runtime.sendMessage({ action: 'fetchProjects' }, (response) => {
        if (response && response.success) {
            select.innerHTML = '<option value="" disabled selected>Select a project</option>';
            response.projects.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.name;
                select.appendChild(opt);
            });

            // Try to restore last project selection if we want to be fancy, 
            // but for now simple list is fine.
        } else {
            select.innerHTML = '<option disabled>Failed to load projects</option>';
        }
    });
}
