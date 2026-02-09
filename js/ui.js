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
let currentSort = 'newest';
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

        // Sort functionality
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                currentSort = e.target.value;
                filterAndDisplayNotes();
            });
        }

        // Upload button
        const uploadBtn = document.getElementById('upload-btn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', handleUploadClick);
            console.log('✅ Upload button event listener attached');
        } else {
            console.error('❌ Upload button not found in DOM');
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


        // User Selector Change
        const userSelector = document.getElementById('user-selector');
        if (userSelector) {
            userSelector.addEventListener('change', (e) => {
                const selectedUser = e.target.value;
                window.users.setCurrentUser(selectedUser);
                showToast(`Switched to ${selectedUser}`, 'success');
            });

            // Initialize user selector
            window.users.updateUserSelectorUI();
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

        // PDF Preview Modal
        const pdfModal = document.getElementById('pdf-modal');
        const closePdfBtn = document.getElementById('close-pdf-btn');

        if (pdfModal && closePdfBtn) {
            closePdfBtn.addEventListener('click', () => {
                const iframe = document.getElementById('pdf-frame');
                if (iframe.src) {
                    // Start loading about:blank to clear
                    iframe.src = '';
                    // Revoke not strictly available on element property without tracking, but we can just clear src
                }
                pdfModal.style.display = 'none';
            });

            window.addEventListener('click', (e) => {
                if (e.target === pdfModal) {
                    const iframe = document.getElementById('pdf-frame');
                    if (iframe.src) {
                        iframe.src = '';
                    }
                    pdfModal.style.display = 'none';
                }
            });
        }

        // Mobile Menu Toggle - Initialize BEFORE other components to ensure responsiveness
        const menuToggle = document.getElementById('menu-toggle');
        const sidebar = document.querySelector('.sidebar');

        // Add overlay element dynamically if it doesn't exist
        let overlay = document.querySelector('.sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
        }

        if (menuToggle && sidebar) {
            console.log('📱 initializing mobile menu toggle');

            // Ensure any existing listeners don't create duplicates (though unlikely in initUI)
            // Use cloneNode or separate function? No, initUI runs once.

            menuToggle.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent bubbling issues
                console.log('📱 menu toggle clicked');
                sidebar.classList.toggle('active');
                if (overlay) overlay.classList.toggle('active');
            });

            if (overlay) {
                overlay.addEventListener('click', () => {
                    sidebar.classList.remove('active');
                    overlay.classList.remove('active');
                });
            }

            // Close sidebar when clicking a nav item on mobile
            sidebar.addEventListener('click', (e) => {
                if (window.innerWidth <= 768 && e.target.closest('.nav-item')) {
                    // Check if it's NOT the toggle button itself (though distinct)
                    sidebar.classList.remove('active');
                    if (overlay) overlay.classList.remove('active');
                }
            });
        }

        try {
            updateSidebarNav();
        } catch (e) {
            console.error('Failed to update sidebar nav:', e);
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
/**
 * Handle search
 */
function handleSearch(e) {
    filterAndDisplayNotes();
}

/**
 * Filter and display notes
 */
function filterAndDisplayNotes() {
    let filteredNotes = [...allNotes]; // Create copy
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase().trim() || '';

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

    // Sort: Favorites first, then selected criteria
    filteredNotes.sort((a, b) => {
        // Favorites always on top
        if (a.isFavorite !== b.isFavorite) {
            return a.isFavorite ? -1 : 1;
        }

        // Secondary sort
        switch (currentSort) {
            case 'newest':
                return new Date(b.createdTime) - new Date(a.createdTime);
            case 'oldest':
                return new Date(a.createdTime) - new Date(b.createdTime);
            case 'name-asc':
                return a.name.localeCompare(b.name);
            case 'name-desc':
                return b.name.localeCompare(a.name);
            case 'size-desc':
                return b.size - a.size;
            case 'size-asc':
                return a.size - b.size;
            default:
                return 0;
        }
    });

    // Display notes
    displayNotes(filteredNotes);
}

/**
 * Handle upload button click
 */
function handleUploadClick() {
    console.log('📤 Upload button clicked');

    if (!window.auth || !window.auth.isAuthenticated()) {
        console.warn('⚠️ User not authenticated');
        showToast('Please sign in first', 'warning');
        return;
    }

    console.log('✅ User authenticated, creating file input');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.multiple = true;

    input.onchange = (e) => {
        console.log('📁 Files selected:', e.target.files.length);
        handleFileDrop(e.target.files);
    };

    input.click();
    console.log('🖱️ File picker triggered');
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
            window.drive.previewFile(note.id, note.name);
        });

        // Favorite button
        const favBtn = card.querySelector('.favorite-btn');
        if (favBtn) {
            favBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isFav = window.drive.toggleFavorite(note.id);
                note.isFavorite = isFav;

                // Re-sort and display using current criteria
                filterAndDisplayNotes();
                showToast(isFav ? 'Pinned to top' : 'Unpinned', 'success');
            });
        }

        // Download button
        card.querySelector('.download-btn').addEventListener('click', () => {
            window.drive.downloadFile(note.id, note.name);
        });

        // Annotate button
        const annotateBtn = card.querySelector('.annotate-btn');
        if (annotateBtn) {
            annotateBtn.addEventListener('click', async () => {
                // Initialize whiteboard if not already done
                if (!window.whiteboard) {
                    window.initWhiteboard();
                }

                // Wait a moment for initialization
                await new Promise(resolve => setTimeout(resolve, 100));

                if (window.whiteboard && window.whiteboard.loadPDFForAnnotation) {
                    await window.whiteboard.loadPDFForAnnotation(note.id, note.name, note.subject);
                } else {
                    showToast('Whiteboard not available', 'error');
                }
            });
        }

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
    let previewHtml = '';

    // Check if thumbnail exists
    if (note.thumbnailLink) {
        // Use the thumbnail link provided by Google Drive API (force higher resolution s800)
        previewHtml = `
            <div class="pdf-preview-img-container">
                <img src="${note.thumbnailLink.replace(/=s\d+.*$/, '=s800')}" alt="${note.name}" loading="lazy" class="pdf-preview-img" onerror="this.onerror=null; this.parentElement.parentElement.innerHTML='<div class=\\'pdf-icon\\'><svg width=\\'40\\' height=\\'40\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\'><path d=\\'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z\\'></path><polyline points=\\'14 2 14 8 20 8\\'></polyline><line x1=\\'16\\' y1=\\'13\\' x2=\\'8\\' y2=\\'13\\'></line><line x1=\\'16\\' y1=\\'17\\' x2=\\'8\\' y2=\\'17\\'></line><polyline points=\\'10 9 9 9 8 9\\'></polyline></svg></div>'">
            </div>
        `;
    } else {
        // Fallback to Icon
        previewHtml = `
            <div class="pdf-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
            </div>
        `;
    }

    const isFav = note.isFavorite;
    const favIcon = isFav
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;

    return `
        <div class="pdf-card">
            <div class="pdf-preview">
                ${previewHtml}
                <button class="favorite-btn ${isFav ? 'active' : ''}" title="${isFav ? 'Unpin' : 'Pin to top'}">
                    ${favIcon}
                </button>
            </div>
            <div class="pdf-content">
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
                    <button class="action-btn annotate-btn" title="Annotate PDF" style="color: #8b5cf6;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                        </svg>
                        Annotate
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
            <div class="subject-actions">
                <button class="rename-btn" onclick="handleRenameSubject('${subject}')" aria-label="Rename subject" title="Rename">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="remove-subject-btn" onclick="handleRemoveSubject('${subject}')" aria-label="Remove subject" title="Remove">
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
 * Handle renaming a subject
 */
window.handleRenameSubject = async function (oldName) {
    const newName = prompt(`Rename subject "${oldName}" to:`, oldName);
    if (newName && newName.trim() !== oldName) {
        const finalName = newName.trim();
        const success = await window.drive.renameSubject(oldName, finalName);
        if (success) {
            showToast(`Renamed to "${finalName}"`, 'success');
            renderSubjectsList();
            updateSidebarNav();
            updateSubjectButtons();

            // Check if active subject was renamed
            if (currentSubject === oldName) {
                currentSubject = finalName;
                updateSidebarNav();

                // Update local notes subject property
                if (allNotes) {
                    allNotes.forEach(note => {
                        if (note.subject === oldName) {
                            note.subject = finalName;
                        }
                    });
                    // Redisplay
                    filterAndDisplayNotes();
                }
            } else {
                if (allNotes) {
                    allNotes.forEach(note => {
                        if (note.subject === oldName) {
                            note.subject = finalName;
                        }
                    });
                }
            }
        } else {
            showToast('Rename failed or name already exists', 'error');
        }
    }
};

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


/**
 * Show PDF Modal
 */
function showPDFModal(url, title) {
    const pdfModal = document.getElementById('pdf-modal');
    const pdfFrame = document.getElementById('pdf-frame');
    const modalTitle = document.getElementById('pdf-modal-title');

    if (pdfModal && pdfFrame) {
        pdfFrame.src = url;
        if (modalTitle) modalTitle.textContent = title;
        pdfModal.style.display = 'flex';
    } else {
        window.open(url, '_blank');
    }
}

// Expose to window.ui
window.ui = window.ui || {};
window.ui.showPDFModal = showPDFModal;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initUI);

console.log('✅ UI module loaded');
