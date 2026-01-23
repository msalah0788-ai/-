let socket = null;
let currentUser = null;
let onlineUsers = [];
let allUsers = [];
let gifs = [];
let newsWall = [];
let darkMode = false;
let draggedMessage = null;
let longPressTimer = null;
let isDragging = false;

async function initChat() {
    try {
        const savedUser = localStorage.getItem('chatUser');
        if (!savedUser) {
            window.location.href = 'index.html';
            return;
        }
        
        currentUser = JSON.parse(savedUser);
        darkMode = localStorage.getItem('darkMode') === 'true';
        if (darkMode) document.body.classList.add('dark-mode');
        
        await loadSettings();
        await loadGifs();
        await loadAllUsers();
        await loadNews();
        
        displayUserInfo();
        setupUI();
        await connectToServer();
        setupEventListeners();
        
        showNotification(`مرحباً ${currentUser.username}!`, 'success', '💬');
        
    } catch (error) {
        console.error('خطأ:', error);
        showNotification('حدث خطأ', 'error', '⚠️');
    }
}

async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        const data = await response.json();
        if (data.success) {
            darkMode = data.settings.darkMode;
            updateDarkMode();
        }
    } catch (error) {
        console.error('خطأ في الإعدادات:', error);
    }
}

async function loadGifs() {
    try {
        const response = await fetch('/api/gifs');
        const data = await response.json();
        if (data.success) gifs = data.gifs;
    } catch (error) {
        console.error('خطأ في GIFs:', error);
    }
}

async function loadAllUsers() {
    try {
        const response = await fetch('/api/all-users');
        const data = await response.json();
        if (data.success) {
            allUsers = data.users;
            updateAllUsersList();
        }
    } catch (error) {
        console.error('خطأ في المستخدمين:', error);
    }
}

async function loadNews() {
    try {
        const response = await fetch('/api/news');
        const data = await response.json();
        if (data.success) newsWall = data.news;
    } catch (error) {
        console.error('خطأ في الأخبار:', error);
    }
}

function displayUserInfo() {
    if (!currentUser) return;
    
    const profilePic = document.getElementById('current-profile-pic');
    profilePic.src = currentUser.profilePic;
    profilePic.className = `profile-pic ${getFrameClass(currentUser.role)}`;
    profilePic.alt = currentUser.username;
    
    const usernameEl = document.getElementById('current-username');
    usernameEl.textContent = currentUser.username;
    usernameEl.className = `username-glow ${getRoleClass(currentUser.role)}`;
    
    const roleEl = document.getElementById('current-role');
    roleEl.textContent = currentUser.role;
    roleEl.className = `role-badge ${getRoleClass(currentUser.role)}-badge`;
    
    updateDarkModeToggle();
}

function updateDarkMode() {
    if (darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('darkMode', darkMode);
}

function updateDarkModeToggle() {
    const toggle = document.querySelector('.dark-mode-toggle');
    if (toggle) {
        toggle.innerHTML = darkMode ? 
            '<i class="fas fa-sun"></i> الوضع الفاتح' : 
            '<i class="fas fa-moon"></i> الوضع الداكن';
    }
}

function toggleDarkMode() {
    darkMode = !darkMode;
    updateDarkMode();
    updateDarkModeToggle();
    
    fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ darkMode })
    });
}

function getRoleClass(role) {
    const map = { 'مالك': 'owner', 'وزير': 'minister', 'وزيرة': 'minister', 'عضو مميز': 'vip', 'عضو': 'member', 'زائر': 'guest' };
    return map[role] || 'member';
}

function getFrameClass(role) {
    const map = { 'مالك': 'owner-frame', 'وزير': 'minister-frame', 'وزيرة': 'minister-frame', 'عضو مميز': 'vip-frame' };
    return map[role] || '';
}

function getRoleIcon(role) {
    const icons = { 'مالك': '👑', 'وزير': '⭐', 'وزيرة': '⭐', 'عضو مميز': '🌟', 'عضو': '👤', 'زائر': '👣' };
    return icons[role] || '';
}

function updateAllUsersList() {
    const list = document.getElementById('all-users-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    const sortedUsers = [...allUsers].sort((a, b) => {
        const order = { 'مالك': 1, 'وزير': 2, 'وزيرة': 2, 'عضو مميز': 3, 'عضو': 4, 'زائر': 5 };
        return (order[a.role] || 6) - (order[b.role] || 6);
    });
    
    sortedUsers.forEach(user => {
        const isOnline = onlineUsers.some(u => u.username === user.username);
        const userItem = document.createElement('div');
        userItem.className = `user-item ${isOnline ? '' : 'offline'}`;
        userItem.innerHTML = `
            <span class="user-status ${isOnline ? '' : 'offline'}"></span>
            <img src="${user.profilePic}" class="profile-pic ${getFrameClass(user.role)}" alt="${user.username}">
            <div style="flex:1;">
                <div class="user-name">
                    ${user.username}
                    <span class="user-role ${getRoleClass(user.role)}-badge">
                        ${getRoleIcon(user.role)} ${user.role}
                    </span>
                </div>
                <div class="user-meta">
                    #${user.serial} • ${user.interaction || 0} تفاعل
                </div>
            </div>
            ${currentUser.role === 'مالك' && user.username !== currentUser.username ? 
                `<button class="message-action" onclick="openManagement('${user.username}')">
                    <i class="fas fa-cog"></i>
                </button>` : ''}
        `;
        userItem.onclick = () => openProfileModal(user.username);
        list.appendChild(userItem);
    });
}

function updateOnlineUsersList(users) {
    onlineUsers = users;
    const list = document.getElementById('online-users-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.innerHTML = `
            <span class="user-status"></span>
            <img src="${user.profilePic}" class="profile-pic ${getFrameClass(user.role)}" alt="${user.username}">
            <div style="flex:1;">
                <div class="user-name">
                    ${user.username}
                    <span class="user-role ${getRoleClass(user.role)}-badge">
                        ${getRoleIcon(user.role)} ${user.role}
                    </span>
                </div>
                <div class="user-meta">
                    ${user.isGuest ? 'زائر' : `#${user.serial}`}
                </div>
            </div>
            ${currentUser.role === 'مالك' && user.username !== currentUser.username ? 
                `<button class="message-action" onclick="openManagement('${user.username}')">
                    <i class="fas fa-cog"></i>
                </button>` : ''}
        `;
        userItem.onclick = () => openProfileModal(user.username);
        list.appendChild(userItem);
    });
    
    updateAllUsersList();
}

function setupUI() {
    document.getElementById('toggle-sidebar').onclick = () => {
        document.querySelector('.sidebar').classList.toggle('active');
    };
    
    document.getElementById('current-profile-pic').onclick = () => {
        openProfileModal(currentUser.username);
    };
    
    document.querySelector('[title="بروفايلك"]').onclick = () => {
        openProfileModal(currentUser.username);
    };
    
    document.querySelector('[title="الأكثر تفاعلاً"]').onclick = showTopUsers;
    
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    
    sendBtn.onclick = sendMessage;
    
    messageInput.onkeypress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };
    
    messageInput.oninput = () => {
        if (socket && socket.connected) {
            socket.emit('typing', {
                username: currentUser.username,
                isTyping: true,
                room: 'general'
            });
            
            clearTimeout(window.typingTimeout);
            window.typingTimeout = setTimeout(() => {
                if (socket && socket.connected) {
                    socket.emit('typing', {
                        username: currentUser.username,
                        isTyping: false,
                        room: 'general'
                    });
                }
            }, 1000);
        }
        
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 100) + 'px';
    };
    
    setupAttachmentButtons();
    setupQuickActions();
    setupCollapsibleSections();
    setupDragAndDrop();
}

function setupAttachmentButtons() {
    const imageBtn = document.querySelector('[title="إرسال صورة"]');
    const fileBtn = document.querySelector('[title="إرسال ملف"]');
    const emojiBtn = document.querySelector('[title="إرسال تعبير"]');
    const voiceBtn = document.querySelector('[title="تسجيل صوتي"]');
    const gifBtn = document.querySelector('[title="إرسال GIF"]');
    
    imageBtn.onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) uploadImage(file);
        };
        input.click();
    };
    
    fileBtn.onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) uploadFile(file);
        };
        input.click();
    };
    
    emojiBtn.onclick = () => {
        showNotification('الإيموجيات قريباً', 'info', '😊');
    };
    
    voiceBtn.onclick = () => {
        showNotification('التسجيل الصوتي قريباً', 'info', '🎤');
    };
    
    gifBtn.onclick = () => openGifsModal();
}

function setupQuickActions() {
    const themeBtn = document.querySelector('[title="الثيمات"]');
    const settingsBtn = document.querySelector('[title="الإعدادات"]');
    const logoutBtn = document.querySelector('[title="خروج"]');
    const newsBtn = document.querySelector('[title="الأخبار"]');
    
    themeBtn.onclick = toggleDarkMode;
    settingsBtn.onclick = openSettings;
    logoutBtn.onclick = logout;
    newsBtn.onclick = openNewsWall;
}

function setupCollapsibleSections() {
    const sections = document.querySelectorAll('.section-header');
    sections.forEach(header => {
        header.onclick = () => {
            header.classList.toggle('collapsed');
            const list = header.nextElementSibling;
            list.classList.toggle('collapsed');
        };
    });
}

function setupDragAndDrop() {
    const messagesContainer = document.getElementById('chat-messages');
    
    messagesContainer.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('drag-indicator')) {
            const message = e.target.closest('.message');
            draggedMessage = message;
            e.dataTransfer.setData('text/plain', message.dataset.id);
            e.dataTransfer.effectAllowed = 'move';
        }
    });
    
    messagesContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });
    
    messagesContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedMessage) {
            const messageId = draggedMessage.dataset.id;
            const replyInput = document.getElementById('message-input');
            replyInput.value = `رد على الرسالة #${messageId}\n`;
            replyInput.focus();
            draggedMessage = null;
        }
    });
}

async function connectToServer() {
    return new Promise((resolve, reject) => {
        socket = io({
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            timeout: 20000
        });
        
        socket.on('connect', () => {
            console.log('✅ متصل');
            
            socket.emit('user-join', {
                username: currentUser.username,
                role: currentUser.role,
                gender: currentUser.gender,
                profilePic: currentUser.profilePic,
                profileColor: currentUser.profileColor,
                serial: currentUser.serial,
                isGuest: currentUser.isGuest || false
            });
            
            resolve();
        });
        
        socket.on('connect_error', (error) => {
            console.error('❌ خطأ اتصال:', error);
            showNotification('تعذر الاتصال', 'error', '🔌');
            reject(error);
        });
    });
}

function setupEventListeners() {
    if (!socket) return;
    
    socket.on('new-message', (message) => {
        addMessageToChat(message);
    });
    
    socket.on('online-users-updated', (users) => {
        updateOnlineUsersList(users);
    });
    
    socket.on('user-joined', (user) => {
        showNotification(`${user.username} انضم`, 'success', '👋');
    });
    
    socket.on('user-join-effect', (effect) => {
        showJoinEffect(effect);
        playSound('join');
    });
    
    socket.on('user-left', (user) => {
        showNotification(`${user.username} غادر`, 'warning', '🚪');
    });
    
    socket.on('user-exit-effect', (effect) => {
        showExitEffect(effect);
        playSound('exit');
    });
    
    socket.on('user-typing', (data) => {
        showTypingIndicator(data);
    });
    
    socket.on('mentioned', (data) => {
        if (data.by !== currentUser.username) {
            showNotification(`تم ذكرك بواسطة ${data.by}`, 'warning', '📍');
            playSound('mention');
        }
    });
    
    socket.on('role-updated', (data) => {
        if (data.targetUsername === currentUser.username) {
            currentUser.role = data.newRole;
            localStorage.setItem('chatUser', JSON.stringify(currentUser));
            displayUserInfo();
            showNotification(`تم ترقيتك إلى ${data.newRole}`, 'success', '🎉');
        } else {
            showNotification(`${data.targetUsername} أصبح ${data.newRole}`, 'info', '🌟');
        }
        loadAllUsers();
    });
    
    socket.on('gif-added', (gif) => {
        gifs.unshift(gif);
        showNotification('تمت إضافة GIF جديد', 'success', '🖼️');
    });
    
    socket.on('gif-removed', (id) => {
        gifs = gifs.filter(g => g.id !== id);
        showNotification('تم حذف GIF', 'info', '🗑️');
    });
    
    socket.on('new-news', (news) => {
        newsWall.unshift(news);
        if (currentUser.role === 'مالك' || currentUser.role === 'وزير' || currentUser.role === 'وزيرة') {
            showNotification('خبر جديد على الحائط', 'info', '📰');
        }
    });
    
    socket.on('news-deleted', (id) => {
        newsWall = newsWall.filter(n => n.id !== id);
    });
    
    socket.on('news-liked', (data) => {
        const news = newsWall.find(n => n.id === data.newsId);
        if (news) news.likes = data.likes;
    });
    
    socket.on('news-commented', (data) => {
        const news = newsWall.find(n => n.id === data.newsId);
        if (news) {
            if (!news.comments) news.comments = [];
            news.comments.push(data.comment);
        }
    });
    
    socket.on('user-kicked', (data) => {
        showNotification(`${data.targetUsername} تم طرده`, 'warning', '👢');
    });
    
    socket.on('user-muted', (data) => {
        showNotification(`${data.targetUsername} تم كتمه`, 'warning', '🔇');
    });
    
    socket.on('user-unmuted', (data) => {
        showNotification(`${data.targetUsername} تم فك الكتم عنه`, 'success', '🔊');
    });
    
    socket.on('kicked', (data) => {
        showNotification(`تم طردك بواسطة ${data.by}`, 'error', '👢');
        setTimeout(() => {
            logout();
        }, 3000);
    });
    
    socket.on('muted', (data) => {
        showNotification(`تم كتمك لمدة ${data.duration} ثانية`, 'error', '🔇');
    });
    
    socket.on('unmuted', () => {
        showNotification('تم فك الكتم عنك', 'success', '🔊');
    });
    
    socket.on('profile-liked', (data) => {
        showNotification(`أعجب بك ${data.by}`, 'success', '❤️');
    });
    
    socket.on('message-deleted', (data) => {
        const messageElement = document.querySelector(`[data-id="${data.messageId}"]`);
        if (messageElement) {
            messageElement.style.opacity = '0.5';
            messageElement.style.textDecoration = 'line-through';
            setTimeout(() => {
                if (messageElement.parentNode) {
                    messageElement.remove();
                }
            }, 1000);
        }
    });
    
    socket.on('disconnect', () => {
        showNotification('انقطع الاتصال', 'error', '🔌');
    });
    
    socket.on('reconnect', () => {
        showNotification('تم إعادة الاتصال', 'success', '🔗');
        if (currentUser) {
            socket.emit('user-join', {
                username: currentUser.username,
                role: currentUser.role,
                gender: currentUser.gender,
                profilePic: currentUser.profilePic,
                profileColor: currentUser.profileColor,
                serial: currentUser.serial,
                isGuest: currentUser.isGuest || false
            });
        }
    });
}

function sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();
    
    if (!message || !socket || !currentUser) return;
    
    socket.emit('send-message', {
        username: currentUser.username,
        text: message,
        room: 'general'
    });
    
    input.value = '';
    input.style.height = '46px';
    
    if (socket.connected) {
        socket.emit('typing', {
            username: currentUser.username,
            isTyping: false,
            room: 'general'
        });
    }
    
    document.getElementById('typing-indicator').style.display = 'none';
}

function addMessageToChat(message) {
    const messagesContainer = document.getElementById('chat-messages');
    const emptyState = document.getElementById('empty-state');
    if (emptyState) emptyState.remove();
    
    const isSelf = message.username === currentUser.username;
    const roleClass = getRoleClass(message.userInfo.role);
    const roleIcon = getRoleIcon(message.userInfo.role);
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isSelf ? 'self' : ''} ${roleClass}`;
    messageElement.dataset.id = message.id;
    
    messageElement.innerHTML = `
        <div class="drag-indicator" draggable="true">
            <i class="fas fa-reply"></i>
        </div>
        <img src="${message.userInfo.profilePic}" class="message-avatar ${getFrameClass(message.userInfo.role)}" 
             alt="${message.username}"
             onclick="openProfileModal('${message.username}')">
        <div class="message-content">
            <div class="message-header">
                <span class="message-username username-glow ${roleClass}" onclick="openProfileModal('${message.username}')">
                    ${message.username}
                </span>
                <span class="message-time">${message.timestamp}</span>
                <span class="role-badge ${roleClass}-badge" style="margin-right: auto;">
                    ${roleIcon} ${message.userInfo.role}
                </span>
            </div>
            <div class="message-bubble">
                <div class="message-text">${formatMessage(message.text)}</div>
            </div>
            <div class="message-actions">
                <button class="message-action" title="رد" onclick="replyToMessage(${message.id})">
                    <i class="fas fa-reply"></i>
                </button>
                <button class="message-action" title="تفاصيل">
                    <i class="fas fa-info-circle"></i>
                </button>
                ${canDeleteMessage(message.username) ? 
                    `<button class="message-action" title="حذف" onclick="deleteMessage(${message.id})">
                        <i class="fas fa-trash"></i>
                    </button>` : ''}
            </div>
        </div>
    `;
    
    // إضافة تأثير الضغط الطويل للصور
    const messageText = messageElement.querySelector('.message-text');
    messageText.querySelectorAll('img').forEach(img => {
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => previewImage(img.src));
        img.addEventListener('mousedown', startLongPress);
        img.addEventListener('mouseup', endLongPress);
        img.addEventListener('touchstart', startLongPress);
        img.addEventListener('touchend', endLongPress);
        img.addEventListener('mouseleave', endLongPress);
    });
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    if (!isSelf) {
        playSound('message');
    }
}

function startLongPress(e) {
    const img = e.target;
    longPressTimer = setTimeout(() => {
        saveImage(img.src);
    }, 3000);
}

function endLongPress() {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
}

function saveImage(src) {
    const link = document.createElement('a');
    link.href = src;
    link.download = `صورة-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('تم حفظ الصورة', 'success', '💾');
}

function previewImage(src) {
    const modal = document.createElement('div');
    modal.className = 'image-preview-modal active';
    modal.innerHTML = `
        <img src="${src}" class="preview-image" onclick="this.parentElement.remove()">
    `;
    document.body.appendChild(modal);
}

function canDeleteMessage(username) {
    if (!currentUser) return false;
    
    if (currentUser.role === 'مالك') return true;
    if ((currentUser.role === 'وزير' || currentUser.role === 'وزيرة') && 
        username !== 'محمد') return true;
    if (username === currentUser.username) return true;
    
    return false;
}

function deleteMessage(messageId) {
    if (!socket || !currentUser) return;
    
    if (confirm('هل تريد حذف هذه الرسالة؟')) {
        socket.emit('delete-message', {
            messageId,
            deleterUsername: currentUser.username
        });
    }
}

function replyToMessage(messageId) {
    const input = document.getElementById('message-input');
    input.value += `رد على الرسالة #${messageId}\n`;
    input.focus();
}

function formatMessage(text) {
    text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="message-link">$1</a>');
    text = text.replace(/@([\u0600-\u06FF\w]+)/g, '<span class="mention" onclick="openProfileModal(\'$1\')">@$1</span>');
    text = text.replace(/\n/g, '<br>');
    text = text.replace(/(https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp))/gi, '<img src="$1" class="message-image" loading="lazy">');
    return text;
}

function showTypingIndicator(data) {
    const indicator = document.getElementById('typing-indicator');
    if (!indicator) return;
    
    if (data.isTyping && data.username !== currentUser.username) {
        indicator.innerHTML = `
            <i class="fas fa-pencil-alt"></i>
            <span>${data.username} يكتب...</span>
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        indicator.style.display = 'flex';
    } else {
        indicator.style.display = 'none';
    }
}

function showJoinEffect(effect) {
    const messagesContainer = document.getElementById('chat-messages');
    const effectElement = document.createElement('div');
    effectElement.className = `join-effect ${effect.type}`;
    effectElement.innerHTML = effect.message;
    messagesContainer.appendChild(effectElement);
    setTimeout(() => effectElement.remove(), 3000);
}

function showExitEffect(effect) {
    const messagesContainer = document.getElementById('chat-messages');
    const effectElement = document.createElement('div');
    effectElement.className = `exit-effect ${effect.type}`;
    effectElement.innerHTML = effect.message;
    messagesContainer.appendChild(effectElement);
    setTimeout(() => effectElement.remove(), 3000);
}

function playSound(type) {
    try {
        const audio = new Audio();
        const sounds = {
            'message': 'https://assets.mixkit.co/sfx/preview/mixkit-message-pop-alert-2354.mp3',
            'mention': 'https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3',
            'join': 'https://assets.mixkit.co/sfx/preview/mixkit-unlock-game-notification-253.mp3',
            'exit': 'https://assets.mixkit.co/sfx/preview/mixkit-retro-game-emergency-alarm-1000.mp3'
        };
        if (sounds[type]) {
            audio.src = sounds[type];
            audio.volume = 0.3;
            audio.play();
        }
    } catch (error) {
        console.error('خطأ في الصوت:', error);
    }
}

function showNotification(message, type = 'info', icon = 'ℹ️') {
    const notifications = document.querySelectorAll('.notification');
    notifications.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span style="font-size: 20px;">${icon}</span>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideInRight 0.3s reverse';
            setTimeout(() => {
                if (notification.parentNode) notification.remove();
            }, 300);
        }
    }, 5000);
}

async function openProfileModal(username) {
    try {
        const response = await fetch(`/api/user/${username}`);
        const data = await response.json();
        if (!data.success) {
            showNotification('المستخدم غير موجود', 'error', '👤');
            return;
        }
        
        const user = data.user;
        const isCurrentUser = username === currentUser.username;
        
        const modal = document.createElement('div');
        modal.className = 'profile-modal active';
        modal.innerHTML = `
            <div class="profile-content">
                <div class="profile-header">
                    ${user.coverPhoto ? 
                        `<img src="${user.coverPhoto}" class="profile-cover" alt="غلاف">` : 
                        '<div class="profile-cover"></div>'
                    }
                    <img src="${user.profilePic}" class="profile-pic-large ${getFrameClass(user.role)}" 
                         alt="${username}"
                         onclick="previewImage('${user.profilePic}')">
                    ${!isCurrentUser ? `
                        <button class="like-btn" onclick="likeProfile('${username}')">
                            <i class="fas fa-heart"></i>
                        </button>
                    ` : ''}
                    <button class="close-btn" onclick="this.closest('.profile-modal').remove()" 
                            style="position:absolute; top:15px; left:15px; background:rgba(0,0,0,0.5); color:white; border:none; width:40px; height:40px; border-radius:50%; cursor:pointer;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="profile-body">
                    <div class="profile-name">
                        ${username}
                        <span class="profile-role ${getRoleClass(user.role)}-badge">
                            ${getRoleIcon(user.role)} ${user.role}
                        </span>
                    </div>
                    
                    <div style="color:var(--text-secondary); font-size:13px; margin-bottom:15px;">
                        <span><i class="fas fa-hashtag"></i> #${user.serial}</span>
                        <span style="margin:0 10px;">•</span>
                        <span><i class="fas ${user.gender === 'أنثى' ? 'fa-venus' : 'fa-mars'}"></i> ${user.gender}</span>
                        <span style="margin:0 10px;">•</span>
                        <span><i class="fas fa-birthday-cake"></i> ${user.age} سنة</span>
                    </div>
                    
                    ${user.bio ? `
                        <div class="profile-bio" style="background:var(--bg-tertiary); padding:12px; border-radius:var(--radius-sm); margin-bottom:15px;">
                            ${user.bio}
                        </div>
                    ` : ''}
                    
                    <div class="profile-stats">
                        <div class="stat">
                            <div class="stat-value">${user.interaction || 0}</div>
                            <div class="stat-label">تفاعل</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value">${user.likes || 0}</div>
                            <div class="stat-label">إعجاب</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value">${user.friends?.length || 0}</div>
                            <div class="stat-label">أصدقاء</div>
                        </div>
                    </div>
                    
                    ${user.profileSong ? `
                        <div class="profile-song">
                            <i class="fas fa-music"></i>
                            <div style="flex:1; font-size:13px;">${user.profileSong}</div>
                            <button class="song-btn">
                                <i class="fas fa-play"></i>
                            </button>
                        </div>
                    ` : ''}
                    
                    <div class="profile-actions" style="display:flex; gap:10px; margin-top:20px;">
                        ${isCurrentUser ? `
                            <button class="manage-btn" style="flex:1; background:var(--primary-color); color:white; padding:10px; border-radius:var(--radius-sm); border:none; cursor:pointer;" 
                                    onclick="editProfile()">
                                <i class="fas fa-edit"></i> تعديل
                            </button>
                        ` : `
                            <button class="manage-btn" style="flex:1; background:var(--primary-color); color:white; padding:10px; border-radius:var(--radius-sm); border:none; cursor:pointer;" 
                                    onclick="sendPrivateMessage('${username}')">
                                <i class="fas fa-comment"></i> مراسلة
                            </button>
                            <button class="manage-btn" style="flex:1; background:var(--success-color); color:white; padding:10px; border-radius:var(--radius-sm); border:none; cursor:pointer;" 
                                    onclick="sendFriendRequest('${username}')">
                                <i class="fas fa-user-plus"></i> صديق
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    } catch (error) {
        console.error('خطأ في البروفايل:', error);
        showNotification('حدث خطأ', 'error', '⚠️');
    }
}

function likeProfile(username) {
    if (!socket || !currentUser) return;
    
    socket.emit('like-profile', {
        targetUsername: username,
        likerUsername: currentUser.username
    });
    
    const likeBtn = document.querySelector('.like-btn');
    if (likeBtn) {
        likeBtn.classList.add('liked');
        likeBtn.innerHTML = '<i class="fas fa-heart"></i>';
        setTimeout(() => likeBtn.classList.remove('liked'), 500);
    }
}

function openManagement(username) {
    if (!currentUser) return;
    
    const modal = document.createElement('div');
    modal.className = 'management-modal active';
    modal.innerHTML = `
        <h3 style="margin-bottom:15px;">إدارة ${username}</h3>
        <div class="management-actions">
            ${currentUser.role === 'مالك' || currentUser.role === 'وزير' || currentUser.role === 'وزيرة' ? `
                <button class="manage-btn kick" onclick="manageUser('${username}', 'kick')">
                    <i class="fas fa-ban"></i> طرد
                </button>
                <button class="manage-btn mute" onclick="manageUser('${username}', 'mute')">
                    <i class="fas fa-volume-mute"></i> كتم (5 دقائق)
                </button>
            ` : ''}
            ${currentUser.role === 'مالك' ? `
                <button class="manage-btn promote" onclick="updateRole('${username}')">
                    <i class="fas fa-crown"></i> تغيير الرتبة
                </button>
            ` : ''}
            <button class="manage-btn" style="background:var(--text-tertiary); color:white;" 
                    onclick="this.closest('.management-modal').remove()">
                <i class="fas fa-times"></i> إلغاء
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function manageUser(username, action) {
    if (!socket || !currentUser) return;
    
    const reason = prompt('سبب الإجراء (اختياري):');
    
    socket.emit('manage-user', {
        adminUsername: currentUser.username,
        targetUsername: username,
        action,
        duration: action === 'mute' ? 300 : null,
        reason: reason || ''
    });
    
    document.querySelector('.management-modal')?.remove();
}

function updateRole(username) {
    const newRole = prompt('أدخل الرتبة الجديدة (مالك, وزير, وزيرة, عضو مميز, عضو, زائر):');
    if (!newRole || !['مالك', 'وزير', 'وزيرة', 'عضو مميز', 'عضو', 'زائر'].includes(newRole)) {
        showNotification('رتبة غير صالحة', 'error', '❌');
        return;
    }
    
    fetch('/api/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            adminUsername: currentUser.username,
            targetUsername: username,
            newRole
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showNotification(data.message, 'success', '✅');
        } else {
            showNotification(data.message, 'error', '❌');
        }
    })
    .catch(error => {
        showNotification('حدث خطأ', 'error', '⚠️');
    });
    
    document.querySelector('.management-modal')?.remove();
}

function openGifsModal() {
    const modal = document.createElement('div');
    modal.className = 'gifs-modal active';
    modal.innerHTML = `
        <div style="padding:15px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
            <h3 style="margin:0;">GIFs</h3>
            <button onclick="this.closest('.gifs-modal').remove()" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; font-size:20px;">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="gifs-grid">
            ${gifs.length > 0 ? gifs.map(gif => `
                <div class="gif-item" onclick="sendGif('${gif.url}')">
                    <img src="${gif.url}" alt="${gif.name}" loading="lazy">
                </div>
            `).join('') : 
            '<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-tertiary);">لا توجد GIFs</div>'}
        </div>
        ${currentUser.role === 'مالك' ? `
            <div style="padding:15px; border-top:1px solid var(--border-color);">
                <input type="text" id="gif-url" placeholder="رابط GIF" style="width:100%; padding:10px; margin-bottom:10px; border:1px solid var(--border-color); border-radius:var(--radius-sm); background:var(--bg-primary); color:var(--text-primary);">
                <button onclick="addGif()" style="width:100%; padding:10px; background:var(--primary-color); color:white; border:none; border-radius:var(--radius-sm); cursor:pointer;">
                    إضافة GIF
                </button>
            </div>
        ` : ''}
    `;
    
    document.body.appendChild(modal);
}

function sendGif(url) {
    const input = document.getElementById('message-input');
    input.value += `[GIF: ${url}]`;
    input.focus();
    document.querySelector('.gifs-modal')?.remove();
}

function addGif() {
    const urlInput = document.getElementById('gif-url');
    const url = urlInput.value.trim();
    
    if (!url) {
        showNotification('أدخل رابط GIF', 'error', '❌');
        return;
    }
    
    fetch('/api/gifs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: currentUser.username,
            url,
            name: `GIF ${gifs.length + 1}`
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            urlInput.value = '';
            showNotification('تمت الإضافة', 'success', '✅');
        } else {
            showNotification(data.message, 'error', '❌');
        }
    })
    .catch(error => {
        showNotification('حدث خطأ', 'error', '⚠️');
    });
}

function openNewsWall() {
    const modal = document.createElement('div');
    modal.className = 'news-wall active';
    modal.innerHTML = `
        <div style="padding:15px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; position:sticky; top:0; background:var(--bg-primary); z-index:10;">
            <h2 style="margin:0;"><i class="fas fa-newspaper"></i> حائط الأخبار</h2>
            <button onclick="this.closest('.news-wall').remove()" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; font-size:20px;">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div style="padding:20px;">
            ${currentUser.role === 'مالك' || currentUser.role === 'وزير' || currentUser.role === 'وزيرة' ? `
                <div style="margin-bottom:20px; background:var(--bg-secondary); padding:15px; border-radius:var(--radius-md);">
                    <textarea id="news-content" placeholder="اكتب خبراً جديداً..." style="width:100%; padding:10px; margin-bottom:10px; border:1px solid var(--border-color); border-radius:var(--radius-sm); background:var(--bg-primary); color:var(--text-primary); min-height:80px;"></textarea>
                    <input type="text" id="news-image" placeholder="رابط الصورة (اختياري)" style="width:100%; padding:10px; margin-bottom:10px; border:1px solid var(--border-color); border-radius:var(--radius-sm); background:var(--bg-primary); color:var(--text-primary);">
                    <button onclick="postNews()" style="width:100%; padding:10px; background:var(--primary-color); color:white; border:none; border-radius:var(--radius-sm); cursor:pointer;">
                        نشر الخبر
                    </button>
                </div>
            ` : ''}
            
            <div id="news-posts">
                ${newsWall.length > 0 ? newsWall.map(news => `
                    <div class="news-post">
                        <div class="news-header">
                            <img src="${usersData[news.username]?.profilePic || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user&backgroundColor=1E90FF'}" 
                                 style="width:40px; height:40px; border-radius:50%;">
                            <div style="flex:1;">
                                <div style="font-weight:bold;">${news.username}</div>
                                <div style="font-size:12px; color:var(--text-tertiary);">
                                    ${new Date(news.timestamp).toLocaleString('ar-EG')}
                                </div>
                            </div>
                            ${currentUser.role === 'مالك' ? `
                                <button onclick="deleteNews(${news.id})" style="background:none; border:none; color:var(--text-tertiary); cursor:pointer;">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                        <div class="news-content">${news.content}</div>
                        ${news.image ? `
                            <img src="${news.image}" class="news-image" onclick="previewImage('${news.image}')">
                        ` : ''}
                        <div style="display:flex; gap:15px; margin-top:10px; color:var(--text-tertiary); font-size:13px;">
                            <button onclick="likeNews(${news.id})" style="background:none; border:none; color:inherit; cursor:pointer;">
                                <i class="fas fa-heart"></i> ${news.likes || 0}
                            </button>
                            <button onclick="commentNews(${news.id})" style="background:none; border:none; color:inherit; cursor:pointer;">
                                <i class="fas fa-comment"></i> ${news.comments?.length || 0}
                            </button>
                        </div>
                    </div>
                `).join('') : 
                '<div style="text-align:center; padding:40px; color:var(--text-tertiary);">لا توجد أخبار</div>'}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function postNews() {
    const content = document.getElementById('news-content').value.trim();
    const image = document.getElementById('news-image').value.trim();
    
    if (!content) {
        showNotification('اكتب محتوى الخبر', 'error', '❌');
        return;
    }
    
    fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: currentUser.username,
            content,
            image
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            document.getElementById('news-content').value = '';
            document.getElementById('news-image').value = '';
            showNotification('تم النشر', 'success', '✅');
        } else {
            showNotification(data.message, 'error', '❌');
        }
    })
    .catch(error => {
        showNotification('حدث خطأ', 'error', '⚠️');
    });
}

function deleteNews(newsId) {
    if (confirm('هل تريد حذف هذا الخبر؟')) {
        fetch(`/api/news/${newsId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser.username })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showNotification('تم الحذف', 'success', '✅');
                document.querySelector(`[onclick="deleteNews(${newsId})"]`)?.closest('.news-post')?.remove();
            } else {
                showNotification(data.message, 'error', '❌');
            }
        });
    }
}

function likeNews(newsId) {
    if (!socket || !currentUser) return;
    
    socket.emit('like-news', {
        newsId,
        username: currentUser.username
    });
}

function commentNews(newsId) {
    const comment = prompt('أدخل تعليقك:');
    if (comment && socket && currentUser) {
        socket.emit('comment-news', {
            newsId,
            username: currentUser.username,
            comment
        });
    }
}

function uploadImage(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.src = e.target.result;
        img.onload = function() {
            const input = document.getElementById('message-input');
            input.value += `[صورة: ${file.name}]`;
            showNotification('تم تحميل الصورة', 'success', '🖼️');
        };
    };
    reader.readAsDataURL(file);
}

function uploadFile(file) {
    const input = document.getElementById('message-input');
    input.value += `[ملف: ${file.name}]`;
    showNotification('تم تحميل الملف', 'success', '📎');
}

function showTopUsers() {
    const topUsers = [...allUsers]
        .filter(u => u.interaction > 0)
        .sort((a, b) => b.interaction - a.interaction)
        .slice(0, 3);
    
    if (topUsers.length === 0) {
        alert('لا يوجد مستخدمين متفاعلين بعد');
        return;
    }
    
    const message = topUsers.map((u, i) => 
        `${i + 1}. ${u.username} - ${u.interaction} تفاعل`
    ).join('\n');
    
    alert(`🏆 الأعلى تفاعلاً:\n\n${message}`);
}

function editProfile() {
    showNotification('تعديل البروفايل قريباً', 'info', '🛠️');
}

function sendPrivateMessage(username) {
    showNotification(`مراسلة ${username} قريباً`, 'info', '💬');
}

function sendFriendRequest(username) {
    showNotification(`طلب صداقة لـ ${username}`, 'success', '👥');
}

function openSettings() {
    showNotification('الإعدادات قريباً', 'info', '⚙️');
}

function logout() {
    if (confirm('هل تريد تسجيل الخروج؟')) {
        if (socket) socket.disconnect();
        localStorage.removeItem('chatUser');
        localStorage.removeItem('darkMode');
        window.location.href = 'index.html';
    }
}

// إغلاق النوافذ عند النقر خارجها
document.addEventListener('click', (e) => {
    const modals = document.querySelectorAll('.profile-modal, .management-modal, .gifs-modal, .news-wall');
    modals.forEach(modal => {
        if (modal.classList.contains('active') && 
            !modal.contains(e.target) && 
            !e.target.closest('[onclick*="openProfileModal"], [onclick*="openManagement"], [onclick*="openGifsModal"], [onclick*="openNewsWall"]')) {
            modal.remove();
        }
    });
    
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.getElementById('toggle-sidebar');
    if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('active') && 
        !sidebar.contains(e.target) && e.target !== toggleBtn && !toggleBtn.contains(e.target)) {
        sidebar.classList.remove('active');
    }
});

// تهيئة عند التحميل
document.addEventListener('DOMContentLoaded', initChat);
