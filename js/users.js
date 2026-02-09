/**
 * ============================================
 * USER MANAGEMENT MODULE
 * ============================================
 * 
 * This module handles fixed user profiles for
 * multi-user note organization.
 */

// Fixed list of users
const FIXED_USERS = ['Kavindya', 'Umayangana', 'Samuduni'];
let CURRENT_USER = localStorage.getItem('campus_notes_current_user');

// Validate current user
if (!CURRENT_USER || !FIXED_USERS.includes(CURRENT_USER)) {
    CURRENT_USER = FIXED_USERS[0];
    localStorage.setItem('campus_notes_current_user', CURRENT_USER);
}

/**
 * Get all users
 */
function getUsers() {
    return [...FIXED_USERS];
}

/**
 * Get current active user
 */
function getCurrentUser() {
    return CURRENT_USER;
}

/**
 * Set current active user
 */
function setCurrentUser(userName) {
    if (FIXED_USERS.includes(userName)) {
        CURRENT_USER = userName;
        localStorage.setItem('campus_notes_current_user', CURRENT_USER);

        // Trigger notes reload
        if (window.auth && window.auth.isAuthenticated()) {
            loadAllNotes();
        }

        // Update UI
        updateUserSelectorUI();
        return true;
    }
    return false;
}

/**
 * Update user selector UI
 */
function updateUserSelectorUI() {
    const userSelector = document.getElementById('user-selector');

    if (userSelector) {
        userSelector.innerHTML = FIXED_USERS.map(user =>
            `<option value="${user}" ${user === CURRENT_USER ? 'selected' : ''}>${user}</option>`
        ).join('');
    }
}

// Export functions (simplified API)
window.users = {
    getUsers,
    getCurrentUser,
    setCurrentUser,
    updateUserSelectorUI
};
