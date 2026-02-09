/**
 * ============================================
 * ANALYTICS & INSIGHTS MODULE
 * ============================================
 * 
 * Tracks user study behavior and stores data in Google Drive.
 * Provides statistics for heatmaps, charts, and reports.
 */

const ANALYTICS_FILE_NAME = '.campus_notes_analytics.json';
let analyticsData = {
    sessions: [],           // { date, duration, notesViewed }
    noteViews: {},          // { fileId: count }
    dailyActivity: {},      // { "2024-02-09": activityCount }
    lastAccess: null,       // ISO date string
    studyStreak: 0,
    totalStudyTime: 0,      // in minutes
    version: 1
};

let analyticsFileId = null;
let currentSessionStart = null;
let currentNoteId = null;
let currentNoteStartTime = null;

/**
 * Initialize analytics system
 */
async function initAnalytics() {
    if (!window.auth || !window.auth.isAuthenticated()) {
        console.log('⏸️ Analytics: Waiting for authentication');
        return;
    }

    try {
        await loadAnalyticsFromDrive();
        updateDailyActivity();
        updateStudyStreak();
        startSession();
        console.log('📊 Analytics initialized');
    } catch (error) {
        console.error('Analytics init error:', error);
    }
}

/**
 * Load analytics data from Google Drive
 */
async function loadAnalyticsFromDrive() {
    try {
        // Search for analytics file in root folder
        const response = await gapi.client.drive.files.list({
            q: `name='${ANALYTICS_FILE_NAME}' and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        if (response.result.files && response.result.files.length > 0) {
            analyticsFileId = response.result.files[0].id;

            // Download and parse the file
            const fileResponse = await gapi.client.drive.files.get({
                fileId: analyticsFileId,
                alt: 'media'
            });

            analyticsData = JSON.parse(fileResponse.body);
            console.log('📥 Analytics data loaded from Drive');
        } else {
            // Create new analytics file
            console.log('📝 Creating new analytics file');
            await saveAnalyticsToDrive();
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

/**
 * Save analytics data to Google Drive
 */
async function saveAnalyticsToDrive() {
    try {
        const content = JSON.stringify(analyticsData, null, 2);
        const blob = new Blob([content], { type: 'application/json' });

        const metadata = {
            name: ANALYTICS_FILE_NAME,
            mimeType: 'application/json'
        };

        if (analyticsFileId) {
            // Update existing file
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', blob);

            await fetch(`https://www.googleapis.com/upload/drive/v3/files/${analyticsFileId}?uploadType=multipart`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${gapi.auth.getToken().access_token}`
                },
                body: form
            });
        } else {
            // Create new file
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', blob);

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${gapi.auth.getToken().access_token}`
                },
                body: form
            });

            const result = await response.json();
            analyticsFileId = result.id;
        }

        console.log('💾 Analytics saved to Drive');
    } catch (error) {
        console.error('Error saving analytics:', error);
    }
}

/**
 * Update daily activity counter
 */
function updateDailyActivity() {
    const today = new Date().toISOString().split('T')[0];

    if (!analyticsData.dailyActivity[today]) {
        analyticsData.dailyActivity[today] = 0;
    }

    analyticsData.dailyActivity[today]++;
}

/**
 * Update study streak
 */
function updateStudyStreak() {
    const today = new Date().toISOString().split('T')[0];
    const lastAccess = analyticsData.lastAccess ? analyticsData.lastAccess.split('T')[0] : null;

    if (!lastAccess) {
        analyticsData.studyStreak = 1;
    } else {
        const lastDate = new Date(lastAccess);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            // Same day, keep streak
        } else if (diffDays === 1) {
            // Consecutive day
            analyticsData.studyStreak++;
        } else {
            // Streak broken
            analyticsData.studyStreak = 1;
        }
    }

    analyticsData.lastAccess = new Date().toISOString();
}

/**
 * Start a study session
 */
function startSession() {
    currentSessionStart = Date.now();
}

/**
 * End current session and save
 */
async function endSession() {
    if (!currentSessionStart) return;

    const duration = Math.floor((Date.now() - currentSessionStart) / 1000 / 60); // minutes

    if (duration > 0) {
        analyticsData.sessions.push({
            date: new Date().toISOString(),
            duration: duration,
            notesViewed: Object.keys(analyticsData.noteViews).length
        });

        analyticsData.totalStudyTime += duration;
        await saveAnalyticsToDrive();
    }

    currentSessionStart = null;
}

/**
 * Track when a note is viewed
 */
function trackNoteView(fileId, fileName) {
    if (!fileId) return;

    // Increment view count
    if (!analyticsData.noteViews[fileId]) {
        analyticsData.noteViews[fileId] = {
            count: 0,
            name: fileName || 'Unknown',
            lastViewed: null
        };
    }

    analyticsData.noteViews[fileId].count++;
    analyticsData.noteViews[fileId].lastViewed = new Date().toISOString();

    // Start tracking time for this note
    currentNoteId = fileId;
    currentNoteStartTime = Date.now();

    // Update daily activity
    updateDailyActivity();

    // Save periodically (debounced)
    debouncedSave();
}

/**
 * Track when a note is closed
 */
function trackNoteClose() {
    if (currentNoteId && currentNoteStartTime) {
        const readingTime = Math.floor((Date.now() - currentNoteStartTime) / 1000 / 60); // minutes

        if (readingTime > 0 && analyticsData.noteViews[currentNoteId]) {
            if (!analyticsData.noteViews[currentNoteId].totalReadingTime) {
                analyticsData.noteViews[currentNoteId].totalReadingTime = 0;
            }
            analyticsData.noteViews[currentNoteId].totalReadingTime += readingTime;
        }

        currentNoteId = null;
        currentNoteStartTime = null;
    }
}

/**
 * Debounced save function
 */
let saveTimeout;
function debouncedSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveAnalyticsToDrive();
    }, 5000); // Save after 5 seconds of inactivity
}

/**
 * Get analytics statistics
 */
function getAnalyticsStats() {
    return {
        studyStreak: analyticsData.studyStreak,
        totalStudyTime: analyticsData.totalStudyTime,
        totalSessions: analyticsData.sessions.length,
        totalNotesViewed: Object.keys(analyticsData.noteViews).length,
        mostViewedNotes: getMostViewedNotes(5),
        dailyActivity: analyticsData.dailyActivity,
        subjectDistribution: getSubjectDistribution(),
        weeklyActivity: getWeeklyActivity(),
        studyHeatmap: getStudyHeatmap()
    };
}

/**
 * Get most viewed notes
 */
function getMostViewedNotes(limit = 5) {
    return Object.entries(analyticsData.noteViews)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
}

/**
 * Get subject distribution (count of notes per subject)
 */
function getSubjectDistribution() {
    if (!window.drive || !window.drive.SUBJECTS) return {};

    const distribution = {};
    window.drive.SUBJECTS.forEach(subject => {
        distribution[subject] = 0;
    });

    // Count notes in each subject (this would need to be tracked separately)
    // For now, return empty distribution
    return distribution;
}

/**
 * Get weekly activity (last 7 days)
 */
function getWeeklyActivity() {
    const activity = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        activity.push({
            date: dateStr,
            day: date.toLocaleDateString('en-US', { weekday: 'short' }),
            count: analyticsData.dailyActivity[dateStr] || 0
        });
    }

    return activity;
}

/**
 * Get study heatmap data (hour of day activity)
 */
function getStudyHeatmap() {
    const heatmap = Array(24).fill(0); // 24 hours

    analyticsData.sessions.forEach(session => {
        const hour = new Date(session.date).getHours();
        heatmap[hour]++;
    });

    return heatmap.map((count, hour) => ({
        hour: `${hour}:00`,
        count
    }));
}

/**
 * Reset all analytics data
 */
async function resetAnalytics() {
    // Confirm with user
    const confirmed = confirm(
        '⚠️ Reset All Statistics?\n\n' +
        'This will permanently delete:\n' +
        '• All study sessions\n' +
        '• Note view history\n' +
        '• Study streak\n' +
        '• All charts data\n\n' +
        'This action cannot be undone. Continue?'
    );

    if (!confirmed) return;

    try {
        // Delete the analytics file from Google Drive if it exists
        if (analyticsFileId) {
            await gapi.client.drive.files.delete({
                fileId: analyticsFileId
            });
            console.log('🗑️ Analytics file deleted from Drive');
        }

        // Reset local data
        analyticsData = {
            sessions: [],
            noteViews: {},
            dailyActivity: {},
            lastAccess: null,
            studyStreak: 0,
            totalStudyTime: 0,
            version: 1
        };
        analyticsFileId = null;
        currentSessionStart = null;
        currentNoteId = null;
        currentNoteStartTime = null;

        // Create fresh file
        await saveAnalyticsToDrive();

        // Restart session
        startSession();
        updateDailyActivity();
        updateStudyStreak();

        console.log('✅ Analytics reset complete');

        // Show success message
        if (window.ui && window.ui.showToast) {
            window.ui.showToast('Statistics reset successfully!', 'success');
        } else {
            alert('✅ Statistics reset successfully!');
        }

        // Reload the stats display if modal is open
        if (window.statsUI && window.statsUI.loadStatistics) {
            window.statsUI.loadStatistics();
        }

    } catch (error) {
        console.error('Error resetting analytics:', error);
        if (window.ui && window.ui.showToast) {
            window.ui.showToast('Failed to reset statistics', 'error');
        } else {
            alert('❌ Failed to reset statistics. Please try again.');
        }
    }
}

// Initialize when authenticated
function tryInitAnalytics() {
    if (window.auth && window.auth.isAuthenticated && window.auth.isAuthenticated()) {
        initAnalytics();
    } else {
        // Retry after a short delay
        setTimeout(tryInitAnalytics, 500);
    }
}

// Start trying to initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInitAnalytics);
} else {
    tryInitAnalytics();
}

// Save analytics before page unload
window.addEventListener('beforeunload', () => {
    endSession();
    if (analyticsData) {
        saveAnalyticsToDrive();
    }
});

// Export functions
window.analytics = {
    trackNoteView,
    trackNoteClose,
    getAnalyticsStats,
    initAnalytics,
    resetAnalytics
};
