let playerQueue = [];
let currentPlayer = null;
let displaySocket = null;
const playerActivity = new Map();

function addToQueue(playerId) {
    if (!playerQueue.includes(playerId)) {
        playerQueue.push(playerId);
        playerActivity.set(playerId, Date.now());
        return true;
    }
    return false;
}

function updateActivity(playerId) {
    if (playerQueue.includes(playerId) || playerId === currentPlayer) {
        playerActivity.set(playerId, Date.now());
    }
}

function cleanupInactivePlayers() {
    const now = Date.now();
    const inactiveThreshold = 60000; // 60 seconds
    
    // Check current player
    if (currentPlayer && now - playerActivity.get(currentPlayer) > inactiveThreshold) {
        removePlayer(currentPlayer);
    }
    
    // Check queued players
    playerQueue = playerQueue.filter(playerId => {
        if (now - playerActivity.get(playerId) > inactiveThreshold) {
            playerActivity.delete(playerId);
            return false;
        }
        return true;
    });
}

function removeFromQueue(playerId) {
    const queueIndex = playerQueue.indexOf(playerId);
    if (queueIndex > -1) {
        playerQueue.splice(queueIndex, 1);
        return true;
    }
    return false;
}

function removePlayer(playerId) {
    // Remove from queue if present
    removeFromQueue(playerId);
    
    // If it's the current player, end their game
    if (playerId === currentPlayer) {
        currentPlayer = null;
        return true;
    }
    
    return false;
}

function getQueueStatus(playerId) {
    if (playerId === currentPlayer) {
        return {
            position: 0,
            total: playerQueue.length,
            isPlaying: true
        };
    }

    const position = playerQueue.indexOf(playerId);
    if (position === -1) {
        return null;
    }

    return {
        position: position + 1,
        total: playerQueue.length,
        isPlaying: false
    };
}

function getNextPlayer() {
    if (!currentPlayer && playerQueue.length > 0) {
        currentPlayer = playerQueue.shift();
        return currentPlayer;
    }
    return null;
}

function setDisplaySocket(socket) {
    displaySocket = socket;
}

function getDisplaySocket() {
    return displaySocket;
}

function getCurrentPlayer() {
    return currentPlayer;
}

function clearCurrentPlayer() {
    currentPlayer = null;
}

function getQueueLength() {
    return playerQueue.length;
}

function getAllQueueStatuses() {
    const statuses = [];
    
    // Add current player status if exists
    if (currentPlayer) {
        statuses.push({
            playerId: currentPlayer,
            status: getQueueStatus(currentPlayer)
        });
    }
    
    // Add status for each player in queue
    playerQueue.forEach(playerId => {
        statuses.push({
            playerId,
            status: getQueueStatus(playerId)
        });
    });
    
    return statuses;
}

// Start cleanup interval
setInterval(cleanupInactivePlayers, 30000); // Check every 30 seconds

export {
    addToQueue,
    removeFromQueue,
    removePlayer,
    getQueueStatus,
    getNextPlayer,
    setDisplaySocket,
    getDisplaySocket,
    getCurrentPlayer,
    clearCurrentPlayer,
    getQueueLength,
    getAllQueueStatuses,
    updateActivity,
    cleanupInactivePlayers
};
