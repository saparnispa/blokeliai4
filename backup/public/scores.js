document.addEventListener('DOMContentLoaded', () => {
    const socket = io({
        transports: ['websocket'],
        upgrade: false,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        forceNew: true
    });
    
    // Elements for each game's queue count
    const queueCounts = {
        1: document.getElementById('queue-count1'),
        2: document.getElementById('queue-count2'),
        3: document.getElementById('queue-count3'),
        4: document.getElementById('queue-count4')
    };

    const scoresBody = document.getElementById('scores-body');
    const totalPlayersElement = document.getElementById('total-players');
    let isUpdating = false;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 5000; // 5 seconds
    let updateTimeout = null;

    // Update queue counts
    socket.on('queueUpdate', (queues) => {
        Object.keys(queues).forEach(gameId => {
            if (queueCounts[gameId]) {
                queueCounts[gameId].textContent = queues[gameId];
            }
        });
    });

    // Show loading state
    function showLoading() {
        scoresBody.innerHTML = '<tr><td colspan="5" class="text-center">Kraunami rezultatai...</td></tr>';
    }

    // Show error state
    function showError(message) {
        scoresBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${message}</td></tr>`;
    }

    // Update high scores with retry mechanism
    async function updateHighScores(isRetry = false) {
        if (isUpdating) return;
        isUpdating = true;

        if (!isRetry) {
            showLoading();
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

            const response = await fetch('/api/scores', {
                signal: controller.signal,
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const scores = await response.json();
            
            if (!Array.isArray(scores)) {
                throw new Error('Invalid scores data received');
            }

            // Reset retry count on successful fetch
            retryCount = 0;

            // Clear scores table
            scoresBody.innerHTML = '';

            // Update total unique players count
            const uniquePlayers = new Set(scores.map(score => score.player)).size;
            if (totalPlayersElement) {
                totalPlayersElement.textContent = uniquePlayers;
            }

            // Add all scores to the table
            scores.forEach((score, index) => {
                const row = document.createElement('tr');
                const date = new Date(score.date).toLocaleDateString('lt-LT', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${score.player || 'Unknown'}</td>
                    <td>${score.score || 0}</td>
                    <td>Žaidimas #${score.gameId || '?'}</td>
                    <td>${date}</td>
                `;
                
                // Add special class for top 3 scores
                if (index < 3) {
                    row.classList.add(`top-${index + 1}`);
                }
                
                scoresBody.appendChild(row);
            });

            // Schedule next update
            scheduleNextUpdate();
        } catch (error) {
            if (error.name === 'AbortError') {
                showError('Užklausa užtruko per ilgai. Bandoma iš naujo...');
                retryCount++;
            } else if (retryCount < MAX_RETRIES) {
                retryCount++;
                showError(`Klaida gaunant rezultatus. Bandoma iš naujo (${retryCount}/${MAX_RETRIES})...`);
            } else {
                showError('Nepavyko gauti rezultatų. Pabandykite atnaujinti puslapį.');
                scheduleNextUpdate(30000); // Try again in 30 seconds
                isUpdating = false;
                return;
            }
            
            // Retry after delay
            setTimeout(() => {
                isUpdating = false;
                updateHighScores(true);
            }, RETRY_DELAY);
            return;
        }
        
        isUpdating = false;
    }

    function scheduleNextUpdate(delay = 60000) {
        if (updateTimeout) {
            clearTimeout(updateTimeout);
        }
        updateTimeout = setTimeout(() => {
            retryCount = 0;
            updateHighScores();
        }, delay);
    }

    // Socket events
    socket.on('updateHighScores', () => {
        retryCount = 0;
        updateHighScores();
    });

    // Initial load
    updateHighScores();

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        if (updateTimeout) {
            clearTimeout(updateTimeout);
        }
        socket.disconnect();
    });

    // Connection status handling
    let reconnectAttempt = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;

    socket.on('connect', () => {
        reconnectAttempt = 0;
        retryCount = 0;
        updateHighScores();
    });

    socket.on('disconnect', () => {
        showError('Prarastas ryšys su serveriu. Bandoma prisijungti iš naujo...');
    });

    socket.on('connect_error', (error) => {
        reconnectAttempt++;
        if (reconnectAttempt <= MAX_RECONNECT_ATTEMPTS) {
            showError(`Nepavyko prisijungti prie serverio. Bandymas ${reconnectAttempt}/${MAX_RECONNECT_ATTEMPTS}...`);
            // Force a new connection attempt
            socket.disconnect();
            setTimeout(() => {
                socket.connect();
            }, 1000);
        } else {
            showError('Nepavyko prisijungti prie serverio. Pabandykite atnaujinti puslapį.');
            socket.disconnect();
        }
    });

    // Handle errors
    socket.on('error', (error) => {
        showError('Įvyko klaida. Bandoma atkurti ryšį...');
        socket.disconnect();
        setTimeout(() => {
            socket.connect();
        }, 1000);
    });

    // Ping to keep connection alive
    setInterval(() => {
        if (socket.connected) {
            socket.emit('ping');
        }
    }, 25000);
});
