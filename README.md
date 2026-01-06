
# Scytale Cipher Simulation

An interactive educational tool for 9th grade Cryptography classes.
Simulates the Ancient Spartan Scytale cipher with a 3D visualizer.

## Features
- **Interactive Scytale Stick**: Adjust diameter (faces) and drag to rotate.
- **Encode / Decode Modes**: Real-time visualization of the wrapping process.
- **Challenge Mode**: A built-in puzzle for students to solve (decrypting a message) to earn a certificate.
- **Certificate**: Downloadable result for grading.

## How to Run Locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
3. Open the URL provided (usually `http://localhost:5173`).

## How to Deploy to GitHub Pages
1. Build the project:
   ```bash
   npm run build
   ```
2. This creates a `dist` folder.
3. Commit everything to your GitHub repository.
4. **Option A (Manual)**: Run a deployment command if you have `gh-pages` package set up (not included by default to keep it simple).
   
   **Option B (Easy)**:
   - Go to your GitHub Repository Settings.
   - Go to **Pages**.
   - Select the Source as **GitHub Actions** (if using a workflow) OR simply build locally and upload the contents of `dist` to a `gh-pages` branch.
   
   **Recommended for this setup**:
   - Push your code to GitHub.
   - In GitHub Repositories, go to Settings > Pages.
   - Choose "Deploy from branch".
   - Select `main` (or `master`) branch and `/` folder IF you haven't built it? No, raw source won't work without build.
   
   **Better approach**:
   - Push the `dist` folder contents (force add if ignored) to a `gh-pages` branch.
   
   Or, since this is a simple Vite app, configure GitHub Actions to build and deploy.

## Student Instructions
1. Open the simulation.
2. Click "How it Works" to learn.
3. Use the "Challenge Mode" button to access the assignment.
4. Solve the cipher "STESOCA__OYLICL" using the hint (3 faces).
5. Enter the decoded message ("SCYTALE_IS_COOL") to download your completion certificate.
