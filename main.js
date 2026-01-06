
import './style.css'

// State
const state = {
    message: '',
    faces: 4,
    mode: 'encode', // 'encode' or 'decode'
    rotation: 0
};

// Elements
const cylinder = document.getElementById('cylinder');
const messageInput = document.getElementById('message-input');
const diameterSlider = document.getElementById('diameter-slider');
const diameterValue = document.getElementById('diameter-value');
const resultOutput = document.getElementById('result-output');
const btnEncode = document.getElementById('mode-encode');
const btnDecode = document.getElementById('mode-decode');

const btnLearn = document.getElementById('btn-learn');
const modalLearn = document.getElementById('modal-learn');
const btnChallenge = document.getElementById('btn-challenge');
const modalChallenge = document.getElementById('modal-challenge');
const closeModals = document.querySelectorAll('.close-modal');

// Init
function init() {
    bindEvents();
    renderCylinder();
    updateLogic(); // Initial calculation
}

function bindEvents() {
    // Navigation
    btnLearn.addEventListener('click', () => modalLearn.classList.remove('hidden'));
    btnChallenge.addEventListener('click', () => modalChallenge.classList.remove('hidden'));
    closeModals.forEach(btn => btn.addEventListener('click', (e) => {
        e.target.closest('.modal').classList.add('hidden');
    }));

    // Controls
    messageInput.addEventListener('input', (e) => {
        state.message = e.target.value;
        updateLogic();
    });

    diameterSlider.addEventListener('input', (e) => {
        state.faces = parseInt(e.target.value);
        diameterValue.textContent = state.faces;
        renderCylinder();
        updateLogic();
    });

    btnEncode.addEventListener('click', () => setMode('encode'));
    btnDecode.addEventListener('click', () => setMode('decode'));

    // Drag to rotate
    let isDragging = false;
    let startX = 0;
    let startRotation = 0;

    const container = document.querySelector('.scytale-container');

    container.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startRotation = state.rotation;
        container.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const delta = e.clientX - startX;
        state.rotation = startRotation + (delta * 0.5);
        updateRotation();
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        container.style.cursor = 'grab';
    });

    // Challenge
    document.getElementById('btn-submit-challenge').addEventListener('click', checkChallenge);
    document.getElementById('btn-download-cert').addEventListener('click', downloadCertificate);
}

function setMode(mode) {
    state.mode = mode;
    btnEncode.classList.toggle('active', mode === 'encode');
    btnDecode.classList.toggle('active', mode === 'decode');
    updateLogic();
}

const FACE_WIDTH = 50; // px

function renderCylinder() {
    // Limit rotation to avoid jumpiness? No, it's fine.

    cylinder.innerHTML = '';
    const n = state.faces;
    const angle = 360 / n;
    // Calculate radius (apothem)
    // Side = 2 * r * tan(PI/n) => r = Side / (2 * tan(PI/n))
    const rad = (FACE_WIDTH / 2) / Math.tan(Math.PI / n);

    for (let i = 0; i < n; i++) {
        const face = document.createElement('div');
        face.className = 'face';
        face.style.width = `${FACE_WIDTH}px`;
        face.style.transform = `rotateY(${i * angle}deg) translateZ(${rad}px)`;
        face.id = `face-${i}`;
        cylinder.appendChild(face);
    }
}

function updateRotation() {
    cylinder.style.transform = `rotateY(${state.rotation}deg)`;
}

function updateLogic() {
    const msg = state.message.replace(/[\r\n]+/g, ''); // Remove newlines
    const n = state.faces;
    let output = '';

    // Clear faces
    document.querySelectorAll('.face').forEach(f => f.innerHTML = '');

    if (state.mode === 'encode') {
        // Write across rows (faces), Read down columns
        // We visualize: Text written horizontally across the rod's "unrolled" surface?
        // Actually, on the rod, the text appears in a spiral.
        // Let's visualize the "input" on the rod.
        // If INPUT is "HELLO", and we are encoding.
        // We place H on face 0, E on face 1...
        // Visually: Face `i` gets char `k` if `k % n === i`.
        // Wait, row-major vs column-major.
        // Encode: Standard transpostion.
        // Input written ROW by ROW.
        // So "HELLO" (5 chars). Faces=2.
        // Row 0: H E
        // Row 1: L L
        // Row 2: O
        // On the rod:
        // Face 0 (First "column" of the unrolled sheet? No.)
        // Let's map "Grid" to "Faces".
        // Vertical columns on the virtual paper = Faces on the rod?
        // Usually, the strip is ONE line.
        // Wrapping it creates rows.
        // So if I have a strip "H L O" (Face 0), "E L" (Face 1).
        // The message is "HELLO"? No.
        // If I write "HELLO", I write H, then E, then L on the rod.
        // This physically places them on adjacent faces.
        // So Face 0 has H. Face 1 has E. Face 2 has L...
        // When we finish a full turn (N faces), we are back at Face 0, but "one line down" (if holding rod vertically) or "one unit to right" (horiz).
        // Let's assume vertical rod, text written top-down.
        // Face 0: H, then (wrapping around)... next char on Face 0 is 'L' (if diameter=2, H E L L O => H(0), E(1), L(0), L(1), O(0)).
        // Yes.
        // Face 0 has chars at indices: 0, 0+n, 0+2n...
        // Face 1 has chars at: 1, 1+n, 1+2n...

        // Visualization: Populate faces.
        for (let i = 0; i < msg.length; i++) {
            const faceIndex = i % n;
            const char = msg[i];
            addCharToFace(faceIndex, char);
        }

        // Output: Read each face sequentially.
        // Face 0's content + Face 1's content ...
        for (let f = 0; f < n; f++) {
            const faceContent = getFaceContent(f, msg, n);
            output += faceContent;
        }

    } else {
        // Decode
        // Input is the Scrambled text.
        // We want to reconstruct the original "Across" write.
        // We fill the faces such that reading across gives the meaningful message.
        // BUT the user puts in the scrambled message.
        // Visualization: We want to show the letters on the rod such that they reveal the message?
        // Or do we show the scrambled message on the rod?
        // If we wrap the strip (message), it aligns to form the message.
        // "Scrambled Message" = The Strip.
        // So we just wrap the message around the rod.
        // Input: "HLOEL" (from previous example). 
        // We wrap it: H goes to Face 0. L goes to Face 1? NO.
        // The strip wraps helically. 
        // H is at pos 0 on strip. L is at pos 1 on strip.
        // If we wrap it, H is at Face 0. L is at Face 1. O is at Face 2...
        // Visual: Just wrap the input string around the faces.
        // FaceIndex = i % n.
        // Output: Read ACROSS the rod.
        // i.e. Read Row 0 (Face 0 ch 0, Face 1 ch 0...), then Row 1.

        for (let i = 0; i < msg.length; i++) {
            const faceIndex = i % n;
            const char = msg[i];
            addCharToFace(faceIndex, char);
        }

        // To generate output, we read "Ring by Ring".
        // 1st ring: chars at indices 0, 1, ... n-1 (which are Face 0 ch 0, Face 1 ch 0...)
        // Wait. My logic for 'Encode' placed H on Face 0, E on Face 1.
        // That means the Input "HELLO" was written *around* the rod.
        // And the "Output" was reading the strip (Face 0 vertical, then Face 1 vertical).
        // So 'Decode' operation:
        // User inputs the 'Strip' content (Output of Encode).
        // We wrap it?
        // If input is "HLOEL" (Strip content).
        // And we wrap it purely sequentially?
        // H -> Face 0. L -> Face 1. O -> Face 0 (wrap). E -> Face 1. L -> Face 0.
        // This results in Face 0: H O L. Face 1: L E.
        // Read across: H L (row 0), O E (row 1), L (row 2). -> HLOEL? No.
        // Decode implies we want to GET "HELLO".
        // How do we put "HLOEL" onto the rod so it reads "HELLO"?
        // The strip contained: H, L, O (from Face 0), E, L (from Face 1).
        // So we need to put the first chunk on Face 0.
        // Chunk size = Ceil(L / n).
        // Let k = Ceil(L/n).
        // Face 0 gets msg[0..k-1].
        // Face 1 gets msg[k..2k-1].

        // Visual:
        const rows = Math.ceil(msg.length / n);
        // Be careful with uneven rows.
        // Standard scytale often assumes filled rectangle, but let's handle partial.
        // If len=5, n=2. Rows=3.
        // Cols (Faces) filled:
        // Face 0 gets 3 chars (indices 0, 2, 4 of original "HELLO", which are H, L, O).
        // Face 1 gets 2 chars (indices 1, 3 of original "HELLO", which are E, L).
        // So Input string "HLOEL" has H,L,O first, then E,L.
        // We place Input[0..2] to Face 0. Input[3..4] to Face 1.

        let pointer = 0;
        for (let f = 0; f < n; f++) {
            // How many chars in this face?
            // Total Length L.
            // Faces 0 to (L % n - 1) have Floor(L/n) + 1 chars.
            // Remaining faces have Floor(L/n) chars.
            const baseLen = Math.floor(msg.length / n);
            const remainder = msg.length % n;
            const faceLen = (f < remainder || remainder === 0) ? baseLen + (remainder === 0 ? 0 : 1) : baseLen;
            // Wait, standard transposition might fill top rows vs full columns.
            // If we Encoded by reading Face 0 then Face 1...
            // Face 0 had H(0), L(2), O(4). (Indices of original).
            // Face 1 had E(1), L(3).
            // So yes, Face 0 has 3 chars. Face 1 has 2.
            // This matches logic: Remainder 1 (5%2). Face 0 gets +1.

            // But wait. "H L O" came from H(0), L(2), O(4).
            // Wait, 0, 0+2, 0+4.
            // Face 1: 1, 3.
            // Correct.

            for (let j = 0; j < faceLen; j++) {
                if (pointer < msg.length) {
                    addCharToFace(f, msg[pointer]);
                    pointer++;
                }
            }
        }

        // Now Read Across to get output
        // Read Face0[0], Face1[0]... FaceN[0]
        // Then Face0[1]...
        let decoded = '';
        const maxRows = Math.ceil(msg.length / n);
        for (let r = 0; r < maxRows; r++) {
            for (let f = 0; f < n; f++) {
                const faceDiv = document.getElementById(`face-${f}`);
                if (faceDiv && faceDiv.children[r]) {
                    decoded += faceDiv.children[r].textContent;
                }
            }
        }
        output = decoded;
    }

    resultOutput.textContent = output;
    checkChallenge(false); // Check silently?
}

function addCharToFace(faceIdx, char) {
    const f = document.getElementById(`face-${faceIdx}`);
    const div = document.createElement('div');
    div.className = 'face-letter';
    div.textContent = char;
    f.appendChild(div);
}

function getFaceContent(faceIdx, fullMsg, n) {
    // Logic helper if needed, but we already have DOM content.
    // Let's reconstruct from logic to be safe or read DOM.
    // Read DOM is easier since we just filled it.
    const f = document.getElementById(`face-${faceIdx}`);
    return Array.from(f.children).map(c => c.textContent).join('');
}


// Challenge Logic
// Challenge: "SCYTALE_IS_COOL" (15 chars). Faces: 3.
// Encoded:
// Face0: S (0), T (3), E (6), S (9), O (12). -> STESO
// Face1: C (1), A (4), _ (7), _ (10), O (13). -> CA__O
// Face2: Y (2), L (5), I (8), C (11), L (14). -> YLICL
// Ciphertext: "STESOCA__OYLICL"
const CHALLENGE_ENC = "STESOCA__OYLICL";
const CHALLENGE_KEY = 3;
const CHALLENGE_ANSWER = "SCYTALE_IS_COOL";

document.querySelector('.challenge-code').textContent = CHALLENGE_ENC;
document.getElementById('challenge-hint-faces').textContent = CHALLENGE_KEY;

function checkChallenge(isSubmit) {
    const val = document.getElementById('challenge-input').value.trim().toUpperCase();
    // Allow spaces or underscores
    const cleanVal = val.replace(/\s/g, '_');

    if (isSubmit && isEvent) {
        // 'isEvent' is redundant, assume click listener passes event object
    }

    // Actually, this function is called by event listener.
    // If 'isSubmit' is event, it's true-ish.
}

document.getElementById('btn-submit-challenge').onclick = () => {
    const val = document.getElementById('challenge-input').value.toUpperCase().replace(/\s/g, '_');
    if (val === CHALLENGE_ANSWER) {
        document.getElementById('challenge-success').classList.remove('hidden');
    } else {
        alert('Incorrect! Try setting the rod faces to ' + CHALLENGE_KEY + ' and decoding.');
    }
};

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
    ctx.font = '40px Cinzel';
    ctx.fillStyle = '#d4af37';
    ctx.textAlign = 'center';
    ctx.fillText('CERTIFICATE OF MASTERY', 400, 100);

    ctx.font = '20px Outfit';
    ctx.fillStyle = '#e0e0e0';
    ctx.fillText('This certifies that the student has successfully', 400, 200);
    ctx.fillText('cracked the Spartan Scytale Cipher.', 400, 240);

    ctx.font = '30px Courier New';
    ctx.fillStyle = '#fff';
    ctx.fillText(CHALLENGE_ANSWER, 400, 350);

    ctx.font = '16px Outfit';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Date: ' + new Date().toLocaleDateString(), 400, 500);

    const link = document.createElement('a');
    link.download = 'scytale_certificate.png';
    link.href = canvas.toDataURL();
    link.click();
}


updateRotation(); // Visual init
init();

