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
    LASER: "laser"
};

const WB_PEN_PRESETS = {
    pen: { width: 2, opacity: 1, cap: "round", join: "round" },
    marker: { width: 6, opacity: 1, cap: "square", join: "round" },
    highlighter: { width: 20, opacity: 0.35, cap: "butt", join: "round" }
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

        // Cursor logic
        if (tool === WB_TOOLS.ERASER) this.canvas.style.cursor = 'crosshair'; // Should ideally contain an eraser circle
        else if (tool === WB_TOOLS.TEXT) this.canvas.style.cursor = 'text';
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

    resizeCanvas() {
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
        this.drawBackground(ctx, w, h);

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
            const pdfBlob = await this.generatePDF();

            // File object
            const file = new File([pdfBlob], name.endsWith('.pdf') ? name : name + '.pdf', { type: 'application/pdf' });

            if (window.drive) {
                btn.innerText = "Uploading...";
                await window.drive.uploadPDF(file, subject);
                this.closeUploadModal();
                // Optionally clear
            } else {
                console.error("Drive module not found");
                alert("Drive module not found");
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
            if (s.type === "highlighter") ctx.globalCompositeOperation = "multiply";

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
        // e.preventDefault(); // can break scrolling if not careful
        if (!this.isDrawing) {
            // Laser pointer logic could go here
            return;
        }

        const pos = this.getPos(e);

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
                if (s.type === "highlighter") ctx.globalCompositeOperation = "multiply";

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

            if (shape) this.saveStroke(shape);
            this.shapeStart = null;
            this.octx.clearRect(0, 0, this.overlay.width, this.overlay.height);
        }

        this.redrawAll();
    }

    eraseAt(pos) {
        const threshold = 15;
        const page = this.pages[this.pageIndex];
        const initialCount = page.strokes.length;

        page.strokes = page.strokes.filter(s => {
            if (s.points) {
                // Freehand
                return !s.points.some(p => Math.hypot(p.x - pos.x, p.y - pos.y) < threshold);
            }
            // Simple bounding box checks for shapes for performance, can enhance later
            if (s.type === 'rect') {
                return !(pos.x > s.x - threshold && pos.x < s.x + s.w + threshold && pos.y > s.y - threshold && pos.y < s.y + s.h + threshold);
            }
            return true; // Keep others for now to avoid accidental deletions of complex shapes
        });

        if (page.strokes.length !== initialCount) {
            this.redrawAll();
        }
    }

    saveStroke(stroke) {
        this.pages[this.pageIndex].strokes.push(stroke);
        this.history.push({ pageIndex: this.pageIndex, stroke: stroke });
        this.redoStack = [];
        this.redrawAll();
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
}

// Global instance
let whiteboard;

function initWhiteboard() {
    if (!whiteboard) {
        whiteboard = new Whiteboard();
    }
    whiteboard.show();
}

// Expose to window
window.initWhiteboard = initWhiteboard;
