
import './style.css'

// Default Configuration
const CONFIG = {
    faceHeight: 60, // Match CSS
    defaultFaces: 6,
    defaultMessage: "SCYTALE CIPHER"
};

// State
const state = {
    message: CONFIG.defaultMessage,
    faces: CONFIG.defaultFaces,
    mode: 'encode',
    rotationX: 0
};

// Elements
const el = {
    cylinder: document.getElementById('cylinder'),
    stripContent: document.getElementById('strip-content'),
    wrapper: document.getElementById('scytale-wrapper'),
    input: document.getElementById('message-input'),
    slider: document.getElementById('diameter-slider'),
    sliderVal: document.getElementById('diameter-value'),
    btnEncode: document.getElementById('mode-encode'),
    btnDecode: document.getElementById('mode-decode'),
    scene: document.querySelector('.scene-3d'),
    gridContent: document.getElementById('grid-content'),
    decodedMessage: document.getElementById('decoded-message')
};

function init() {
    try {
        console.log("Initializing Scytale Sim...");

        // Set initial values
        if (el.input) el.input.value = state.message;
        if (el.slider) el.slider.value = state.faces;
        if (el.sliderVal) el.sliderVal.textContent = state.faces;

        bindEvents();
        renderCylinderStructure();
        updateVisuals();

        console.log("Initialization Complete.");
    } catch (e) {
        console.error("Scytale Init Error:", e);
        alert("Simulation Error: " + e.message);
    }
}

function bindEvents() {
    // Navigation
    const btnLearn = document.getElementById('btn-learn');
    const btnChallenge = document.getElementById('btn-challenge');
    const closeModals = document.querySelectorAll('.close-modal');

    if (btnLearn) btnLearn.addEventListener('click', () => document.getElementById('modal-learn').classList.remove('hidden'));
    if (btnChallenge) btnChallenge.addEventListener('click', () => document.getElementById('modal-challenge').classList.remove('hidden'));
    closeModals.forEach(btn => btn.addEventListener('click', (e) => {
        e.target.closest('.modal').classList.add('hidden');
    }));

    // Inputs
    if (el.input) {
        el.input.addEventListener('input', (e) => {
            state.message = e.target.value;
            updateVisuals();
        });
        // Handle paste to clean newlines
        el.input.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text');
            const cleanText = text.replace(/[\r\n]+/g, '');

            const start = el.input.selectionStart;
            const end = el.input.selectionEnd;
            const val = el.input.value;
            const newVal = val.slice(0, start) + cleanText + val.slice(end);

            el.input.value = newVal;
            el.input.selectionStart = el.input.selectionEnd = start + cleanText.length;
            state.message = newVal;
            updateVisuals();
        });
    }

    if (el.slider) el.slider.addEventListener('input', (e) => {
        state.faces = parseInt(e.target.value);
        el.sliderVal.textContent = state.faces;
        renderCylinderStructure();
        updateVisuals();
    });

    if (el.btnEncode) el.btnEncode.addEventListener('click', () => setMode('encode'));
    if (el.btnDecode) el.btnDecode.addEventListener('click', () => setMode('decode'));

    // Drag Rotation
    let isDragging = false;
    let startY = 0;
    let startRot = 0;

    if (el.scene) {
        el.scene.addEventListener('mousedown', (e) => {
            isDragging = true;
            startY = e.clientY;
            startRot = state.rotationX;
            el.scene.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const delta = e.clientY - startY;
            state.rotationX = startRot - (delta * 0.5);
            el.wrapper.style.transform = `rotateX(${state.rotationX}deg)`;
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
            el.scene.style.cursor = 'grab';
        });
    }

    // Challenge
    const btnSubmit = document.getElementById('btn-submit-challenge');
    if (btnSubmit) btnSubmit.addEventListener('click', checkChallenge);

    const btnCert = document.getElementById('btn-download-cert');
    if (btnCert) btnCert.addEventListener('click', downloadCertificate);
}

function setMode(mode) {
    state.mode = mode;
    el.btnEncode.classList.toggle('active', mode === 'encode');
    el.btnDecode.classList.toggle('active', mode === 'decode');

    // Reset Rotation to show Face 0
    state.rotationX = 0;
    if (el.wrapper) el.wrapper.style.transform = `rotateX(0deg)`;

    updateVisuals();
}

function renderCylinderStructure() {
    el.cylinder.innerHTML = '';
    const n = state.faces;
    const h = CONFIG.faceHeight;
    const angleInfo = 360 / n;

    // Apothem
    const rad = (h / 2) / Math.tan(Math.PI / n);

    for (let i = 0; i < n; i++) {
        const face = document.createElement('div');
        face.className = 'face';
        face.style.height = `${h}px`;

        face.style.top = '50%';
        face.style.marginTop = `-${h / 2}px`;

        face.style.transform = `rotateX(${i * angleInfo}deg) translateZ(${rad}px)`;
        face.id = `face-${i}`;
        el.cylinder.appendChild(face);
    }
}

function updateVisuals() {
    const msg = state.message.replace(/[\r\n]+/g, '');
    const n = state.faces;

    // Clear
    document.querySelectorAll('.face').forEach(f => {
        f.innerHTML = '';
        f.style.borderLeft = '';
    });
    el.stripContent.innerHTML = '';

    let grid = {};

    // PHYSICAL SCYTALE PROCESS:
    // ENCODE: Write HORIZONTALLY on rod (Row-Major Fill), Unwrap strip (Column-Major Read)
    // DECODE: Wrap strip around rod (Column-Major Fill), Read HORIZONTALLY (Row-Major Read)

    if (state.mode === 'encode') {
        // ENCODE: Write message HORIZONTALLY on each face
        // Face 0 gets first ROW_LEN chars, Face 1 gets next, etc.
        let ROW_LEN = Math.ceil(msg.length / n);
        if (ROW_LEN < 1) ROW_LEN = 1;

        for (let i = 0; i < msg.length; i++) {
            const faceIdx = Math.floor(i / ROW_LEN); // Which face (row)
            const colIdx = i % ROW_LEN;              // Which column position

            if (!grid[faceIdx]) grid[faceIdx] = [];
            grid[faceIdx][colIdx] = msg[i];
        }

        // Generate Ciphertext: Read COLUMN-BY-COLUMN (unwrap the strip)
        // The strip winds around the rod, so we read down columns
        let ciphertext = "";
        for (let c = 0; c < ROW_LEN; c++) {
            for (let f = 0; f < n; f++) {
                if (grid[f] && grid[f][c] !== undefined) {
                    ciphertext += grid[f][c];
                }
            }
        }

        renderStrip(ciphertext);
        renderFaces(grid);
        render2DGrid(grid);
        displayDecodedMessage(''); // Clear in encode mode

    } else {
        // DECODE: Wrap ciphertext strip around rod (Column-Major Fill)
        // Strip winds around, so each position goes to successive faces
        const ciphertext = msg;

        for (let i = 0; i < ciphertext.length; i++) {
            const faceIdx = i % n;                   // Face cycles as strip wraps
            const colIdx = Math.floor(i / n);        // Move to next column every N chars

            if (!grid[faceIdx]) grid[faceIdx] = [];
            grid[faceIdx][colIdx] = ciphertext[i];
        }

        // The plaintext is now visible HORIZONTALLY on each face (Row-Major Read)
        let plaintext = "";
        for (let f = 0; f < n; f++) {
            if (grid[f]) {
                plaintext += grid[f].join('');
            }
        }

        renderStrip(ciphertext);
        renderFaces(grid);
        render2DGrid(grid);
        displayDecodedMessage(plaintext);
    }
}

function renderFaces(grid) {
    const n = state.faces;
    let maxCol = 15;
    Object.values(grid).forEach(row => { if (row.length > maxCol) maxCol = row.length; });

    for (let f = 0; f < n; f++) {
        const faceDiv = document.getElementById(`face-${f}`);
        // Add Marker to Face 0
        if (f === 0) {
            faceDiv.style.borderLeft = "5px solid #d4af37"; // Gold-er border
            // Check if marker exists? simpler to clear HTML in updateVisuals, which calls this.
            // But main clear is before.
            const marker = document.createElement('div');
            marker.textContent = "START READING HERE";
            marker.style.position = "absolute";
            marker.style.left = "-140px"; // Shift left
            marker.style.top = "15px";
            marker.style.color = "#d4af37";
            marker.style.fontSize = "12px";
            marker.style.fontWeight = "bold";
            marker.style.whiteSpace = "nowrap";
            faceDiv.appendChild(marker);

            // Arrow
            const arrow = document.createElement('div');
            arrow.textContent = "➔";
            arrow.style.position = "absolute";
            arrow.style.left = "-20px";
            arrow.style.top = "10px";
            arrow.style.color = "#d4af37";
            arrow.style.fontSize = "24px";
            faceDiv.appendChild(arrow);

        } else {
            faceDiv.style.borderLeft = "";
        }

        const rowData = grid[f] || [];
        // Render only used columns to avoid overflow or empty divs
        const len = Math.max(maxCol, rowData.length);
        for (let c = 0; c < len; c++) {
            const char = rowData[c] || '';
            const span = document.createElement('div');
            span.className = 'face-char';
            span.textContent = char;
            faceDiv.appendChild(span);
        }
    }
}

function renderStrip(text) {
    if (!text) return;
    for (let i = 0; i < text.length; i++) {
        const d = document.createElement('div');
        d.className = 'strip-char';
        d.textContent = text[i];
        el.stripContent.appendChild(d);
    }
}

function displayDecodedMessage(plaintext) {
    if (!el.decodedMessage) return;

    if (!plaintext || plaintext.length === 0) {
        el.decodedMessage.textContent = 'Switch to Decode mode to see the decoded message';
        el.decodedMessage.classList.add('empty');
    } else {
        el.decodedMessage.textContent = plaintext;
        el.decodedMessage.classList.remove('empty');
    }
}

// Challenge Logic
// SCYTALE_IS_COOL encoded with 3 faces using physical process:
// Row-Major Fill: Face 0=SCYTA, Face 1=LE_IS, Face 2=_COOL
// Column-Major Read: S-L-_, C-E-C, Y-_-O, T-I-O, A-S-L
const CHALLENGE_CIPHER_REAL = "SL_CECY_OTIOASL";
const CHALLENGE_KEY = 3;
const CHALLENGE_ANSWER = "SCYTALE_IS_COOL";

const codeEl = document.querySelector('.challenge-code');
if (codeEl) codeEl.textContent = CHALLENGE_CIPHER_REAL;

const hintEl = document.getElementById('challenge-hint-faces');
if (hintEl) hintEl.textContent = CHALLENGE_KEY;

function checkChallenge() {
    const input = document.getElementById('challenge-input');
    if (!input) return;

    const val = input.value.toUpperCase().replace(/\s/g, '_');
    if (val === CHALLENGE_ANSWER) {
        document.getElementById('challenge-success').classList.remove('hidden');
    } else {
        alert('Incorrect! Try setting the rod faces to ' + CHALLENGE_KEY + ' and decoding.');
    }
}

function downloadCertificate() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#0f1115';
    ctx.fillRect(0, 0, 800, 600);

    // Border
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, 760, 560);

    // Text
    ctx.font = '40px Cinzel'; // Font loading might be issue in canvas, usually fallbacks
    ctx.fillStyle = '#d4af37';
    ctx.textAlign = 'center';
    ctx.fillText('CERTIFICATE OF MASTERY', 400, 100);

    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#e0e0e0';
    ctx.fillText('This certifies that the student has successfully', 400, 200);
    ctx.fillText('cracked the Spartan Scytale Cipher.', 400, 240);

    ctx.font = '30px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(CHALLENGE_ANSWER, 400, 350);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Date: ' + new Date().toLocaleDateString(), 400, 500);

    const link = document.createElement('a');
    link.download = 'scytale_certificate.png';
    link.href = canvas.toDataURL();
    link.click();
}

function render2DGrid(grid) {
    if (!el.gridContent) return;
    el.gridContent.innerHTML = '';

    const n = state.faces;
    let maxCol = 15;
    Object.values(grid).forEach(row => { if (row.length > maxCol) maxCol = row.length; });

    for (let f = 0; f < n; f++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'grid-row';
        rowDiv.dataset.face = f + 1; // 1-based index for logic

        const rowData = grid[f] || [];
        // We render all cols up to maxCol to keep alignment

        const len = Math.max(maxCol, rowData.length);

        for (let c = 0; c < len; c++) {
            const char = rowData[c] || '';
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            if (c === 0 && state.mode === 'decode') cell.classList.add('first-col');
            cell.textContent = char;
            rowDiv.appendChild(cell);
        }

        el.gridContent.appendChild(rowDiv);
    }
}

// Start
init();
