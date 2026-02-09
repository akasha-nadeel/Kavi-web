/**
 * ============================================
 * USER MANAGEMENT MODULE (Single User)
 * ============================================
 * 
 * Simplified single-user version.
 * Always returns 'Me' as the current user.
 */

const CURRENT_USER = 'Me';

/**
 * Get current active user (always 'Me')
 */
function getCurrentUser() {
    return CURRENT_USER;
}

// Export functions (simplified API)
window.users = {
    getCurrentUser
};
