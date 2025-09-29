// Overlay-only TikTok Live Analytics
let backendUrl = location.protocol === 'file:' ? "https://tiktok-chat-reader.zerody.one/" : undefined;

// Create a completely separate connection instance for overlay
let overlayConnection = new TikTokIOConnection(backendUrl);

// Prevent global connection variable conflicts
window.connection = null; // Ensure no global connection is used

// Unique identifier for this overlay instance
const overlayInstanceId = 'overlay_' + Date.now() + '_' + Math.random();

// Prevent double initialization
let isInitialized = false;

// Event processing tracker to prevent duplicates
const processedEvents = new Set();

// Counter
let viewerCount = 0; // Start with 0, update with real data
let likeCount = 0;
let diamondsCount = 0; // Diamonds start at 0 since they accumulate from gifts
let followerCount = 0; // Track total followers from the live
let shareCount = 0; // Track total shares from the live
let hasReceivedInitialData = false; // Track if we've received any real data

// Font scaling
let fontScale = parseFloat(localStorage.getItem('overlayFontScale')) || 1;
const minFontScale = 0.6;
const maxFontScale = 2.0;
const fontScaleStep = 0.1;

// Track users who have already liked to avoid duplicates
const usersWhoLiked = new Set();

// Mark this as overlay context to prevent conflicts
window.isOverlayContext = true;

// Auto-connect if username is provided - with global protection
$(document).ready(() => {
    console.log('Overlay script loaded, instance ID:', overlayInstanceId);
    
    // Global flag to prevent multiple initializations across all scripts
    if (window.overlayInitialized) {
        console.log('Overlay already initialized, skipping');
        return;
    }
    window.overlayInitialized = true;

    // Apply saved font scale on load
    updateFontScale();

    // Set up font control buttons
    $('#increaseFont').on('click', () => {
        if (fontScale < maxFontScale) {
            fontScale = Math.min(maxFontScale, fontScale + fontScaleStep);
            updateFontScale();
        }
    });

    $('#decreaseFont').on('click', () => {
        if (fontScale > minFontScale) {
            fontScale = Math.max(minFontScale, fontScale - fontScaleStep);
            updateFontScale();
        }
    });

    if (!isInitialized && window.settings && window.settings.username) {
        console.log('Auto-connecting to:', window.settings.username);
        initializeConnection();
        connect();
    }
});

function initializeConnection() {
    if (isInitialized) {
        console.log('Connection already initialized, skipping');
        return;
    }
    console.log('Initializing overlay connection...');
    isInitialized = true;

    // Clear any existing listeners to prevent duplication
    if (overlayConnection && overlayConnection.socket) {
        overlayConnection.socket.removeAllListeners('roomUser');
        overlayConnection.socket.removeAllListeners('like');
        overlayConnection.socket.removeAllListeners('member');
        overlayConnection.socket.removeAllListeners('chat');
        overlayConnection.socket.removeAllListeners('gift');
        overlayConnection.socket.removeAllListeners('social');
        overlayConnection.socket.removeAllListeners('streamEnd');
    }

    // Event handlers - only set up once
    overlayConnection.on('roomUser', (msg) => {
        if (typeof msg.viewerCount === 'number') {
            viewerCount = msg.viewerCount;
            hasReceivedInitialData = true;
            updateRoomStats();
        }
    });

    overlayConnection.on('like', (msg) => {
        if (typeof msg.totalLikeCount === 'number') {
            likeCount = msg.totalLikeCount;
            hasReceivedInitialData = true;
            updateRoomStats();
        }

        // Only show like message once per user, regardless of like count
        if (msg.userId && msg.likeCount > 0) {
            if (usersWhoLiked.has(msg.userId)) {
                // User already liked, don't show message again
                return;
            }
            
            // Add user to the set of users who have liked
            usersWhoLiked.add(msg.userId);
            
            // Create unique event ID to prevent duplicates
            const eventId = `like_${msg.userId}_${msg.timestamp || Date.now()}`;
            
            if (processedEvents.has(eventId)) {
                console.log('Duplicate like event prevented:', eventId);
                return;
            }
            
            processedEvents.add(eventId);
            
            // Clean up old events (keep only last 100)
            if (processedEvents.size > 100) {
                const eventsArray = Array.from(processedEvents);
                eventsArray.slice(0, 50).forEach(id => processedEvents.delete(id));
            }
            
            addChatItem('#fe2c55', msg, `liked the live`);
        }
    });

    let joinMsgDelay = 0;
    overlayConnection.on('member', (msg) => {
        // Create unique event ID to prevent duplicates
        const eventId = `member_${msg.userId}_${msg.timestamp || Date.now()}`;
        
        if (processedEvents.has(eventId)) {
            console.log('Duplicate member join event prevented:', eventId);
            return;
        }
        
        processedEvents.add(eventId);
        
        // Clean up old events (keep only last 100)
        if (processedEvents.size > 100) {
            const eventsArray = Array.from(processedEvents);
            eventsArray.slice(0, 50).forEach(id => processedEvents.delete(id));
        }
        
        let addDelay = 250;
        if (joinMsgDelay > 500) addDelay = 100;
        if (joinMsgDelay > 1000) addDelay = 0;

        joinMsgDelay += addDelay;

        setTimeout(() => {
            joinMsgDelay -= addDelay;
            addChatItem('#00d4aa', msg, 'joined', true);
        }, joinMsgDelay);
    });

    overlayConnection.on('chat', (msg) => {
        // Create unique event ID to prevent duplicates
        const eventId = `chat_${msg.userId}_${msg.timestamp || Date.now()}_${msg.comment}`;
        
        if (processedEvents.has(eventId)) {
            console.log('Duplicate chat event prevented:', eventId);
            return;
        }
        
        processedEvents.add(eventId);
        
        // Clean up old events (keep only last 100)
        if (processedEvents.size > 100) {
            const eventsArray = Array.from(processedEvents);
            eventsArray.slice(0, 50).forEach(id => processedEvents.delete(id));
        }
        
        addChatItem('', msg, msg.comment);
    });

    overlayConnection.on('gift', (data) => {
        // Create unique event ID to prevent duplicates
        const eventId = `gift_${data.userId}_${data.timestamp || Date.now()}_${data.giftId}_${data.repeatCount}`;
        
        if (processedEvents.has(eventId)) {
            console.log('Duplicate gift event prevented:', eventId);
            return;
        }
        
        processedEvents.add(eventId);
        
        // Clean up old events (keep only last 100)
        if (processedEvents.size > 100) {
            const eventsArray = Array.from(processedEvents);
            eventsArray.slice(0, 50).forEach(id => processedEvents.delete(id));
        }
        
        if (!isPendingStreak(data) && data.diamondCount > 0) {
            diamondsCount += (data.diamondCount * data.repeatCount);
            updateRoomStats();
        }

        addGiftItem(data);
    });

    overlayConnection.on('social', (data) => {
        // Create unique event ID to prevent duplicates
        const eventId = `social_${data.userId}_${data.timestamp || Date.now()}_${data.displayType}`;
        
        if (processedEvents.has(eventId)) {
            console.log('Duplicate social event prevented:', eventId);
            return;
        }
        
        processedEvents.add(eventId);
        
        // Clean up old events (keep only last 100)
        if (processedEvents.size > 100) {
            const eventsArray = Array.from(processedEvents);
            eventsArray.slice(0, 50).forEach(id => processedEvents.delete(id));
        }
        
        // Track followers and shares
        if (data.displayType && data.displayType.includes('follow')) {
            followerCount++;
            updateRoomStats();
        } else if (data.displayType && data.displayType.includes('share')) {
            shareCount++;
            updateRoomStats();
        }
        
        let color = data.displayType.includes('follow') ? '#fe2c55' : '#00d4aa';
        addChatItem(color, data, data.label.replace('{0:user}', ''));
    });

    overlayConnection.on('streamEnd', () => {
        $('#stateText').text('Stream ended.');
        $('.status-dot').removeClass('connecting connected');

        // Auto-reconnect if username is set
        if (window.settings && window.settings.username) {
            setTimeout(() => {
                connect();
            }, 30000);
        }
    });
}

function connect() {
    // Initialize connection handlers if not already done
    if (!isInitialized) {
        initializeConnection();
    }

    let uniqueId = window.settings && window.settings.username ? window.settings.username : null;
    
    if (!uniqueId) {
        $('#stateText').text('No username provided');
        return;
    }

    $('#stateText').text('Connecting...');
    $('.status-dot').addClass('connecting').removeClass('connected');

    overlayConnection.connect(uniqueId, {
        enableExtendedGiftInfo: true
    }).then(state => {
        $('#stateText').text(`Connected to @${uniqueId}`);
        $('.status-dot').removeClass('connecting').addClass('connected');
        $('.empty-message').hide();

        // Reset only diamonds (they accumulate from gifts)
        diamondsCount = 0;
        followerCount = 0;
        shareCount = 0;
        hasReceivedInitialData = false;
        usersWhoLiked.clear(); // Clear the like tracking set for new stream
        
        // Show current stats immediately
        updateRoomStats();
        
        // Request initial room data by simulating a small delay
        // This helps ensure we get the first roomUser/like events
        setTimeout(() => {
            if (!hasReceivedInitialData) {
                console.log('No initial data received yet, keeping current display');
            }
        }, 3000);

    }).catch(errorMessage => {
        let displayMessage = errorMessage;
        
        if (typeof errorMessage === 'string') {
            if (errorMessage.includes('status') || errorMessage.includes('Failed to connect')) {
                displayMessage = 'User not live or incorrect username';
            } else if (errorMessage.includes('timeout')) {
                displayMessage = 'Connection timeout';
            } else if (errorMessage.includes('LIVE has ended')) {
                displayMessage = 'Stream ended';
            }
        }
        
        $('#stateText').text(displayMessage);
        $('.status-dot').removeClass('connecting connected');

        // Retry connection every 30 seconds for auto-connected streams
        if (window.settings && window.settings.username) {
            setTimeout(() => {
                connect();
            }, 30000);
        }
    });
}

function sanitize(text) {
    return text.replace(/</g, '&lt;');
}

function updateRoomStats() {
    $('#viewerCount').text(viewerCount.toLocaleString());
    $('#likeCount').text(likeCount.toLocaleString());
    $('#followerCount').text(followerCount.toLocaleString());
    $('#shareCount').text(shareCount.toLocaleString());
    $('#diamondCount').text(diamondsCount.toLocaleString());
}

function updateFontScale() {
    document.documentElement.style.setProperty('--font-scale', fontScale);
    localStorage.setItem('overlayFontScale', fontScale.toString());
    console.log('Font scale updated to:', fontScale);
}

function generateUsernameLink(data) {
    // Use nickname (display name) if available, otherwise fall back to uniqueId (username)
    const displayName = data.nickname || data.displayName || data.uniqueId;
    return `<a class="username" href="https://www.tiktok.com/@${data.uniqueId}" target="_blank">${displayName}</a>`;
}

function isPendingStreak(data) {
    return data.giftType === 1 && !data.repeatEnd;
}

/**
 * Add a new event to the overlay
 */
function addChatItem(color, data, text, summarize) {
    let container = $('.eventcontainer');

    // Hide empty message when first event arrives
    container.find('.empty-message').hide();

    // Keep only recent events (100 max)
    if (container.find('.event-item').length > 100) {
        container.find('.event-item').slice(0, 50).remove();
    }

    // Remove temporary events
    container.find('.temporary').remove();

    const timestamp = new Date().toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    const messageClass = summarize ? 'temporary' : 'static';
    let eventClass = 'event-item';
    
    // Add specific classes for different event types
    if (text.includes('liked')) eventClass += ' like';
    if (text.includes('joined')) eventClass += ' join';
    if (text.includes('followed')) eventClass += ' follow';

    const textColor = color ? `color: ${color}` : '';
    // Use nickname (display name) if available, otherwise fall back to uniqueId (username)
    const displayName = data.nickname || data.displayName || data.uniqueId;

    container.append(`
        <div class="${eventClass} ${messageClass}">
            <div class="event-header">
                <img class="miniprofilepicture" src="${data.profilePictureUrl}" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMTAiIGZpbGw9IiMzNzM3MzciLz4KPGNpcmNsZSBjeD0iMTAiIGN5PSI4IiByPSIzIiBmaWxsPSIjNjY2NjY2Ii8+CjxwYXRoIGQ9Ik0xNyAxNmMwLTMuODctMy4xMy03LTctN3MtNyAzLjEzLTcgN2gxNFoiIGZpbGw9IiM2NjY2NjYiLz4KPC9zdmc+'" 
                     alt="Profile">
                <a href="https://www.tiktok.com/@${data.uniqueId}" target="_blank" class="username">${displayName}</a>
                <span class="timestamp">${timestamp}</span>
            </div>
            <div class="event-content" style="${textColor}">${sanitize(text)}</div>
        </div>
    `);

    container.stop();
    container.animate({
        scrollTop: container[0].scrollHeight
    }, 300);
}

/**
 * Add a gift event to the overlay
 */
function addGiftItem(data) {
    let container = $('.eventcontainer');

    // Hide empty message when first gift arrives
    container.find('.empty-message').hide();

    if (container.find('.event-item').length > 100) {
        container.find('.event-item').slice(0, 50).remove();
    }

    let streakId = data.userId.toString() + '_' + data.giftId;
    const timestamp = new Date().toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    const isStreaking = isPendingStreak(data);
    // Use nickname (display name) if available, otherwise fall back to uniqueId (username)
    const displayName = data.nickname || data.displayName || data.uniqueId;

    let html = `
        <div class="event-item gift ${isStreaking ? 'streaking' : ''}" data-streakid="${isStreaking ? streakId : ''}">
            <div class="event-header">
                <img class="miniprofilepicture" src="${data.profilePictureUrl}" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMTAiIGZpbGw9IiMzNzM3MzciLz4KPGNpcmNsZSBjeD0iMTAiIGN5PSI4IiByPSIzIiBmaWxsPSIjNjY2NjY2Ii8+CjxwYXRoIGQ9Ik0xNyAxNmMwLTMuODctMy4xMy03LTctN3MtNyAzLjEzLTcgN2gxNFoiIGZpbGw9IiM2NjY2NjYiLz4KPC9zdmc+'" 
                     alt="Profile">
                <a href="https://www.tiktok.com/@${data.uniqueId}" target="_blank" class="username">${displayName}</a>
                <span class="timestamp">${timestamp}</span>
            </div>
            <div class="event-content">${data.describe}</div>
            <div class="gift-details">
                <img class="gifticon" src="${data.giftPictureUrl}" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiByeD0iNCIgZmlsbD0iI2ZmOGM0MiIvPgo8cGF0aCBkPSJNMTIgMTZjMi4yMDkgMCA0LTEuNzkxIDQtNHMtMS43OTEtNC00LTQtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQiIGZpbGw9IiNmZmYiLz4KPC9zdmc+'" 
                     alt="Gift">
                <div class="gift-info">
                    <div class="gift-name">${data.giftName}</div>
                    <div class="gift-stats">
                        <span>x${data.repeatCount.toLocaleString()}</span>
                        <span>💎 ${(data.diamondCount * data.repeatCount).toLocaleString()}</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    let existingStreakItem = container.find(`[data-streakid='${streakId}']`);

    if (existingStreakItem.length) {
        existingStreakItem.replaceWith(html);
    } else {
        container.append(html);
    }

    container.stop();
    container.animate({
        scrollTop: container[0].scrollHeight
    }, 400);
}
