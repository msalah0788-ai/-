document.addEventListener('DOMContentLoaded', function() {
    // ========== تهيئة المتغيرات العامة ==========
    let socket = null;
    let currentUser = {
        username: localStorage.getItem('chatUsername') || 'زائر',
        role: localStorage.getItem('chatRole') || 'visitor',
        token: localStorage.getItem('chatToken') || null,
        textColor: localStorage.getItem('chatColor') || '#000000',
        font: localStorage.getItem('chatFont') || 'Arial',
        fontSize: localStorage.getItem('chatFontSize') || 'medium'
    };
    
    let currentRoom = 'general';
    let rooms = [];
    let onlineUsers = [];
    let privateMessages = new Map();
    let unreadPrivateCount = 0;
    let emojiPicker = null;
    
    // ========== عناصر DOM ==========
    const elements = {
        loadingScreen: document.getElementById('loadingScreen'),
        chatContainer: document.getElementById('chatContainer'),
        loginModal: document.getElementById('loginModal'),
        registerModal: document.getElementById('registerModal'),
        profileModal: document.getElementById('profileModal'),
        attachmentModal: document.getElementById('attachmentModal'),
        recordModal: document.getElementById('recordModal'),
        diaryModal: document.getElementById('diaryModal'),
        newPostModal: document.getElementById('newPostModal'),
        emojiModal: document.getElementById('emojiModal'),
        
        // الشريط العلوي
        menuBtn: document.getElementById('menuBtn'),
        sidebar: document.getElementById('sidebar'),
        currentRoomName: document.getElementById('currentRoomName'),
        roomMembersCount: document.getElementById('roomMembersCount'),
        roomIcon: document.getElementById('roomIcon'),
        notificationsBtn: document.getElementById('notificationsBtn'),
        privateChatBtn: document.getElementById('privateChatBtn'),
        privateBadge: document.getElementById('privateBadge'),
        diaryBtn: document.getElementById('diaryBtn'),
        userMenu: document.getElementById('userMenu'),
        userName: document.getElementById('userName'),
        userAvatar: document.getElementById('userAvatar'),
        
        // القائمة الجانبية
        roomsList: document.getElementById('roomsList'),
        usersList: document.getElementById('usersList'),
        onlineCount: document.getElementById('onlineCount'),
        
        // منطقة المحادثة
        messagesContainer: document.getElementById('messagesContainer'),
        messageInput: document.getElementById('messageInput'),
        sendBtn: document.getElementById('sendBtn'),
        attachmentBtn: document.getElementById('attachmentBtn'),
        emojiBtn: document.getElementById('emojiBtn'),
        attachmentPreview: document.getElementById('attachmentPreview'),
        loginNotice: document.getElementById('loginNotice'),
        
        // المحادثات الخاصة
        privateChatSidebar: document.getElementById('privateChatSidebar'),
        closePrivateBtn: document.getElementById('closePrivateBtn'),
        privateChatsList: document.getElementById('privateChatsList'),
        
        // النماذج
        messageInputContainer: document.getElementById('messageInputContainer')
    };
    
    // ========== تهيئة التطبيق ==========
    function initApp() {
        // إعداد المستخدم
        setupUser();
        
        // الاتصال بالسيرفر
        connectToServer();
        
        // إعداد واجهة المستخدم
        setupUI();
        
        // تحميل الغرف
        loadRooms();
        
        // إخفاء شاشة التحميل بعد تهيئة كل شيء
        setTimeout(() => {
            elements.loadingScreen.style.display = 'none';
            elements.chatContainer.style.display = 'flex';
        }, 1000);
    }
    
    // ========== إعداد المستخدم ==========
    function setupUser() {
        // تحديث واجهة المستخدم بالمعلومات
        elements.userName.textContent = currentUser.username;
        
        // تعيين لون الاسم حسب الرتبة
        updateUserRoleDisplay();
        
        // تعيين الصورة الرمزية
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.username)}&background=${currentUser.role === 'owner' ? 'FF6B6B' : currentUser.role === 'admin' ? '8B5CF6' : currentUser.role === 'member' ? '3B82F6' : '6B7280'}&color=fff`;
        elements.userAvatar.src = avatarUrl;
        
        // تعطيل/تفعيل إدخال الرسائل بناءً على دور المستخدم
        if (currentUser.role === 'visitor' || !currentUser.token) {
            elements.messageInput.disabled = true;
            elements.sendBtn.disabled = true;
            elements.loginNotice.style.display = 'block';
            elements.attachmentBtn.disabled = true;
            elements.emojiBtn.disabled = true;
        } else {
            elements.messageInput.disabled = false;
            elements.sendBtn.disabled = false;
            elements.loginNotice.style.display = 'none';
            elements.attachmentBtn.disabled = false;
            elements.emojiBtn.disabled = false;
        }
    }
    
    function updateUserRoleDisplay() {
        const roleClasses = ['role-owner', 'role-admin', 'role-member', 'role-visitor'];
        roleClasses.forEach(cls => elements.userName.classList.remove(cls));
        
        switch(currentUser.role) {
            case 'owner':
                elements.userName.classList.add('role-owner');
                break;
            case 'admin':
                elements.userName.classList.add('role-admin');
                break;
            case 'member':
                elements.userName.classList.add('role-member');
                break;
            default:
                elements.userName.classList.add('role-visitor');
        }
    }
    
    // ========== الاتصال بالسيرفر ==========
    function connectToServer() {
        // الاتصال بخادم Socket.IO
        socket = io('http://localhost:3000');
        
        socket.on('connect', () => {
            console.log('✅ متصل بالسيرفر');
            
            // الانضمام للغرفة الافتراضية إذا كان المستخدم مسجلاً
            if (currentUser.token) {
                joinRoom(currentRoom);
            }
        });
        
        socket.on('disconnect', () => {
            console.log('❌ انقطع الاتصال بالسيرفر');
            showError('انقطع الاتصال بالسيرفر. جاري إعادة المحاولة...');
        });
        
        socket.on('connect_error', (error) => {
            console.error('❌ خطأ في الاتصال:', error);
            showError('خطأ في الاتصال بالسيرفر');
        });
        
        // معالجة الأحداث الواردة من السيرفر
        setupSocketEvents();
    }
    
    function setupSocketEvents() {
        // حدث عند الانضمام للغرفة بنجاح
        socket.on('roomJoined', (data) => {
            console.log('✅ انضممت للغرفة:', data.room.name);
            
            // تحديث واجهة الغرفة
            updateRoomUI(data.room);
            
            // تحديث قائمة المستخدمين
            updateUsersList(data.users);
            
            // عرض الرسائل
            displayMessages(data.messages);
            
            // التمرير لآخر رسالة
            scrollToBottom();
        });
        
        // حدث عند استقبال رسالة جديدة
        socket.on('newMessage', (message) => {
            if (message.roomId === currentRoom) {
                displayMessage(message);
                scrollToBottom();
            }
        });
        
        // حدث عند تحديث قائمة المستخدمين
        socket.on('userListUpdate', (data) => {
            if (data.roomId === currentRoom) {
                updateUsersList(data.users);
            }
        });
        
        // حدث عند تغيير حالة مستخدم
        socket.on('userStatusChange', (user) => {
            updateUserStatus(user);
        });
        
        // حدث عند استقبال رسالة خاصة
        socket.on('newPrivateMessage', (message) => {
            handlePrivateMessage(message);
        });
        
        // حدث عند إرسال رسالة خاصة بنجاح
        socket.on('privateMessageSent', (message) => {
            console.log('✅ تم إرسال الرسالة الخاصة');
        });
        
        // حدث عند الكتم
        socket.on('muted', (data) => {
            showWarning(`لقد تم كتمك لمدة 10 دقائق`);
            elements.messageInput.disabled = true;
            elements.sendBtn.disabled = true;
            elements.messageInput.placeholder = data.message;
        });
        
        // حدث عند الطرد
        socket.on('kicked', (data) => {
            if (data.roomId === currentRoom) {
                showError(data.message);
                joinRoom('general'); // العودة للغرفة العامة
            }
        });
        
        // حدث عند حظر مستخدم
        socket.on('userBlocked', (data) => {
            showSuccess(data.message);
        });
        
        // حدث عند حدوث خطأ
        socket.on('error', (data) => {
            showError(data.message);
        });
        
        // إشعارات
        socket.on('notification', (data) => {
            showNotification(data);
        });
    }
    
    // ========== إدارة الغرف ==========
    async function loadRooms() {
        try {
            const response = await fetch('/api/rooms');
            const data = await response.json();
            rooms = data.rooms;
            renderRoomsList();
        } catch (error) {
            console.error('❌ خطأ في تحميل الغرف:', error);
            // استخدام غرف افتراضية في حالة الخطأ
            rooms = [
                { id: 'general', name: 'العمومية', description: 'الغرفة الرئيسية للجميع', color: '#3B82F6', userCount: 0 },
                { id: 'games', name: 'الألعاب', description: 'مناقشة الألعاب والمسابقات', color: '#10B981', userCount: 0 },
                { id: 'friends', name: 'التعارف', description: 'التعارف وبناء الصداقات', color: '#8B5CF6', userCount: 0 },
                { id: 'tech', name: 'التقنية', description: 'مناقشة المواضيع التقنية', color: '#F59E0B', userCount: 0 }
            ];
            renderRoomsList();
        }
    }
    
    function renderRoomsList() {
        elements.roomsList.innerHTML = '';
        
        rooms.forEach(room => {
            const roomElement = document.createElement('div');
            roomElement.className = `room-item ${room.id === currentRoom ? 'active' : ''}`;
            roomElement.innerHTML = `
                <span class="room-icon-small" style="color: ${room.color}">
                    <i class="fas fa-hashtag"></i>
                </span>
                <span class="room-name-small">${room.name}</span>
                <span class="room-count">${room.userCount || 0}</span>
            `;
            
            roomElement.addEventListener('click', () => {
                if (room.id !== currentRoom) {
                    joinRoom(room.id);
                }
            });
            
            elements.roomsList.appendChild(roomElement);
        });
    }
    
    function joinRoom(roomId) {
        if (!socket.connected) {
            showError('لا يوجد اتصال بالسيرفر');
            return;
        }
        
        if (!currentUser.token && currentUser.role !== 'visitor') {
            showLoginModal();
            return;
        }
        
        currentRoom = roomId;
        
        // تحديث واجهة المستخدم
        const room = rooms.find(r => r.id === roomId) || { name: roomId };
        updateRoomUI(room);
        
        // إرسال طلب الانضمام للغرفة
        socket.emit('join', {
            token: currentUser.token,
            roomId: roomId
        });
        
        // تحديث قائمة الغرف
        renderRoomsList();
        
        // مسح الرسائل القديمة
        elements.messagesContainer.innerHTML = '';
        
        // إضافة رسالة ترحيبية
        const welcomeMsg = document.createElement('div');
        welcomeMsg.className = 'welcome-message';
        welcomeMsg.innerHTML = `
            <div class="welcome-icon">
                <i class="fas fa-comments"></i>
            </div>
            <h2>مرحباً بك في ${room.name}</h2>
            <p>جاري تحميل المحادثة...</p>
        `;
        elements.messagesContainer.appendChild(welcomeMsg);
    }
    
    function updateRoomUI(room) {
        elements.currentRoomName.textContent = room.name;
        elements.roomIcon.innerHTML = `<i class="fas fa-hashtag"></i>`;
        elements.roomIcon.style.color = room.color || '#3B82F6';
    }
    
    // ========== إدارة الرسائل ==========
    function displayMessages(messages) {
        elements.messagesContainer.innerHTML = '';
        
        if (messages.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'empty-state';
            emptyMsg.innerHTML = `
                <i class="fas fa-comment-slash"></i>
                <h3>لا توجد رسائل بعد</h3>
                <p>كن أول من يكتب في هذه الغرفة!</p>
            `;
            elements.messagesContainer.appendChild(emptyMsg);
            return;
        }
        
        messages.forEach(message => {
            displayMessage(message);
        });
    }
    
    function displayMessage(message) {
        // إزالة رسالة الترحيب إذا كانت موجودة
        const welcomeMsg = elements.messagesContainer.querySelector('.welcome-message');
        if (welcomeMsg) {
            welcomeMsg.remove();
        }
        
        // إزالة حالة عدم وجود رسائل إذا كانت موجودة
        const emptyState = elements.messagesContainer.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }
        
        const messageElement = document.createElement('div');
        
        if (message.type === 'system') {
            messageElement.className = 'chat-message system';
            messageElement.innerHTML = `
                <div class="system-message ${message.content.includes('كتم') ? 'mute-message' : message.content.includes('طرد') ? 'kick-message' : ''}">
                    ${message.content}
                    <span class="message-time">${formatTime(message.timestamp)}</span>
                </div>
            `;
        } else {
            const isOwnMessage = message.sender === currentUser.username;
            messageElement.className = `chat-message ${isOwnMessage ? 'sent' : 'received'}`;
            
            // تحديد لون ورتبة المرسل
            let senderClass = 'role-member';
            if (message.senderRole === 'owner') senderClass = 'role-owner';
            else if (message.senderRole === 'admin') senderClass = 'role-admin';
            else if (message.senderRole === 'visitor') senderClass = 'role-visitor';
            
            // أيقونة الرتبة
            let roleIcon = '';
            if (message.senderRole === 'owner') roleIcon = '<i class="fas fa-crown role-icon"></i>';
            else if (message.senderRole === 'admin') roleIcon = '<i class="fas fa-shield-alt role-icon"></i>';
            
            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(message.sender)}&background=${message.senderRole === 'owner' ? 'FF6B6B' : message.senderRole === 'admin' ? '8B5CF6' : message.senderRole === 'member' ? '3B82F6' : '6B7280'}&color=fff`;
            
            messageElement.innerHTML = `
                <div class="message-avatar">
                    <img src="${avatarUrl}" alt="${message.sender}">
                </div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-sender ${senderClass}">
                            ${roleIcon}${message.sender}
                        </span>
                        <span class="message-time">${formatTime(message.timestamp)}</span>
                        <div class="message-actions">
                            ${!isOwnMessage ? `<button class="message-action-btn" onclick="replyToUser('${message.sender}')"><i class="fas fa-reply"></i></button>` : ''}
                            ${!isOwnMessage ? `<button class="message-action-btn" onclick="startPrivateChat('${message.sender}')"><i class="fas fa-envelope"></i></button>` : ''}
                        </div>
                    </div>
                    <div class="message-bubble">
                        ${renderMessageContent(message)}
                    </div>
                    ${isOwnMessage ? `<div class="message-status">تم الإرسال</div>` : ''}
                </div>
            `;
            
            // تعيين نمط النص إذا كان موجوداً
            const messageText = messageElement.querySelector('.message-text');
            if (messageText) {
                messageText.style.color = message.senderColor || '#000000';
                messageText.style.fontFamily = message.senderFont || 'inherit';
                
                // حجم النص
                if (message.senderFontSize === 'small') messageText.style.fontSize = '0.9rem';
                else if (message.senderFontSize === 'large') messageText.style.fontSize = '1.1rem';
            }
        }
        
        elements.messagesContainer.appendChild(messageElement);
    }
    
    function renderMessageContent(message) {
        switch (message.type) {
            case 'text':
                return `<div class="message-text">${formatMessageText(message.content)}</div>`;
                
            case 'image':
                return `
                    <div class="message-text">${message.sender} أرسل صورة:</div>
                    <img src="${message.content}" class="message-image" onclick="openImageModal('${message.content}')">
                `;
                
            case 'audio':
                return `
                    <div class="message-text">${message.sender} أرسل تسجيلاً صوتياً:</div>
                    <div class="message-audio">
                        <div class="audio-player">
                            <button class="play-btn" onclick="playAudio(this, '${message.content}')">
                                <i class="fas fa-play"></i>
                            </button>
                            <div class="progress-bar">
                                <div class="progress"></div>
                            </div>
                            <span class="audio-time">00:00</span>
                        </div>
                    </div>
                `;
                
            case 'video':
                return `
                    <div class="message-text">${message.sender} شارك فيديو:</div>
                    <div class="message-video">
                        <div class="video-embed">
                            <img src="https://img.youtube.com/vi/${extractYouTubeId(message.content)}/0.jpg" 
                                 class="video-thumbnail" 
                                 onclick="playYouTubeVideo('${message.content}')">
                            <div class="video-info">
                                <div class="video-title">فيديو يوتيوب</div>
                                <div class="video-channel">${message.content}</div>
                            </div>
                        </div>
                    </div>
                `;
                
            default:
                return `<div class="message-text">${formatMessageText(message.content)}</div>`;
        }
    }
    
    function formatMessageText(text) {
        // تحويل الروابط إلى روابط قابلة للنقر
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, url => {
            return `<a href="${url}" target="_blank" class="message-link">${url}</a>`;
        });
    }
    
    function extractYouTubeId(url) {
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[7].length === 11) ? match[7] : null;
    }
    
    function sendMessage() {
        const content = elements.messageInput.value.trim();
        if (!content) return;
        
        if (!currentUser.token && currentUser.role !== 'member') {
            showLoginModal();
            return;
        }
        
        // إرسال الرسالة
        socket.emit('sendMessage', {
            token: currentUser.token,
            roomId: currentRoom,
            content: content,
            type: 'text'
        });
        
        // مسح حقل الإدخال
        elements.messageInput.value = '';
        elements.messageInput.focus();
        
        // إخفاء معاينة المرفقات
        elements.attachmentPreview.innerHTML = '';
    }
    
    // ========== إدارة المستخدمين ==========
    function updateUsersList(users) {
        elements.usersList.innerHTML = '';
        elements.onlineCount.textContent = users.length;
        elements.roomMembersCount.innerHTML = `<i class="fas fa-user"></i> ${users.length}`;
        
        onlineUsers = users;
        
        if (users.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <i class="fas fa-user-slash"></i>
                <p>لا يوجد مستخدمون متصلون</p>
            `;
            elements.usersList.appendChild(emptyState);
            return;
        }
        
        // ترتيب المستخدمين حسب الرتبة
        const sortedUsers = [...users].sort((a, b) => {
            const roleOrder = { owner: 0, admin: 1, member: 2, visitor: 3 };
            return roleOrder[a.role] - roleOrder[b.role];
        });
        
        sortedUsers.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            
            let roleIcon = '';
            if (user.role === 'owner') roleIcon = '<i class="fas fa-crown"></i>';
            else if (user.role === 'admin') roleIcon = '<i class="fas fa-shield-alt"></i>';
            
            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=${user.role === 'owner' ? 'FF6B6B' : user.role === 'admin' ? '8B5CF6' : user.role === 'member' ? '3B82F6' : '6B7280'}&color=fff`;
            
            userElement.innerHTML = `
                <img src="${avatarUrl}" class="user-avatar-small" alt="${user.username}">
                <div class="user-details">
                    <div class="user-name-small ${user.username === currentUser.username ? 'role-' + user.role : ''}" style="${user.username !== currentUser.username ? `color: ${user.textColor || '#000000'}` : ''}">
                        ${roleIcon}${user.username}
                    </div>
                    <div class="user-role">${getRoleName(user.role)}</div>
                </div>
                <div class="user-status ${user.isOnline ? 'online' : ''}"></div>
            `;
            
            // إضافة أزرار المشرفين
            if ((currentUser.role === 'admin' || currentUser.role === 'owner') && user.username !== currentUser.username) {
                const adminActions = document.createElement('div');
                adminActions.className = 'admin-actions';
                adminActions.innerHTML = `
                    <button class="admin-action-btn mute" onclick="muteUser('${user.username}')">
                        <i class="fas fa-microphone-slash"></i> كتم
                    </button>
                    <button class="admin-action-btn kick" onclick="kickUser('${user.username}')">
                        <i class="fas fa-door-open"></i> طرد
                    </button>
                    <button class="admin-action-btn" onclick="startPrivateChat('${user.username}')">
                        <i class="fas fa-envelope"></i> مراسلة
                    </button>
                `;
                userElement.appendChild(adminActions);
            }
            
            // إضافة حدث النقر لفتح المحادثة الخاصة
            userElement.addEventListener('click', (e) => {
                if (!e.target.closest('.admin-actions')) {
                    showUserProfile(user);
                }
            });
            
            elements.usersList.appendChild(userElement);
        });
    }
    
    function updateUserStatus(user) {
        const userElement = Array.from(elements.usersList.querySelectorAll('.user-item'))
            .find(el => el.querySelector('.user-name-small').textContent.includes(user.username));
        
        if (userElement) {
            const statusDot = userElement.querySelector('.user-status');
            statusDot.classList.toggle('online', user.isOnline);
        }
    }
    
    function getRoleName(role) {
        const roles = {
            owner: 'المالك',
            admin: 'مشرف',
            member: 'عضو',
            visitor: 'زائر'
        };
        return roles[role] || role;
    }
    
    // ========== المحادثات الخاصة ==========
    function handlePrivateMessage(message) {
        // زيادة عدد الرسائل غير المقروءة
        unreadPrivateCount++;
        elements.privateBadge.textContent = unreadPrivateCount;
        elements.privateBadge.classList.add('notification-pulse');
        
        // حفظ الرسالة
        const chatKey = [currentUser.username, message.sender].sort().join(':');
        if (!privateMessages.has(chatKey)) {
            privateMessages.set(chatKey, []);
        }
        privateMessages.get(chatKey).push(message);
        
        // تحديث قائمة المحادثات الخاصة
        updatePrivateChatsList();
        
        // إشعار صوتي
        playNotificationSound();
        
        // إشعار مرئي
        showNotification({
            type: 'privateMessage',
            from: message.sender,
            message: 'رسالة خاصة جديدة'
        });
    }
    
    function updatePrivateChatsList() {
        elements.privateChatsList.innerHTML = '';
        
        if (privateMessages.size === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <i class="fas fa-envelope-open"></i>
                <h3>لا توجد محادثات خاصة</h3>
                <p>ابدأ محادثة خاصة مع أحد الأعضاء</p>
            `;
            elements.privateChatsList.appendChild(emptyState);
            return;
        }
        
        privateMessages.forEach((messages, chatKey) => {
            const participants = chatKey.split(':');
            const otherUser = participants.find(p => p !== currentUser.username);
            const unreadCount = messages.filter(m => !m.read && m.sender !== currentUser.username).length;
            const lastMessage = messages[messages.length - 1];
            
            const chatItem = document.createElement('div');
            chatItem.className = `private-chat-item ${unreadCount > 0 ? 'unread' : ''}`;
            chatItem.innerHTML = `
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser)}&background=3B82F6&color=fff" 
                     class="private-chat-avatar" 
                     alt="${otherUser}">
                <div class="private-chat-details">
                    <div class="private-chat-name">${otherUser}</div>
                    <div class="private-chat-preview">${lastMessage.content.substring(0, 30)}${lastMessage.content.length > 30 ? '...' : ''}</div>
                </div>
                <div class="private-chat-time">${formatTime(lastMessage.timestamp)}</div>
                ${unreadCount > 0 ? `<div class="private-chat-unread">${unreadCount}</div>` : ''}
            `;
            
            chatItem.addEventListener('click', () => {
                openPrivateChat(otherUser);
            });
            
            elements.privateChatsList.appendChild(chatItem);
        });
    }
    
    function startPrivateChat(username) {
        openPrivateChatSidebar();
        openPrivateChat(username);
    }
    
    function openPrivateChat(username) {
        // تنفيذ فتح نافذة المحادثة الخاصة
        // (سيتم تنفيذها في المرحلة التالية)
        showNotification(`فتح محادثة خاصة مع ${username}`);
    }
    
    function openPrivateChatSidebar() {
        elements.privateChatSidebar.classList.add('active');
    }
    
    function closePrivateChatSidebar() {
        elements.privateChatSidebar.classList.remove('active');
    }
    
    // ========== إدارة الملف الشخصي ==========
    function showUserProfile(user) {
        // تنفيذ عرض الملف الشخصي للمستخدم
        // (سيتم تنفيذها في المرحلة التالية)
        showNotification(`عرض ملف ${user.username}`);
    }
    
    function updateProfile() {
        // تحديث الملف الشخصي
        const fontSelect = document.getElementById('fontSelect');
        const colorPicker = document.getElementById('colorPicker');
        const fontSizeOptions = document.querySelectorAll('input[name="fontSize"]');
        
        const newProfile = {
            textColor: colorPicker.value,
            font: fontSelect.value,
            fontSize: Array.from(fontSizeOptions).find(opt => opt.checked)?.value || 'medium'
        };
        
        // تحديث التخزين المحلي
        currentUser.textColor = newProfile.textColor;
        currentUser.font = newProfile.font;
        currentUser.fontSize = newProfile.fontSize;
        
        localStorage.setItem('chatColor', newProfile.textColor);
        localStorage.setItem('chatFont', newProfile.font);
        localStorage.setItem('chatFontSize', newProfile.fontSize);
        
        // تحديث العينة
        updateTextPreview();
        
        // إرسال التحديث للسيرفر
        if (currentUser.token) {
            fetch('/api/update-profile', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${currentUser.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newProfile)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    currentUser.token = data.token;
                    localStorage.setItem('chatToken', data.token);
                    showSuccess('تم تحديث الملف الشخصي بنجاح');
                }
            })
            .catch(error => {
                console.error('❌ خطأ في تحديث الملف الشخصي:', error);
                showError('خطأ في تحديث الملف الشخصي');
            });
        }
    }
    
    function updateTextPreview() {
        const preview = document.getElementById('textPreview');
        const fontSelect = document.getElementById('fontSelect');
        const colorPicker = document.getElementById('colorPicker');
        const fontSizeOptions = document.querySelectorAll('input[name="fontSize"]');
        
        preview.style.fontFamily = fontSelect.value;
        preview.style.color = colorPicker.value;
        
        const selectedSize = Array.from(fontSizeOptions).find(opt => opt.checked)?.value || 'medium';
        if (selectedSize === 'small') preview.style.fontSize = '0.9rem';
        else if (selectedSize === 'medium') preview.style.fontSize = '1rem';
        else if (selectedSize === 'large') preview.style.fontSize = '1.1rem';
    }
    
    // ========== الأدوات المساعدة ==========
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        
        if (diffMins < 1) {
            return 'الآن';
        } else if (diffMins < 60) {
            return `منذ ${diffMins} دقيقة`;
        } else if (diffHours < 24) {
            return `منذ ${diffHours} ساعة`;
        } else {
            return date.toLocaleTimeString('ar-EG', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            });
        }
    }
    
    function scrollToBottom() {
        elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    }
    
    function showError(message) {
        // تنفيذ عرض رسالة خطأ
        console.error('❌', message);
        alert(message);
    }
    
    function showSuccess(message) {
        // تنفيذ عرض رسالة نجاح
        console.log('✅', message);
        alert(message);
    }
    
    function showWarning(message) {
        // تنفيذ عرض رسالة تحذير
        console.warn('⚠️', message);
        alert(message);
    }
    
    function showNotification(data) {
        // تنفيذ عرض إشعار
        console.log('🔔', data);
    }
    
    function playNotificationSound() {
        // تنفيذ تشغيل صوت الإشعار
        const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3');
        audio.volume = 0.3;
        audio.play().catch(e => console.log('❌ لا يمكن تشغيل الصوت:', e));
    }
    
    // ========== إعداد واجهة المستخدم ==========
    function setupUI() {
        // إعداد الأحداث
        setupEventListeners();
        
        // إعداد محرر الإيموجي
        setupEmojiPicker();
        
        // إعداد معاينة النص في الملف الشخصي
        setupProfilePreview();
    }
    
    function setupEventListeners() {
        // زر القائمة الجانبية
        elements.menuBtn.addEventListener('click', () => {
            elements.sidebar.classList.toggle('active');
        });
        
        // زر إرسال الرسالة
        elements.sendBtn.addEventListener('click', sendMessage);
        
        // إرسال الرسالة بالضغط على Enter
        elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // زر الإيموجي
        elements.emojiBtn.addEventListener('click', toggleEmojiPicker);
        
        // زر إرفاق الملفات
        elements.attachmentBtn.addEventListener('click', showAttachmentModal);
        
        // زر المحادثات الخاصة
        elements.privateChatBtn.addEventListener('click', openPrivateChatSidebar);
        
        // زر إغلاق المحادثات الخاصة
        elements.closePrivateBtn.addEventListener('click', closePrivateChatSidebar);
        
        // قائمة المستخدم
        elements.userMenu.addEventListener('click', showProfileModal);
        
        // زر اليوميات
        elements.diaryBtn.addEventListener('click', showDiaryModal);
        
        // إغلاق القائمة الجانبية بالنقر خارجها
        document.addEventListener('click', (e) => {
            if (!elements.sidebar.contains(e.target) && !elements.menuBtn.contains(e.target)) {
                elements.sidebar.classList.remove('active');
            }
            
            if (!elements.privateChatSidebar.contains(e.target) && !elements.privateChatBtn.contains(e.target)) {
                elements.privateChatSidebar.classList.remove('active');
            }
            
            if (!elements.emojiModal.contains(e.target) && !elements.emojiBtn.contains(e.target)) {
                elements.emojiModal.classList.remove('active');
            }
        });
    }
    
    function setupEmojiPicker() {
        const emojis = {
            smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚'],
            animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆'],
            food: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🥦', '🥬'],
            activities: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳']
        };
        
        const emojiGrid = document.getElementById('emojiGrid');
        const emojiCategories = document.querySelectorAll('.emoji-category');
        
        // عرض الإيموجي الافتراضية
        showEmojis('smileys');
        
        // أحداث التبويبات
        emojiCategories.forEach(category => {
            category.addEventListener('click', function() {
                const categoryName = this.getAttribute('data-category');
                
                // تحديث التبويب النشط
                emojiCategories.forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                
                // عرض الإيموجي المحددة
                showEmojis(categoryName);
            });
        });
        
        function showEmojis(category) {
            emojiGrid.innerHTML = '';
            emojis[category].forEach(emoji => {
                const emojiElement = document.createElement('div');
                emojiElement.className = 'emoji-item';
                emojiElement.textContent = emoji;
                emojiElement.addEventListener('click', () => {
                    insertEmoji(emoji);
                });
                emojiGrid.appendChild(emojiElement);
            });
        }
    }
    
    function setupProfilePreview() {
        const fontSelect = document.getElementById('fontSelect');
        const colorPicker = document.getElementById('colorPicker');
        const fontSizeOptions = document.querySelectorAll('input[name="fontSize"]');
        const colorValue = document.getElementById('colorValue');
        
        fontSelect.value = currentUser.font;
        colorPicker.value = currentUser.textColor;
        colorValue.textContent = currentUser.textColor;
        
        fontSizeOptions.forEach(option => {
            if (option.value === currentUser.fontSize) {
                option.checked = true;
            }
        });
        
        fontSelect.addEventListener('change', updateTextPreview);
        colorPicker.addEventListener('input', () => {
            colorValue.textContent = colorPicker.value;
            updateTextPreview();
        });
        fontSizeOptions.forEach(option => {
            option.addEventListener('change', updateTextPreview);
        });
        
        updateTextPreview();
    }
    
    function toggleEmojiPicker() {
        elements.emojiModal.classList.toggle('active');
        
        if (elements.emojiModal.classList.contains('active')) {
            positionEmojiPicker();
        }
    }
    
    function positionEmojiPicker() {
        const rect = elements.emojiBtn.getBoundingClientRect();
        elements.emojiModal.style.bottom = `${window.innerHeight - rect.top + 10}px`;
        elements.emojiModal.style.left = `${rect.left}px`;
    }
    
    function insertEmoji(emoji) {
        const input = elements.messageInput;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const text = input.value;
        
        input.value = text.substring(0, start) + emoji + text.substring(end);
        input.focus();
        input.setSelectionRange(start + emoji.length, start + emoji.length);
        
        elements.emojiModal.classList.remove('active');
    }
    
    function showAttachmentModal() {
        // تنفيذ عرض نافذة إرفاق الملفات
        elements.attachmentModal.classList.add('active');
    }
    
    function showProfileModal() {
        // تنفيذ عرض نافذة الملف الشخصي
        elements.profileModal.classList.add('active');
    }
    
    function showDiaryModal() {
        // تنفيذ عرض نافذة اليوميات
        elements.diaryModal.classList.add('active');
    }
    
    function showLoginModal() {
        // تنفيذ عرض نافذة تسجيل الدخول
        elements.loginModal.classList.add('active');
    }
    
    // ========== وظائف إدارية (للمشرفين) ==========
    window.muteUser = function(username) {
        if (!currentUser.token) return;
        
        if (confirm(`هل تريد كتم ${username} لمدة 10 دقائق؟`)) {
            socket.emit('muteUser', {
                token: currentUser.token,
                roomId: currentRoom,
                targetUsername: username,
                durationMinutes: 10
            });
        }
    };
    
    window.kickUser = function(username) {
        if (!currentUser.token) return;
        
        if (confirm(`هل تريد طرد ${username} من الغرفة؟`)) {
            socket.emit('kickUser', {
                token: currentUser.token,
                roomId: currentRoom,
                targetUsername: username
            });
        }
    };
    
    window.replyToUser = function(username) {
        elements.messageInput.value = `@${username} `;
        elements.messageInput.focus();
    };
    
    window.startPrivateChat = function(username) {
        startPrivateChat(username);
    };
    
    window.openImageModal = function(imageUrl) {
        // تنفيذ عرض الصورة في نافذة منبثقة
        window.open(imageUrl, '_blank');
    };
    
    window.playAudio = function(button, audioUrl) {
        // تنفيذ تشغيل التسجيل الصوتي
        const audio = new Audio(audioUrl);
        audio.play();
        
        const playBtn = button.querySelector('i');
        playBtn.classList.toggle('fa-play');
        playBtn.classList.toggle('fa-pause');
        
        audio.addEventListener('ended', () => {
            playBtn.classList.toggle('fa-play');
            playBtn.classList.toggle('fa-pause');
        });
    };
    
    window.playYouTubeVideo = function(videoUrl) {
        // تنفيذ تشغيل فيديو اليوتيوب
        window.open(videoUrl, '_blank');
    };
    
    // ========== بدء التطبيق ==========
    initApp();
});
