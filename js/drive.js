/**
 * ============================================
 * GOOGLE DRIVE OPERATIONS MODULE
 * ============================================
 * 
 * This module handles all Google Drive operations:
 * - Creating subject folders
 * - Uploading PDF files
 * - Listing files
 * - Downloading files
 * - Deleting files
 * 
 * FOLDER STRUCTURE IN GOOGLE DRIVE:
 * ----------------------------------
 * Campus Notes Library/
 * ├── Programming/
 * ├── Mathematics/
 * ├── Database/
 * ├── Networks/
 * └── Algorithms/
 */

// Root folder configuration
const ROOT_FOLDER_ID = '11yKfTAeieeW0_wvC74_Sfy2ujZ-8aNpB'; // ID from your provided URL
const ROOT_FOLDER_NAME = 'Campus Notes Library';

// Subject folders
let SUBJECTS = JSON.parse(localStorage.getItem('campus_notes_subjects')) || ['Programming', 'Mathematics', 'Database', 'Networks', 'Algorithms'];

// Favorites
let FAVORITES = JSON.parse(localStorage.getItem('campus_notes_favorites')) || [];

function saveFavorites() {
    localStorage.setItem('campus_notes_favorites', JSON.stringify(FAVORITES));
}

/**
 * Toggle Favorite status
 */
function toggleFavorite(fileId) {
    const index = FAVORITES.indexOf(fileId);
    let isFav = false;
    if (index > -1) {
        FAVORITES.splice(index, 1);
        isFav = false;
    } else {
        FAVORITES.push(fileId);
        isFav = true;
    }
    saveFavorites();
    return isFav;
}

function isFavorite(fileId) {
    return FAVORITES.includes(fileId);
}

/**
 * Save subjects to local storage
 */
function saveSubjects() {
    localStorage.setItem('campus_notes_subjects', JSON.stringify(SUBJECTS));
}

/**
 * Add a new subject
 */
async function addSubject(subjectName) {
    if (!subjectName || SUBJECTS.includes(subjectName)) {
        return false;
    }

    SUBJECTS.push(subjectName);
    saveSubjects();

    // Create folder in Drive if authenticated
    if (window.auth.isAuthenticated()) {
        try {
            await getSubjectFolder(subjectName);
        } catch (error) {
            console.error('Error creating subject folder:', error);
        }
    }

    return true;
}

/**
 * Remove a subject
 */
function removeSubject(subjectName) {
    const index = SUBJECTS.indexOf(subjectName);
    if (index > -1) {
        SUBJECTS.splice(index, 1);
        saveSubjects();
        return true;
    }
    return false;
}

/**
 * Rename a subject
 */
async function renameSubject(oldName, newName) {
    if (!newName || SUBJECTS.includes(newName)) {
        return false;
    }

    const index = SUBJECTS.indexOf(oldName);
    if (index > -1) {
        // Update local list
        SUBJECTS[index] = newName;
        saveSubjects();

        // Update Drive Folder
        if (window.auth.isAuthenticated()) {
            try {
                // Get ID of old folder
                const folderId = await getSubjectFolder(oldName);
                if (folderId) {
                    // Update name in Drive
                    await gapi.client.drive.files.update({
                        fileId: folderId,
                        resource: { name: newName }
                    });

                    // Update Cache: remove old key, add new key with same ID
                    delete folderCache[oldName];
                    folderCache[newName] = folderId;
                    console.log(`✅ Renamed folder: ${oldName} -> ${newName}`);
                }
            } catch (error) {
                console.error('❌ Error naming Drive folder:', error);
                // Proceed anyway as local update succeeded
            }
        }
        return true;
    }
    return false;
}

/**
 * Get list of subjects
 */
function getSubjects() {
    return SUBJECTS;
}


// Cache for folder IDs
let folderCache = {
    [ROOT_FOLDER_NAME]: ROOT_FOLDER_ID
};

/**
 * Get the root folder ID
 */
async function getRootFolder() {
    // Return the hardcoded ID directly
    return ROOT_FOLDER_ID;
}

/**
 * Get or create a subject folder
 */
async function getSubjectFolder(subjectName) {
    try {
        // Check cache first
        if (folderCache[subjectName]) {
            return folderCache[subjectName];
        }

        const rootFolderId = await getRootFolder();

        // Search for existing subject folder
        const response = await gapi.client.drive.files.list({
            q: `name='${subjectName}' and '${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        if (response.result.files && response.result.files.length > 0) {
            // Subject folder exists
            folderCache[subjectName] = response.result.files[0].id;
            return response.result.files[0].id;
        } else {
            // Create subject folder
            const fileMetadata = {
                name: subjectName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [rootFolderId]
            };

            const folder = await gapi.client.drive.files.create({
                resource: fileMetadata,
                fields: 'id'
            });

            folderCache[subjectName] = folder.result.id;
            console.log(`✅ Created subject folder: ${subjectName}`);
            return folder.result.id;
        }
    } catch (error) {
        console.error(`❌ Error getting/creating subject folder ${subjectName}:`, error);
        throw error;
    }
}

/**
 * Upload a PDF file to Google Drive
 */
async function uploadPDF(file, subjectName) {
    if (!window.auth.isAuthenticated()) {
        showToast('Please sign in first', 'warning');
        return null;
    }

    if (file.type !== 'application/pdf') {
        showToast('Only PDF files are allowed', 'error');
        return null;
    }

    try {
        showLoading(true);

        // Get subject folder ID
        const folderId = await getSubjectFolder(subjectName);

        // File metadata
        const metadata = {
            name: file.name,
            mimeType: file.type,
            parents: [folderId]
        };

        // Create form data
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        // Upload file using multipart upload
        const accessToken = window.auth.getAccessToken();
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,createdTime,size,webViewLink,webContentLink', {
            method: 'POST',
            headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
            body: form
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ File uploaded:', result);
            showToast(`${file.name} uploaded successfully!`, 'success');
            return result;
        } else {
            console.error('Server returned error:', result);
            throw new Error(result.error ? result.error.message : 'Unknown upload error');
        }
    } catch (error) {
        console.error('❌ Error uploading file:', error);
        // Show the actual error message to the user
        showToast(`Upload failed: ${error.message}`, 'error');
        return null;
    } finally {
        showLoading(false);
    }
}

/**
 * List all PDF files from a subject folder
 */
async function listPDFsBySubject(subjectName) {
    if (!window.auth.isAuthenticated()) {
        return [];
    }

    try {
        const folderId = await getSubjectFolder(subjectName);

        const response = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`,
            fields: 'files(id, name, mimeType, createdTime, size, webViewLink, webContentLink, thumbnailLink)',
            orderBy: 'createdTime desc',
            spaces: 'drive'
        });

        return response.result.files || [];
    } catch (error) {
        console.error(`❌ Error listing files for ${subjectName}:`, error);
        return [];
    }
}

/**
 * List all PDF files from all subjects
 */
async function listAllPDFs() {
    if (!window.auth.isAuthenticated()) {
        return [];
    }

    try {
        showLoading(true);

        const allFiles = [];

        for (const subject of SUBJECTS) {
            const files = await listPDFsBySubject(subject);
            // Add subject info to each file
            files.forEach(file => {
                file.subject = subject;
                file.isFavorite = FAVORITES.includes(file.id);
            });
            allFiles.push(...files);
        }

        // Sort: Favorites first, then Data (Newest First)
        allFiles.sort((a, b) => {
            if (a.isFavorite === b.isFavorite) {
                return new Date(b.createdTime) - new Date(a.createdTime);
            }
            return a.isFavorite ? -1 : 1;
        });

        return allFiles;
    } catch (error) {
        console.error('❌ Error listing all files:', error);
        return [];
    } finally {
        showLoading(false);
    }
}

/**
 * Delete a file from Google Drive
 */
async function deleteFile(fileId, fileName) {
    if (!window.auth.isAuthenticated()) {
        showToast('Please sign in first', 'warning');
        return false;
    }

    if (!confirm(`Are you sure you want to move "${fileName}" to trash?`)) {
        return false;
    }

    try {
        showLoading(true);

        // Move to trash instead of permanent delete
        await gapi.client.drive.files.update({
            fileId: fileId,
            resource: { trashed: true }
        });

        console.log(`✅ File moved to trash: ${fileName}`);
        showToast(`${fileName} moved to trash`, 'success');
        return true;
    } catch (error) {
        console.error('❌ Error deleting file:', error);
        showToast('Failed to delete file', 'error');
        return false;
    } finally {
        showLoading(false);
    }
}

/**
 * Download a file from Google Drive
 */
async function downloadFile(fileId, fileName) {
    if (!window.auth.isAuthenticated()) {
        showToast('Please sign in first', 'warning');
        return;
    }

    try {
        const accessToken = window.auth.getAccessToken();
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: new Headers({ 'Authorization': 'Bearer ' + accessToken })
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            showToast(`${fileName} downloaded`, 'success');
        } else {
            throw new Error('Download failed');
        }
    } catch (error) {
        console.error('❌ Error downloading file:', error);
        showToast('Failed to download file', 'error');
    }
}

/**
 * View a file in Google Drive (Legacy)
 */
function viewFile(webViewLink) {
    window.open(webViewLink, '_blank');
}

/**
 * Preview file in generic modal
 */
async function previewFile(fileId, fileName) {
    if (!window.auth.isAuthenticated()) {
        showToast('Please sign in first', 'warning');
        return;
    }

    try {
        showLoading(true);
        const accessToken = window.auth.getAccessToken();
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: new Headers({ 'Authorization': 'Bearer ' + accessToken })
        });

        if (response.ok) {
            const blob = await response.blob();
            const pdfBlob = new Blob([blob], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(pdfBlob);

            if (window.ui && window.ui.showPDFModal) {
                window.ui.showPDFModal(url, fileName);
            } else {
                window.open(url, '_blank');
            }
        } else {
            throw new Error('Preview failed');
        }
    } catch (error) {
        console.error('❌ Error previewing file:', error);
        showToast('Failed to load preview', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
    if (!bytes) return 'Unknown size';

    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format date
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}

/**
 * List all trashed PDF files
 */
async function listTrashedFiles() {
    if (!window.auth.isAuthenticated()) {
        return [];
    }

    try {
        const response = await gapi.client.drive.files.list({
            q: "trashed=true and mimeType='application/pdf'",
            fields: 'files(id, name, mimeType, createdTime, size, webViewLink, webContentLink, thumbnailLink)',
            orderBy: 'modifiedTime desc',
            spaces: 'drive'
        });

        return response.result.files || [];
    } catch (error) {
        console.error('❌ Error listing trash:', error);
        return [];
    }
}

/**
 * Restore a file from trash
 */
async function restoreFile(fileId, fileName) {
    try {
        showLoading(true);

        await gapi.client.drive.files.update({
            fileId: fileId,
            resource: { trashed: false }
        });

        console.log(`✅ File restored: ${fileName}`);
        showToast(`${fileName} restored successfully`, 'success');
        return true;
    } catch (error) {
        console.error('❌ Error restoring file:', error);
        showToast('Failed to restore file', 'error');
        return false;
    } finally {
        showLoading(false);
    }
}

/**
 * Permanently delete a file
 */
async function deletePermanently(fileId, fileName) {
    if (!confirm(`⚠️ WARNING: This will PERMANENTLY delete "${fileName}". This cannot be undone. Are you sure?`)) {
        return false;
    }

    try {
        showLoading(true);
        await gapi.client.drive.files.delete({ fileId: fileId });
        showToast(`${fileName} deleted permanently`, 'success');
        return true;
    } catch (error) {
        console.error('❌ Error deleting file:', error);
        showToast('Failed to delete file', 'error');
        return false;
    } finally {
        showLoading(false);
    }
}

// Export functions
window.drive = {
    uploadPDF,
    listPDFsBySubject,
    listAllPDFs,
    deleteFile,
    downloadFile,
    viewFile,
    previewFile,
    formatFileSize,
    formatDate,
    getSubjects,
    addSubject,
    removeSubject,
    listTrashedFiles,
    restoreFile,
    deletePermanently,
    toggleFavorite,
    isFavorite,
    renameSubject,
    SUBJECTS
};
