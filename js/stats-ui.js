/**
 * ============================================
 * STATISTICS UI MODULE
 * ============================================
 * 
 * Handles the statistics modal UI and chart rendering
 */

let weeklyChart, heatmapChart, subjectChart;

/**
 * Open statistics modal
 */
function openStatsModal() {
    const modal = document.getElementById('stats-modal');
    if (!modal) return;

    modal.style.display = 'flex';
    loadStatistics();
}

/**
 * Close statistics modal
 */
function closeStatsModal() {
    const modal = document.getElementById('stats-modal');
    if (modal) {
        modal.style.display = 'none';
    }

    // Destroy charts to prevent memory leaks
    if (weeklyChart) {
        weeklyChart.destroy();
        weeklyChart = null;
    }
    if (heatmapChart) {
        heatmapChart.destroy();
        heatmapChart = null;
    }
    if (subjectChart) {
        subjectChart.destroy();
        subjectChart = null;
    }
}

/**
 * Load and display statistics
 */
async function loadStatistics() {
    if (!window.analytics) {
        console.error('Analytics module not loaded');
        return;
    }

    const stats = window.analytics.getAnalyticsStats();

    // Update stat cards
    document.getElementById('stat-streak').textContent = stats.studyStreak;
    document.getElementById('stat-time').textContent = stats.totalStudyTime;
    document.getElementById('stat-notes').textContent = stats.totalNotesViewed;
    document.getElementById('stat-sessions').textContent = stats.totalSessions;

    // Render charts
    renderWeeklyChart(stats.weeklyActivity);
    renderHeatmapChart(stats.studyHeatmap);
    renderSubjectChart(stats.subjectDistribution);
    renderMostViewedList(stats.mostViewedNotes);
}

/**
 * Render weekly activity chart
 */
function renderWeeklyChart(weeklyData) {
    const ctx = document.getElementById('weekly-chart');
    if (!ctx) return;

    // Destroy existing chart
    if (weeklyChart) {
        weeklyChart.destroy();
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#e2e8f0' : '#1e293b';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    weeklyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: weeklyData.map(d => d.day),
            datasets: [{
                label: 'Activity Count',
                data: weeklyData.map(d => d.count),
                backgroundColor: 'rgba(99, 102, 241, 0.6)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    titleColor: textColor,
                    bodyColor: textColor,
                    borderColor: gridColor,
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: textColor,
                        stepSize: 1
                    },
                    grid: {
                        color: gridColor
                    }
                },
                x: {
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

/**
 * Render study heatmap chart
 */
function renderHeatmapChart(heatmapData) {
    const ctx = document.getElementById('heatmap-chart');
    if (!ctx) return;

    // Destroy existing chart
    if (heatmapChart) {
        heatmapChart.destroy();
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#e2e8f0' : '#1e293b';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    // Show only hours with activity or key hours
    const filteredData = heatmapData.filter((d, i) =>
        d.count > 0 || [6, 9, 12, 15, 18, 21].includes(i)
    );

    heatmapChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: filteredData.map(d => d.hour),
            datasets: [{
                label: 'Study Sessions',
                data: filteredData.map(d => d.count),
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                borderColor: 'rgba(16, 185, 129, 1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: 'rgba(16, 185, 129, 1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    titleColor: textColor,
                    bodyColor: textColor,
                    borderColor: gridColor,
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: textColor,
                        stepSize: 1
                    },
                    grid: {
                        color: gridColor
                    }
                },
                x: {
                    ticks: {
                        color: textColor,
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

/**
 * Render subject distribution chart
 */
function renderSubjectChart(subjectData) {
    const ctx = document.getElementById('subject-chart');
    if (!ctx) return;

    // Destroy existing chart
    if (subjectChart) {
        subjectChart.destroy();
    }

    const subjects = Object.keys(subjectData);
    const counts = Object.values(subjectData);

    // If no data, show empty state
    if (subjects.length === 0 || counts.every(c => c === 0)) {
        ctx.parentElement.innerHTML = '<p class="empty-state">No subject data yet. Upload some notes!</p>';
        return;
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#e2e8f0' : '#1e293b';

    const colors = [
        'rgba(99, 102, 241, 0.8)',
        'rgba(236, 72, 153, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(139, 92, 246, 0.8)'
    ];

    subjectChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: subjects,
            datasets: [{
                data: counts,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: isDark ? '#1e293b' : '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: textColor,
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    titleColor: textColor,
                    bodyColor: textColor,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                    borderWidth: 1,
                    padding: 12
                }
            }
        }
    });
}

/**
 * Render most viewed notes list
 */
function renderMostViewedList(mostViewed) {
    const container = document.getElementById('most-viewed-list');
    if (!container) return;

    if (!mostViewed || mostViewed.length === 0) {
        container.innerHTML = '<p class="empty-state">No data yet. Start viewing notes!</p>';
        return;
    }

    container.innerHTML = mostViewed.map((note, index) => `
        <div class="most-viewed-item">
            <span class="most-viewed-rank">${index + 1}.</span>
            <span class="most-viewed-name" title="${note.name}">${note.name}</span>
            <span class="most-viewed-count">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
                ${note.count}
            </span>
        </div>
    `).join('');
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Stats button
    const statsBtn = document.getElementById('stats-btn');
    if (statsBtn) {
        statsBtn.addEventListener('click', openStatsModal);
    }

    // Close button
    const closeBtn = document.getElementById('close-stats-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeStatsModal);
    }

    // Reset button
    const resetBtn = document.getElementById('reset-stats-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            if (window.analytics && window.analytics.resetAnalytics) {
                await window.analytics.resetAnalytics();
            }
        });
    }

    // Close on backdrop click
    const modal = document.getElementById('stats-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeStatsModal();
            }
        });
    }

    // Update charts when theme changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'data-theme') {
                const modal = document.getElementById('stats-modal');
                if (modal && modal.style.display === 'flex') {
                    loadStatistics();
                }
            }
        });
    });

    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    });
});

// Export functions
window.statsUI = {
    openStatsModal,
    closeStatsModal,
    loadStatistics
};
