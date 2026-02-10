/**
 * Popup Logic
 * Handles the extension's browser action UI.
 * Communicates with background.js for all API and auth tasks.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const noMeetDiv = document.getElementById('no-meet');
    const loginSection = document.getElementById('login-section');
    const mainInterfaceDiv = document.getElementById('main-interface');

    // 1. Check if current tab is Google Meet
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // We check URL to see if we should even show the UI
    const isMeet = tab?.url?.startsWith('https://meet.google.com/') && tab.url.length > 24;

    if (!isMeet) {
        noMeetDiv.classList.remove('hidden');
        return;
    }

    const meetUrl = tab.url;

    // 2. Check Auth State
    chrome.runtime.sendMessage({ action: 'checkAuth' }, (response) => {
        if (response && response.isAuthenticated) {
            setupMainInterface(response.user, meetUrl);
        } else {
            loginSection.classList.remove('hidden');
            setupLoginForm(meetUrl);
        }
    });

    // 3. Logout Handler
    document.getElementById('btn-logout').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'logout' }, () => {
            window.close(); // Close popup on logout
        });
    });
});

/**
 * LOGIN FORM
 */
function setupLoginForm(meetUrl) {
    const form = document.getElementById('login-form');
    const loginBtn = document.getElementById('login-btn');
    const errorDiv = document.getElementById('login-error');

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        errorDiv.style.display = 'none';
        loginBtn.disabled = true;
        const btnText = loginBtn.querySelector('span:first-child');
        if (btnText) btnText.textContent = 'SIGNING IN...';

        chrome.runtime.sendMessage({
            action: 'login',
            email,
            password
        }, (response) => {
            loginBtn.disabled = false;
            if (btnText) btnText.textContent = 'LOGIN';

            if (response && response.success) {
                document.getElementById('login-section').classList.add('hidden');
                setupMainInterface(response.user, meetUrl);
            } else {
                errorDiv.textContent = response.message || 'Login failed';
                errorDiv.style.display = 'block';
            }
        });
    });
}

/**
 * MAIN INTERFACE
 */
async function setupMainInterface(auth, meetUrl) {
    document.getElementById('main-interface').classList.remove('hidden');
    const projectSelect = document.getElementById('project-select');
    const connectBtn = document.getElementById('btn-connect');

    // Load Projects via background
    chrome.runtime.sendMessage({ action: 'fetchProjects' }, (response) => {
        if (response && response.success) {
            projectSelect.innerHTML = '<option value="" disabled selected>Select a project</option>';
            response.projects.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.name;
                projectSelect.appendChild(opt);
            });

            // Restore last selection
            chrome.storage.local.get(['lastProjectId'], (result) => {
                if (result.lastProjectId) {
                    const exists = response.projects.find(p => p.id === result.lastProjectId);
                    if (exists) projectSelect.value = result.lastProjectId;
                }
            });
        } else {
            updateStatus('Failed to load projects: ' + (response?.message || 'Unknown error'), 'red');
        }
    });

    connectBtn.addEventListener('click', () => {
        const customerId = projectSelect.value;
        if (!customerId) {
            updateStatus('Please select a project.', 'red');
            return;
        }

        // Save last used project
        chrome.storage.local.set({ lastProjectId: customerId });

        connectBtn.disabled = true;
        const btnText = connectBtn.querySelector('span:first-child');
        if (btnText) btnText.textContent = 'CONNECTING...';
        updateStatus('Connecting bot...', 'info');

        chrome.runtime.sendMessage({
            action: 'connectBot',
            customerId: customerId,
            meetUrl: meetUrl
        }, (response) => {
            if (response && response.success) {
                updateStatus('Bot Connected ✅', 'success');
                if (btnText) btnText.textContent = 'CONNECTED';
            } else {
                updateStatus('Error: ' + (response?.message || 'Failed'), 'error');
                connectBtn.disabled = false;
                if (btnText) btnText.textContent = 'CONNECT BOT';
            }
        });
    });
}

function updateStatus(msg, type) {
    const el = document.getElementById('status-display');
    if (el) {
        el.textContent = msg;
        el.className = 'status ' + (type || '');
    }
}
