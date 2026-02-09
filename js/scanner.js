/**
 * ============================================
 * IMAGE TO PDF SCANNER MODULE
 * ============================================
 * 
 * Handles image capture/selection, preview,
 * PDF generation using jsPDF, and upload.
 */

let scannedImages = [];

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const scanBtn = document.getElementById('scan-btn');
    const scannerModal = document.getElementById('scanner-modal');
    const closeScannerBtn = document.getElementById('close-scanner-btn');
    const addCameraBtn = document.getElementById('add-camera-image-btn');
    const addGalleryBtn = document.getElementById('add-gallery-image-btn');
    const cameraInput = document.getElementById('camera-input');
    const galleryInput = document.getElementById('gallery-input');
    const convertBtn = document.getElementById('convert-upload-btn');
    const previewGrid = document.getElementById('scanned-images-preview');
    const filenameInput = document.getElementById('scan-filename');
    const subjectSelect = document.getElementById('scan-subject-select');

    // Initialize UI listeners if elements exist
    if (scanBtn) {
        scanBtn.addEventListener('click', openScanner);
    }

    if (closeScannerBtn) {
        closeScannerBtn.addEventListener('click', closeScanner);
    }

    if (window) {
        window.addEventListener('click', (e) => {
            if (e.target === scannerModal) {
                closeScanner();
            }
        });
    }

    if (addCameraBtn) {
        addCameraBtn.addEventListener('click', () => cameraInput.click());
    }

    if (addGalleryBtn) {
        addGalleryBtn.addEventListener('click', () => galleryInput.click());
    }

    if (cameraInput) {
        cameraInput.addEventListener('change', handleFileSelect);
    }

    if (galleryInput) {
        galleryInput.addEventListener('change', handleFileSelect);
    }

    if (subjectSelect) {
        // Add change listener for validation
        subjectSelect.addEventListener('change', updateConvertButton);
    }

    if (convertBtn) {
        convertBtn.addEventListener('click', handleConvertAndUpload);
    }

    /**
     * Open Scanner Modal
     */
    function openScanner() {
        scannedImages = [];
        filenameInput.value = '';
        renderPreview();
        populateSubjectSelect();
        updateConvertButton(); // Ensure disabled state
        if (scannerModal) scannerModal.style.display = 'flex';
    }

    /**
     * Close Scanner Modal
     */
    function closeScanner() {
        if (scannerModal) scannerModal.style.display = 'none';
    }

    /**
     * Handle File Selection
     */
    function handleFileSelect(e) {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            // Filter images
            const images = files.filter(f => f.type.startsWith('image/'));
            if (images.length !== files.length) {
                if (window.showToast) window.showToast('Some files were ignored (images only)', 'warning');
            }

            images.forEach(file => scannedImages.push(file));
            renderPreview();
            updateConvertButton();
        }
        // Reset input to allow selecting same file again
        e.target.value = '';
    }

    /**
     * Render Image Previews
     */
    function renderPreview() {
        previewGrid.innerHTML = '';

        if (scannedImages.length === 0) {
            previewGrid.innerHTML = `
                <div class="empty-scan-state" style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 2rem;">
                    <p>No images selected</p>
                </div>`;
            updateConvertButton();
            return;
        }

        scannedImages.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.className = 'scan-preview-item';
                div.style.position = 'relative';
                div.style.height = '150px';

                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '8px';

                const removeBtn = document.createElement('button');
                removeBtn.innerHTML = '&times;';
                removeBtn.style.position = 'absolute';
                removeBtn.style.top = '4px';
                removeBtn.style.right = '4px';
                removeBtn.style.background = 'rgba(0,0,0,0.6)';
                removeBtn.style.color = 'white';
                removeBtn.style.border = 'none';
                removeBtn.style.borderRadius = '50%';
                removeBtn.style.width = '24px';
                removeBtn.style.height = '24px';
                removeBtn.style.cursor = 'pointer';
                removeBtn.style.display = 'flex';
                removeBtn.style.alignItems = 'center';
                removeBtn.style.justifyContent = 'center';
                removeBtn.style.fontSize = '16px';

                removeBtn.onclick = (ev) => {
                    ev.stopPropagation();
                    scannedImages.splice(index, 1);
                    renderPreview();
                };

                div.appendChild(img);
                div.appendChild(removeBtn);
                previewGrid.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
        updateConvertButton();
    }

    function updateConvertButton() {
        if (convertBtn) {
            const hasImages = scannedImages.length > 0;
            const hasSubject = subjectSelect && subjectSelect.value && subjectSelect.value !== "";
            convertBtn.disabled = !(hasImages && hasSubject);
        }
    }

    /**
     * Populate Subjects
     */
    function populateSubjectSelect() {
        if (!subjectSelect || !window.drive || !window.drive.getSubjects) return;

        const subjects = window.drive.getSubjects();

        // Add default placeholder
        let options = `<option value="" disabled selected>Select a subject...</option>`;
        options += subjects.map(s => `<option value="${s}">${s}</option>`).join('');

        subjectSelect.innerHTML = options;
    }

    /**
     * Convert Images to PDF and Upload
     */
    async function handleConvertAndUpload() {
        if (scannedImages.length === 0) return;

        const filename = filenameInput.value.trim() || `Scanned_${new Date().toISOString().slice(0, 10)}`;
        const subject = subjectSelect.value;

        if (window.showLoading) window.showLoading(true);

        try {
            // Check jsPDF
            if (!window.jspdf) {
                throw new Error('jsPDF library not loaded');
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            for (let i = 0; i < scannedImages.length; i++) {
                if (i > 0) doc.addPage();

                const imgData = await readFileAsDataURL(scannedImages[i]);

                // Get image dimensions to fit page
                const imgProps = doc.getImageProperties(imgData);
                const pdfWidth = doc.internal.pageSize.getWidth();
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                // Add image
                doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            }

            const pdfBlob = doc.output('blob');
            const pdfFile = new File([pdfBlob], `${filename}.pdf`, { type: 'application/pdf' });

            // Upload using existing Drive logic
            if (window.drive && window.drive.uploadPDF) {
                await window.drive.uploadPDF(pdfFile, subject);
            }

            // Success cleanup
            closeScanner();

            // Reload notes to show the new PDF
            if (window.loadAllNotes) {
                await window.loadAllNotes();
            }

            if (window.showToast) window.showToast('PDF created and uploaded!', 'success');

        } catch (error) {
            console.error('PDF Conversion Failed:', error);
            if (window.showToast) window.showToast('Failed to create PDF. See console.', 'error');
        } finally {
            if (window.showLoading) window.showLoading(false);
        }
    }

    /**
     * Helper: Read file
     */
    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
});
