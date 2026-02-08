/**
 * ============================================
 * UI INTERACTIONS MODULE
 * ============================================
 * 
 * This module handles all frontend interactivity:
 * - Theme toggle
 * - Sidebar navigation
 * - Search functionality
 * - Drag and drop
 * - File upload
 * - Rendering PDF cards
 */

// Global state
let currentSubject = 'all';
let allNotes = [];
let pendingFiles = [];

/**
 * Initialize UI
 */
function initUI() {
    try {
        console.log('🚀 Initializing UI...');

        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeToggle.addEventListener('click', toggleTheme);

        // Search functionality
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', handleSearch);
        }

        // Upload button
        const uploadBtn = document.getElementById('upload-btn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', handleUploadClick);
        }

        // Subject selector buttons - Initialize dynamic buttons
        try {
            updateSubjectButtons();
        } catch (e) {
            console.error('Failed to update subject buttons:', e);
        }

        // Cancel upload
        const cancelBtn = document.getElementById('cancel-upload');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', cancelUpload);
        }

        // Manage Subjects Modal Loop
        const manageSubjectsBtn = document.getElementById('manage-subjects-btn');
        const manageSubjectsModal = document.getElementById('manage-subjects-modal');
        const closeModalBtn = document.getElementById('close-modal-btn');
        const addSubjectBtn = document.getElementById('add-subject-btn');
        const newSubjectInput = document.getElementById('new-subject-input');

        if (manageSubjectsBtn && manageSubjectsModal) {
            manageSubjectsBtn.addEventListener('click', () => {
                renderSubjectsList();
                manageSubjectsModal.style.display = 'flex';
            });

            closeModalBtn.addEventListener('click', () => {
                manageSubjectsModal.style.display = 'none';
            });

            window.addEventListener('click', (e) => {
                if (e.target === manageSubjectsModal) {
                    manageSubjectsModal.style.display = 'none';
                }
            });

            addSubjectBtn.addEventListener('click', async () => {
                const subjectName = newSubjectInput.value.trim();
                if (subjectName) {
                    const success = await window.drive.addSubject(subjectName);
                    if (success) {
                        newSubjectInput.value = '';
                        renderSubjectsList();
                        updateSidebarNav();
                        updateSubjectButtons();
                        showToast(`Subject "${subjectName}" added`, 'success');
                    } else {
                        showToast('Subject already exists or invalid', 'error');
                    }
                }
            });
        }

        // Trash Modal Loop
        const trashBtn = document.getElementById('trash-btn');
        const trashModal = document.getElementById('trash-modal');
        const closeTrashBtn = document.getElementById('close-trash-btn');

        if (trashBtn && trashModal) {
            trashBtn.addEventListener('click', openTrashModal);

            closeTrashBtn.addEventListener('click', () => {
                trashModal.style.display = 'none';
            });

            window.addEventListener('click', (e) => {
                if (e.target === trashModal) {
                    trashModal.style.display = 'none';
                }
            });
        }

        updateSidebarNav();

        // Mobile Menu Toggle
        const menuToggle = document.getElementById('menu-toggle');
        const sidebar = document.querySelector('.sidebar');

        // Add overlay element dynamically
        let overlay = document.querySelector('.sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
        }

        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
                overlay.classList.toggle('active');
            });

            overlay.addEventListener('click', () => {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            });

            // Close sidebar when clicking a nav item on mobile
            // Use delegation or re-select since updateSidebarNav rebuilds DOM
            sidebar.addEventListener('click', (e) => {
                if (window.innerWidth <= 768 && e.target.closest('.nav-item')) {
                    sidebar.classList.remove('active');
                    overlay.classList.remove('active');
                }
            });
        }

        // Drag and drop
        const dropZone = document.getElementById('drop-zone');
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });

            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('drag-over');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                handleFileDrop(e.dataTransfer.files);
            });

            // Click to upload
            dropZone.addEventListener('click', () => {
                if (window.auth.isAuthenticated()) {
                    handleUploadClick();
                } else {
                    showToast('Please sign in first', 'warning');
                }
            });
        }

        console.log('✅ UI initialized successfully');
    } catch (error) {
        console.error('❌ Critical Error in initUI:', error);
    }
}

/**
 * Toggle theme
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

/**
 * Handle navigation click
 */
function handleNavClick(item) {
    // Remove active class from all items
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
    });

    // Add active class to clicked item
    item.classList.add('active');

    // Update current subject
    currentSubject = item.dataset.subject;

    // Filter and display notes
    filterAndDisplayNotes();
}

/**
 * Handle search
 */
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    filterAndDisplayNotes(searchTerm);
}

/**
 * Filter and display notes
 */
function filterAndDisplayNotes(searchTerm = '') {
    let filteredNotes = allNotes;

    // Filter by subject
    if (currentSubject !== 'all') {
        filteredNotes = filteredNotes.filter(note => note.subject === currentSubject);
    }

    // Filter by search term
    if (searchTerm) {
        filteredNotes = filteredNotes.filter(note =>
            note.name.toLowerCase().includes(searchTerm)
        );
    }

    // Display notes
    displayNotes(filteredNotes);
}

/**
 * Handle upload button click
 */
function handleUploadClick() {
    if (!window.auth.isAuthenticated()) {
        showToast('Please sign in first', 'warning');
        return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.multiple = true;

    input.onchange = (e) => {
        handleFileDrop(e.target.files);
    };

    input.click();
}

/**
 * Handle file drop/selection
 */
function handleFileDrop(files) {
    if (!window.auth.isAuthenticated()) {
        showToast('Please sign in first', 'warning');
        return;
    }

    // Filter PDF files only
    const pdfFiles = Array.from(files).filter(file => file.type === 'application/pdf');

    if (pdfFiles.length === 0) {
        showToast('Please select PDF files only', 'error');
        return;
    }

    if (pdfFiles.length !== files.length) {
        showToast(`${files.length - pdfFiles.length} non-PDF file(s) ignored`, 'warning');
    }

    // Store files temporarily
    pendingFiles = pdfFiles;

    // Show subject selector
    document.getElementById('subject-selector').style.display = 'block';

    const dropZone = document.getElementById('drop-zone');
    if (dropZone) dropZone.style.display = 'none';

    // Ensure buttons are updated
    updateSubjectButtons();
}

/**
 * Handle subject selection for upload
 */
async function handleSubjectSelect(subject) {
    if (pendingFiles.length === 0) return;

    // Hide subject selector
    document.getElementById('subject-selector').style.display = 'none';
    document.getElementById('drop-zone').style.display = 'block';

    // Upload files
    for (const file of pendingFiles) {
        const result = await window.drive.uploadPDF(file, subject);
        if (result) {
            // Add subject info
            result.subject = subject;
            // Add to notes array
            allNotes.unshift(result);
        }
    }

    // Clear pending files
    pendingFiles = [];

    // Refresh display
    filterAndDisplayNotes();
}

/**
 * Cancel upload
 */
function cancelUpload() {
    pendingFiles = [];
    document.getElementById('subject-selector').style.display = 'none';
    document.getElementById('drop-zone').style.display = 'block';
}

/**
 * Display notes in grid
 */
function displayNotes(notes) {
    const notesGrid = document.getElementById('notes-grid');
    const emptyState = document.getElementById('empty-state');

    if (notes.length === 0) {
        notesGrid.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';

    notesGrid.innerHTML = notes.map(note => createPDFCard(note)).join('');

    // Add event listeners to action buttons
    notes.forEach((note, index) => {
        const card = notesGrid.children[index];

        // View button
        card.querySelector('.view-btn').addEventListener('click', () => {
            window.drive.viewFile(note.webViewLink);
        });

        // Download button
        card.querySelector('.download-btn').addEventListener('click', () => {
            window.drive.downloadFile(note.id, note.name);
        });

        // Delete button
        card.querySelector('.delete-btn').addEventListener('click', async () => {
            const deleted = await window.drive.deleteFile(note.id, note.name);
            if (deleted) {
                // Remove from array
                allNotes = allNotes.filter(n => n.id !== note.id);
                // Refresh display
                filterAndDisplayNotes();
            }
        });
    });
}

/**
 * Create PDF card HTML
 */
function createPDFCard(note) {
    return `
        <div class="pdf-card">
            <div class="pdf-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
            </div>
            <div class="pdf-info">
                <h3>${note.name}</h3>
                <div class="pdf-meta">
                    <span>${window.drive.formatFileSize(note.size)}</span>
                    <span>•</span>
                    <span>${window.drive.formatDate(note.createdTime)}</span>
                </div>
                <span class="pdf-subject">${note.subject}</span>
            </div>
            <div class="pdf-actions">
                <button class="action-btn view-btn" title="View in Google Drive">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    View
                </button>
                <button class="action-btn download-btn" title="Download PDF">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download
                </button>
                <button class="action-btn delete-btn" title="Delete PDF">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Delete
                </button>
            </div>
        </div>
    `;
}

/**
 * Load all notes from Google Drive
 */
async function loadAllNotes() {
    if (!window.auth.isAuthenticated()) {
        return;
    }

    allNotes = await window.drive.listAllPDFs();
    filterAndDisplayNotes();
}

/**
 * Update sidebar navigation
 */
function updateSidebarNav() {
    const navContainer = document.getElementById('sidebar-nav-container');
    if (!navContainer || !window.drive) return;

    const subjects = window.drive.getSubjects();

    let html = `
        <button class="nav-item ${currentSubject === 'all' ? 'active' : ''}" data-subject="all">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            All Notes
        </button>
    `;

    subjects.forEach(subject => {
        html += `
            <button class="nav-item ${currentSubject === subject ? 'active' : ''}" data-subject="${subject}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
                ${subject}
            </button>
        `;
    });

    navContainer.innerHTML = html;

    // Add listeners
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => handleNavClick(item));
    });
}

/**
 * Render subjects list in modal
 */
function renderSubjectsList() {
    const list = document.getElementById('subjects-list');
    if (!list || !window.drive) return;

    const subjects = window.drive.getSubjects();

    list.innerHTML = subjects.map(subject => `
        <div class="subject-item">
            <span>${subject}</span>
            <button class="remove-subject-btn" onclick="handleRemoveSubject('${subject}')" aria-label="Remove subject">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    `).join('');
}

/**
 * Update subject selection buttons
 */
function updateSubjectButtons() {
    const container = document.querySelector('.subject-buttons');
    if (!container || !window.drive) return;

    const subjects = window.drive.getSubjects();
    container.innerHTML = subjects.map(subject => `
        <button class="subject-btn" data-subject="${subject}">${subject}</button>
    `).join('');

    // Add listeners
    container.querySelectorAll('.subject-btn').forEach(btn => {
        btn.addEventListener('click', () => handleSubjectSelect(btn.dataset.subject));
    });
}

/**
 * Handle removing a subject
 */
window.handleRemoveSubject = function (subject) {
    if (confirm(`Are you sure you want to remove "${subject}" from the list? (Files in Google Drive won't be deleted)`)) {
        if (window.drive.removeSubject(subject)) {
            renderSubjectsList();
            updateSidebarNav();
            updateSubjectButtons();

            // If current subject was removed, switch to 'all'
            if (currentSubject === subject) {
                currentSubject = 'all';
                updateSidebarNav(); // to update active state
                filterAndDisplayNotes();
            }

            showToast(`Subject "${subject}" removed`, 'success');
        }
    }
};

/**
 * Show loading indicator
 */
function showLoading(show) {
    const loading = document.getElementById('loading');
    const notesGrid = document.getElementById('notes-grid');
    const emptyState = document.getElementById('empty-state');

    if (show) {
        loading.style.display = 'flex';
        notesGrid.style.display = 'none';
        emptyState.style.display = 'none';
    } else {
        loading.style.display = 'none';
        notesGrid.style.display = 'grid';
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast ${type}`;

    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    // Hide toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3100);
}

// Make functions globally available
window.showToast = showToast;
window.showLoading = showLoading;
/**
 * Open Trash Modal
 */
async function openTrashModal() {
    const modal = document.getElementById('trash-modal');
    const listContainer = document.getElementById('trash-list-container');

    if (modal && listContainer) {
        modal.style.display = 'flex';
        listContainer.innerHTML = '<div class="spinner"></div><p style="text-align:center">Loading deleted files...</p>';

        const files = await window.drive.listTrashedFiles();
        renderTrashList(files);
    }
}

/**
 * Render Trash List
 */
function renderTrashList(files) {
    const listContainer = document.getElementById('trash-list-container');
    if (!listContainer) return;

    if (files.length === 0) {
        listContainer.innerHTML = '<div class="empty-state"><h3>Recycle Bin is Empty</h3><p>No deleted files found.</p></div>';
        return;
    }

    listContainer.innerHTML = files.map(file => `
        <div class="trash-item">
            <div class="trash-info">
                <span class="trash-name">${file.name}</span>
                <span class="trash-meta">${window.drive.formatDate(file.createdTime)} • ${window.drive.formatFileSize(file.size)}</span>
            </div>
            <div class="trash-actions">
                <button class="restore-btn" onclick="handleRestoreFile('${file.id}', '${file.name.replace(/'/g, "\\'")}')" title="Restore">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 14 15 8"></polyline>
                        <polyline points="9 8 9 14 15 14"></polyline>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                    </svg>
                    Restore
                </button>
                <button class="delete-perm-btn" onclick="handleDeletePermanently('${file.id}', '${file.name.replace(/'/g, "\\'")}')" title="Delete Permanently">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Handle Restore File
 */
window.handleRestoreFile = async function (fileId, fileName) {
    const success = await window.drive.restoreFile(fileId, fileName);
    if (success) {
        // Refresh trash list
        const files = await window.drive.listTrashedFiles();
        renderTrashList(files);
        // Refresh main notes list just in case
        loadAllNotes();
    }
};

/**
 * Handle Permanent Delete
 */
window.handleDeletePermanently = async function (fileId, fileName) {
    const success = await window.drive.deletePermanently(fileId, fileName);
    if (success) {
        // Refresh trash list
        const files = await window.drive.listTrashedFiles();
        renderTrashList(files);
    }
};

window.loadAllNotes = loadAllNotes;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initUI);

console.log('✅ UI module loaded');
