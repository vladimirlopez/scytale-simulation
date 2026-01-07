
import './style.css'

// Configuration
const CONFIG = {
    faceHeight: 60,
    defaultFaces: 6,
    defaultMessage: "SCYTALE CIPHER",
    maxMessageLength: 100
};

// Challenge Bank - Array of challenges with increasing difficulty
const CHALLENGE_BANK = [
    { plaintext: "HELLO_SPARTAN", faces: 3 },
    { plaintext: "SCYTALE_IS_COOL", faces: 3 },
    { plaintext: "SECRET_MESSAGE", faces: 4 },
    { plaintext: "ATTACK_AT_DAWN", faces: 4 },
    { plaintext: "CRYPTOGRAPHY_RULES", faces: 5 }
];

// State
const state = {
    message: CONFIG.defaultMessage,
    faces: CONFIG.defaultFaces,
    mode: 'encode',
    rotationX: 0,
    currentCiphertext: '', // Track for copy functionality

    // Challenge game state
    challengeIndex: 0,
    challengeScore: 0,
    shuffledChallenges: [],
    gameCompleted: false
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
    decodedMessage: document.getElementById('decoded-message'),
    charCount: document.getElementById('char-count'),
    charCounter: document.querySelector('.char-counter'),
    btnCopyStrip: document.getElementById('btn-copy-strip')
};

// Shuffle array helper
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Encode plaintext to ciphertext (Row-Major Fill, Column-Major Read)
function encodeMessage(plaintext, faces) {
    const msg = plaintext.replace(/[\r\n]+/g, '');
    const n = faces;
    let ROW_LEN = Math.ceil(msg.length / n);
    if (ROW_LEN < 1) ROW_LEN = 1;

    let grid = {};
    for (let i = 0; i < msg.length; i++) {
        const faceIdx = Math.floor(i / ROW_LEN);
        const colIdx = i % ROW_LEN;
        if (!grid[faceIdx]) grid[faceIdx] = [];
        grid[faceIdx][colIdx] = msg[i];
    }

    let ciphertext = "";
    for (let c = 0; c < ROW_LEN; c++) {
        for (let f = 0; f < n; f++) {
            if (grid[f] && grid[f][c] !== undefined) {
                ciphertext += grid[f][c];
            }
        }
    }
    return ciphertext;
}

function init() {
    try {
        console.log("Initializing Scytale Sim...");

        // Set initial values
        if (el.input) el.input.value = state.message;
        if (el.slider) el.slider.value = state.faces;
        if (el.sliderVal) el.sliderVal.textContent = state.faces;

        // Initialize character counter
        updateCharCounter();

        bindEvents();
        renderCylinderStructure();
        updateVisuals();

        // Initialize challenge game
        initChallengeGame();

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
    if (btnChallenge) btnChallenge.addEventListener('click', () => {
        document.getElementById('modal-challenge').classList.remove('hidden');
        // Reset game state when opening challenge
        if (state.gameCompleted) {
            resetChallengeGame();
        }
    });
    closeModals.forEach(btn => btn.addEventListener('click', (e) => {
        e.target.closest('.modal').classList.add('hidden');
    }));

    // Inputs with character limit
    if (el.input) {
        el.input.addEventListener('input', (e) => {
            state.message = e.target.value;
            updateCharCounter();
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
            const remainingSpace = CONFIG.maxMessageLength - val.length + (end - start);
            const truncatedText = cleanText.slice(0, remainingSpace);
            const newVal = val.slice(0, start) + truncatedText + val.slice(end);

            el.input.value = newVal.slice(0, CONFIG.maxMessageLength);
            el.input.selectionStart = el.input.selectionEnd = start + truncatedText.length;
            state.message = el.input.value;
            updateCharCounter();
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

    // Copy Strip Button
    if (el.btnCopyStrip) {
        el.btnCopyStrip.addEventListener('click', copyStripToClipboard);
    }

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

    // Challenge Game Events
    const btnSubmit = document.getElementById('btn-submit-challenge');
    if (btnSubmit) btnSubmit.addEventListener('click', checkChallenge);

    const btnNext = document.getElementById('btn-next-challenge');
    if (btnNext) btnNext.addEventListener('click', nextChallenge);

    const btnReset = document.getElementById('btn-reset-game');
    if (btnReset) btnReset.addEventListener('click', resetChallengeGame);

    const btnCert = document.getElementById('btn-download-cert');
    if (btnCert) btnCert.addEventListener('click', downloadCertificate);

    // Allow Enter key to submit challenge
    const challengeInput = document.getElementById('challenge-input');
    if (challengeInput) {
        challengeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                checkChallenge();
            }
        });
    }
}

function updateCharCounter() {
    if (!el.charCount || !el.charCounter) return;

    const length = state.message.length;
    el.charCount.textContent = length;

    // Update styling based on usage
    el.charCounter.classList.remove('warning', 'error');
    if (length >= CONFIG.maxMessageLength) {
        el.charCounter.classList.add('error');
    } else if (length >= CONFIG.maxMessageLength * 0.8) {
        el.charCounter.classList.add('warning');
    }
}

function copyStripToClipboard() {
    if (!state.currentCiphertext) {
        return;
    }

    navigator.clipboard.writeText(state.currentCiphertext).then(() => {
        // Visual feedback
        el.btnCopyStrip.classList.add('copied');
        el.btnCopyStrip.textContent = '✓ Copied!';

        setTimeout(() => {
            el.btnCopyStrip.classList.remove('copied');
            el.btnCopyStrip.textContent = '📋 Copy Strip';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard');
    });
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

    if (state.mode === 'encode') {
        let ROW_LEN = Math.ceil(msg.length / n);
        if (ROW_LEN < 1) ROW_LEN = 1;

        for (let i = 0; i < msg.length; i++) {
            const faceIdx = Math.floor(i / ROW_LEN);
            const colIdx = i % ROW_LEN;

            if (!grid[faceIdx]) grid[faceIdx] = [];
            grid[faceIdx][colIdx] = msg[i];
        }

        let ciphertext = "";
        for (let c = 0; c < ROW_LEN; c++) {
            for (let f = 0; f < n; f++) {
                if (grid[f] && grid[f][c] !== undefined) {
                    ciphertext += grid[f][c];
                }
            }
        }

        state.currentCiphertext = ciphertext; // Store for copy
        renderStrip(ciphertext);
        renderFaces(grid);
        render2DGrid(grid);
        displayDecodedMessage('');

    } else {
        const ciphertext = msg;
        state.currentCiphertext = ciphertext; // Store for copy

        // Calculate grid structure (how many characters in each row/face)
        // This must match the encoding distribution
        let ROW_LEN = Math.ceil(ciphertext.length / n);
        if (ROW_LEN < 1) ROW_LEN = 1;

        let rowSizes = new Array(n).fill(0);
        let remaining = ciphertext.length;
        for (let f = 0; f < n; f++) {
            let size = Math.min(ROW_LEN, remaining);
            rowSizes[f] = size;
            remaining -= size;
        }

        // Fill grid COLUMN-BY-COLUMN from ciphertext
        let charIndex = 0;
        for (let c = 0; c < ROW_LEN; c++) {
            for (let f = 0; f < n; f++) {
                if (c < rowSizes[f] && charIndex < ciphertext.length) {
                    if (!grid[f]) grid[f] = [];
                    grid[f][c] = ciphertext[charIndex++];
                }
            }
        }

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
        if (f === 0) {
            faceDiv.style.borderLeft = "5px solid #d4af37";
            const marker = document.createElement('div');
            marker.textContent = "START READING HERE";
            marker.style.position = "absolute";
            marker.style.left = "-140px";
            marker.style.top = "15px";
            marker.style.color = "#d4af37";
            marker.style.fontSize = "12px";
            marker.style.fontWeight = "bold";
            marker.style.whiteSpace = "nowrap";
            faceDiv.appendChild(marker);

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

// ==================
// Challenge Game System
// ==================

function initChallengeGame() {
    state.shuffledChallenges = shuffleArray(CHALLENGE_BANK);
    state.challengeIndex = 0;
    state.challengeScore = 0;
    state.gameCompleted = false;
    loadCurrentChallenge();
}

function loadCurrentChallenge() {
    const challenge = state.shuffledChallenges[state.challengeIndex];
    const ciphertext = encodeMessage(challenge.plaintext, challenge.faces);

    // Update UI
    const cipherEl = document.getElementById('challenge-cipher');
    const hintEl = document.getElementById('challenge-hint-faces');
    const numEl = document.getElementById('challenge-number');
    const totalEl = document.getElementById('challenge-total');
    const scoreEl = document.getElementById('challenge-score');
    const inputEl = document.getElementById('challenge-input');
    const feedbackEl = document.getElementById('challenge-feedback');
    const successEl = document.getElementById('challenge-success');
    const completeEl = document.getElementById('game-complete');

    if (cipherEl) cipherEl.textContent = ciphertext;
    if (hintEl) hintEl.textContent = challenge.faces;
    if (numEl) numEl.textContent = state.challengeIndex + 1;
    if (totalEl) totalEl.textContent = state.shuffledChallenges.length;
    if (scoreEl) scoreEl.textContent = state.challengeScore;
    if (inputEl) inputEl.value = '';
    if (feedbackEl) feedbackEl.classList.add('hidden');
    if (successEl) successEl.classList.add('hidden');
    if (completeEl) completeEl.classList.add('hidden');
}

function checkChallenge() {
    const input = document.getElementById('challenge-input');
    const feedbackEl = document.getElementById('challenge-feedback');
    const successEl = document.getElementById('challenge-success');
    if (!input) return;

    const challenge = state.shuffledChallenges[state.challengeIndex];
    const val = input.value.toUpperCase().replace(/\s/g, '_');

    if (val === challenge.plaintext) {
        // Correct!
        state.challengeScore++;
        document.getElementById('challenge-score').textContent = state.challengeScore;

        feedbackEl.classList.add('hidden');
        successEl.classList.remove('hidden');

        // Check if game complete
        if (state.challengeIndex >= state.shuffledChallenges.length - 1) {
            showGameComplete();
        }
    } else {
        // Incorrect - show feedback
        feedbackEl.textContent = '❌ Incorrect! Try again. Hint: Use the simulator with ' + challenge.faces + ' faces in Decode mode.';
        feedbackEl.classList.remove('hidden');
        feedbackEl.classList.add('incorrect');
    }
}

function nextChallenge() {
    state.challengeIndex++;
    if (state.challengeIndex >= state.shuffledChallenges.length) {
        showGameComplete();
    } else {
        loadCurrentChallenge();
    }
}

function showGameComplete() {
    state.gameCompleted = true;
    const successEl = document.getElementById('challenge-success');
    const completeEl = document.getElementById('game-complete');
    const finalScoreEl = document.getElementById('final-score');
    const finalTotalEl = document.getElementById('final-total');

    if (successEl) successEl.classList.add('hidden');
    if (completeEl) completeEl.classList.remove('hidden');
    if (finalScoreEl) finalScoreEl.textContent = state.challengeScore;
    if (finalTotalEl) finalTotalEl.textContent = state.shuffledChallenges.length;
}

function resetChallengeGame() {
    initChallengeGame();
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

    // Inner border
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, 720, 520);

    // Text
    ctx.font = '36px serif';
    ctx.fillStyle = '#d4af37';
    ctx.textAlign = 'center';
    ctx.fillText('CERTIFICATE OF MASTERY', 400, 100);

    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#e0e0e0';
    ctx.fillText('This certifies that the student has successfully', 400, 180);
    ctx.fillText('mastered the Spartan Scytale Cipher.', 400, 215);

    // Score
    ctx.font = '28px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(`Score: ${state.challengeScore}/${state.shuffledChallenges.length}`, 400, 300);

    // Trophy emoji area
    ctx.font = '60px sans-serif';
    ctx.fillText('🏆', 400, 400);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Date: ' + new Date().toLocaleDateString(), 400, 500);
    ctx.fillText('Scytale Cipher Simulation', 400, 530);

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
        rowDiv.dataset.face = f + 1;

        const rowData = grid[f] || [];
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
