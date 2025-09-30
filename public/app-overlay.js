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

// TikTok earnings calculator
// TikTok takes about 50% commission, and exchange rate varies by region
// Approximate rate: 1000 diamonds ≈ $5 USD (after TikTok's cut)
const DIAMONDS_TO_USD_RATE = 0.005; // $0.005 per diamond (conservative estimate)

// Font scaling
let fontScale = parseFloat(localStorage.getItem('overlayFontScale')) || 1;
const minFontScale = 0.6;
const maxFontScale = 2.0;
const fontScaleStep = 0.1;

// Track users who have already liked to avoid duplicates
const usersWhoLiked = new Set();

// Track current viewers (who joined and are watching)
const currentViewers = new Map(); // userId -> {username, nickname, profilePic, joinTime}

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

    // Click earnings to show breakdown
    $(document).on('click', '.earnings-stat', () => {
        showEarningsBreakdown();
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
            
            // Continuously sync placeholder viewers with actual count
            syncViewerCount(msg.viewerCount);
        }
    });

    // Clean up stale viewers every 30 seconds
    setInterval(() => {
        cleanupStaleViewers();
    }, 30000);

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
            
            // Track this user as a viewer if not already tracked
            if (msg.userId && !currentViewers.has(msg.userId)) {
                currentViewers.set(msg.userId, {
                    username: msg.uniqueId,
                    nickname: msg.nickname || msg.displayName || msg.uniqueId,
                    profilePic: msg.profilePictureUrl,
                    joinTime: Date.now(),
                    lastActivity: Date.now(),
                    wasAlreadyWatching: true
                });
                updateViewersList();
                removePlaceholderViewer();
            } else if (msg.userId && currentViewers.has(msg.userId)) {
                // Update activity timestamp
                const viewer = currentViewers.get(msg.userId);
                viewer.lastActivity = Date.now();
                currentViewers.set(msg.userId, viewer);
            }
            
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
        
        // Add viewer to current viewers list
        currentViewers.set(msg.userId, {
            username: msg.uniqueId,
            nickname: msg.nickname || msg.displayName || msg.uniqueId,
            profilePic: msg.profilePictureUrl,
            joinTime: Date.now(),
            lastActivity: Date.now(),
            wasAlreadyWatching: false // Mark as new joiner
        });
        
        updateViewersList();
        
        // Remove one placeholder if it exists (new person joined)
        removePlaceholderViewer();
        
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
        
        // Update viewer info when they chat (in case they joined before we started tracking)
        if (msg.userId && !currentViewers.has(msg.userId)) {
            currentViewers.set(msg.userId, {
                username: msg.uniqueId,
                nickname: msg.nickname || msg.displayName || msg.uniqueId,
                profilePic: msg.profilePictureUrl,
                joinTime: Date.now(),
                lastActivity: Date.now(),
                wasAlreadyWatching: true // Mark as existing viewer
            });
            updateViewersList();
            
            // Remove one placeholder if it exists
            removePlaceholderViewer();
        } else if (msg.userId && currentViewers.has(msg.userId)) {
            // Update existing viewer info and mark as active
            const viewer = currentViewers.get(msg.userId);
            viewer.nickname = msg.nickname || msg.displayName || msg.uniqueId;
            viewer.profilePic = msg.profilePictureUrl;
            viewer.lastActivity = Date.now();
            currentViewers.set(msg.userId, viewer);
        }
        
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
            
            // Track gift sender as viewer if not already tracked
            if (data.userId && !currentViewers.has(data.userId)) {
                currentViewers.set(data.userId, {
                    username: data.uniqueId,
                    nickname: data.nickname || data.displayName || data.uniqueId,
                    profilePic: data.profilePictureUrl,
                    joinTime: Date.now(),
                    wasAlreadyWatching: true
                });
                updateViewersList();
                removePlaceholderViewer();
            }
            
            // Trigger gift effects
            triggerGiftEffects(data);
            
            // Update earnings display with gift notification
            showEarningsUpdate(data.diamondCount * data.repeatCount);
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
            
            // Track social interaction users as viewers
            if (data.userId && !currentViewers.has(data.userId)) {
                currentViewers.set(data.userId, {
                    username: data.uniqueId,
                    nickname: data.nickname || data.displayName || data.uniqueId,
                    profilePic: data.profilePictureUrl,
                    joinTime: Date.now(),
                    wasAlreadyWatching: true
                });
                updateViewersList();
                removePlaceholderViewer();
            }
        } else if (data.displayType && data.displayType.includes('share')) {
            shareCount++;
            updateRoomStats();
            
            // Track social interaction users as viewers
            if (data.userId && !currentViewers.has(data.userId)) {
                currentViewers.set(data.userId, {
                    username: data.uniqueId,
                    nickname: data.nickname || data.displayName || data.uniqueId,
                    profilePic: data.profilePictureUrl,
                    joinTime: Date.now(),
                    wasAlreadyWatching: true
                });
                updateViewersList();
                removePlaceholderViewer();
            }
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
        currentViewers.clear(); // Clear viewers list for new stream
        updateViewersList(); // Update the viewers display
        
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
    
    // Calculate and display estimated earnings
    const estimatedEarnings = diamondsCount * DIAMONDS_TO_USD_RATE;
    $('#earningsCount').text('$' + estimatedEarnings.toFixed(2));
    
    // Update earnings tooltip with breakdown
    const earningsElement = $('#earningsCount').parent();
    earningsElement.attr('title', 
        `Breakdown:\n` +
        `💎 ${diamondsCount.toLocaleString()} diamonds\n` +
        `💰 ~$${estimatedEarnings.toFixed(2)} estimated\n` +
        `📊 Rate: $${DIAMONDS_TO_USD_RATE}/diamond\n` +
        `⚠️ After TikTok's ~50% cut`
    );
}

function updateViewersList() {
    const viewersContainer = $('#currentViewers');
    if (!viewersContainer.length) return;
    
    const viewers = Array.from(currentViewers.values());
    const realViewers = viewers.filter(v => !v.isPlaceholder);
    const placeholderViewers = viewers.filter(v => v.isPlaceholder);
    
    console.log(`Updating viewers list: ${realViewers.length} real + ${placeholderViewers.length} placeholders = ${viewers.length} total`);
    
    // Sort by join time (newest first), but put known users before placeholders
    viewers.sort((a, b) => {
        // Real users first, then placeholders
        if (a.isPlaceholder && !b.isPlaceholder) return 1;
        if (!a.isPlaceholder && b.isPlaceholder) return -1;
        return b.joinTime - a.joinTime;
    });
    
    // Limit to most recent 50 viewers to avoid performance issues
    const recentViewers = viewers.slice(0, 50);
    
    if (recentViewers.length === 0) {
        viewersContainer.html(`
            <div class="no-viewers">
                <i class="fas fa-eye"></i>
                <p>No viewers tracked yet</p>
            </div>
        `);
    } else {
        const viewersHtml = recentViewers.map(viewer => `
            <div class="viewer-item ${viewer.isPlaceholder ? 'placeholder' : ''}" 
                 title="${viewer.isPlaceholder ? 'Anonymous viewer' : `${viewer.wasAlreadyWatching ? 'Was already watching' : 'Joined'}: ${new Date(viewer.joinTime).toLocaleTimeString()}`}">
                <img class="viewer-pic" src="${viewer.profilePic || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMTAiIGZpbGw9IiMzNzM3MzciLz4KPGNpcmNsZSBjeD0iMTAiIGN5PSI4IiByPSIzIiBmaWxsPSIjNjY2NjY2Ii8+CjxwYXRoIGQ9Ik0xNyAxNmMwLTMuODctMy4xMy03LTctN3MtNyAzLjEzLTcgN2gxNFoiIGZpbGw9IiM2NjY2NjYiLz4KPC9zdmc+'}" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMTAiIGZpbGw9IiMzNzM3MzciLz4KPGNpcmNsZSBjeD0iMTAiIGN5PSI4IiByPSIzIiBmaWxsPSIjNjY2NjY2Ii8+CjxwYXRoIGQ9Ik0xNyAxNmMwLTMuODctMy4xMy03LTctN3MtNyAzLjEzLTcgN2gxNFoiIGZpbGw9IiM2NjY2NjYiLz4KPC9zdmc+'" 
                     alt="Viewer">
                <span class="viewer-name">${viewer.nickname || (viewer.isPlaceholder ? 'Anonymous Viewer' : 'Unknown')}</span>
                ${viewer.wasAlreadyWatching && !viewer.isPlaceholder ? '<span class="viewer-badge">👁️</span>' : ''}
                ${viewer.isPlaceholder ? '<span class="viewer-badge">❓</span>' : ''}
            </div>
        `).join('');
        
        viewersContainer.html(viewersHtml);
    }
    
    // Update viewers count in header (including placeholders)
    $('#activeViewersCount').text(currentViewers.size);
}

function addPlaceholderViewers(numberOfPlaceholders) {
    console.log(`Adding ${numberOfPlaceholders} placeholder viewers`);
    
    // Add placeholder entries for viewers we don't know about
    for (let i = 0; i < numberOfPlaceholders; i++) {
        const placeholderId = `placeholder_${Date.now()}_${Math.random()}`;
        currentViewers.set(placeholderId, {
            username: 'anonymous',
            nickname: 'Anonymous Viewer',
            profilePic: null,
            joinTime: Date.now() - (i * 100), // Spread them out slightly
            isPlaceholder: true,
            wasAlreadyWatching: true
        });
    }
    
    updateViewersList();
}

function removePlaceholderViewer() {
    // Find and remove one placeholder viewer
    for (const [key, viewer] of currentViewers.entries()) {
        if (viewer.isPlaceholder) {
            currentViewers.delete(key);
            break;
        }
    }
}

function syncViewerCount(actualViewerCount) {
    const currentTracked = currentViewers.size;
    const difference = actualViewerCount - currentTracked;
    
    console.log(`Syncing viewers: ${actualViewerCount} actual vs ${currentTracked} tracked (diff: ${difference})`);
    
    if (difference > 0) {
        // We have fewer tracked viewers than actual - add placeholders
        addPlaceholderViewers(difference);
    } else if (difference < 0) {
        // We have more tracked viewers than actual - people left
        const excessCount = Math.abs(difference);
        console.log(`${excessCount} viewers left, removing oldest entries`);
        
        // Remove oldest viewers (prioritize placeholders first, then oldest real viewers)
        const viewers = Array.from(currentViewers.entries());
        
        // Sort: placeholders first, then by oldest join time
        viewers.sort(([keyA, viewerA], [keyB, viewerB]) => {
            if (viewerA.isPlaceholder && !viewerB.isPlaceholder) return -1;
            if (!viewerA.isPlaceholder && viewerB.isPlaceholder) return 1;
            return viewerA.joinTime - viewerB.joinTime; // oldest first
        });
        
        // Remove the oldest/placeholder viewers
        for (let i = 0; i < excessCount && i < viewers.length; i++) {
            const [key, viewer] = viewers[i];
            console.log(`Removing viewer: ${viewer.nickname} (${viewer.isPlaceholder ? 'placeholder' : 'real'})`);
            currentViewers.delete(key);
        }
        
        updateViewersList();
    }
    
    // Final verification
    console.log(`After sync: ${currentViewers.size} tracked viewers`);
}

function cleanupStaleViewers() {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes of inactivity
    let removedCount = 0;
    
    // Only clean up real viewers (not placeholders) who haven't been active
    for (const [key, viewer] of currentViewers.entries()) {
        if (!viewer.isPlaceholder && viewer.lastActivity && (now - viewer.lastActivity) > staleThreshold) {
            console.log(`Removing stale viewer: ${viewer.nickname} (${Math.round((now - viewer.lastActivity) / 60000)} minutes inactive)`);
            currentViewers.delete(key);
            removedCount++;
        }
    }
    
    if (removedCount > 0) {
        console.log(`Cleaned up ${removedCount} stale viewers`);
        updateViewersList();
    }
}

function triggerGiftEffects(giftData) {
    const giftValue = giftData.diamondCount * giftData.repeatCount;
    const isStreak = isPendingStreak(giftData);
    const isHighValue = giftValue >= 100; // High value threshold
    
    console.log(`Gift received: ${giftData.giftName} x${giftData.repeatCount} (${giftValue} diamonds) ${isStreak ? '[STREAK]' : ''}`);
    
    // Choose effect intensity based on gift value
    let effectLevel = 'normal';
    if (giftValue >= 500) effectLevel = 'epic';
    else if (giftValue >= 100) effectLevel = 'rare';
    
    // Apply screen shake
    applyScreenShake(effectLevel);
    
    // Show gift particles
    showGiftParticles(effectLevel, giftData.giftName);
    
    // Flash border effect
    flashBorderEffect(effectLevel);
    
    // For streaks, add continuous effects
    if (isStreak) {
        showStreakEffect(giftData);
    }
    
    // For high value gifts, show special announcement
    if (isHighValue) {
        showGiftAnnouncement(giftData, giftValue);
    }
}

function applyScreenShake(intensity) {
    const overlay = $('.overlay-container');
    let shakeClass = 'shake-normal';
    
    if (intensity === 'epic') shakeClass = 'shake-epic';
    else if (intensity === 'rare') shakeClass = 'shake-rare';
    
    overlay.addClass(shakeClass);
    
    setTimeout(() => {
        overlay.removeClass('shake-normal shake-rare shake-epic');
    }, 1000);
}

function showGiftParticles(intensity, giftName) {
    const container = $('.overlay-container');
    const particleCount = intensity === 'epic' ? 30 : intensity === 'rare' ? 20 : 10;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = $(`
            <div class="gift-particle ${intensity}">
                <span class="particle-emoji">${getGiftEmoji(giftName)}</span>
            </div>
        `);
        
        // Random position
        const startX = Math.random() * 100;
        const endX = startX + (Math.random() - 0.5) * 40;
        
        particle.css({
            left: startX + '%',
            animationDelay: (i * 100) + 'ms',
            '--end-x': endX + '%'
        });
        
        container.append(particle);
        
        // Remove particle after animation
        setTimeout(() => particle.remove(), 3000);
    }
}

function flashBorderEffect(intensity) {
    const overlay = $('.overlay-container');
    let flashClass = 'flash-normal';
    
    if (intensity === 'epic') flashClass = 'flash-epic';
    else if (intensity === 'rare') flashClass = 'flash-rare';
    
    overlay.addClass(flashClass);
    
    setTimeout(() => {
        overlay.removeClass('flash-normal flash-rare flash-epic');
    }, 2000);
}

function showStreakEffect(giftData) {
    const streakIndicator = $('.streak-indicator');
    
    if (streakIndicator.length === 0) {
        // Create streak indicator if it doesn't exist
        $('body').append(`
            <div class="streak-indicator">
                <div class="streak-content">
                    <span class="streak-text">🔥 STREAK! 🔥</span>
                    <span class="streak-gift">${giftData.giftName}</span>
                    <span class="streak-count">x${giftData.repeatCount}</span>
                </div>
            </div>
        `);
    } else {
        // Update existing streak
        streakIndicator.find('.streak-count').text(`x${giftData.repeatCount}`);
        streakIndicator.addClass('streak-pulse');
        
        setTimeout(() => {
            streakIndicator.removeClass('streak-pulse');
        }, 500);
    }
    
    // Remove streak indicator after 5 seconds of no updates
    clearTimeout(window.streakTimeout);
    window.streakTimeout = setTimeout(() => {
        $('.streak-indicator').fadeOut(() => {
            $('.streak-indicator').remove();
        });
    }, 5000);
}

function showGiftAnnouncement(giftData, totalValue) {
    const displayName = giftData.nickname || giftData.displayName || giftData.uniqueId;
    
    const announcement = $(`
        <div class="gift-announcement">
            <div class="announcement-content">
                <div class="announcement-title">🎁 BIG GIFT! 🎁</div>
                <div class="announcement-user">${displayName}</div>
                <div class="announcement-gift">${giftData.giftName} x${giftData.repeatCount}</div>
                <div class="announcement-value">💎 ${totalValue.toLocaleString()} Diamonds</div>
            </div>
        </div>
    `);
    
    $('body').append(announcement);
    
    // Animate in
    setTimeout(() => announcement.addClass('show'), 100);
    
    // Remove after 4 seconds
    setTimeout(() => {
        announcement.removeClass('show');
        setTimeout(() => announcement.remove(), 500);
    }, 4000);
}

function getGiftEmoji(giftName) {
    const giftEmojis = {
        'rose': '🌹',
        'heart': '❤️',
        'diamond': '💎',
        'crown': '👑',
        'star': '⭐',
        'rocket': '🚀',
        'cake': '🎂',
        'car': '🚗',
        'lion': '🦁',
        'default': '🎁'
    };
    
    const lowerName = giftName.toLowerCase();
    for (const [key, emoji] of Object.entries(giftEmojis)) {
        if (lowerName.includes(key)) return emoji;
    }
    
    return giftEmojis.default;
}

function showEarningsUpdate(diamondsEarned) {
    const earningsIncrease = diamondsEarned * DIAMONDS_TO_USD_RATE;
    const earningsElement = $('.earnings-stat');
    
    // Create floating earnings indicator
    const floatingEarnings = $(`
        <div class="floating-earnings">
            +$${earningsIncrease.toFixed(2)}
            <br>
            <small>+${diamondsEarned} 💎</small>
        </div>
    `);
    
    earningsElement.append(floatingEarnings);
    
    // Animate and remove
    setTimeout(() => {
        floatingEarnings.addClass('show');
    }, 100);
    
    setTimeout(() => {
        floatingEarnings.remove();
    }, 3000);
    
    // Pulse the earnings display
    earningsElement.addClass('earnings-pulse');
    setTimeout(() => {
        earningsElement.removeClass('earnings-pulse');
    }, 1000);
}

function showEarningsBreakdown() {
    const totalEarnings = diamondsCount * DIAMONDS_TO_USD_RATE;
    const beforeTikTokCut = totalEarnings / 0.5; // Reverse the 50% cut to show original value
    
    const breakdown = $(`
        <div class="earnings-breakdown">
            <div class="breakdown-content">
                <h3>💰 Earnings Breakdown</h3>
                <div class="breakdown-row">
                    <span>Total Diamonds:</span>
                    <span>💎 ${diamondsCount.toLocaleString()}</span>
                </div>
                <div class="breakdown-row">
                    <span>Gross Value:</span>
                    <span>$${beforeTikTokCut.toFixed(2)}</span>
                </div>
                <div class="breakdown-row">
                    <span>TikTok Cut (~50%):</span>
                    <span class="negative">-$${(beforeTikTokCut - totalEarnings).toFixed(2)}</span>
                </div>
                <div class="breakdown-row total">
                    <span>Your Earnings:</span>
                    <span class="positive">$${totalEarnings.toFixed(2)}</span>
                </div>
                <div class="breakdown-note">
                    <small>⚠️ Estimated values. Actual rates may vary by region.</small>
                </div>
                <button onclick="$(this).closest('.earnings-breakdown').remove();" class="close-btn">Close</button>
            </div>
        </div>
    `);
    
    $('body').append(breakdown);
    setTimeout(() => breakdown.addClass('show'), 100);
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
