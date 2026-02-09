/**
 * Whiteboard Module
 * Implements a full-screen drawing and writing experience similar to Samsung Notes.
 */

const WB_TOOLS = {
    PEN: "pen",
    MARKER: "marker",
    HIGHLIGHTER: "highlighter",
    ERASER: "eraser",
    LINE: "line",
    RECTANGLE: "rect",
    CIRCLE: "circle",
    ARROW: "arrow",
    TEXT: "text",
    STICKY: "sticky",
    LASER: "laser",
    LASSO: "lasso",
    PAN: "pan"
};

const WB_PEN_PRESETS = {
    pen: { width: 2, opacity: 1, cap: "round", join: "round" },
    marker: { width: 6, opacity: 0.7, cap: "round", join: "round" },
    highlighter: { width: 20, opacity: 0.4, cap: "butt", join: "round" },
    eraser: { width: 20, opacity: 1, cap: "round", join: "round" }
};

const WB_COLORS = [
    "#1a1a2e", "#e94560", "#0f3460", "#16c79a",
    "#f5a623", "#8b5cf6", "#ec4899", "#06b6d4",
    "#84cc16", "#f97316", "#ffffff", "#6b7280",
];

const WB_BACKGROUNDS = {
    blank: "Blank",
    grid: "Grid",
    dots: "Dots",
    lined: "Lined",
    graph: "Graph",
};

class Whiteboard {
    constructor() {
        this.container = document.getElementById('whiteboard-container');
        this.canvas = document.getElementById('wb-canvas');
        this.overlay = document.getElementById('wb-overlay');
        this.ctx = this.canvas.getContext('2d');
        this.octx = this.overlay.getContext('2d');

        // State
        this.tool = WB_TOOLS.PEN;
        this.color = "#1a1a2e";
        this.strokeWidth = 2;
        this.background = "blank";
        this.isDark = false;
        this.zoom = 100;

        this.pages = [{ id: this.generateId(), strokes: [], stickies: [] }];
        this.pageIndex = 0;
        this.history = []; // Simplified history for Undo
        this.redoStack = [];

        this.isDrawing = false;
        this.currentStroke = null;
        this.shapeStart = null;

        this.stickyNotes = [];
        this.draggingSticky = null;

        // PDF annotation state
        this.pdfDocument = null;
        this.pdfFileId = null;
        this.pdfFileName = null;
        this.pdfSubject = null;
        this.pdfPages = [];

        // Lasso tool state
        this.selectedStrokes = [];
        this.lassoPath = [];
        this.isDraggingSelection = false;
        this.selectionOffset = { x: 0, y: 0 };

        // Pan tool state
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };
        this.panOffset = { x: 0, y: 0 };

        // Shape selection state
        this.selectedShape = null;
        this.isDraggingShape = false;
        this.isResizingShape = false;
        this.resizeHandle = null; // 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'
        this.dragStartPos = null;
        this.shapeOriginalBounds = null;

        this.init();
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    init() {
        // Event Listeners for Canvas
        this.canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this));
        window.addEventListener('pointermove', this.handlePointerMove.bind(this)); // Window for drag out
        window.addEventListener('pointerup', this.handlePointerUp.bind(this));

        // Resize Observer
        new ResizeObserver(() => this.resizeCanvas()).observe(this.container);

        // UI Bindings
        this.bindUI();

        // Initial Draw
        this.resizeCanvas();
    }

    bindUI() {
        // Tools
        document.querySelectorAll('.wb-tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tool = e.currentTarget.dataset.tool;
                this.setTool(tool);
            });
        });

        // Colors
        const colorContainer = document.getElementById('wb-color-picker');
        colorContainer.innerHTML = ''; // Clear placeholder
        WB_COLORS.slice(0, 8).forEach(c => {
            const btn = document.createElement('button');
            btn.className = 'wb-color-btn';
            btn.style.backgroundColor = c;
            btn.onclick = () => this.setColor(c);
            colorContainer.appendChild(btn);
        });

        // Toggle Color Picker
        document.getElementById('wb-more-colors-btn').addEventListener('click', () => {
            // Simple implementation: cycle through extra colors or show native picker
            const input = document.createElement('input');
            input.type = 'color';
            input.value = this.color;
            input.onchange = (e) => this.setColor(e.target.value);
            input.click();
        });

        // Size Slider
        document.getElementById('wb-size-slider').addEventListener('input', (e) => {
            this.setStrokeWidth(parseInt(e.target.value));
        });

        // Top Actions
        document.getElementById('wb-undo-btn').addEventListener('click', () => this.undo());
        document.getElementById('wb-redo-btn').addEventListener('click', () => this.redo());
        document.getElementById('wb-clear-btn').addEventListener('click', () => this.clear());
        document.getElementById('wb-download-btn').addEventListener('click', () => this.exportImage());
        document.getElementById('wb-close-btn').addEventListener('click', () => this.hide());

        // Background
        const bgBtn = document.getElementById('wb-bg-btn');
        bgBtn.addEventListener('click', () => {
            const keys = Object.keys(WB_BACKGROUNDS);
            const nextIndex = (keys.indexOf(this.background) + 1) % keys.length;
            this.setBackground(keys[nextIndex]);
        });

        // Theme
        document.getElementById('wb-theme-btn').addEventListener('click', () => this.toggleTheme());

        // Zoom
        document.getElementById('wb-zoom-in').addEventListener('click', () => this.setZoom(this.zoom + 10));
        document.getElementById('wb-zoom-out').addEventListener('click', () => this.setZoom(this.zoom - 10));

        // Pages
        document.getElementById('wb-prev-page').addEventListener('click', () => this.changePage(-1));
        document.getElementById('wb-next-page').addEventListener('click', () => this.changePage(1));
        document.getElementById('wb-add-page').addEventListener('click', () => this.addPage());

        this.bindUploadUI();
    }

    /* ================= STATE MANAGEMENT ================= */

    show() {
        this.container.style.display = 'flex';
        this.resizeCanvas();
        // Sync theme with main app if possible, or use local state
        const isAppDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (this.isDark !== isAppDark) this.toggleTheme();
    }

    hide() {
        this.container.style.display = 'none';
    }

    setTool(tool) {
        this.tool = tool;
        document.querySelectorAll('.wb-tool-btn').forEach(btn => {
            if (btn.dataset.tool === tool) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        // Update stroke properties from preset if available
        if (WB_PEN_PRESETS[tool]) {
            const preset = WB_PEN_PRESETS[tool];
            this.strokeWidth = preset.width;

            // Update slider UI
            const slider = document.getElementById('wb-size-slider');
            if (slider) slider.value = this.strokeWidth;

            // Update indicator size
            this.setStrokeWidth(this.strokeWidth);
        }

        // Cursor logic
        if (tool === WB_TOOLS.ERASER) this.canvas.style.cursor = 'crosshair';
        else if (tool === WB_TOOLS.TEXT) this.canvas.style.cursor = 'text';
        else if (tool === WB_TOOLS.LASSO) this.canvas.style.cursor = 'default';
        else if (tool === WB_TOOLS.PAN) this.canvas.style.cursor = 'grab';
        else this.canvas.style.cursor = 'crosshair';
    }

    setColor(color) {
        this.color = color;
        // Update UI
        document.querySelectorAll('.wb-color-btn').forEach(btn => {
            // Convert rgb to hex for comparison if needed, or just check style
            // Simple check:
            if (this.rgbToHex(btn.style.backgroundColor) === color || btn.style.backgroundColor === color) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update indicator
        document.getElementById('wb-size-indicator').style.backgroundColor = color;
    }

    // Helper for color binding
    rgbToHex(rgb) {
        if (!rgb) return '#000000';
        if (rgb.startsWith('#')) return rgb;
        const rgbMatch = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        if (!rgbMatch) return color;
        function hex(x) { return ("0" + parseInt(x).toString(16)).slice(-2); }
        return "#" + hex(rgbMatch[1]) + hex(rgbMatch[2]) + hex(rgbMatch[3]);
    }

    setStrokeWidth(width) {
        this.strokeWidth = width;
        const indicator = document.getElementById('wb-size-indicator');
        indicator.style.width = Math.min(width * 1.5 + 4, 40) + 'px';
        indicator.style.height = Math.min(width * 1.5 + 4, 40) + 'px';
    }

    setBackground(bg) {
        this.background = bg;
        document.getElementById('wb-bg-label').textContent = WB_BACKGROUNDS[bg];
        this.redrawAll();
    }

    toggleTheme() {
        this.isDark = !this.isDark;
        if (this.isDark) {
            this.container.setAttribute('data-theme', 'dark');
        } else {
            this.container.removeAttribute('data-theme');
        }
        this.redrawAll();
    }

    setZoom(val) {
        this.zoom = Math.min(Math.max(val, 50), 200);
        document.getElementById('wb-zoom-level').textContent = this.zoom + '%';

        const scale = this.zoom / 100;
        this.canvas.style.transform = `scale(${scale})`;
        this.overlay.style.transform = `scale(${scale})`;

        // Adjust sticky notes and other DOM elements in canvas wrapper if needed
        // For now, simple canvas scale is enough
    }

    changePage(direction) {
        const newIndex = this.pageIndex + direction;
        if (newIndex >= 0 && newIndex < this.pages.length) {
            this.pageIndex = newIndex;
            document.getElementById('wb-page-num').textContent = `${this.pageIndex + 1} / ${this.pages.length}`;

            // Clear sticky notes container and re-render stickies for this page
            const container = document.getElementById('wb-sticky-container');
            container.innerHTML = '';
            this.pages[this.pageIndex].stickies.forEach(s => this.renderSticky(s));

            // Redraw canvas
            this.redrawAll();
        }
    }

    addPage() {
        this.pages.push({
            id: this.generateId(),
            strokes: [],
            stickies: []
        });
        this.pageIndex = this.pages.length - 1;
        document.getElementById('wb-page-num').textContent = `${this.pageIndex + 1} / ${this.pages.length}`;

        // Clear and redraw
        const container = document.getElementById('wb-sticky-container');
        container.innerHTML = '';
        this.redrawAll();
    }

    resizeCanvas() {
        if (this.pdfDocument) {
            // In PDF mode, we don't resize the canvas dimensions (fixed to PDF size)
            // But we might want to re-calculate zoom to fit if we wanted responsive auto-fit
            // For now, let's just keep dimensions and let user scroll/zoom
            return;
        }

        const rect = this.container.getBoundingClientRect();
        // wrapper dims
        const wrapper = document.getElementById('wb-canvas-wrapper');
        const w = wrapper.clientWidth;
        const h = wrapper.clientHeight;

        this.canvas.width = w;
        this.canvas.height = h;
        this.overlay.width = w;
        this.overlay.height = h;

        this.redrawAll();
    }

    /* ================= DRAWING LOGIC ================= */

    getPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    redrawAll() {
        this.drawPage(this.ctx, this.pageIndex, this.canvas.width, this.canvas.height, false);
    }

    drawPage(ctx, pageIndex, w, h, exportMode = false) {
        const page = this.pages[pageIndex];

        ctx.clearRect(0, 0, w, h);

        // Draw PDF background if present
        if (page.pdfBackground) {
            // Create image if not cached
            if (!page._pdfBackgroundImage) {
                page._pdfBackgroundImage = new Image();
                page._pdfBackgroundImage.src = page.pdfBackground;
            }

            const img = page._pdfBackgroundImage;

            // Draw if loaded, or wait for it to load
            if (img.complete) {
                ctx.drawImage(img, 0, 0);
            } else {
                // Image not loaded yet, set up onload handler
                img.onload = () => {
                    ctx.clearRect(0, 0, w, h);
                    ctx.drawImage(img, 0, 0);
                    // Redraw strokes on top
                    page.strokes.forEach(s => {
                        this.drawStroke(ctx, s);
                    });
                    if (exportMode && page.stickies) {
                        this.drawStickiesForExport(ctx, page);
                    }
                };
                // Return early, will redraw when image loads
                return;
            }
        } else {
            this.drawBackground(ctx, w, h);
        }

        page.strokes.forEach(s => {
            this.drawStroke(ctx, s);
        });

        if (exportMode && page.stickies) {
            page.stickies.forEach(s => {
                // Draw sticky background
                ctx.save();
                ctx.fillStyle = s.color;
                // Add shadow
                ctx.shadowColor = "rgba(0,0,0,0.2)";
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
                ctx.fillRect(s.x, s.y, 150, 120);

                // Draw header
                ctx.shadowColor = "transparent";
                ctx.fillStyle = "rgba(0,0,0,0.05)";
                ctx.fillRect(s.x, s.y, 150, 20);

                // Draw text
                ctx.fillStyle = "#1a1a2e";
                ctx.font = "13px Inter, sans-serif";
                this.wrapText(ctx, s.text || "", s.x + 10, s.y + 35, 130, 18);
                ctx.restore();
            });
        }
    }

    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, y);
                line = words[n] + ' ';
                y += lineHeight;
            }
            else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, y);
    }

    bindUploadUI() {
        const uploadBtn = document.getElementById('wb-upload-btn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => this.openUploadModal());
        }

        const cancelUpload = document.getElementById('wb-cancel-upload');
        if (cancelUpload) cancelUpload.addEventListener('click', () => this.closeUploadModal());

        const confirmUpload = document.getElementById('wb-confirm-upload');
        if (confirmUpload) confirmUpload.addEventListener('click', () => this.handleUpload());
    }

    openUploadModal() {
        if (window.auth && !window.auth.isAuthenticated()) {
            if (window.ui && window.ui.showToast) window.ui.showToast("Please sign in to upload.", "warning");
            else alert("Please sign in to upload.");
            return;
        }

        const modal = document.getElementById('wb-upload-modal');
        const subjectSelect = document.getElementById('wb-subject-select');
        const nameInput = document.getElementById('wb-note-name');

        // Populate subjects
        subjectSelect.innerHTML = '<option value="" disabled selected>Select subject...</option>';
        const subjects = window.drive ? window.drive.getSubjects() : [];
        if (subjects.length === 0) {
            // Fallback if drive not ready or empty
            const defaults = ["Programming", "Mathematics", "Database", "Networks", "Algorithms"];
            defaults.forEach(sub => {
                const opt = document.createElement('option');
                opt.value = sub;
                opt.textContent = sub;
                subjectSelect.appendChild(opt);
            });
        } else {
            subjects.forEach(sub => {
                const opt = document.createElement('option');
                opt.value = sub;
                opt.textContent = sub;
                subjectSelect.appendChild(opt);
            });
        }

        // Default name
        nameInput.value = `Note - ${new Date().toLocaleDateString()}`;

        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }

    closeUploadModal() {
        document.getElementById('wb-upload-modal').style.display = 'none';
    }

    async handleUpload() {
        const nameInput = document.getElementById('wb-note-name');
        const subjectSelect = document.getElementById('wb-subject-select');

        const name = nameInput.value.trim();
        const subject = subjectSelect.value;

        if (!name || !subject) {
            alert("Please enter a name and select a subject.");
            return;
        }

        // Indicate loading
        const btn = document.getElementById('wb-confirm-upload');
        const originalText = btn.innerText;
        btn.innerText = "Generating...";
        btn.disabled = true;

        try {
            // Check if this is an annotated PDF
            if (this.pdfDocument) {
                // Save annotated PDF
                const pdfBlob = await this.generatePDF();
                const file = new File([pdfBlob], this.pdfFileName, { type: 'application/pdf' });

                if (window.drive) {
                    btn.innerText = "Uploading...";
                    // Delete old version
                    await window.drive.deleteFile(this.pdfFileId, this.pdfFileName);
                    // Upload new annotated version
                    await window.drive.uploadPDF(file, this.pdfSubject);
                    this.closeUploadModal();

                    if (window.ui && window.ui.showToast) {
                        window.ui.showToast('Annotations saved!', 'success');
                    }

                    // Reload notes
                    if (window.ui && window.ui.loadAllNotes) {
                        await window.ui.loadAllNotes();
                    }
                } else {
                    console.error("Drive module not found");
                    alert("Drive module not found");
                }
            } else {
                // Regular whiteboard save
                const pdfBlob = await this.generatePDF();
                const file = new File([pdfBlob], name.endsWith('.pdf') ? name : name + '.pdf', { type: 'application/pdf' });

                if (window.drive) {
                    btn.innerText = "Uploading...";
                    await window.drive.uploadPDF(file, subject);
                    this.closeUploadModal();
                } else {
                    console.error("Drive module not found");
                    alert("Drive module not found");
                }
            }
        } catch (e) {
            console.error(e);
            alert("Error uploading: " + e.message);
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }

    async generatePDF() {
        if (!window.jspdf) {
            throw new Error("jsPDF library not active");
        }
        const { jsPDF } = window.jspdf;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const doc = new jsPDF({
            orientation: width > height ? 'l' : 'p',
            unit: 'px',
            format: [width, height]
        });

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const ctx = tempCanvas.getContext('2d');

        for (let i = 0; i < this.pages.length; i++) {
            if (i > 0) doc.addPage([width, height]);

            // Draw page to temp canvas
            this.drawPage(ctx, i, width, height, true);

            const imgData = tempCanvas.toDataURL('image/jpeg', 0.85);
            doc.addImage(imgData, 'JPEG', 0, 0, width, height);
        }

        return doc.output('blob');
    }

    drawBackground(ctx, w, h) {
        // Fill background
        ctx.fillStyle = this.isDark ? "#12121e" : "#f8f8fc";
        ctx.fillRect(0, 0, w, h);

        const color = this.isDark ? "#2a2a3e" : "#e8e8f0";
        const dotColor = this.isDark ? "#3a3a50" : "#d0d0e0";

        if (this.background === "grid") {
            ctx.strokeStyle = color;
            ctx.lineWidth = 0.5;
            for (let x = 0; x < w; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
            for (let y = 0; y < h; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
        } else if (this.background === "dots") {
            ctx.fillStyle = dotColor;
            for (let x = 15; x < w; x += 25) for (let y = 15; y < h; y += 25) { ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill(); }
        } else if (this.background === "lined") {
            ctx.strokeStyle = color;
            ctx.lineWidth = 0.5;
            for (let y = 40; y < h; y += 32) { ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(w - 20, y); ctx.stroke(); }
            ctx.strokeStyle = this.isDark ? "#4a3a3a" : "#f0c0c0";
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(70, 0); ctx.lineTo(70, h); ctx.stroke();
        } else if (this.background === "graph") {
            ctx.strokeStyle = color;
            ctx.lineWidth = 0.3;
            for (let x = 0; x < w; x += 10) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
            for (let y = 0; y < h; y += 10) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
        }
    }

    drawStroke(ctx, s) {
        if (["freehand", "pen", "marker", "highlighter"].includes(s.type)) {
            const preset = WB_PEN_PRESETS[s.type] || WB_PEN_PRESETS.pen;
            ctx.save();
            ctx.globalAlpha = s.opacity ?? preset.opacity;
            ctx.strokeStyle = s.color;
            ctx.lineWidth = s.width ?? preset.width;
            ctx.lineCap = preset.cap;
            ctx.lineJoin = preset.join;


            ctx.beginPath();
            if (s.points.length > 0) {
                ctx.moveTo(s.points[0].x, s.points[0].y);
                for (let i = 1; i < s.points.length; i++) {
                    const p0 = s.points[i - 1];
                    const p1 = s.points[i];
                    const mx = (p0.x + p1.x) / 2;
                    const my = (p0.y + p1.y) / 2;
                    ctx.quadraticCurveTo(p0.x, p0.y, mx, my);
                }
                if (s.points.length === 1) {
                    // Dot
                    ctx.lineTo(s.points[0].x, s.points[0].y);
                }
            }
            ctx.stroke();
            ctx.restore();
        } else if (s.type === "line") {
            ctx.save();
            ctx.strokeStyle = s.color;
            ctx.lineWidth = s.width;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(s.x1, s.y1);
            ctx.lineTo(s.x2, s.y2);
            ctx.stroke();
            ctx.restore();
        } else if (s.type === "rect") {
            ctx.save();
            ctx.strokeStyle = s.color;
            ctx.lineWidth = s.width;
            ctx.lineJoin = "round";
            ctx.strokeRect(s.x, s.y, s.w, s.h);
            ctx.restore();
        } else if (s.type === "circle") {
            ctx.save();
            ctx.strokeStyle = s.color;
            ctx.lineWidth = s.width;
            ctx.beginPath();
            ctx.ellipse(s.cx, s.cy, Math.abs(s.rx), Math.abs(s.ry), 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        } else if (s.type === "arrow") {
            ctx.save();
            ctx.strokeStyle = s.color;
            ctx.fillStyle = s.color;
            ctx.lineWidth = s.width;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(s.x1, s.y1);
            ctx.lineTo(s.x2, s.y2);
            ctx.stroke();
            // arrowhead
            const angle = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
            const hl = 14;
            ctx.beginPath();
            ctx.moveTo(s.x2, s.y2);
            ctx.lineTo(s.x2 - hl * Math.cos(angle - 0.4), s.y2 - hl * Math.sin(angle - 0.4));
            ctx.lineTo(s.x2 - hl * Math.cos(angle + 0.4), s.y2 - hl * Math.sin(angle + 0.4));
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        } else if (s.type === "text") {
            ctx.save();
            ctx.fillStyle = s.color;
            ctx.font = `${s.fontSize || 18}px 'Inter', sans-serif`;
            ctx.fillText(s.text, s.x, s.y);
            ctx.restore();
        }
    }

    /* ================= EVENTS ================= */

    handlePointerDown(e) {
        e.preventDefault();
        const pos = this.getPos(e);

        if (this.tool === WB_TOOLS.TEXT) {
            const text = prompt("Enter text:", "");
            if (text) {
                this.saveStroke({
                    type: "text",
                    color: this.color,
                    fontSize: this.strokeWidth * 6 + 12,
                    text: text,
                    x: pos.x,
                    y: pos.y
                });
            }
            return;
        }

        if (this.tool === WB_TOOLS.STICKY) {
            this.addSticky(pos);
            this.setTool(WB_TOOLS.PEN); // Revert to pen after placing
            return;
        }

        if (this.tool === WB_TOOLS.PAN) {
            this.isPanning = true;
            this.panStart = { x: e.clientX, y: e.clientY };
            this.canvas.style.cursor = 'grabbing';
            return;
        }

        if (this.tool === WB_TOOLS.LASSO) {
            // Check if clicking on existing selection
            if (this.selectedStrokes.length > 0 && this.isPointInSelection(pos)) {
                this.isDraggingSelection = true;
                this.selectionOffset = pos;
            } else {
                // Start new lasso selection
                this.lassoPath = [pos];
                this.isDrawing = true;
                this.selectedStrokes = []; // Clear previous selection
                this.octx.clearRect(0, 0, this.overlay.width, this.overlay.height);
            }
            return;
        }

        // Check if clicking on selected shape's resize handle
        if (this.selectedShape) {
            const bounds = this.getShapeBounds(this.selectedShape);
            const handle = this.getResizeHandle(pos, bounds);
            if (handle) {
                this.isResizingShape = true;
                this.resizeHandle = handle;
                this.dragStartPos = pos;
                this.shapeOriginalBounds = { ...bounds };
                return;
            }
        }

        // Check if clicking on a shape
        const clickedShape = this.getShapeAt(pos);
        if (clickedShape) {
            // If clicking on already selected shape, start dragging
            if (this.selectedShape === clickedShape) {
                this.isDraggingShape = true;
                this.dragStartPos = pos;
                return;
            } else {
                // Select new shape
                this.selectedShape = clickedShape;
                this.octx.clearRect(0, 0, this.overlay.width, this.overlay.height);
                this.drawSelectionBox(this.selectedShape);
                return;
            }
        } else {
            // Clicked on empty space - deselect
            if (this.selectedShape) {
                this.selectedShape = null;
                this.octx.clearRect(0, 0, this.overlay.width, this.overlay.height);
            }
        }

        if (this.tool === WB_TOOLS.ERASER) {
            this.isDrawing = true;
            this.eraseAt(pos);
            return;
        }

        if ([WB_TOOLS.LINE, WB_TOOLS.RECTANGLE, WB_TOOLS.CIRCLE, WB_TOOLS.ARROW].includes(this.tool)) {
            this.shapeStart = pos;
            this.isDrawing = true;
            return;
        }

        if ([WB_TOOLS.PEN, WB_TOOLS.MARKER, WB_TOOLS.HIGHLIGHTER].includes(this.tool)) {
            const preset = WB_PEN_PRESETS[this.tool];
            this.isDrawing = true;
            this.currentStroke = {
                type: this.tool,
                color: this.color,
                width: this.strokeWidth || preset.width,
                opacity: preset.opacity,
                points: [pos]
            };
        }
    }

    handlePointerMove(e) {
        // Handle panning
        if (this.isPanning) {
            const dx = e.clientX - this.panStart.x;
            const dy = e.clientY - this.panStart.y;
            const container = document.querySelector('.wb-main-area');
            container.scrollLeft -= dx;
            container.scrollTop -= dy;
            this.panStart = { x: e.clientX, y: e.clientY };
            return;
        }

        // Handle lasso selection dragging
        if (this.isDraggingSelection) {
            const pos = this.getPos(e);
            const dx = pos.x - this.selectionOffset.x;
            const dy = pos.y - this.selectionOffset.y;
            this.moveSelectedStrokes(dx, dy);
            this.selectionOffset = pos;
            this.redrawAll();
            return;
        }

        // e.preventDefault(); // can break scrolling if not careful
        const pos = this.getPos(e);

        // Handle shape dragging
        if (this.isDraggingShape && this.selectedShape) {
            const dx = pos.x - this.dragStartPos.x;
            const dy = pos.y - this.dragStartPos.y;

            if (this.selectedShape.type === 'rect') {
                this.selectedShape.x += dx;
                this.selectedShape.y += dy;
            } else if (this.selectedShape.type === 'circle') {
                this.selectedShape.cx += dx;
                this.selectedShape.cy += dy;
            } else if (this.selectedShape.type === 'line' || this.selectedShape.type === 'arrow') {
                this.selectedShape.x1 += dx;
                this.selectedShape.y1 += dy;
                this.selectedShape.x2 += dx;
                this.selectedShape.y2 += dy;
            }

            this.dragStartPos = pos;
            this.redrawAll();
            this.drawSelectionBox(this.selectedShape);
            return;
        }

        // Handle shape resizing
        if (this.isResizingShape && this.selectedShape) {
            const dx = pos.x - this.dragStartPos.x;
            const dy = pos.y - this.dragStartPos.y;
            const origBounds = this.shapeOriginalBounds;
            const minSize = 10; // Minimum width/height

            if (this.selectedShape.type === 'rect') {
                let newX = origBounds.x;
                let newY = origBounds.y;
                let newW = origBounds.w;
                let newH = origBounds.h;

                if (this.resizeHandle.includes('w')) { newX += dx; newW -= dx; }
                if (this.resizeHandle.includes('e')) { newW += dx; }
                if (this.resizeHandle.includes('n')) { newY += dy; newH -= dy; }
                if (this.resizeHandle.includes('s')) { newH += dy; }

                // Apply minimum size
                if (Math.abs(newW) < minSize) newW = minSize * Math.sign(newW || 1);
                if (Math.abs(newH) < minSize) newH = minSize * Math.sign(newH || 1);

                this.selectedShape.x = newX;
                this.selectedShape.y = newY;
                this.selectedShape.w = newW;
                this.selectedShape.h = newH;
            } else if (this.selectedShape.type === 'circle') {
                let newRx = origBounds.w / 2;
                let newRy = origBounds.h / 2;

                if (this.resizeHandle.includes('e') || this.resizeHandle.includes('w')) {
                    newRx += (this.resizeHandle.includes('e') ? dx : -dx) / 2;
                }
                if (this.resizeHandle.includes('s') || this.resizeHandle.includes('n')) {
                    newRy += (this.resizeHandle.includes('s') ? dy : -dy) / 2;
                }

                this.selectedShape.rx = Math.max(minSize / 2, Math.abs(newRx));
                this.selectedShape.ry = Math.max(minSize / 2, Math.abs(newRy));
            } else if (this.selectedShape.type === 'line' || this.selectedShape.type === 'arrow') {
                // For lines/arrows, resize by moving endpoints
                const origShape = this.selectedShape;

                if (this.resizeHandle === 'nw' || this.resizeHandle === 'n' || this.resizeHandle === 'w') {
                    // Moving start point
                    origShape.x1 = origBounds.x + (this.resizeHandle.includes('w') ? dx : 0);
                    origShape.y1 = origBounds.y + (this.resizeHandle.includes('n') ? dy : 0);
                } else if (this.resizeHandle === 'se' || this.resizeHandle === 's' || this.resizeHandle === 'e') {
                    // Moving end point
                    origShape.x2 = origBounds.x + origBounds.w + (this.resizeHandle.includes('e') ? dx : 0);
                    origShape.y2 = origBounds.y + origBounds.h + (this.resizeHandle.includes('s') ? dy : 0);
                }
            }

            this.redrawAll();
            this.drawSelectionBox(this.selectedShape);
            return;
        }

        // Eraser Cursor (Hover)
        if (this.tool === WB_TOOLS.ERASER) {
            const octx = this.octx;
            const r = (this.strokeWidth || 20) / 2;
            octx.clearRect(0, 0, this.overlay.width, this.overlay.height);
            octx.beginPath();
            octx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
            octx.strokeStyle = '#2a2a3e';
            octx.lineWidth = 1;
            octx.stroke();
            octx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            octx.fill();
        }

        if (!this.isDrawing) {
            return;
        }

        // Handle lasso path drawing
        if (this.tool === WB_TOOLS.LASSO && this.lassoPath.length > 0) {
            this.lassoPath.push(pos);
            this.drawLassoPath();
            return;
        }

        if (this.tool === WB_TOOLS.ERASER) {
            this.eraseAt(pos);
            return;
        }

        if (this.currentStroke) {
            this.currentStroke.points.push(pos);
            // Live draw optimization: just draw the last segment
            const s = this.currentStroke;
            const pts = s.points;
            if (pts.length >= 2) {
                const ctx = this.ctx;
                const preset = WB_PEN_PRESETS[s.type];

                ctx.save();
                ctx.globalAlpha = s.opacity;
                ctx.strokeStyle = s.color;
                ctx.lineWidth = s.width;
                ctx.lineCap = preset.cap;
                ctx.lineJoin = preset.join;


                const p0 = pts[pts.length - 2];
                const p1 = pts[pts.length - 1];

                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                // For smoother lines we normally use quadratic curves but for live preview lines are okay
                // Or we can use the quadratic midpoint approach for live drawing too
                const mx = (p0.x + p1.x) / 2;
                const my = (p0.y + p1.y) / 2;
                ctx.quadraticCurveTo(p0.x, p0.y, mx, my);
                ctx.stroke();

                ctx.restore();
            }
        } else if (this.shapeStart) {
            // Redraw overlay
            const octx = this.octx;
            octx.clearRect(0, 0, this.overlay.width, this.overlay.height);

            octx.save();
            octx.strokeStyle = this.color;
            octx.lineWidth = this.strokeWidth;
            octx.setLineDash([6, 4]);

            if (this.tool === WB_TOOLS.LINE) {
                octx.beginPath(); octx.moveTo(this.shapeStart.x, this.shapeStart.y); octx.lineTo(pos.x, pos.y); octx.stroke();
            } else if (this.tool === WB_TOOLS.RECTANGLE) {
                octx.strokeRect(this.shapeStart.x, this.shapeStart.y, pos.x - this.shapeStart.x, pos.y - this.shapeStart.y);
            } else if (this.tool === WB_TOOLS.CIRCLE) {
                const rx = Math.abs(pos.x - this.shapeStart.x) / 2;
                const ry = Math.abs(pos.y - this.shapeStart.y) / 2;
                const cx = (this.shapeStart.x + pos.x) / 2;
                const cy = (this.shapeStart.y + pos.y) / 2;
                octx.beginPath(); octx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); octx.stroke();
            } else if (this.tool === WB_TOOLS.ARROW) {
                octx.beginPath(); octx.moveTo(this.shapeStart.x, this.shapeStart.y); octx.lineTo(pos.x, pos.y); octx.stroke();
            }

            octx.restore();
        }
    }

    handlePointerUp(e) {
        // Handle pan release
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = 'grab';
            return;
        }

        // Handle lasso selection drag release
        if (this.isDraggingSelection) {
            this.isDraggingSelection = false;
            return;
        }

        // Handle lasso selection completion
        if (this.tool === WB_TOOLS.LASSO && this.lassoPath.length > 0) {
            // Clear temporary drawing path
            this.octx.clearRect(0, 0, this.overlay.width, this.overlay.height);

            // Perform selection
            this.completeSelection();

            this.lassoPath = [];
            this.isDrawing = false;
            return;
        }

        if (!this.isDrawing) return;
        this.isDrawing = false;

        const pos = this.getPos(e);

        if (this.currentStroke) {
            this.saveStroke(this.currentStroke);
            this.currentStroke = null;
        } else if (this.shapeStart) {
            // Finalize shape
            let shape = null;
            if (this.tool === WB_TOOLS.LINE) {
                shape = { type: "line", color: this.color, width: this.strokeWidth, x1: this.shapeStart.x, y1: this.shapeStart.y, x2: pos.x, y2: pos.y };
            } else if (this.tool === WB_TOOLS.RECTANGLE) {
                shape = { type: "rect", color: this.color, width: this.strokeWidth, x: this.shapeStart.x, y: this.shapeStart.y, w: pos.x - this.shapeStart.x, h: pos.y - this.shapeStart.y };
            } else if (this.tool === WB_TOOLS.CIRCLE) {
                const rx = Math.abs(pos.x - this.shapeStart.x) / 2;
                const ry = Math.abs(pos.y - this.shapeStart.y) / 2;
                shape = { type: "circle", color: this.color, width: this.strokeWidth, cx: (this.shapeStart.x + pos.x) / 2, cy: (this.shapeStart.y + pos.y) / 2, rx, ry };
            } else if (this.tool === WB_TOOLS.ARROW) {
                shape = { type: "arrow", color: this.color, width: this.strokeWidth, x1: this.shapeStart.x, y1: this.shapeStart.y, x2: pos.x, y2: pos.y };
            }

            if (shape) {
                this.saveStroke(shape);
                // Auto-select the newly created shape
                this.selectedShape = shape;
                this.drawSelectionBox(this.selectedShape);
            }
            this.shapeStart = null;
        }

        // Reset dragging/resizing states
        if (this.isDraggingShape || this.isResizingShape) {
            this.isDraggingShape = false;
            this.isResizingShape = false;
            this.resizeHandle = null;
            this.dragStartPos = null;
            this.shapeOriginalBounds = null;
        }

        this.redrawAll();

        // Redraw selection box if shape is selected
        if (this.selectedShape) {
            this.drawSelectionBox(this.selectedShape);
        }
    }

    eraseAt(pos) {
        const radius = (this.strokeWidth || 20) / 2;
        const page = this.pages[this.pageIndex];
        let modified = false;
        const newStrokes = [];

        for (const s of page.strokes) {
            if (s.points) {
                // Freehand: Smooth Vector Erasure
                const result = this.computeErasure(s, pos, radius);
                if (result.length !== 1 || result[0] !== s) {
                    modified = true;
                    newStrokes.push(...result);
                } else {
                    newStrokes.push(s);
                }
            } else {
                // Shapes: Simple bounding box (Object Eraser)
                let visible = true;
                if (s.type === 'rect' || s.type === 'image') {
                    if (pos.x > s.x - radius && pos.x < s.x + s.w + radius &&
                        pos.y > s.y - radius && pos.y < s.y + s.h + radius) visible = false;
                } else if (s.type === 'circle') {
                    if (Math.hypot(s.cx - pos.x, s.cy - pos.y) < s.rx + radius) visible = false;
                } else if (s.type === 'line' || s.type === 'arrow') {
                    // Approximate AABB
                    const minX = Math.min(s.x1, s.x2) - radius;
                    const maxX = Math.max(s.x1, s.x2) + radius;
                    const minY = Math.min(s.y1, s.y2) - radius;
                    const maxY = Math.max(s.y1, s.y2) + radius;
                    if (pos.x > minX && pos.x < maxX && pos.y > minY && pos.y < maxY) {
                        // Refined distance check could go here
                        visible = false;
                    }
                } else if (s.type === 'text') {
                    const w = s.text.length * s.fontSize * 0.6;
                    const h = s.fontSize;
                    if (pos.x > s.x - radius && pos.x < s.x + w + radius &&
                        pos.y > s.y - radius && pos.y < s.y + h + radius) visible = false;
                }

                if (visible) newStrokes.push(s);
                else modified = true;
            }
        }

        if (modified) {
            page.strokes = newStrokes;
            this.redrawAll();
        }
    }

    computeErasure(stroke, center, radius) {
        // Optimization: Check bounding box of stroke first
        // But for freehand stroke, computing BB might be slow? 
        // Iterate segments
        const segments = [];
        let currentPoints = [];
        let modified = false;

        const points = stroke.points;
        if (points.length === 0) return [];

        let p1 = points[0];
        let p1Inside = (Math.pow(p1.x - center.x, 2) + Math.pow(p1.y - center.y, 2)) < radius * radius;

        if (!p1Inside) currentPoints.push(p1);
        else modified = true;

        for (let i = 1; i < points.length; i++) {
            const p2 = points[i];
            const p2Inside = (Math.pow(p2.x - center.x, 2) + Math.pow(p2.y - center.y, 2)) < radius * radius;

            if (p1Inside && p2Inside) {
                // Fully inside, skip
                modified = true;
            } else if (!p1Inside && !p2Inside) {
                // Both outside, but might pass through
                const intersects = this.getEraserIntersections(p1, p2, center, radius);
                if (intersects.length === 2) {
                    // Enters and Exits
                    currentPoints.push(intersects[0]);
                    segments.push(currentPoints); // End segment

                    currentPoints = [intersects[1], p2]; // Start new segment
                    modified = true;
                } else {
                    currentPoints.push(p2);
                }
            } else if (!p1Inside && p2Inside) {
                // Entering
                const intersects = this.getEraserIntersections(p1, p2, center, radius);
                if (intersects.length > 0) currentPoints.push(intersects[0]);

                segments.push(currentPoints);
                currentPoints = [];
                modified = true;
            } else if (p1Inside && !p2Inside) {
                // Exiting
                const intersects = this.getEraserIntersections(p1, p2, center, radius);
                if (intersects.length > 0) currentPoints = [intersects[intersects.length - 1], p2];
                else currentPoints = [p2]; // Should not happen ideally
                modified = true;
            }

            p1 = p2;
            p1Inside = p2Inside;
        }

        if (currentPoints.length > 0) segments.push(currentPoints);

        if (!modified) return [stroke];

        // Reconstruct strokes
        const newStrokes = [];
        segments.forEach(pts => {
            // Filter tiny segments
            if (pts.length >= 2 || (stroke.points.length === 1 && pts.length === 1)) {
                newStrokes.push({ ...stroke, points: pts });
            }
        });
        return newStrokes;
    }

    getEraserIntersections(p1, p2, center, radius) {
        // Find intersection of line segment p1-p2 and circle (center, radius)
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const fx = p1.x - center.x;
        const fy = p1.y - center.y;

        const a = dx * dx + dy * dy;
        const b = 2 * (fx * dx + fy * dy);
        const c = (fx * fx + fy * fy) - radius * radius;

        const discriminant = b * b - 4 * a * c;
        if (discriminant < 0) return [];

        const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
        const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);

        const res = [];
        if (t1 >= 0 && t1 <= 1) {
            res.push({ x: p1.x + t1 * dx, y: p1.y + t1 * dy });
        }
        if (t2 >= 0 && t2 <= 1) {
            res.push({ x: p1.x + t2 * dx, y: p1.y + t2 * dy });
        }
        return res;
    }

    /* ================= SHAPE SELECTION & MANIPULATION ================= */

    getShapeAt(pos) {
        // Find shape at position (reverse order for top-most)
        // Only return actual shapes, not freehand strokes
        const page = this.pages[this.pageIndex];
        for (let i = page.strokes.length - 1; i >= 0; i--) {
            const s = page.strokes[i];
            // Only check actual shapes, not freehand/pen/marker/highlighter
            if (['rect', 'circle', 'line', 'arrow'].includes(s.type)) {
                if (this.isPointInShape(pos, s)) {
                    return s;
                }
            }
        }
        return null;
    }

    isPointInShape(pos, shape) {
        const tolerance = 10; // Slightly larger for easier clicking
        if (shape.type === 'rect') {
            // Handle negative width/height
            const x = shape.w >= 0 ? shape.x : shape.x + shape.w;
            const y = shape.h >= 0 ? shape.y : shape.y + shape.h;
            const w = Math.abs(shape.w);
            const h = Math.abs(shape.h);
            return pos.x >= x - tolerance && pos.x <= x + w + tolerance &&
                pos.y >= y - tolerance && pos.y <= y + h + tolerance;
        } else if (shape.type === 'circle') {
            const dist = Math.hypot(pos.x - shape.cx, pos.y - shape.cy);
            return dist <= Math.max(shape.rx, shape.ry) + tolerance;

        } else if (shape.type === 'line' || shape.type === 'arrow') {
            // Existing logic for lines is correct (it checks distance to segment)
            const l2 = Math.pow(shape.x2 - shape.x1, 2) + Math.pow(shape.y2 - shape.y1, 2);
            if (l2 === 0) return Math.hypot(pos.x - shape.x1, pos.y - shape.y1) <= tolerance;
            let t = ((pos.x - shape.x1) * (shape.x2 - shape.x1) + (pos.y - shape.y1) * (shape.y2 - shape.y1)) / l2;
            t = Math.max(0, Math.min(1, t));
            const px = shape.x1 + t * (shape.x2 - shape.x1);
            const py = shape.y1 + t * (shape.y2 - shape.y1);
            return Math.hypot(pos.x - px, pos.y - py) <= tolerance;
        }
        return false;
    }

    getShapeBounds(shape) {
        if (shape.type === 'rect') {
            // Normalize negative dimensions
            const x = shape.w >= 0 ? shape.x : shape.x + shape.w;
            const y = shape.h >= 0 ? shape.y : shape.y + shape.h;
            const w = Math.abs(shape.w);
            const h = Math.abs(shape.h);
            return { x, y, w, h };
        } else if (shape.type === 'circle') {
            return {
                x: shape.cx - shape.rx,
                y: shape.cy - shape.ry,
                w: shape.rx * 2,
                h: shape.ry * 2
            };
        } else if (shape.type === 'line' || shape.type === 'arrow') {
            const minX = Math.min(shape.x1, shape.x2);
            const minY = Math.min(shape.y1, shape.y2);
            const maxX = Math.max(shape.x1, shape.x2);
            const maxY = Math.max(shape.y1, shape.y2);
            return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
        }
        return null;
    }

    getResizeHandle(pos, bounds) {
        const handleSize = 8;
        const handles = {
            nw: { x: bounds.x, y: bounds.y },
            ne: { x: bounds.x + bounds.w, y: bounds.y },
            sw: { x: bounds.x, y: bounds.y + bounds.h },
            se: { x: bounds.x + bounds.w, y: bounds.y + bounds.h },
            n: { x: bounds.x + bounds.w / 2, y: bounds.y },
            s: { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h },
            e: { x: bounds.x + bounds.w, y: bounds.y + bounds.h / 2 },
            w: { x: bounds.x, y: bounds.y + bounds.h / 2 }
        };

        for (const [name, handle] of Object.entries(handles)) {
            if (Math.abs(pos.x - handle.x) <= handleSize && Math.abs(pos.y - handle.y) <= handleSize) {
                return name;
            }
        }
        return null;
    }

    drawSelectionBox(shape) {
        const bounds = this.getShapeBounds(shape);
        if (!bounds) return;

        const octx = this.octx;
        octx.save();
        octx.strokeStyle = '#2196F3';
        octx.lineWidth = 2;
        octx.setLineDash([5, 5]);
        octx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
        octx.setLineDash([]);

        // Draw resize handles
        const handleSize = 6;
        octx.fillStyle = '#2196F3';
        const handles = [
            { x: bounds.x, y: bounds.y },
            { x: bounds.x + bounds.w, y: bounds.y },
            { x: bounds.x, y: bounds.y + bounds.h },
            { x: bounds.x + bounds.w, y: bounds.y + bounds.h },
            { x: bounds.x + bounds.w / 2, y: bounds.y },
            { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h },
            { x: bounds.x + bounds.w, y: bounds.y + bounds.h / 2 },
            { x: bounds.x, y: bounds.y + bounds.h / 2 }
        ];

        handles.forEach(h => {
            octx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
        });

        octx.restore();
    }


    saveStroke(stroke) {
        this.pages[this.pageIndex].strokes.push(stroke);
        this.history.push({ pageIndex: this.pageIndex, stroke: stroke });
        this.redoStack = [];
    }

    undo() {
        const page = this.pages[this.pageIndex];
        if (page.strokes.length > 0) {
            const popped = page.strokes.pop();
            this.redoStack.push(popped);
            this.redrawAll();
        }
    }

    redo() {
        if (this.redoStack.length > 0) {
            const s = this.redoStack.pop();
            this.pages[this.pageIndex].strokes.push(s);
            this.redrawAll();
        }
    }

    clear() {
        if (confirm("Clear entire whiteboard?")) {
            this.pages[this.pageIndex].strokes = [];
            this.pages[this.pageIndex].stickies = [];
            this.stickyNotes = [];

            // Remove PDF background if present
            if (this.pages[this.pageIndex].pdfBackground) {
                delete this.pages[this.pageIndex].pdfBackground;
            }

            // Reset PDF state if this was the last PDF page
            const hasPDFPages = this.pages.some(p => p.pdfBackground);
            if (!hasPDFPages) {
                this.pdfDocument = null;
                this.pdfFileId = null;
                this.pdfFileName = null;
                this.pdfSubject = null;
                this.pdfPages = [];
            }

            document.getElementById('wb-sticky-container').innerHTML = ''; // Clear stickies DOM
            this.redrawAll();
        }
    }

    /* ================= MISC ================= */

    addSticky(pos) {
        const id = this.generateId();
        const sticky = {
            id,
            x: pos.x,
            y: pos.y,
            text: "",
            color: "#fef08a"
        };

        this.pages[this.pageIndex].stickies.push(sticky);
        this.renderSticky(sticky);
    }

    renderSticky(data) {
        const container = document.getElementById('wb-sticky-container');
        const el = document.createElement('div');
        el.className = 'wb-sticky-note';
        el.style.left = data.x + 'px';
        el.style.top = data.y + 'px';
        el.style.width = '150px';
        el.style.height = '120px';
        el.style.backgroundColor = data.color;

        el.innerHTML = `
            <div class="wb-sticky-header">
                <span style="font-size:10px; opacity:0.5;">Sticky</span>
                <button class="wb-close-sticky" style="border:none;background:none;cursor:pointer;">&times;</button>
            </div>
            <textarea class="wb-sticky-textarea">${data.text}</textarea>
        `;

        // Sticky Events
        const header = el.querySelector('.wb-sticky-header');
        let isDragging = false;
        let startX, startY;

        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX - el.offsetLeft;
            startY = e.clientY - el.offsetTop;
        });

        window.addEventListener('mousemove', (e) => {
            if (isDragging) {
                el.style.left = (e.clientX - startX) + 'px';
                el.style.top = (e.clientY - startY) + 'px';
            }
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
        });

        el.querySelector('.wb-close-sticky').addEventListener('click', () => {
            container.removeChild(el);
            // Remove from Model
            this.pages[this.pageIndex].stickies = this.pages[this.pageIndex].stickies.filter(s => s.id !== data.id);
        });

        container.appendChild(el);
    }

    exportImage() {
        const link = document.createElement('a');
        link.download = `whiteboard-${new Date().toISOString()}.png`;
        link.href = this.canvas.toDataURL();
        link.click();
    }

    addPage() {
        this.pages.push({ id: this.generateId(), strokes: [], stickies: [] });
        this.changePage(1);
    }

    changePage(delta) {
        const newIndex = this.pageIndex + delta;
        if (newIndex >= 0 && newIndex < this.pages.length) {
            this.pageIndex = newIndex;
            document.getElementById('wb-page-num').textContent = `${this.pageIndex + 1} / ${this.pages.length}`;
            // Clear DOM stickies and render new ones
            document.getElementById('wb-sticky-container').innerHTML = '';
            this.pages[this.pageIndex].stickies.forEach(s => this.renderSticky(s));
            this.redrawAll();
        }
    }

    /* ================= PDF ANNOTATION ================= */

    async loadPDFForAnnotation(fileId, fileName, subject) {
        try {
            if (window.ui && window.ui.showToast) {
                window.ui.showToast('Loading PDF...', 'info');
            }

            // Download PDF from Google Drive
            const blob = await this.downloadPDFBlob(fileId);
            if (!blob) {
                throw new Error('Failed to download PDF');
            }

            // Load PDF with PDF.js
            const arrayBuffer = await blob.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            this.pdfDocument = await loadingTask.promise;

            this.pdfFileId = fileId;
            this.pdfFileName = fileName;
            this.pdfSubject = subject;

            // Convert PDF pages to images
            await this.renderPDFPages();

            // Show whiteboard
            this.show();

            if (window.ui && window.ui.showToast) {
                window.ui.showToast(`Loaded ${this.pdfDocument.numPages} pages`, 'success');
            }
        } catch (error) {
            console.error('Error loading PDF:', error);
            if (window.ui && window.ui.showToast) {
                window.ui.showToast('Failed to load PDF', 'error');
            } else {
                alert('Failed to load PDF: ' + error.message);
            }
        }
    }

    async downloadPDFBlob(fileId) {
        try {
            const response = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            }, {
                responseType: 'blob'
            });

            // The response.body contains the blob
            return response.body;
        } catch (error) {
            console.error('Error downloading PDF:', error);
            return null;
        }
    }

    async renderPDFPages() {
        this.pdfPages = [];
        const numPages = this.pdfDocument.numPages;

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await this.pdfDocument.getPage(pageNum);
            const viewport = page.getViewport({ scale: 2.0 });

            // Create canvas for this page
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            // Convert to image data URL
            const imageDataUrl = canvas.toDataURL('image/png');
            this.pdfPages.push(imageDataUrl);
        }

        // Replace pages with PDF pages
        this.pages = this.pdfPages.map((imgData, index) => ({
            id: this.generateId(),
            strokes: [],
            stickies: [],
            pdfBackground: imgData
        }));

        this.pageIndex = 0;
        document.getElementById('wb-page-num').textContent = `1 / ${this.pages.length}`;
        this.redrawAll();
    }

    /* ================= AREA SELECTION HELPERS ================= */

    drawLassoPath() {
        const octx = this.octx;
        octx.clearRect(0, 0, this.overlay.width, this.overlay.height);

        if (this.lassoPath.length === 0) return;

        const start = this.lassoPath[0];
        const current = this.lassoPath[this.lassoPath.length - 1]; // Use last point (current mouse pos)

        octx.save();
        octx.strokeStyle = '#8b5cf6';
        octx.lineWidth = 1;
        octx.setLineDash([5, 5]);
        octx.fillStyle = 'rgba(139, 92, 246, 0.1)';

        const w = current.x - start.x;
        const h = current.y - start.y;

        octx.fillRect(start.x, start.y, w, h);
        octx.strokeRect(start.x, start.y, w, h);
        octx.restore();
    }

    completeSelection() {
        if (this.lassoPath.length < 2) return;

        const page = this.pages[this.pageIndex];
        this.selectedStrokes = [];

        const start = this.lassoPath[0];
        const end = this.lassoPath[this.lassoPath.length - 1];

        // Normalize bounds
        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxY = Math.max(start.y, end.y);

        const selectionRect = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };

        // Check which strokes are inside or intersecting the selection rect
        page.strokes.forEach((stroke, index) => {
            if (this.isStrokeInRect(stroke, selectionRect)) {
                this.selectedStrokes.push(index);
            }
        });

        if (this.selectedStrokes.length > 0) {
            this.drawSelectionBox();
        }
    }

    isStrokeInRect(stroke, rect) {
        // Simple bounding box check
        let sMinX = Infinity, sMinY = Infinity, sMaxX = -Infinity, sMaxY = -Infinity;

        if (stroke.points) {
            stroke.points.forEach(p => {
                sMinX = Math.min(sMinX, p.x);
                sMinY = Math.min(sMinY, p.y);
                sMaxX = Math.max(sMaxX, p.x);
                sMaxY = Math.max(sMaxY, p.y);
            });
        } else if (stroke.type === 'rect' || stroke.type === 'image') {
            sMinX = stroke.x;
            sMinY = stroke.y;
            sMaxX = stroke.x + stroke.w;
            sMaxY = stroke.y + stroke.h;
        } else if (stroke.type === 'circle') {
            sMinX = stroke.cx - stroke.rx;
            sMinY = stroke.cy - stroke.ry;
            sMaxX = stroke.cx + stroke.rx;
            sMaxY = stroke.cy + stroke.ry;
        } else if (stroke.type === 'text') {
            sMinX = stroke.x;
            sMinY = stroke.y; // Text anchor is usually top-left or baseline
            // Approximate text size
            sMaxX = stroke.x + (stroke.text.length * stroke.fontSize * 0.6);
            sMaxY = stroke.y + stroke.fontSize;
        } else {
            // Default fallback
            return false;
        }

        // Rect intersection
        return !(rect.x > sMaxX ||
            rect.x + rect.w < sMinX ||
            rect.y > sMaxY ||
            rect.y + rect.h < sMinY);
    }

    isPointInSelection(point) {
        if (this.selectedStrokes.length === 0) return false;

        const page = this.pages[this.pageIndex];
        const bounds = this.getSelectionBounds();

        return point.x >= bounds.minX && point.x <= bounds.maxX &&
            point.y >= bounds.minY && point.y <= bounds.maxY;
    }

    getSelectionBounds() {
        const page = this.pages[this.pageIndex];
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        this.selectedStrokes.forEach(index => {
            const stroke = page.strokes[index];
            if (stroke.points) {
                stroke.points.forEach(p => {
                    minX = Math.min(minX, p.x);
                    minY = Math.min(minY, p.y);
                    maxX = Math.max(maxX, p.x);
                    maxY = Math.max(maxY, p.y);
                });
            }
        });

        return { minX, minY, maxX, maxY };
    }

    drawSelectionBox() {
        const bounds = this.getSelectionBounds();
        const octx = this.octx;

        octx.clearRect(0, 0, this.overlay.width, this.overlay.height);
        octx.save();
        octx.strokeStyle = '#8b5cf6';
        octx.lineWidth = 2;
        octx.setLineDash([5, 5]);
        octx.strokeRect(bounds.minX - 5, bounds.minY - 5,
            bounds.maxX - bounds.minX + 10,
            bounds.maxY - bounds.minY + 10);
        octx.restore();
    }

    moveSelectedStrokes(dx, dy) {
        const page = this.pages[this.pageIndex];

        this.selectedStrokes.forEach(index => {
            const stroke = page.strokes[index];
            if (stroke.points) {
                stroke.points.forEach(p => {
                    p.x += dx;
                    p.y += dy;
                });
            } else if (stroke.x !== undefined) {
                stroke.x += dx;
                stroke.y += dy;
                if (stroke.x1 !== undefined) {
                    stroke.x1 += dx;
                    stroke.y1 += dy;
                    stroke.x2 += dx;
                    stroke.y2 += dy;
                }
                if (stroke.cx !== undefined) {
                    stroke.cx += dx;
                    stroke.cy += dy;
                }
            }
        });
    }

    /* ================= PDF ANNOTATION ================= */

    async saveAnnotatedPDF() {
        if (!this.pdfDocument) {
            if (window.ui && window.ui.showToast) {
                window.ui.showToast('No PDF loaded', 'warning');
            }
            return;
        }

        try {
            const pdfBlob = await this.generatePDF();
            const file = new File([pdfBlob], this.pdfFileName, { type: 'application/pdf' });

            if (window.drive) {
                // Delete old version
                await window.drive.deleteFile(this.pdfFileId, this.pdfFileName);

                // Upload new annotated version
                await window.drive.uploadPDF(file, this.pdfSubject);

                if (window.ui && window.ui.showToast) {
                    window.ui.showToast('Annotations saved!', 'success');
                }

                // Reload notes
                if (window.ui && window.ui.loadAllNotes) {
                    await window.ui.loadAllNotes();
                }
            }
        } catch (error) {
            console.error('Error saving annotated PDF:', error);
            if (window.ui && window.ui.showToast) {
                window.ui.showToast('Failed to save annotations', 'error');
            }
        }
    }

    /* ================= PDF ANNOTATION ================= */

    async loadPDFForAnnotation(fileId, fileName, subject) {
        try {
            if (window.ui && window.ui.showToast) {
                window.ui.showToast('Loading PDF...', 'info');
            }

            // Download PDF from Google Drive using fetch
            const blob = await this.downloadPDFBlob(fileId);
            if (!blob) {
                throw new Error('Failed to download PDF');
            }

            // Load PDF with PDF.js
            const arrayBuffer = await blob.arrayBuffer();

            // Set PDF.js worker
            if (typeof pdfjsLib !== 'undefined') {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }

            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            this.pdfDocument = await loadingTask.promise;

            this.pdfFileId = fileId;
            this.pdfFileName = fileName;
            this.pdfSubject = subject;

            // Convert PDF pages to images
            await this.renderPDFPages();

            // Show whiteboard
            this.show();

            if (window.ui && window.ui.showToast) {
                window.ui.showToast(`Loaded ${this.pdfDocument.numPages} pages`, 'success');
            }
        } catch (error) {
            console.error('Error loading PDF:', error);
            if (window.ui && window.ui.showToast) {
                window.ui.showToast('Failed to load PDF: ' + error.message, 'error');
            } else {
                alert('Failed to load PDF: ' + error.message);
            }
        }
    }

    async downloadPDFBlob(fileId) {
        try {
            // Use fetch API with access token
            const accessToken = gapi.auth.getToken().access_token;
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch PDF from Drive');
            }

            const blob = await response.blob();
            return blob;
        } catch (error) {
            console.error('Error downloading PDF:', error);
            return null;
        }
    }

    async renderPDFPages() {
        this.pdfPages = [];
        const numPages = this.pdfDocument.numPages;

        // Get first page to determine dimensions
        const firstPage = await this.pdfDocument.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1.5 }); // Use 1.5 scale for better quality

        // Resize canvas to match PDF dimensions
        this.canvas.width = viewport.width;
        this.canvas.height = viewport.height;
        this.overlay.width = viewport.width;
        this.overlay.height = viewport.height;

        // Calculate fit zoom
        const containerWidth = this.container.clientWidth || window.innerWidth;
        const containerHeight = this.container.clientHeight || window.innerHeight;

        // Subtract some padding for toolbar
        const availWidth = containerWidth - 80;
        const availHeight = containerHeight - 80;

        const scaleX = availWidth / viewport.width;
        const scaleY = availHeight / viewport.height;
        const fitScale = Math.min(scaleX, scaleY);

        // Set zoom to fit
        const zoomPercent = Math.floor(fitScale * 100);
        // Ensure zoom is at least 10%
        this.setZoom(Math.max(zoomPercent, 10));

        // Center canvas origin for zoom if needed, but for now simple scale is enough
        this.canvas.style.transformOrigin = 'top left';
        this.overlay.style.transformOrigin = 'top left';

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await this.pdfDocument.getPage(pageNum);
            const pageViewport = page.getViewport({ scale: 1.5 });

            // Create canvas for this page
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = pageViewport.width;
            canvas.height = pageViewport.height;

            await page.render({
                canvasContext: context,
                viewport: pageViewport
            }).promise;

            // Convert to image data URL
            const imageDataUrl = canvas.toDataURL('image/png');
            this.pdfPages.push(imageDataUrl);
        }

        // Replace pages with PDF pages
        this.pages = this.pdfPages.map((imgData, index) => ({
            id: this.generateId(),
            strokes: [],
            stickies: [],
            pdfBackground: imgData
        }));

        this.pageIndex = 0;
        document.getElementById('wb-page-num').textContent = `1 / ${this.pages.length}`;
        // Ensure overlay matches canvas size on redraw
        this.redrawAll();
    }
}

// Global instance
let whiteboard;

function initWhiteboard() {
    if (!whiteboard) {
        try {
            whiteboard = new Whiteboard();
            window.whiteboard = whiteboard;
        } catch (e) {
            console.error("Whiteboard init error:", e);
            alert("Failed to initialize whiteboard.");
            return;
        }
    }
    whiteboard.show();
    return whiteboard;
}

// Expose to window and bind button
window.initWhiteboard = initWhiteboard;

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('whiteboard-btn');
    if (btn) {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default if any
            initWhiteboard();
        });
    }
});
