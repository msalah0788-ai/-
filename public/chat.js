// تهيئة التطبيق
class ChatApplication {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.users = [];
        this.messages = [];
        this.privateChats = {};
        this.replyTo = null;
        this.currentPrivateChat = null;
        
        this.init();
    }
    
    async init() {
        // التحقق من تسجيل الدخول
        await this.checkAuthentication();
        
        // تهيئة Socket.IO
        this.initSocket();
        
        // إعداد واجهة المستخدم
        this.setupUI();
        
        // تحميل البيانات الأولية
        this.loadInitialData();
        
        // إعداد المستمعين للأحداث
        this.setupEventListeners();
    }
    
    async checkAuthentication() {
        try {
            const response = await fetch('/api/check-auth');
            const data = await response.json();
            
            if (!data.authenticated) {
                window.location.href = '/';
                return;
            }
            
            this.currentUser = data.user;
            this.updateUserInterface();
        } catch (error) {
            console.error('خطأ في التحقق من المصادقة:', error);
            window.location.href = '/';
        }
    }
    
    initSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('✅ متصل بالخادم');
            
            // الانضمام للدردشة
            this.socket.emit('join-chat', {
                id: this.currentUser.id,
                username: this.currentUser.username,
                role: this.currentUser.role
            });
        });
        
        this.socket.on('new-message', (message) => {
            this.addMessage(message);
            this.playMessageSound();
        });
        
        this.socket.on('private-message', (message) => {
            this.addPrivateMessage(message);
            this.playNotificationSound();
            this.showNotification('رسالة خاصة', `رسالة جديدة من ${message.senderName}`);
        });
        
        this.socket.on('update-users', (data) => {
            this.updateUsersList(data.online, data.all);
        });
        
        this.socket.on('update-top-interactors', (users) => {
            this.updateTopInteractors(users);
        });
        
        this.socket.on('update-richest', (users) => {
            this.updateRichestList(users);
        });
        
        this.socket.on('gold-received', (data) => {
            this.showGoldNotification(data);
        });
        
        this.socket.on('role-purchased', (data) => {
            this.onRolePurchased(data);
        });
        
        this.socket.on('muted-notification', (data) => {
            this.showMuteNotification(data);
        });
        
        this.socket.on('error', (error) => {
            this.showError(error.message);
        });
        
        this.socket.on('user-joined', (userData) => {
            this.showUserJoinEffect(userData);
        });
        
        this.socket.on('user-left', (userData) => {
            this.showUserLeaveEffect(userData);
        });
    }
    
    setupUI() {
        // تحديث معلومات المستخدم
        this.updateUserInterface();
        
        // إعداد تبديل الشريط الجانبي
        document.getElementById('toggleSidebar').addEventListener('click', () => {
            this.toggleSidebar('usersSidebar');
        });
        
        document.getElementById('toggleMenu').addEventListener('click', () => {
            this.toggleSidebar('menuSidebar');
        });
        
        // إعداد زر القائمة الرئيسية
        document.getElementById('mainMenuToggle').addEventListener('click', () => {
            this.toggleSidebar('usersSidebar');
        });
        
        // إعداد أزرار القوائم
        document.querySelectorAll('.menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchMenu(e.target.closest('.menu-btn').dataset.target);
            });
        });
        
        // إعداد زر الإرسال
        document.getElementById('sendMessage').addEventListener('click', () => {
            this.sendMessage();
        });
        
        // إرسال بالضغط على Enter
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // إعداد تبديل الوضع
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // إعداد أزرار الوسائط
        this.setupMediaButtons();
        
        // إعداد أزرار الإشارات الخاصة
        this.setupSignalButtons();
        
        // إعداد زر الدردشة الخاصة
        document.getElementById('privateChatBtn').addEventListener('click', () => {
            this.togglePrivateChat();
        });
        
        // إعداد زر الإعدادات
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openSettings();
        });
        
        // إعداد زر طلبات الصداقة
        document.getElementById('friendRequestsBtn').addEventListener('click', () => {
            this.openFriendRequests();
        });
        
        // إعداد زر التأثيرات
        document.getElementById('effectsBtn').addEventListener('click', () => {
            this.openEffectsModal();
        });
        
        // إعداد أزرار شراء الرتب
        document.querySelectorAll('.buy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const role = e.target.closest('.buy-btn').dataset.role;
                this.purchaseRole(role);
            });
        });
    }
    
    updateUserInterface() {
        if (!this.currentUser) return;
        
        // تحديث اسم المستخدم
        document.getElementById('currentUsername').textContent = this.currentUser.username;
        
        // تحديث الرتبة
        const roleElement = document.getElementById('currentUserRole');
        roleElement.textContent = this.currentUser.role;
        roleElement.className = 'user-role ' + this.getRoleClass(this.currentUser.role);
        
        // تحديث الذهب في الواجهة إذا كان موجوداً
        if (this.currentUser.gold !== undefined) {
            this.updateGoldDisplay(this.currentUser.gold);
        }
        
        // إظهار/إخفاء علامة تبويب الإدارة
        if (['مالك', 'اونر', 'ادمن'].includes(this.currentUser.role)) {
            document.getElementById('adminTab').style.display = 'block';
        } else {
            document.getElementById('adminTab').style.display = 'none';
        }
    }
    
    getRoleClass(role) {
        const roleClasses = {
            'مالك': 'role-owner',
            'اونر': 'role-admin',
            'ادمن': 'role-admin',
            'عضو مميز': 'role-vip',
            'عضو': 'role-member',
            'ضيف': 'role-guest'
        };
        return roleClasses[role] || 'role-member';
    }
    
    toggleSidebar(sidebarId) {
        const sidebar = document.getElementById(sidebarId);
        const toggleBtn = sidebar.querySelector('.toggle-btn i');
        
        sidebar.classList.toggle('active');
        
        if (sidebar.classList.contains('active')) {
            if (sidebarId === 'usersSidebar') {
                toggleBtn.classList.remove('fa-chevron-right');
                toggleBtn.classList.add('fa-chevron-left');
            } else {
                toggleBtn.classList.remove('fa-chevron-left');
                toggleBtn.classList.add('fa-chevron-right');
            }
        } else {
            if (sidebarId === 'usersSidebar') {
                toggleBtn.classList.remove('fa-chevron-left');
                toggleBtn.classList.add('fa-chevron-right');
            } else {
                toggleBtn.classList.remove('fa-chevron-right');
                toggleBtn.classList.add('fa-chevron-left');
            }
        }
        
        // تحديث عرض المحتوى الرئيسي
        this.updateMainContentMargin();
    }
    
    updateMainContentMargin() {
        const mainContent = document.querySelector('.main-content');
        const leftSidebar = document.getElementById('usersSidebar');
        const rightSidebar = document.getElementById('menuSidebar');
        
        let margin = 0;
        
        if (window.innerWidth > 992) {
            margin = (leftSidebar.classList.contains('active') ? 300 : 0) +
                    (rightSidebar.classList.contains('active') ? 300 : 0);
        } else if (window.innerWidth > 768) {
            margin = rightSidebar.classList.contains('active') ? 250 : 0;
        } else {
            margin = 0;
        }
        
        mainContent.style.margin = `0 ${margin}px`;
    }
    
    switchMenu(menuId) {
        // تحديث الأزرار النشطة
        document.querySelectorAll('.menu-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelector(`.menu-btn[data-target="${menuId}"]`).classList.add('active');
        
        // إظهار المحتوى المناسب
        document.querySelectorAll('.menu-section').forEach(section => {
            section.classList.remove('active');
        });
        
        document.getElementById(`${menuId}Section`).classList.add('active');
    }
    
    async sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        
        if (!message || !this.socket || !this.currentUser) return;
        
        const messageData = {
            senderId: this.currentUser.id,
            senderName: this.currentUser.username,
            senderRole: this.currentUser.role,
            content: message,
            type: 'text',
            replyTo: this.replyTo
        };
        
        this.socket.emit('send-message', messageData);
        
        // إضافة رسالة مؤقتة
        this.addTempMessage({
            ...messageData,
            _id: 'temp-' + Date.now(),
            timestamp: new Date()
        });
        
        // مسح الحقل وإعادة التركيز
        input.value = '';
        input.focus();
        
        // إزالة معاينة الرد
        this.clearReply();
    }
    
    addMessage(message) {
        // إزالة الرسالة المؤقتة إذا وجدت
        const tempMessage = document.querySelector(`[data-id="temp-${message._id}"]`);
        if (tempMessage) {
            tempMessage.remove();
        }
        
        const container = document.getElementById('messagesContainer');
        const messageElement = this.createMessageElement(message);
        
        container.appendChild(messageElement);
        
        // التمرير للأسفل
        container.scrollTop = container.scrollHeight;
        
        // إضافة تأثير للرسائل الخاصة بالمالك أو الأونر
        if (['مالك', 'اونر'].includes(message.senderRole)) {
            this.addMessageEffect(messageElement, message.senderRole);
        }
    }
    
    createMessageElement(message) {
        const div = document.createElement('div');
        div.className = `message ${message.senderRole === 'system' ? 'system' : 'received'} ${this.getRoleClass(message.senderRole)}`;
        div.dataset.id = message._id;
        
        let content = message.content;
        
        // تحويل الروابط
        content = this.linkify(content);
        
        // إضافة الرد إذا كان موجوداً
        let replyHTML = '';
        if (message.replyTo) {
            replyHTML = `
                <div class="message-reply" onclick="chatApp.scrollToMessage('${message.replyTo._id}')">
                    <strong>${message.replyTo.senderName}:</strong> ${message.replyTo.content.substring(0, 50)}...
                </div>
            `;
        }
        
        div.innerHTML = `
            ${message.senderRole !== 'system' ? `
                <div class="message-header">
                    <span class="message-sender" style="color: ${this.getRoleColor(message.senderRole)}">
                        ${message.senderName}
                    </span>
                    <span class="message-role ${this.getRoleClass(message.senderRole)}">
                        ${message.senderRole}
                    </span>
                </div>
            ` : ''}
            ${replyHTML}
            <div class="message-content">${content}</div>
            <div class="message-time">${this.formatTime(message.timestamp)}</div>
            <div class="message-actions">
                <button class="message-action" onclick="chatApp.replyToMessage('${message._id}')" title="رد">
                    <i class="fas fa-reply"></i>
                </button>
                ${this.canDeleteMessage(message) ? `
                    <button class="message-action" onclick="chatApp.deleteMessage('${message._id}')" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        `;
        
        return div;
    }
    
    linkify(text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, url => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        });
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    getRoleColor(role) {
        const roleColors = {
            'مالك': '#FFD700',
            'اونر': '#C0C0C0',
            'ادمن': '#FF6B6B',
            'عضو مميز': '#48dbfb',
            'عضو': '#1dd1a1',
            'ضيف': '#f368e0'
        };
        return roleColors[role] || '#666666';
    }
    
    canDeleteMessage(message) {
        if (!this.currentUser) return false;
        
        if (this.currentUser.role === 'مالك') return true;
        if (this.currentUser.role === 'اونr' && message.senderRole !== 'مالك') return true;
        if (this.currentUser.role === 'ادمن' && !['مالك', 'اونر'].includes(message.senderRole)) return true;
        
        return false;
    }
    
    addTempMessage(message) {
        const container = document.getElementById('messagesContainer');
        const messageElement = this.createMessageElement(message);
        messageElement.style.opacity = '0.5';
        container.appendChild(messageElement);
        container.scrollTop = container.scrollHeight;
    }
    
    clearReply() {
        this.replyTo = null;
        const preview = document.getElementById('replyPreview');
        preview.classList.remove('active');
        preview.innerHTML = '';
    }
    
    replyToMessage(messageId) {
        const message = this.messages.find(m => m._id === messageId);
        if (!message) return;
        
        this.replyTo = message;
        
        const preview = document.getElementById('replyPreview');
        preview.innerHTML = `
            <div class="reply-info">
                <i class="fas fa-reply"></i>
                الرد على ${message.senderName}: ${message.content.substring(0, 30)}...
            </div>
            <button class="cancel-reply" onclick="chatApp.clearReply()">
                <i class="fas fa-times"></i>
            </button>
        `;
        preview.classList.add('active');
        
        document.getElementById('messageInput').focus();
    }
    
    scrollToMessage(messageId) {
        const messageElement = document.querySelector(`[data-id="${messageId}"]`);
        if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            messageElement.style.animation = 'highlight 2s';
            
            // إزالة التمييز بعد 2 ثانية
            setTimeout(() => {
                messageElement.style.animation = '';
            }, 2000);
        }
    }
    
    deleteMessage(messageId) {
        if (!confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;
        
        this.socket.emit('delete-message', {
            messageId: messageId,
            userId: this.currentUser.id
        });
    }
    
    updateUsersList(onlineUsers, allUsers) {
        this.users = allUsers;
        
        const onlineList = document.getElementById('onlineUsers');
        const offlineList = document.getElementById('offlineUsers');
        const onlineCount = document.getElementById('onlineCount');
        const totalMembers = document.getElementById('totalMembers');
        
        onlineList.innerHTML = '';
        offlineList.innerHTML = '';
        
        let onlineCountNum = 0;
        
        allUsers.forEach(user => {
            const userElement = this.createUserElement(user);
            
            if (user.isOnline) {
                onlineList.appendChild(userElement);
                onlineCountNum++;
            } else {
                offlineList.appendChild(userElement);
            }
        });
        
        onlineCount.textContent = onlineCountNum;
        totalMembers.textContent = allUsers.length;
    }
    
    createUserElement(user) {
        const div = document.createElement('div');
        div.className = `user-item ${user.isOnline ? 'online' : 'offline'}`;
        div.dataset.userId = user._id;
        
        div.innerHTML = `
            <img src="${user.profileImage || 'https://via.placeholder.com/40'}" alt="صورة ${user.username}" class="user-avatar">
            <div class="user-info">
                <div class="user-name">${user.username}</div>
                <div class="user-details">
                    <span class="user-role ${this.getRoleClass(user.role)}">${user.role}</span>
                    ${user.gold > 0 ? `
                        <span class="user-gold">
                            <i class="fas fa-coins"></i>
                            ${user.gold.toLocaleString()}
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
        
        div.addEventListener('click', () => {
            this.openUserProfile(user);
        });
        
        return div;
    }
    
    openUserProfile(user) {
        // افتح نافذة البروفايل
        if (user._id === this.currentUser.id) {
            this.openSettings('profile');
        } else {
            this.showProfileModal(user);
        }
    }
    
    updateTopInteractors(users) {
        const container = document.getElementById('activeList');
        container.innerHTML = '';
        
        users.forEach((user, index) => {
            const item = document.createElement('div');
            item.className = 'active-item';
            
            item.innerHTML = `
                <span class="rank-number rank-${index + 1}">${index + 1}</span>
                <img src="${user.profileImage || 'https://via.placeholder.com/30'}" alt="صورة ${user.username}" class="user-avatar" style="width: 30px; height: 30px;">
                <div class="user-info">
                    <div class="user-name">${user.username}</div>
                    <div class="user-details">
                        <span class="user-role ${this.getRoleClass(user.role)}">${user.role}</span>
                    </div>
                </div>
                <div class="active-points">
                    <i class="fas fa-fire"></i>
                    ${user.interactionPoints.toLocaleString()}
                </div>
            `;
            
            container.appendChild(item);
        });
    }
    
    updateRichestList(users) {
        const container = document.getElementById('richList');
        container.innerHTML = '';
        
        users.forEach((user, index) => {
            const item = document.createElement('div');
            item.className = 'rich-item';
            
            item.innerHTML = `
                <span class="rank-number rank-${index + 1}">${index + 1}</span>
                <img src="${user.profileImage || 'https://via.placeholder.com/30'}" alt="صورة ${user.username}" class="user-avatar" style="width: 30px; height: 30px;">
                <div class="user-info">
                    <div class="user-name">${user.username}</div>
                    <div class="user-details">
                        <span class="user-role ${this.getRoleClass(user.role)}">${user.role}</span>
                    </div>
                </div>
                <div class="rich-gold">
                    <i class="fas fa-coins"></i>
                    ${user.gold.toLocaleString()}
                </div>
            `;
            
            container.appendChild(item);
        });
    }
    
    setupMediaButtons() {
        // إرفاق صورة
        document.getElementById('attachImage').addEventListener('click', () => {
            this.attachMedia('image');
        });
        
        // إرفاق فيديو
        document.getElementById('attachVideo').addEventListener('click', () => {
            this.attachMedia('video');
        });
        
        // إرفاق صوت
        document.getElementById('attachAudio').addEventListener('click', () => {
            this.attachMedia('audio');
        });
        
        // رابط يوتيوب
        document.getElementById('attachYoutube').addEventListener('click', () => {
            this.attachYoutube();
        });
        
        // الميكروفون
        document.getElementById('toggleMic').addEventListener('click', () => {
            this.toggleMicrophone();
        });
    }
    
    setupSignalButtons() {
        document.querySelectorAll('.signal-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const signal = e.target.closest('.signal-btn').dataset.signal;
                this.sendSignal(signal);
            });
        });
    }
    
    sendSignal(signal) {
        const input = document.getElementById('messageInput');
        input.value += signal + ' ';
        input.focus();
    }
    
    attachMedia(type) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = type === 'image' ? 'image/*' : type === 'video' ? 'video/*' : 'audio/*';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.uploadMedia(file, type);
            }
        };
        
        input.click();
    }
    
    async uploadMedia(file, type) {
        // هنا يمكنك إضافة منطق رفع الملفات
        // لأغراض العرض، سنضيف رسالة نصية فقط
        
        const message = `📎 ${type === 'image' ? 'صورة' : type === 'video' ? 'فيديو' : 'صوت'} مرفق`;
        
        const input = document.getElementById('messageInput');
        input.value = message;
    }
    
    attachYoutube() {
        const url = prompt('أدخل رابط فيديو اليوتيوب:');
        if (url) {
            const input = document.getElementById('messageInput');
            input.value = `🎬 ${url}`;
        }
    }
    
    toggleMicrophone() {
        const micBtn = document.getElementById('toggleMic');
        const isActive = micBtn.classList.toggle('active');
        
        if (isActive) {
            // بدء تسجيل الصوت
            micBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
            this.showNotification('الميكروفون', 'جاري تسجيل الصوت...');
        } else {
            // إيقاف تسجيل الصوت
            micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            this.showNotification('الميكروفون', 'تم إيقاف التسجيل');
        }
    }
    
    toggleTheme() {
        const body = document.body;
        const themeBtn = document.getElementById('themeToggle');
        
        if (body.classList.contains('light-mode')) {
            body.classList.remove('light-mode');
            body.classList.add('dark-mode');
            themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
            localStorage.setItem('chat-theme', 'dark');
        } else {
            body.classList.remove('dark-mode');
            body.classList.add('light-mode');
            themeBtn.innerHTML = '<i class="fas fa-moon"></i>';
            localStorage.setItem('chat-theme', 'light');
        }
    }
    
    togglePrivateChat() {
        const privateWindow = document.getElementById('privateChatWindow');
        privateWindow.classList.toggle('active');
    }
    
    addPrivateMessage(message) {
        if (!this.privateChats[message.senderId]) {
            this.privateChats[message.senderId] = [];
        }
        
        this.privateChats[message.senderId].push(message);
        
        // تحديث واجهة الدردشة الخاصة
        this.updatePrivateChat(message.senderId);
    }
    
    updatePrivateChat(userId) {
        const container = document.getElementById('privateMessages');
        container.innerHTML = '';
        
        if (this.privateChats[userId]) {
            this.privateChats[userId].forEach(message => {
                const div = document.createElement('div');
                div.className = `private-message ${message.senderId === userId ? 'received' : 'sent'}`;
                div.textContent = message.content;
                container.appendChild(div);
            });
        }
        
        container.scrollTop = container.scrollHeight;
    }
    
    openSettings(tab = 'profile') {
        const modal = document.getElementById('settingsModal');
        modal.classList.add('active');
        
        // تفعيل علامة التبويب المطلوبة
        this.switchSettingsTab(tab);
        
        // تحميل بيانات البروفايل
        if (tab === 'profile') {
            this.loadProfileData();
        }
    }
    
    switchSettingsTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        
        document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`${tab}Tab`).classList.add('active');
    }
    
    async loadProfileData() {
        try {
            const response = await fetch(`/api/profile/${this.currentUser.id}`);
            const profile = await response.json();
            
            this.displayProfileData(profile);
        } catch (error) {
            console.error('خطأ في تحميل بيانات البروفايل:', error);
        }
    }
    
    displayProfileData(profile) {
        const container = document.getElementById('profileTab');
        
        container.innerHTML = `
            <div class="profile-header">
                <div class="profile-image-container">
                    <img src="${profile.profileImage || 'https://via.placeholder.com/150'}" 
                         alt="صورة البروفايل" 
                         class="profile-image">
                    <button class="change-image-btn" onclick="chatApp.changeProfileImage()">
                        <i class="fas fa-camera"></i>
                    </button>
                </div>
                <div class="profile-info">
                    <h4>${profile.username}</h4>
                    <div class="profile-role ${this.getRoleClass(profile.role)}">
                        ${profile.role}
                    </div>
                    <div class="profile-stats">
                        <div class="stat">
                            <i class="fas fa-coins"></i>
                            <span>${profile.gold.toLocaleString()} ذهب</span>
                        </div>
                        <div class="stat">
                            <i class="fas fa-fire"></i>
                            <span>${profile.interactionPoints.toLocaleString()} نقطة تفاعل</span>
                        </div>
                        <div class="stat">
                            <i class="fas fa-hashtag"></i>
                            <span>رقم تسلسلي: ${profile.serialNumber}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="profile-details">
                <div class="detail-group">
                    <label><i class="fas fa-venus-mars"></i> الجنس</label>
                    <select id="profileGender">
                        <option value="ذكر" ${profile.gender === 'ذكر' ? 'selected' : ''}>ذكر</option>
                        <option value="انثى" ${profile.gender === 'انثى' ? 'selected' : ''}>انثى</option>
                    </select>
                </div>
                
                <div class="detail-group">
                    <label><i class="fas fa-birthday-cake"></i> العمر</label>
                    <input type="number" id="profileAge" value="${profile.age}" min="1" max="99">
                </div>
                
                <div class="detail-group">
                    <label><i class="fas fa-flag"></i> البلد</label>
                    <input type="text" id="profileCountry" value="${profile.country || ''}" placeholder="أدخل بلدك">
                </div>
                
                <div class="detail-group">
                    <label><i class="fas fa-calendar"></i> تاريخ الانضمام</label>
                    <input type="text" value="${new Date(profile.joinDate).toLocaleDateString('ar-SA')}" disabled>
                </div>
                
                ${['عضو مميز', 'ادمن', 'اونر', 'مالك'].includes(profile.role) ? `
                    <div class="premium-features">
                        <h5><i class="fas fa-crown"></i> المميزات الخاصة</h5>
                        
                        <div class="feature">
                            <label><i class="fas fa-music"></i> أغنية البروفايل</label>
                            <input type="text" id="profileSong" value="${profile.profileSong || ''}" placeholder="رابط ملف MP3 (30 ثانية كحد أقصى)">
                        </div>
                        
                        <div class="feature">
                            <label><i class="fas fa-palette"></i> لون الاسم</label>
                            <input type="color" id="profileNameColor" value="${profile.nameColor || '#000000'}">
                        </div>
                        
                        <div class="feature">
                            <label><i class="fas fa-image"></i> خلفية البروفايل</label>
                            <input type="text" id="profileBackground" value="${profile.profileBackground || ''}" placeholder="رابط صورة الخلفية">
                        </div>
                        
                        <div class="feature">
                            <label><i class="fas fa-border-style"></i> إطار الصورة</label>
                            <select id="profileFrame">
                                <option value="">بدون إطار</option>
                                <option value="gold" ${profile.profileFrame === 'gold' ? 'selected' : ''}>إطار ذهبي</option>
                                <option value="animated" ${profile.profileFrame === 'animated' ? 'selected' : ''}>إطار متحرك</option>
                            </select>
                        </div>
                    </div>
                ` : ''}
                
                <div class="profile-actions">
                    <button class="btn btn-primary" onclick="chatApp.saveProfile()">
                        <i class="fas fa-save"></i> حفظ التغييرات
                    </button>
                </div>
            </div>
        `;
    }
    
    async saveProfile() {
        const profileData = {
            gender: document.getElementById('profileGender').value,
            age: document.getElementById('profileAge').value,
            country: document.getElementById('profileCountry').value,
            nameColor: document.getElementById('profileNameColor')?.value,
            profileBackground: document.getElementById('profileBackground')?.value,
            profileFrame: document.getElementById('profileFrame')?.value,
            profileSong: document.getElementById('profileSong')?.value
        };
        
        try {
            const response = await fetch(`/api/profile/${this.currentUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(profileData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess('تم حفظ التغييرات بنجاح');
                
                // تحديث بيانات المستخدم
                this.currentUser = { ...this.currentUser, ...profileData };
                this.updateUserInterface();
            } else {
                this.showError(result.message);
            }
        } catch (error) {
            console.error('خطأ في حفظ البروفايل:', error);
            this.showError('حدث خطأ أثناء حفظ التغييرات');
        }
    }
    
    changeProfileImage() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                // هنا يمكنك إضافة منطق رفع الصورة
                this.showSuccess('تم رفع الصورة بنجاح');
            }
        };
        
        input.click();
    }
    
    openFriendRequests() {
        this.showNotification('طلبات الصداقة', 'هذه الخاصية قيد التطوير');
    }
    
    openEffectsModal() {
        const modal = document.getElementById('effectsModal');
        modal.classList.add('active');
        
        modal.innerHTML = `
            <div class="effects-content">
                <div class="effects-header">
                    <h3><i class="fas fa-magic"></i> التأثيرات الخاصة</h3>
                    <button class="close-effects" onclick="chatApp.closeModal('effectsModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="effects-grid">
                    <div class="effect-option" data-effect="confetti">
                        <i class="fas fa-birthday-cake"></i>
                        <span>تأثير كونفيتي</span>
                    </div>
                    
                    <div class="effect-option" data-effect="fireworks">
                        <i class="fas fa-fire"></i>
                        <span>ألعاب نارية</span>
                    </div>
                    
                    <div class="effect-option" data-effect="hearts">
                        <i class="fas fa-heart"></i>
                        <span>قلوب متطايرة</span>
                    </div>
                    
                    <div class="effect-option" data-effect="stars">
                        <i class="fas fa-star"></i>
                        <span>نجوم لامعة</span>
                    </div>
                    
                    <div class="effect-option" data-effect="rain">
                        <i class="fas fa-cloud-rain"></i>
                        <span>مطر ذهبي</span>
                    </div>
                    
                    <div class="effect-option" data-effect="sparkles">
                        <i class="fas fa-sparkles"></i>
                        <span>شرارات</span>
                    </div>
                </div>
                
                <div class="effects-info">
                    <p><i class="fas fa-info-circle"></i> يمكنك استخدام التأثيرات لإضافة لمسة جميلة لرسائلك</p>
                </div>
            </div>
        `;
        
        // إضافة مستمعي الأحداث للتأثيرات
        modal.querySelectorAll('.effect-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const effect = e.currentTarget.dataset.effect;
                this.applyEffect(effect);
            });
        });
    }
    
    applyEffect(effect) {
        const effects = {
            confetti: () => this.createConfetti(),
            fireworks: () => this.createFireworks(),
            hearts: () => this.createHearts(),
            stars: () => this.createStars(),
            rain: () => this.createRain(),
            sparkles: () => this.createSparkles()
        };
        
        if (effects[effect]) {
            effects[effect]();
            this.closeModal('effectsModal');
        }
    }
    
    createConfetti() {
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
        
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'effect';
            confetti.style.cssText = `
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                width: 10px;
                height: 10px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                border-radius: 50%;
                position: fixed;
                z-index: 9999;
            `;
            
            document.getElementById('userEffects').appendChild(confetti);
            
            setTimeout(() => {
                confetti.remove();
            }, 2000);
        }
    }
    
    createFireworks() {
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                const x = Math.random() * 100;
                const y = Math.random() * 100;
                
                for (let j = 0; j < 30; j++) {
                    const particle = document.createElement('div');
                    particle.className = 'effect';
                    particle.style.cssText = `
                        left: ${x}%;
                        top: ${y}%;
                        width: 4px;
                        height: 4px;
                        background: ${['#ff0000', '#ffff00', '#00ff00'][j % 3]};
                        border-radius: 50%;
                        position: fixed;
                        z-index: 9999;
                    `;
                    
                    document.getElementById('userEffects').appendChild(particle);
                    
                    // تحريك الجسيم
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 2 + Math.random() * 3;
                    
                    let posX = x;
                    let posY = y;
                    
                    const move = () => {
                        posX += Math.cos(angle) * speed;
                        posY += Math.sin(angle) * speed;
                        
                        particle.style.left = posX + '%';
                        particle.style.top = posY + '%';
                        
                        if (posX < 0 || posX > 100 || posY < 0 || posY > 100) {
                            particle.remove();
                        } else {
                            requestAnimationFrame(move);
                        }
                    };
                    
                    move();
                    
                    setTimeout(() => {
                        particle.remove();
                    }, 1000);
                }
            }, i * 100);
        }
    }
    
    createHearts() {
        for (let i = 0; i < 30; i++) {
            setTimeout(() => {
                const heart = document.createElement('div');
                heart.className = 'effect';
                heart.innerHTML = '❤️';
                heart.style.cssText = `
                    left: ${Math.random() * 100}%;
                    top: 100%;
                    font-size: 24px;
                    position: fixed;
                    z-index: 9999;
                `;
                
                document.getElementById('userEffects').appendChild(heart);
                
                // تحريك القلب
                let posY = 100;
                const move = () => {
                    posY -= 1;
                    heart.style.top = posY + '%';
                    
                    if (posY > -10) {
                        requestAnimationFrame(move);
                    } else {
                        heart.remove();
                    }
                };
                
                move();
            }, i * 100);
        }
    }
    
    createStars() {
        // تنفيذ مشابه لـ createHearts مع نجوم
    }
    
    createRain() {
        // تنفيذ مشابه لـ createHearts مع قطرات
    }
    
    createSparkles() {
        // تنفيذ مشابه لـ createHearts مع شرارات
    }
    
    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }
    
    purchaseRole(role) {
        if (!confirm(`هل أنت متأكد من شراء رتبة ${role}؟`)) return;
        
        this.socket.emit('buy-role', {
            userId: this.currentUser.id,
            role: role
        });
    }
    
    onRolePurchased(data) {
        this.showSuccess(`مبروك! تمت ترقيتك إلى رتبة ${data.role}`);
        
        // تحديث بيانات المستخدم
        this.currentUser.role = data.role;
        this.currentUser.gold = data.newGold;
        
        this.updateUserInterface();
    }
    
    showGoldNotification(data) {
        const notification = document.createElement('div');
        notification.className = 'gold-notification';
        notification.innerHTML = `
            <i class="fas fa-coins"></i>
            <div>
                <strong>هدية ذهبية!</strong>
                <p>تلقت ${data.amount.toLocaleString()} ذهب من ${data.from}</p>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // إزالة الإشعار بعد 5 ثوانٍ
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
    
    showMuteNotification(data) {
        const durationText = {
            '5m': '5 دقائق',
            '1d': '24 ساعة',
            'permanent': 'مؤبد'
        }[data.duration] || data.duration;
        
        this.showError(`تم كتمك لمدة ${durationText}${data.reason ? `، السبب: ${data.reason}` : ''}`);
    }
    
    showUserJoinEffect(userData) {
        if (userData.role === 'مالك') {
            this.createFireworks();
            this.showNotification('المالك', `🔥 ${userData.username} دخل الغرفة!`);
        } else if (userData.role === 'اونر') {
            this.createSparkles();
            this.showNotification('الأونر', `✨ ${userData.username} دخل الغرفة!`);
        } else if (userData.role === 'ادمن') {
            this.createStars();
            this.showNotification('الأدمن', `⭐ ${userData.username} دخل الغرفة!`);
        }
    }
    
    showUserLeaveEffect(userData) {
        // يمكن إضافة تأثيرات لمغادرة المستخدمين
    }
    
    showNotification(title, message) {
        // تنفيذ نظام الإشعارات
        console.log(`[${title}] ${message}`);
        
        // يمكنك استخدام مكتبة إشعارات هنا
    }
    
    showSuccess(message) {
        this.showNotification('نجاح', message);
    }
    
    showError(message) {
        this.showNotification('خطأ', message);
    }
    
    playMessageSound() {
        // تشغيل صوت الرسائل
        const audio = new Audio('message.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {});
    }
    
    playNotificationSound() {
        // تشغيل صوت الإشعارات
        const audio = new Audio('notification.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {});
    }
    
    updateGoldDisplay(gold) {
        // تحديث عرض الذهب في الواجهة
        const goldElements = document.querySelectorAll('.user-gold');
        goldElements.forEach(el => {
            el.innerHTML = `<i class="fas fa-coins"></i> ${gold.toLocaleString()}`;
        });
    }
    
    loadInitialData() {
        // تحميل الرسائل السابقة
        fetch('/api/messages')
            .then(res => res.json())
            .then(messages => {
                this.messages = messages;
                messages.forEach(message => this.addMessage(message));
            })
            .catch(error => console.error('خطأ في تحميل الرسائل:', error));
        
        // تحميل قائمة الأثرياء
        fetch('/api/richest')
            .then(res => res.json())
            .then(users => this.updateRichestList(users))
            .catch(error => console.error('خطأ في تحميل قائمة الأثرياء:', error));
        
        // تحميل أكثر المتفاعلين
        fetch('/api/top-interactors')
            .then(res => res.json())
            .then(users => this.updateTopInteractors(users))
            .catch(error => console.error('خطأ في تحميل أكثر المتفاعلين:', error));
    }
    
    setupEventListeners() {
        // إغلاق الإعدادات
        document.getElementById('closeSettings').addEventListener('click', () => {
            this.closeModal('settingsModal');
        });
        
        // إغلاق الدردشة الخاصة
        document.getElementById('closePrivate').addEventListener('click', () => {
            this.togglePrivateChat();
        });
        
        // إرسال رسالة خاصة
        document.getElementById('sendPrivateMessage').addEventListener('click', () => {
            this.sendPrivateMessage();
        });
        
        document.getElementById('privateMessageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendPrivateMessage();
            }
        });
        
        // إغلاق النافذة عند النقر خارجها
        window.addEventListener('click', (e) => {
            const settingsModal = document.getElementById('settingsModal');
            if (e.target === settingsModal) {
                this.closeModal('settingsModal');
            }
            
            const effectsModal = document.getElementById('effectsModal');
            if (e.target === effectsModal) {
                this.closeModal('effectsModal');
            }
        });
        
        // تحديث حجم الشاشة
        window.addEventListener('resize', () => {
            this.updateMainContentMargin();
        });
        
        // تحميل الوضع المحفوظ
        const savedTheme = localStorage.getItem('chat-theme') || 'light';
        if (savedTheme === 'dark') {
            document.body.classList.remove('light-mode');
            document.body.classList.add('dark-mode');
            document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i>';
        }
    }
    
    sendPrivateMessage() {
        const input = document.getElementById('privateMessageInput');
        const message = input.value.trim();
        
        if (!message || !this.currentPrivateChat) return;
        
        // إرسال الرسالة عبر Socket
        this.socket.emit('private-message', {
            senderId: this.currentUser.id,
            receiverId: this.currentPrivateChat,
            content: message
        });
        
        // إضافة الرسالة محلياً
        this.addPrivateMessage({
            senderId: this.currentUser.id,
            content: message,
            timestamp: new Date()
        });
        
        // مسح الحقل
        input.value = '';
        input.focus();
    }
    
    showProfileModal(user) {
        const modal = document.getElementById('profileModal');
        modal.classList.add('active');
        
        modal.innerHTML = `
            <div class="profile-modal-content">
                <div class="profile-modal-header">
                    <h3><i class="fas fa-user"></i> بروفايل ${user.username}</h3>
                    <button class="close-profile" onclick="chatApp.closeModal('profileModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="profile-modal-body">
                    <div class="profile-image-large">
                        <img src="${user.profileImage || 'https://via.placeholder.com/200'}" 
                             alt="صورة ${user.username}">
                    </div>
                    
                    <div class="profile-details-modal">
                        <div class="detail">
                            <i class="fas fa-hashtag"></i>
                            <span>الرقم التسلسلي: ${user.serialNumber}</span>
                        </div>
                        
                        <div class="detail">
                            <i class="fas fa-crown"></i>
                            <span>الرتبة: <span class="${this.getRoleClass(user.role)}">${user.role}</span></span>
                        </div>
                        
                        <div class="detail">
                            <i class="fas fa-venus-mars"></i>
                            <span>الجنس: ${user.gender}</span>
                        </div>
                        
                        <div class="detail">
                            <i class="fas fa-birthday-cake"></i>
                            <span>العمر: ${user.age}</span>
                        </div>
                        
                        ${user.country ? `
                            <div class="detail">
                                <i class="fas fa-flag"></i>
                                <span>البلد: ${user.country}</span>
                            </div>
                        ` : ''}
                        
                        <div class="detail">
                            <i class="fas fa-coins"></i>
                            <span>الذهب: ${user.gold.toLocaleString()}</span>
                        </div>
                        
                        <div class="detail">
                            <i class="fas fa-fire"></i>
                            <span>نقاط التفاعل: ${user.interactionPoints.toLocaleString()}</span>
                        </div>
                        
                        <div class="detail">
                            <i class="fas fa-calendar"></i>
                            <span>تاريخ الانضمام: ${new Date(user.joinDate).toLocaleDateString('ar-SA')}</span>
                        </div>
                    </div>
                    
                    ${this.currentUser.role === 'مالك' ? `
                        <div class="admin-actions">
                            <button class="btn btn-danger" onclick="chatApp.muteUser('${user._id}')">
                                <i class="fas fa-volume-mute"></i> كتم
                            </button>
                            <button class="btn btn-warning" onclick="chatApp.banUser('${user._id}')">
                                <i class="fas fa-ban"></i> طرد
                            </button>
                            <button class="btn btn-primary" onclick="chatApp.sendGold('${user._id}')">
                                <i class="fas fa-gift"></i> إرسال ذهب
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    muteUser(userId) {
        this.openAdminActionModal('mute', userId);
    }
    
    banUser(userId) {
        this.openAdminActionModal('ban', userId);
    }
    
    sendGold(userId) {
        this.openAdminActionModal('gold', userId);
    }
    
    openAdminActionModal(action, userId) {
        const user = this.users.find(u => u._id === userId);
        if (!user) return;
        
        const modal = document.getElementById('adminActionsModal');
        modal.classList.add('active');
        
        let content = '';
        
        switch(action) {
            case 'mute':
                content = `
                    <h3><i class="fas fa-volume-mute"></i> كتم ${user.username}</h3>
                    <div class="form-group">
                        <label>مدة الكتم</label>
                        <select id="muteDuration">
                            <option value="5m">5 دقائق</option>
                            <option value="1d">24 ساعة</option>
                            <option value="permanent">مؤبد</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>السبب (اختياري)</label>
                        <input type="text" id="muteReason" placeholder="سبب الكتم...">
                    </div>
                    <button class="btn btn-danger" onclick="chatApp.executeAction('mute', '${userId}')">
                        تأكيد الكتم
                    </button>
                `;
                break;
                
            case 'ban':
                content = `
                    <h3><i class="fas fa-ban"></i> طرد ${user.username}</h3>
                    <div class="form-group">
                        <label>مدة الطرد</label>
                        <select id="banDuration">
                            <option value="5m">5 دقائق</option>
                            <option value="1d">24 ساعة</option>
                            <option value="permanent">مؤبد</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>السبب (اختياري)</label>
                        <input type="text" id="banReason" placeholder="سبب الطرد...">
                    </div>
                    <button class="btn btn-warning" onclick="chatApp.executeAction('ban', '${userId}')">
                        تأكيد الطرد
                    </button>
                `;
                break;
                
            case 'gold':
                content = `
                    <h3><i class="fas fa-gift"></i> إرسال ذهب لـ ${user.username}</h3>
                    <div class="form-group">
                        <label>المبلغ</label>
                        <input type="number" id="goldAmount" min="1" max="${this.currentUser.gold}" 
                               placeholder="أدخل المبلغ" value="1000">
                    </div>
                    <div class="current-gold">
                        <i class="fas fa-coins"></i>
                        <span>رصيدك الحالي: ${this.currentUser.gold.toLocaleString()}</span>
                    </div>
                    <button class="btn btn-primary" onclick="chatApp.executeAction('gold', '${userId}')">
                        إرسال الذهب
                    </button>
                `;
                break;
        }
        
        modal.innerHTML = `
            <div class="admin-modal-content">
                ${content}
                <button class="close-admin" onclick="chatApp.closeModal('adminActionsModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }
    
    executeAction(action, userId) {
        switch(action) {
            case 'mute':
                const duration = document.getElementById('muteDuration').value;
                const reason = document.getElementById('muteReason').value;
                
                this.socket.emit('mute-user', {
                    muterId: this.currentUser.id,
                    targetId: userId,
                    duration: duration,
                    reason: reason
                });
                break;
                
            case 'ban':
                const banDuration = document.getElementById('banDuration').value;
                const banReason = document.getElementById('banReason').value;
                
                this.socket.emit('ban-user', {
                    bannerId: this.currentUser.id,
                    targetId: userId,
                    duration: banDuration,
                    reason: banReason
                });
                break;
                
            case 'gold':
                const amount = parseInt(document.getElementById('goldAmount').value);
                
                if (amount > this.currentUser.gold) {
                    this.showError('رصيدك غير كافي');
                    return;
                }
                
                this.socket.emit('send-gold', {
                    senderId: this.currentUser.id,
                    receiverId: userId,
                    amount: amount
                });
                break;
        }
        
        this.closeModal('adminActionsModal');
        this.closeModal('profileModal');
    }
}

// بدء التطبيق
let chatApp;

document.addEventListener('DOMContentLoaded', () => {
    chatApp = new ChatApplication();
});

// جعل الدوال متاحة عالمياً
window.chatApp = chatApp;
