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

    // Load Google Fonts
    const fontLink1 = document.createElement('link');
    fontLink1.rel = 'stylesheet';
    fontLink1.href = 'https://fonts.googleapis.com/css2?family=Product+Sans:wght@400;500;700&family=Roboto:wght@300;400;500&display=swap';
    shadow.appendChild(fontLink1);

    const fontLink2 = document.createElement('link');
    fontLink2.rel = 'stylesheet';
    fontLink2.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';
    shadow.appendChild(fontLink2);

    // Styles
    const style = document.createElement('style');
    style.textContent = `
        @font-face {
            font-family: 'Material Symbols Outlined';
            src: url('chrome-extension://__MSG_@@extension_id__/fonts/symbols.woff2') format('woff2');
            font-weight: 400;
            font-style: normal;
        }

        :host {
            --google-blue: #1a73e8;
            --google-red: #ea4335;
            --google-yellow: #fbbc04;
            --google-green: #34a853;
            --surface: #ffffff;
            --background: #f8f9fa;
            --text-primary: #202124;
            --text-secondary: #5f6368;
            --border-color: #dadce0;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        .container {
            width: 380px;
            background: var(--surface);
            box-shadow: 0 1px 3px 0 rgba(60, 64, 67, 0.3), 0 4px 8px 3px rgba(60, 64, 67, 0.15);
            border-radius: 24px;
            color: var(--text-primary);
            font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            position: relative;
            transition: height 0.3s ease, width 0.25s ease, border-radius 0.25s ease;
        }

        .container.collapsed {
            width: 280px;
            border-radius: 999px;
        }

        .header {
            padding: 24px 24px 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }

        .header-title-container {
            display: flex;
            align-items: center;
            gap: 16px;
            flex: 1;
        }

        .avatar-container {
            position: relative;
            flex-shrink: 0;
        }

        .avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .avatar-logo {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: block;
        }

        .status-indicator {
            position: absolute;
            bottom: -4px;
            right: -4px;
            width: 20px;
            height: 20px;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }

        .status-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: var(--google-green);
        }

        .title-section {
            flex: 1;
        }

        .title-text {
            font-family: 'Product Sans', 'Roboto', sans-serif;
            font-weight: 500;
            font-size: 24px;
            letter-spacing: -0.5px;
            color: var(--text-primary);
            margin-bottom: 4px;
        }

        .session-status {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-top: 2px;
        }

        .status-dot-small {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--google-blue);
        }

        .status-text {
            font-size: 11px;
            font-weight: 500;
            color: var(--google-blue);
            text-transform: uppercase;
            letter-spacing: 0.5px;
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

        .header-actions {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .icon-button {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: var(--text-secondary);
            transition: all 0.2s ease;
            background: transparent;
        }
        .icon-button:hover {
            background: rgba(60, 64, 67, 0.08);
            color: var(--text-primary);
        }

        .icon-button svg {
            width: 20px;
            height: 20px;
            fill: var(--text-secondary);
        }

        .icon-button:hover svg {
            fill: var(--text-primary);
        }

        .collapse-icon {
            transform: rotate(0deg);
            transition: transform 0.25s ease;
        }

        .container.collapsed .collapse-icon {
            transform: rotate(180deg);
        }

        .content {
            padding: 0 24px 24px;
        }

        .container.collapsed .content {
            display: none;
        }

        .section-title {
            font-family: 'Product Sans', 'Roboto', sans-serif;
            font-size: 18px;
            font-weight: 500;
            color: var(--text-primary);
            margin-bottom: 8px;
        }

        .section-description {
            font-size: 14px;
            color: var(--text-secondary);
            margin-bottom: 24px;
            line-height: 1.5;
        }

        .hidden { display: none !important; }

        /* Form Elements */
        .form-group {
            margin-bottom: 20px;
        }

        .form-label {
            font-family: 'Product Sans', 'Roboto', sans-serif;
            font-size: 13px;
            font-weight: 500;
            color: var(--text-primary);
            margin-bottom: 6px;
            display: block;
            padding-left: 4px;
        }

        .input-group {
            position: relative;
        }

        input, select {
            width: 100%;
            padding: 12px 16px;
            background: white;
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            border-radius: 8px;
            font-family: 'Roboto', sans-serif;
            font-size: 14px;
            outline: none;
            transition: all 0.2s ease;
            appearance: none;
        }

        input::placeholder {
            color: #80868b;
        }

        input:focus, select:focus {
            border-color: var(--google-blue);
            box-shadow: 0 0 0 1px var(--google-blue);
        }

        .password-toggle {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: opacity 0.2s;
        }

        .password-toggle:hover {
            opacity: 0.7;
        }

        .password-toggle svg {
            width: 20px;
            height: 20px;
            fill: var(--text-secondary);
        }

        .password-toggle:hover svg {
            fill: var(--text-primary);
        }

        /* Custom Select Arrow (SVG) */
        .select-wrapper {
            position: relative;
        }
        .select-wrapper::after {
            content: '';
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            pointer-events: none;
            width: 20px;
            height: 20px;
            background-repeat: no-repeat;
            background-position: center;
            background-size: 16px 16px;
            background-image: url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%23696a6c' d='M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z'/%3E%3C/svg%3E");
        }

        .btn {
            width: 100%;
            padding: 14px 24px;
            background: var(--google-blue);
            border: none;
            color: white;
            border-radius: 999px;
            cursor: pointer;
            font-family: 'Product Sans', 'Roboto', sans-serif;
            font-weight: 500;
            font-size: 14px;
            letter-spacing: 0.5px;
            transition: all 0.2s ease;
            text-transform: uppercase;
            box-shadow: 0 2px 4px rgba(26, 115, 232, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .btn:hover {
            background: #1557b0;
            box-shadow: 0 4px 8px rgba(26, 115, 232, 0.3);
            transform: translateY(-1px);
        }

        .btn:active {
            transform: translateY(0);
        }

        .btn:disabled {
            background: #dadce0;
            color: #80868b;
            cursor: not-allowed;
            box-shadow: none;
            transform: none;
        }

        .btn-icon {
            width: 18px;
            height: 18px;
            fill: currentColor;
        }

        .error {
            color: var(--google-red);
            font-size: 13px;
            margin-top: 12px;
            text-align: center;
            background: rgba(234, 67, 53, 0.1);
            padding: 10px 12px;
            border-radius: 8px;
            border: 1px solid rgba(234, 67, 53, 0.2);
            animation: fadeIn 0.3s ease;
            display: none;
        }

        .status {
            margin-top: 16px;
            text-align: center;
            font-size: 14px;
            min-height: 24px;
            font-weight: 400;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            color: var(--text-secondary);
        }

        .status.success {
            color: var(--google-green);
        }

        .status.error {
            color: var(--google-red);
        }

        .status.info {
            color: var(--google-blue);
        }

        .divider {
            margin: 24px 0;
            border-top: 1px solid #e8eaed;
        }

        .google-colors {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 8px;
            opacity: 0.4;
            margin-top: 16px;
        }

        .color-dot {
            width: 6px;
            height: 6px;
            border-radius: 999px;
        }

        .color-dot.blue { background: var(--google-blue); }
        .color-dot.red { background: var(--google-red); }
        .color-dot.yellow { background: var(--google-yellow); }
        .color-dot.green { background: var(--google-green); }

        .logout {
            background: none;
            border: none;
            color: var(--text-secondary);
            font-size: 12px;
            cursor: pointer;
            margin-top: 16px;
            display: block;
            width: 100%;
            text-align: center;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            transition: color 0.2s;
            font-weight: 500;
        }
        .logout:hover { 
            color: var(--google-red);
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        /* Loading Spinner */
        .spinner {
            width: 20px;
            height: 20px;
            border: 2px solid #e8eaed;
            border-top-color: var(--google-blue);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .loading-container {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 12px;
            padding: 24px;
            color: var(--text-secondary);
            font-size: 14px;
        }
    `;
    shadow.appendChild(style);

    // HTML Structure
    const iconUrl = chrome.runtime.getURL('logo.png');
    const container = document.createElement('div');
    container.className = 'container';
    container.innerHTML = `
        <div class="header">
            <div class="header-title-container">
                <div class="avatar-container">
                    <div class="avatar">
                        <img src="${iconUrl}" alt="AI Companion" class="avatar-logo" />
                    </div>
                    <div class="status-indicator">
                        <div class="status-dot"></div>
                    </div>
                </div>
                <div class="title-section">
                    <h3 class="title-text">AI Companion</h3>
                </div>
            </div>
            <div class="header-actions">
                <div class="icon-button" id="collapse-btn" title="Collapse">
                    <svg class="collapse-icon" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
                    </svg>
                </div>
                <div class="icon-button" id="close-btn" title="Close">
                    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.29 10.59 10.6l6.3-6.3z"/>
                    </svg>
                </div>
            </div>
        </div>

        <div class="content">
            <!-- Loading View -->
            <div id="view-loading" class="loading-container">
                <div class="spinner"></div>
                <span>Connecting...</span>
            </div>

            <!-- Login View -->
            <div id="view-login" class="hidden">
                <h2 class="section-title">Let's get you connected!</h2>
                <p class="section-description">Enter your details below to login and start your personal assistant session.</p>
                <form id="login-form">
                    <div class="form-group">
                        <label class="form-label" for="email">Email address</label>
                        <div class="input-group">
                            <input type="email" id="email" placeholder="name@company.com" required />
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="password">Security Passcode</label>
                        <div class="input-group">
                            <input type="password" id="password" placeholder="Enter your code" required />
                            <button type="button" class="password-toggle" id="password-toggle">
                                <svg id="eye-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                                </svg>
                                <svg id="eye-off-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: none;">
                                    <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <button type="submit" class="btn" id="login-submit-btn">
                        <span>LOGIN</span>
                    </button>
                    <div class="error" id="login-error"></div>
                </form>
            </div>

            <!-- Main View -->
            <div id="view-main" class="hidden">
                <h2 class="section-title">Select Customer Project</h2>
                <p class="section-description">Choose a project to connect the bot to this meeting.</p>
                
                <div class="form-group">
                    <label class="form-label" for="project-select">Project</label>
                    <div class="select-wrapper">
                        <select id="project-select">
                            <option value="" disabled selected>Loading projects...</option>
                        </select>
                    </div>
                </div>

                <button id="connect-btn" class="btn">
                    <span>CONNECT BOT</span>
                    <svg class="btn-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3.9 12a5 5 0 0 1 1.46-3.54l2.83-2.83a5 5 0 0 1 7.07 0 1 1 0 1 1-1.42 1.42 3 3 0 0 0-4.24 0L6.77 9.29A3 3 0 0 0 6 12a3 3 0 0 0 .88 2.12 1 1 0 0 1-1.42 1.42A5 5 0 0 1 3.9 12zm6.75 5.37a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07 1 1 0 0 0 1.42 1.42 3 3 0 0 1 4.24 4.24l-2.83 2.83a3 3 0 0 1-4.24-4.24 1 1 0 0 0-1.42-1.42 5 5 0 0 0 0 7.07z"/>
                    </svg>
                </button>
                
                <div class="status" id="status-msg"></div>
                
                <div class="divider"></div>
                
                <button class="logout" id="logout-btn">Log out</button>
            </div>
        </div>
    `;
    shadow.appendChild(container);

    // Bind Events
    shadow.getElementById('close-btn').onclick = () => {
        document.body.removeChild(panelRoot);
        panelRoot = null;
    };

    const collapseBtn = shadow.getElementById('collapse-btn');
    collapseBtn.onclick = (e) => {
        e.stopPropagation();
        container.classList.toggle('collapsed');
    };

    // Password toggle functionality
    const passwordToggle = shadow.getElementById('password-toggle');
    const passwordInput = shadow.getElementById('password');
    if (passwordToggle && passwordInput) {
        const eyeIcon = shadow.getElementById('eye-icon');
        const eyeOffIcon = shadow.getElementById('eye-off-icon');
        
        passwordToggle.onclick = () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            if (type === 'password') {
                eyeIcon.style.display = 'block';
                eyeOffIcon.style.display = 'none';
            } else {
                eyeIcon.style.display = 'none';
                eyeOffIcon.style.display = 'block';
            }
        };
    }

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
        const btnText = submitBtn.querySelector('span:first-child');
        if (btnText) btnText.textContent = 'SIGNING IN...';

        chrome.runtime.sendMessage({
            action: 'login',
            email: emailInput.value,
            password: passInput.value
        }, (response) => {
            submitBtn.disabled = false;
            const btnText = submitBtn.querySelector('span:first-child');
            if (btnText) btnText.textContent = 'LOGIN';

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
            statusMsg.className = 'status error';
            return;
        }

        connectBtn.disabled = true;
        const btnText = connectBtn.querySelector('span:first-child');
        if (btnText) btnText.textContent = 'CONNECTING...';
        statusMsg.textContent = 'Initiating bot connection...';
        statusMsg.className = 'status info';

        chrome.runtime.sendMessage({
            action: 'connectBot',
            customerId: customerId,
            meetUrl: window.location.href
        }, (response) => {
            if (response && response.success) {
                statusMsg.textContent = 'Bot Connected ✅';
                statusMsg.className = 'status success';
                if (btnText) btnText.textContent = 'CONNECTED';
            } else {
                connectBtn.disabled = false;
                if (btnText) btnText.textContent = 'CONNECT BOT';
                statusMsg.textContent = response.message || 'Connection failed';
                statusMsg.className = 'status error';
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
