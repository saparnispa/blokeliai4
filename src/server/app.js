
import express from 'express';
import path from 'path';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { exec } from 'child_process';
import { loadScores } from './game/scores.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Port configuration for deployment
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, '..', '..', 'public')));
app.use(compression());

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'index.html'));
});

app.get('/play', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'controls.html'));
});

app.get('/scores', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'scores.html'));
});

app.get('/api/scores', async (req, res) => {
    try {
        const scores = await loadScores();
        res.json(scores);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load scores' });
    }
});

// Check if port is in use
async function checkPort(port) {
    return new Promise((resolve) => {
        exec(`lsof -i :${port}`, (err, stdout) => {
            resolve(stdout ? stdout.split('\n').filter(Boolean) : []);
        });
    });
}

// Kill process using port
async function killPort(port) {
    return new Promise((resolve) => {
        // Use a more forceful kill command
        exec(`lsof -t -i :${port} | xargs kill -9`, async (err) => {
            if (err) {
                console.log('No processes to kill');
                resolve();
                return;
            }
            console.log(`Killed processes on port ${port}`);
            
            // Wait longer to ensure port is released
            setTimeout(resolve, 2000);
        });
    });
}

// Wait for port to be free
async function waitForPort(port, retries = 5) {
    for (let i = 0; i < retries; i++) {
        const processes = await checkPort(port);
        if (processes.length === 0) {
            return true;
        }
        console.log(`Port ${port} still in use, retrying... (${i + 1}/${retries})`);
        await killPort(port);
        // Wait between retries
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    return false;
}

// Initialize app
async function initializeApp() {
    console.log(`Checking if port ${PORT} is in use...`);
    const portFree = await waitForPort(PORT);
    if (!portFree) {
        throw new Error(`Could not free port ${PORT} after multiple attempts`);
    }
    console.log(`Port ${PORT} is ready`);
}

export { app, PORT, initializeApp };
