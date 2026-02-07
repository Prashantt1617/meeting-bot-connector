/**
 * Background Service Worker
 * Handles authentication state, API communication, and automatic injection.
 */

const LOGIN_API = 'https://api.floorselector.convrse.ai/api/sales-person/login';
const API_PROJECTS = 'https://api.floorselector.convrse.ai/api/customers/projects';
const API_SESSION = 'https://api.floorselector.convrse.ai/session';
const API_JOIN = 'https://notetaker.convrse.ai/api/meetings/join';

// Listener for installation
chrome.runtime.onInstalled.addListener(() => {

});

// Listener for tab updates to detect Google Meet
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('https://meet.google.com/')) {
        try {
            const urlObj = new URL(tab.url);
            // Exclude home page and probably landing pages if possible, but path length check is decent
            if (urlObj.pathname !== '/' && urlObj.pathname.length > 1) {

                chrome.tabs.sendMessage(tabId, { action: 'SHOW_PANEL' }).catch((err) => {
                    // Content script might not be injected or ready yet

                });
            }
        } catch (e) {
            console.error('Invalid URL:', tab.url);
        }
    }
});

// Listener for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'checkAuth') {
        handleCheckAuth(sendResponse);
        return true;
    }

    if (request.action === 'login') {
        handleLogin(request.email, request.password).then(sendResponse);
        return true;
    }

    if (request.action === 'logout') {
        chrome.storage.local.remove('auth', () => {
            sendResponse({ success: true });
        });
        return true;
    }

    if (request.action === 'fetchProjects') {
        handleFetchProjects(sendResponse);
        return true;
    }

    if (request.action === 'connectBot') {
        handleConnectBot(request, sendResponse);
        return true;
    }
});

// =====================
// HANDLERS
// =====================

function handleCheckAuth(sendResponse) {
    chrome.storage.local.get(['auth'], (result) => {
        const auth = result.auth;
        if (auth && auth.token) {
            sendResponse({ isAuthenticated: true, user: auth });
        } else {
            sendResponse({ isAuthenticated: false });
        }
    });
}

async function handleLogin(email, password) {
    try {
        const response = await fetch(LOGIN_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                password: password,
                business_identifier: "meeting_bot",
                remember_me: false
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            const { salesPerson, token, sessionId } = data.data;

            const authStorage = {
                token: token.access_token,
                tokenType: token.token_type,
                userId: salesPerson.user_id,
                internalId: salesPerson._id,
                email: salesPerson.email,
                fullName: salesPerson.full_name,
                businessIdentifier: salesPerson.business_id,
                projectIds: salesPerson.project_ids,
                isAdmin: salesPerson.is_admin,
                userType: salesPerson.type,
                loginSessionId: sessionId,
                loggedInAt: Date.now()
            };

            await chrome.storage.local.set({ auth: authStorage });
            return { success: true, user: authStorage };
        } else {
            return { success: false, message: data.message || 'Login failed' };
        }
    } catch (err) {
        console.error('Login error:', err);
        return { success: false, message: err.message || 'Network error' };
    }
}

function handleFetchProjects(sendResponse) {
    chrome.storage.local.get(['auth'], async (result) => {
        if (!result.auth) {
            sendResponse({ success: false, message: 'Not authenticated' });
            return;
        }
        try {
            const projects = await fetchProjectsAPI(result.auth.token);
            sendResponse({ success: true, projects });
        } catch (err) {
            sendResponse({ success: false, message: err.message });
        }
    });
}

function handleConnectBot(request, sendResponse) {
    chrome.storage.local.get(['auth'], async (result) => {
        if (!result.auth) {
            sendResponse({ success: false, message: 'Not authenticated' });
            return;
        }
        try {
            const sessionData = await createSession(result.auth, request.customerId);
            const sessionId = extractSessionId(sessionData);

            if (!sessionId) {
                throw new Error('Could not retrieve Session ID from backend.');
            }

            const joinResponse = await joinMeeting(result.auth, request.customerId, sessionId, request.meetUrl);
            sendResponse({ success: true, data: joinResponse });

        } catch (err) {
            console.error('Connection error:', err);
            sendResponse({ success: false, message: err.message });
        }
    });
}

// =====================
// API HELPERS
// =====================

async function fetchProjectsAPI(token) {
    const res = await fetch(API_PROJECTS, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('API Error ' + res.status);
    const json = await res.json();
    const projectIds = Array.isArray(json.data) ? json.data : [];
    return projectIds.map(id => ({
        id: id,
        name: id.replace(/_/g, ' ')
    }));
}

async function createSession(auth, customerId) {
    const payload = {
        customer_id: customerId,
        rm_id: auth.userId,
        project_id: auth.businessIdentifier,
        project_sfid: "",
        status: "active",
        start_time: Date.now()
    };
    const res = await fetch(API_SESSION, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${auth.token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Session Creation Failed: ' + res.status);
    return await res.json();
}

function extractSessionId(res) {
    return res.data?.sessionId || res.sessionId || res._id || res.id || null;
}

async function joinMeeting(auth, customerId, sessionId, meetUrl) {
    const payload = {
        meeting_url: meetUrl,
        platform: "meet",
        user_email: auth.email,
        jwt_token: auth.token,
        business_identifier: auth.businessIdentifier,
        customer_id: customerId,
        session_id: sessionId
    };
    const res = await fetch(API_JOIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Bot Join Failed: ' + res.status);
    }
    return await res.json();
}
