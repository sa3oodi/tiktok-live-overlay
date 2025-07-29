// This will use the demo backend if you open index.html locally via file://, otherwise your server will be used
let backendUrl = location.protocol === 'file:' ? "https://tiktok-chat-reader.zerody.one/" : undefined;
let connection = new TikTokIOConnection(backendUrl);

// Counter
let viewerCount = 0; // Start with 0, update with real data
let likeCount = 0;
let diamondsCount = 0; // Diamonds start at 0 since they accumulate from gifts

// These settings are defined by obs.html
if (!window.settings) window.settings = {};

$(document).ready(() => {
    $('#connectButton').click(connect);
    $('#uniqueIdInput').on('keyup', function (e) {
        if (e.key === 'Enter') {
            connect();
        }
    });

    if (window.settings.username) connect();
})

function connect() {
    let uniqueId = window.settings.username || $('#uniqueIdInput').val();
    if (uniqueId !== '') {

        $('#stateText').text('Connecting...');
        $('.status-dot').addClass('connecting').removeClass('connected');

        connection.connect(uniqueId, {
            enableExtendedGiftInfo: true
        }).then(state => {
            $('#stateText').text(`Connected to ${uniqueId}'s live stream`);
            $('.status-dot').removeClass('connecting').addClass('connected');
            $('.empty-state').hide(); // Hide empty states when connected

            // Reset only diamonds (they accumulate from gifts)
            diamondsCount = 0;
            updateRoomStats();

        }).catch(errorMessage => {
            // Enhanced error message handling
            let displayMessage = errorMessage;
            
            if (typeof errorMessage === 'string') {
                if (errorMessage.includes('status') || errorMessage.includes('Failed to connect')) {
                    displayMessage = 'Unable to connect. Please check if the user is currently live and the username is correct.';
                } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
                    displayMessage = 'Connection timeout. Please try again.';
                } else if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
                    displayMessage = 'Too many connection attempts. Please wait a moment and try again.';
                } else if (errorMessage.includes('blocked')) {
                    displayMessage = 'Connection blocked. Please try again later.';
                }
            }
            
            $('#stateText').text(displayMessage);
            $('.status-dot').removeClass('connecting connected');

            // schedule next try if obs username set
            if (window.settings.username) {
                setTimeout(() => {
                    connect(window.settings.username);
                }, 30000);
            }
        })

    } else {
        alert('Please enter a username');
    }
}

// Prevent Cross site scripting (XSS)
function sanitize(text) {
    return text.replace(/</g, '&lt;')
}

function updateRoomStats() {
    $('#viewerCount').text(viewerCount.toLocaleString());
    $('#likeCount').text(likeCount.toLocaleString());
    $('#diamondCount').text(diamondsCount.toLocaleString());
}

function generateUsernameLink(data) {
    return `<a class="usernamelink" href="https://www.tiktok.com/@${data.uniqueId}" target="_blank">${data.uniqueId}</a>`;
}

function isPendingStreak(data) {
    return data.giftType === 1 && !data.repeatEnd;
}

/**
 * Add a new message to the chat container
 */
function addChatItem(color, data, text, summarize) {
    let container = location.href.includes('obs.html') ? $('.eventcontainer') : $('.chatcontainer');

    // Hide empty state when first message arrives
    container.find('.empty-state').hide();

    if (container.find('div:not(.empty-state)').length > 500) {
        container.find('div:not(.empty-state)').slice(0, 200).remove();
    }

    container.find('.temporary').remove();

    const timestamp = new Date().toLocaleTimeString();
    const messageClass = summarize ? 'temporary' : 'static';
    const textColor = color ? `color: ${color}` : '';

    container.append(`
        <div class="${messageClass}" style="animation: slideInUp 0.3s ease-out;">
            <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
                <img class="miniprofilepicture" src="${data.profilePictureUrl}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiMzNzM3MzciLz4KPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI4IiB5PSI4Ij4KPHBhdGggZD0iTTggMTJDMTAuMjA5MSAxMiAxMiAxMC4yMDkxIDEyIDhDMTIgNS43OTA5IDEwLjIwOTEgNCAxTyIDNEM1Ljc5MDk0IDQgNCA1Ljc5MDkgNCA4QzQgMTAuMjA5MSA1Ljc5MDk0IDEyIDggMTJaIiBmaWxsPSIjNjY2NjY2Ii8+CjxwYXRoIGQ9Ik04IDhDOC44Mjg0MyA4IDkuNSA3LjMyODQzIDkuNSA2LjVDOS41IDUuNjcxNTcgOC44Mjg0MyA1IDggNUM3LjE3MTU3IDUgNi41IDUuNjcxNTcgNi41IDYuNUM2LjUgNy4zMjg0MyA3LjE3MTU3IDggOCA4WiIgZmlsbD0iIzMzMzMzMyIvPgo8L3N2Zz4KPC9zdmc+'" alt="Profile">
                <div style="flex: 1; min-width: 0;">
                    <div style="margin-bottom: 0.25rem;">
                        <span style="font-weight: 600; margin-right: 0.5rem;">${generateUsernameLink(data)}</span>
                        <span style="font-size: 0.75rem; color: var(--text-muted);">${timestamp}</span>
                    </div>
                    <div style="${textColor}; word-wrap: break-word; line-height: 1.4;">${sanitize(text)}</div>
                </div>
            </div>
        </div>
    `);

    container.stop();
    container.animate({
        scrollTop: container[0].scrollHeight
    }, 400);
}

/**
 * Add a new gift to the gift container
 */
function addGiftItem(data) {
    let container = location.href.includes('obs.html') ? $('.eventcontainer') : $('.giftcontainer');

    // Hide empty state when first gift arrives
    container.find('.empty-state').hide();

    if (container.find('div:not(.empty-state)').length > 200) {
        container.find('div:not(.empty-state)').slice(0, 100).remove();
    }

    let streakId = data.userId.toString() + '_' + data.giftId;
    const timestamp = new Date().toLocaleTimeString();
    const isStreaking = isPendingStreak(data);

    let html = `
        <div data-streakid="${isStreaking ? streakId : ''}" style="animation: slideInUp 0.3s ease-out;">
            <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
                <img class="miniprofilepicture" src="${data.profilePictureUrl}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiMzNzM3MzciLz4KPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI4IiB5PSI4Ij4KPHBhdGggZD0iTTggMTJDMTAuMjA5MSAxMiAxMiAxMC4yMDkxIDEyIDhDMTIgNS43OTA5IDEwLjIwOTEgNCAxMiA0QzUuNzkwOTQgNCA0IDUuNzkwOSA0IDhDNCAxMC4yMDkxIDUuNzkwOTQgMTIgOCAxMloiIGZpbGw9IiM2NjY2NjYiLz4KPHBhdGggZD0iTTggOEM4LjgyODQzIDggOS41IDcuMzI4NDMgOS41IDYuNUM5LjUgNS42NzE1NyA4LjgyODQzIDUgOCA1QzcuMTcxNTcgNSA2LjUgNS42NzE1NyA2LjUgNi41QzYuNSA3LjMyODQzIDcuMTcxNTcgOCA4IDhaIiBmaWxsPSIjMzMzMzMzIi8+Cjwvc3ZnPgo8L3N2Zz4K'" alt="Profile">
                <div style="flex: 1; min-width: 0;">
                    <div style="margin-bottom: 0.5rem;">
                        <span style="font-weight: 600; margin-right: 0.5rem;">${generateUsernameLink(data)}</span>
                        <span style="font-size: 0.75rem; color: var(--text-muted);">${timestamp}</span>
                    </div>
                    <div style="color: var(--tiktok-orange); margin-bottom: 0.75rem; font-weight: 500;">${data.describe}</div>
                    <div style="display: flex; align-items: center; gap: 1rem; background: rgba(255, 140, 66, 0.1); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid rgba(255, 140, 66, 0.2);">
                        <img class="gifticon" src="${data.giftPictureUrl}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iOCIgZmlsbD0iI2ZmOGM0MiIvPgo8cGF0aCBkPSJNMjQgMzJDMjguNDE4MyAzMiAzMiAyOC40MTgzIDMyIDI0QzMyIDE5LjU4MTcgMjguNDE4MyAxNiAyNCAxNkMxOS41ODE3IDE2IDE2IDE5LjU4MTcgMTYgMjRDMTYgMjguNDE4MyAxOS41ODE3IDMyIDI0IDMyWiIgZmlsbD0iI2ZmZmZmZiIvPgo8L3N2Zz4K'" alt="Gift">
                        <div style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                <span style="font-weight: 600; color: var(--text-primary);">${data.giftName}</span>
                                <span style="font-size: 0.75rem; color: var(--text-muted);">ID: ${data.giftId}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                <span style="color: var(--text-secondary);">Repeat:</span>
                                <span style="font-weight: 600; ${isStreaking ? 'color: var(--tiktok-red); animation: pulse 1s infinite;' : 'color: var(--success);'}">x${data.repeatCount.toLocaleString()}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: var(--text-secondary);">Diamonds:</span>
                                <span style="font-weight: 600; color: var(--tiktok-orange);">💎 ${(data.diamondCount * data.repeatCount).toLocaleString()}</span>
                            </div>
                        </div>
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
    }, 800);
}


// Only set up these event handlers if we're NOT in the overlay context
// The overlay uses app-overlay.js which has its own handlers
if (!window.isOverlayContext && !location.pathname.includes('/overlay') && !location.search.includes('username=')) {
    // viewer stats
    connection.on('roomUser', (msg) => {
        if (typeof msg.viewerCount === 'number') {
            viewerCount = msg.viewerCount;
            updateRoomStats();
        }
    })

    // like stats
    connection.on('like', (msg) => {
        if (typeof msg.totalLikeCount === 'number') {
            likeCount = msg.totalLikeCount;
            updateRoomStats();
        }

        if (window.settings.showLikes === "0") return;

        if (typeof msg.likeCount === 'number') {
            addChatItem('#447dd4', msg, msg.label.replace('{0:user}', '').replace('likes', `${msg.likeCount} likes`))
        }
    })

    // Member join
    let joinMsgDelay = 0;
    connection.on('member', (msg) => {
        if (window.settings.showJoins === "0") return;

        let addDelay = 250;
        if (joinMsgDelay > 500) addDelay = 100;
        if (joinMsgDelay > 1000) addDelay = 0;

        joinMsgDelay += addDelay;

        setTimeout(() => {
            joinMsgDelay -= addDelay;
            addChatItem('#21b2c2', msg, 'joined', true);
        }, joinMsgDelay);
    })

    // New chat comment received
    connection.on('chat', (msg) => {
        if (window.settings.showChats === "0") return;

        addChatItem('', msg, msg.comment);
    })

    // New gift received
    connection.on('gift', (data) => {
        if (!isPendingStreak(data) && data.diamondCount > 0) {
            diamondsCount += (data.diamondCount * data.repeatCount);
            updateRoomStats();
        }

        if (window.settings.showGifts === "0") return;

        addGiftItem(data);
    })

    // share, follow
    connection.on('social', (data) => {
        if (window.settings.showFollows === "0") return;

        let color = data.displayType.includes('follow') ? '#ff005e' : '#2fb816';
        addChatItem(color, data, data.label.replace('{0:user}', ''));
    })

    connection.on('streamEnd', () => {
        $('#stateText').text('Stream ended.');
        $('.status-dot').removeClass('connecting connected');

        // schedule next try if obs username set
        if (window.settings.username) {
            setTimeout(() => {
                connect(window.settings.username);
            }, 30000);
        }
    })
}