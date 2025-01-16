let playerQueue = [];
let currentPlayer = null;
let displaySocket = null;

function addToQueue(playerId) {
    if (!playerQueue.includes(playerId)) {
        playerQueue.push(playerId);
        return true;
    }
    return false;
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
    getAllQueueStatuses
};
