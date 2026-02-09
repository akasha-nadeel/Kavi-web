/**
 * ============================================
 * GOOGLE DRIVE AUTHENTICATION MODULE
 * ============================================
 * 
 * This module handles Google OAuth 2.0 authentication
 * for accessing Google Drive API.
 * 
 * SETUP INSTRUCTIONS:
 * -------------------
 * 1. Go to Google Cloud Console: https://console.cloud.google.com/
 * 2. Create a new project or select an existing one
 * 3. Enable Google Drive API:
 *    - Go to "APIs & Services" > "Library"
 *    - Search for "Google Drive API"
 *    - Click "Enable"
 * 4. Create OAuth 2.0 credentials:
 *    - Go to "APIs & Services" > "Credentials"
 *    - Click "Create Credentials" > "OAuth client ID"
 *    - Choose "Web application"
 *    - Add authorized JavaScript origins:
 *      - http://localhost:5500 (for local development)
 *      - Your production domain (if deploying)
 *    - Add authorized redirect URIs:
 *      - http://localhost:5500 (for local development)
 *      - Your production domain (if deploying)
 * 5. Copy the Client ID and paste it below
 * 6. Configure OAuth consent screen with necessary scopes
 * 
 * REPLACE THIS WITH YOUR CLIENT ID:
 */

const CLIENT_ID = '26955947407-qe8q0i1hdnu86b9oa8shd208gbt3k38b.apps.googleusercontent.com';

/**
 * SCOPES: Define what permissions we need
 * - drive.file: Access to files created/opened by this app
 * - drive.metadata.readonly: Read file metadata
 */
const SCOPES = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.profile';

// Discovery docs for Google Drive API
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];

// Global variables
let tokenClient;
let gapiInited = false;
let gisInited = false;

/**
 * Initialize Google API client
 */
function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

/**
 * Initialize GAPI client with API key and discovery docs
 */
async function initializeGapiClient() {
    try {
        await gapi.client.init({
            discoveryDocs: DISCOVERY_DOCS,
        });
        gapiInited = true;
        maybeEnableButtons();
        console.log('✅ Google API client initialized');
    } catch (error) {
        console.error('❌ Error initializing GAPI client:', error);
        showToast('Failed to initialize Google API', 'error');
    }
}

/**
 * Initialize Google Identity Services
 */
function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
    });
    gisInited = true;
    maybeEnableButtons();
    console.log('✅ Google Identity Services initialized');
}

/**
 * Enable UI elements once both GAPI and GIS are initialized
 */
function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        // Try to restore session from localStorage
        const token = localStorage.getItem('gdrive_token');
        const expiry = localStorage.getItem('gdrive_token_expiry');
        const now = new Date().getTime();

        if (token && expiry && now < parseInt(expiry)) {
            console.log('🔄 Restoring session from storage...');
            gapi.client.setToken({
                access_token: token,
                expires_in: (parseInt(expiry) - now) / 1000
            });
            updateSignInStatus(true);
            // Wait a bit for UI to settle then load notes
            setTimeout(() => loadAllNotes(), 500);
        } else {
            // Token expired or not found
            if (token) {
                console.log('⚠️ Session expired, clearing storage');
                localStorage.removeItem('gdrive_token');
                localStorage.removeItem('gdrive_token_expiry');
            }
            updateSignInStatus(false);
        }
    }
}

/**
 * Handle user sign-in
 */
function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            console.error('❌ Auth error:', resp);
            showToast('Authentication failed', 'error');
            throw (resp);
        }

        // Save token to localStorage
        const expiryTime = new Date().getTime() + (resp.expires_in * 1000);
        localStorage.setItem('gdrive_token', resp.access_token);
        localStorage.setItem('gdrive_token_expiry', expiryTime);

        updateSignInStatus(true);
        showToast('Successfully signed in!', 'success');

        // Load notes after sign in
        await loadAllNotes();
    };

    if (gapi.client.getToken() === null) {
        // Prompt the user to select a Google Account and ask for consent
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        // Skip display of account chooser and consent dialog
        tokenClient.requestAccessToken({ prompt: '' });
    }
}

/**
 * Handle user sign-out
 */
function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
    }

    updateSignInStatus(false);
    showToast('Signed out successfully', 'success');

    // Clear local storage tokens
    localStorage.removeItem('gdrive_token');
    localStorage.removeItem('gdrive_token_expiry');
    localStorage.removeItem('user_profile');

    // Clear notes display
    const notesGrid = document.getElementById('notes-grid');
    const emptyState = document.getElementById('empty-state');
    if (notesGrid) notesGrid.innerHTML = '';
    if (emptyState) emptyState.style.display = 'flex';
}

/**
 * Fetch user profile from Google
 */
async function fetchUserProfile(accessToken) {
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user profile');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
}

/**
 * Update UI based on sign-in status
 */
async function updateSignInStatus(isSignedIn) {
    const signInBtn = document.getElementById('sign-in-btn');
    const userProfile = document.getElementById('user-profile');
    const userAvatar = document.getElementById('user-avatar');
    const userNameDisplay = document.getElementById('user-name-display');
    const signOutBtn = document.getElementById('sign-out-btn');

    if (isSignedIn) {
        if (signInBtn) signInBtn.style.display = 'none';
        if (userProfile) userProfile.style.display = 'flex';

        if (signOutBtn) signOutBtn.onclick = handleSignoutClick;

        // Fetch profile
        const token = getAccessToken() || localStorage.getItem('gdrive_token');
        if (token) {
            // Try cache first for instant UI
            const cached = JSON.parse(localStorage.getItem('user_profile') || '{}');
            if (cached.picture && userAvatar) userAvatar.src = cached.picture;
            if (cached.name && userNameDisplay) userNameDisplay.textContent = cached.given_name || cached.name;

            // Fetch fresh
            const profile = await fetchUserProfile(token);
            if (profile) {
                const pic = profile.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=random`;
                if (userAvatar) userAvatar.src = pic;
                if (userNameDisplay) userNameDisplay.textContent = profile.given_name || profile.name;
                localStorage.setItem('user_profile', JSON.stringify(profile));
            }
        }
    } else {
        if (signInBtn) {
            signInBtn.style.display = 'flex';
            signInBtn.onclick = handleAuthClick;
        }
        if (userProfile) userProfile.style.display = 'none';
        if (userAvatar) userAvatar.src = '';
        if (userNameDisplay) userNameDisplay.textContent = '';
    }
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    return gapi.client.getToken() !== null;
}

/**
 * Get current access token
 */
function getAccessToken() {
    const token = gapi.client.getToken();
    return token ? token.access_token : null;
}

// Initialize when scripts are loaded
window.addEventListener('load', () => {
    // Check if GAPI is loaded
    if (typeof gapi !== 'undefined') {
        gapiLoaded();
    } else {
        console.error('❌ Google API library not loaded');
        showToast('Failed to load Google API. Please refresh the page.', 'error');
    }

    // Check if GIS is loaded
    if (typeof google !== 'undefined' && google.accounts) {
        gisLoaded();
    } else {
        console.error('❌ Google Identity Services not loaded');
        showToast('Failed to load authentication. Please refresh the page.', 'error');
    }
});

// Export functions for use in other modules
window.auth = {
    handleAuthClick,
    handleSignoutClick,
    isAuthenticated,
    getAccessToken,
    updateSignInStatus
};
