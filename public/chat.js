// ====== نظام الشات المتقدم ======
// نظام كامل مع رتب، ذهب، مميزات، وعقوبات

"use strict";

// ====== تهيئة التطبيق ======
class ChatSystem {
    constructor() {
        // المتغيرات الرئيسية
        this.socket = null;
        this.currentUser = null;
        this.currentRoom = 'general';
        this.rooms = [];
        this.users = new Map();
        this.onlineUsers = new Map();
        this.messages = [];
        this.privateMessages = new Map();
        this.notifications = [];
        this.friendRequests = [];
        this.wallPosts = [];
        this.activeList = [];
        this.richList = [];
        this.systemLogs = [];
        this.mutedUsers = new Map();
        this.kickedUsers = new Map();
        this.goldTransactions = [];
        this.isTyping = false;
        this.isRecording = false;
        this.isSidebarHidden = false;
        this.isDarkMode = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.typingTimeout = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        // إعداد العناصر
        this.elements = this.initializeElements();
        
        // بدء النظام
        this.init();
    }
    
    // ====== تهيئة العناصر ======
    initializeElements() {
        return {
            // النوافذ
            loadingOverlay: document.getElementById('loadingOverlay'),
            loadingDetails: document.getElementById('loadingDetails'),
            chatWrapper: document.getElementById('chatWrapper'),
            effectsContainer: document.getElementById('effectsContainer'),
            notificationsContainer: document.getElementById('notificationsContainer'),
            
            // الشريط العلوي
            mainMenuBtn: document.getElementById('mainMenuBtn'),
            currentRoomName: document.getElementById('currentRoomName'),
            onlineCount: document.getElementById('onlineCount'),
            messageCount: document.getElementById('messageCount'),
            notificationsBtn: document.getElementById('notificationsBtn'),
            notificationBadge: document.getElementById('notificationBadge'),
            privateChatBtn: document.getElementById('privateChatBtn'),
            privateBadge: document.getElementById('privateBadge'),
            friendsBtn: document.getElementById('friendsBtn'),
            friendsBadge: document.getElementById('friendsBadge'),
            settingsBtn: document.getElementById('settingsBtn'),
            userProfileBtn: document.getElementById('userProfileBtn'),
            userAvatarSm: document.getElementById('userAvatarSm'),
            userNameSm: document.getElementById('userNameSm'),
            userRoleSm: document.getElementById('userRoleSm'),
            userStatus: document.getElementById('userStatus'),
            
            // الشريط الجانبي الأيسر
            sidebarLeft: document.getElementById('sidebarLeft'),
            wallBtn: document.getElementById('wallBtn'),
            wallBadge: document.getElementById('wallBadge'),
            activeListBtn: document.getElementById('activeListBtn'),
            richListBtn: document.getElementById('richListBtn'),
            subscriptionsBtn: document.getElementById('subscriptionsBtn'),
            roomsList: document.getElementById('roomsList'),
            createRoomSection: document.getElementById('createRoomSection'),
            createRoomBtn: document.getElementById('createRoomBtn'),
            
            // منطقة الرسائل
            messagesContainer: document.getElementById('messagesContainer'),
            messagesArea: document.getElementById('messagesArea'),
            typingIndicator: document.getElementById('typingIndicator'),
            typingText: document.getElementById('typingText'),
            
            // منطقة الإدخال
            inputArea: document.getElementById('inputArea'),
            replyPreview: document.getElementById('replyPreview'),
            replySender: document.getElementById('replySender'),
            replyMessage: document.getElementById('replyMessage'),
            cancelReplyBtn: document.getElementById('cancelReplyBtn'),
            emojiBtn: document.getElementById('emojiBtn'),
            attachmentBtn: document.getElementById('attachmentBtn'),
            micBtn: document.getElementById('micBtn'),
            themeBtn: document.getElementById('themeBtn'),
            messageInput: document.getElementById('messageInput'),
            attachmentsPreview: document.getElementById('attachmentsPreview'),
            charCount: document.getElementById('charCount'),
            sendBtn: document.getElementById('sendBtn'),
            
            // الشريط الجانبي الأيمن
            sidebarRight: document.getElementById('sidebarRight'),
            toggleOnlineOnly: document.getElementById('toggleOnlineOnly'),
            refreshUsersBtn: document.getElementById('refreshUsersBtn'),
            toggleSidebarBtn: document.getElementById('toggleSidebarBtn'),
            usersSearch: document.getElementById('usersSearch'),
            clearSearchBtn: document.getElementById('clearSearchBtn'),
            roleFilter: document.getElementById('roleFilter'),
            usersList: document.getElementById('usersList'),
            emptyUsers: document.getElementById('emptyUsers'),
            connectedCount: document.getElementById('connectedCount'),
            offlineCount: document.getElementById('offlineCount'),
            totalUsers: document.getElementById('totalUsers'),
            
            // النوافذ المنبثقة
            profileModal: document.getElementById('profileModal'),
            editProfileModal: document.getElementById('editProfileModal'),
            settingsModal: document.getElementById('settingsModal'),
            notificationsModal: document.getElementById('notificationsModal'),
            privateChatModal: document.getElementById('privateChatModal'),
            friendsModal: document.getElementById('friendsModal'),
            wallModal: document.getElementById('wallModal'),
            activeListModal: document.getElementById('activeListModal'),
            richListModal: document.getElementById('richListModal'),
            subscriptionsModal: document.getElementById('subscriptionsModal'),
            sendGoldModal: document.getElementById('sendGoldModal'),
            giftRoleModal: document.getElementById('giftRoleModal'),
            punishmentsModal: document.getElementById('punishmentsModal'),
            systemLogsModal: document.getElementById('systemLogsModal'),
            attachmentModal: document.getElementById('attachmentModal'),
            emojiModal: document.getElementById('emojiModal'),
            recordingModal: document.getElementById('recordingModal'),
            previewModal: document.getElementById('previewModal'),
            confirmModal: document.getElementById('confirmModal'),
            
            // أزرار إغلاق النوافذ
            closeProfileModal: document.getElementById('closeProfileModal'),
            closeEditProfileModal: document.getElementById('closeEditProfileModal'),
            closeSettingsModal: document.getElementById('closeSettingsModal'),
            closeNotificationsModal: document.getElementById('closeNotificationsModal'),
            closePrivateChatModal: document.getElementById('closePrivateChatModal'),
            closeFriendsModal: document.getElementById('closeFriendsModal'),
            closeWallModal: document.getElementById('closeWallModal'),
            closeActiveListModal: document.getElementById('closeActiveListModal'),
            closeRichListModal: document.getElementById('closeRichListModal'),
            closeSubscriptionsModal: document.getElementById('closeSubscriptionsModal'),
            closeSendGoldModal: document.getElementById('closeSendGoldModal'),
            closeGiftRoleModal: document.getElementById('closeGiftRoleModal'),
            closePunishmentsModal: document.getElementById('closePunishmentsModal'),
            closeSystemLogsModal: document.getElementById('closeSystemLogsModal'),
            closeAttachmentModal: document.getElementById('closeAttachmentModal'),
            closeRecordingModal: document.getElementById('closeRecordingModal'),
            closePreviewModal: document.getElementById('closePreviewModal'),
            
            // عناصر داخل النوافذ
            profileContainer: document.getElementById('profileContainer'),
            editProfileContainer: document.getElementById('editProfileContainer'),
            settingsContainer: document.getElementById('settingsContainer'),
            notificationsList: document.getElementById('notificationsList'),
            privateChatsContainer: document.getElementById('privateChatsContainer'),
            friendsContainer: document.getElementById('friendsContainer'),
            wallContainer: document.getElementById('wallContainer'),
            activeListContainer: document.getElementById('activeListContainer'),
            richListContainer: document.getElementById('richListContainer'),
            subscriptionsContainer: document.getElementById('subscriptionsContainer'),
            sendGoldContainer: document.getElementById('sendGoldContainer'),
            giftRoleContainer: document.getElementById('giftRoleContainer'),
            punishmentsContainer: document.getElementById('punishmentsContainer'),
            systemLogsContainer: document.getElementById('systemLogsContainer'),
            attachmentContainer: document.getElementById('attachmentContainer'),
            emojiContainer: document.getElementById('emojiContainer'),
            recordingContainer: document.getElementById('recordingContainer'),
            previewContainer: document.getElementById('previewContainer'),
            confirmContainer: document.getElementById('confirmContainer')
        };
    }
    
    // ====== بدء النظام ======
    async init() {
        try {
            // تحميل بيانات المستخدم
            await this.loadUserData();
            
            // إعداد الواجهة
            this.setupUI();
            
            // الاتصال بالسيرفر
            await this.connectToServer();
            
            // تحميل البيانات الأولية
            await this.loadInitialData();
            
            // إخفاء شاشة التحميل
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ فشل في تهيئة النظام:', error);
            this.showError('فشل في تحميل النظام. يرجى تحديث الصفحة.');
        }
    }
    
    // ====== تحميل بيانات المستخدم ======
    async loadUserData() {
        this.updateLoadingDetails('جاري تحميل بيانات المستخدم...');
        
        // محاولة الحصول على بيانات المستخدم من localStorage
        const userData = localStorage.getItem('currentUser');
        const token = localStorage.getItem('userToken');
        
        if (!userData || !token) {
            // إذا لا يوجد بيانات، العودة للصفحة الرئيسية
            window.location.href = '/';
            throw new Error('لا توجد بيانات مستخدم');
        }
        
        try {
            this.currentUser = JSON.parse(userData);
            
            // التحقق من صحة التوكن
            if (!this.validateToken(token)) {
                localStorage.removeItem('currentUser');
                localStorage.removeItem('userToken');
                window.location.href = '/';
                throw new Error('التوكن غير صالح');
            }
            
            // تحديث واجهة المستخدم
            this.updateUserInterface();
            
            // إضافة تأثير دخول حسب الرتبة
            this.showEnterEffect();
            
        } catch (error) {
            console.error('❌ خطأ في تحميل بيانات المستخدم:', error);
            throw error;
        }
    }
    
    validateToken(token) {
        // محاكاة التحقق من التوكن
        return token && token.startsWith('token-');
    }
    
    updateUserInterface() {
        // تحديث الصورة الرمزية
        this.elements.userAvatarSm.src = this.currentUser.avatar || 
            `https://ui-avatars.com/api/?name=${encodeURIComponent(this.currentUser.username)}&background=3B82F6&color=fff`;
        
        // تحديث الاسم
        this.elements.userNameSm.textContent = this.currentUser.username;
        this.elements.userNameSm.className = `user-name-sm role-${this.currentUser.role.replace(' ', '-').toLowerCase()}`;
        
        // تحديث الرتبة
        this.elements.userRoleSm.textContent = this.currentUser.role;
        this.elements.userRoleSm.className = `user-role-sm role-${this.currentUser.role.replace(' ', '-').toLowerCase()}`;
        
        // تحديث حالة الاتصال
        this.elements.userStatus.classList.add('online');
        
        // تحديث لون الاسم إذا كان للمستخدم صلاحية
        if (this.currentUser.nameColor && this.currentUser.nameColor !== '#000000') {
            this.elements.userNameSm.style.color = this.currentUser.nameColor;
        }
    }
    
    showEnterEffect() {
        const effects = {
            'مالك': 'gold',
            'اونر': 'fire',
            'ادمن': 'sparkle',
            'عضو مميز': 'vip',
            'عضو': '',
            'ضيف': ''
        };
        
        const effectType = effects[this.currentUser.role];
        if (effectType) {
            this.createEffect(effectType, `مرحباً بك ${this.currentUser.username}!`);
        }
    }
    
    // ====== إعداد الواجهة ======
    setupUI() {
        this.updateLoadingDetails('جاري إعداد الواجهة...');
        
        // إعداد الأحداث
        this.setupEventListeners();
        
        // إعداد محرر الإيموجي
        this.setupEmojiPicker();
        
        // إعداد نظام الثيم
        this.setupTheme();
        
        // إعداد نظام الصوت
        this.setupAudioSystem();
    }
    
    setupEventListeners() {
        // أحداث الشريط العلوي
        this.elements.mainMenuBtn.addEventListener('click', () => this.toggleSidebar('left'));
        this.elements.notificationsBtn.addEventListener('click', () => this.showNotifications());
        this.elements.privateChatBtn.addEventListener('click', () => this.showPrivateChats());
        this.elements.friendsBtn.addEventListener('click', () => this.showFriendRequests());
        this.elements.settingsBtn.addEventListener('click', () => this.showSettings());
        this.elements.userProfileBtn.addEventListener('click', () => this.showUserProfile(this.currentUser.username));
        
        // أحداث الشريط الجانبي الأيسر
        this.elements.wallBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.showWall();
        });
        
        this.elements.activeListBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.showActiveList();
        });
        
        this.elements.richListBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.showRichList();
        });
        
        this.elements.subscriptionsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.showSubscriptions();
        });
        
        this.elements.createRoomBtn.addEventListener('click', () => this.showCreateRoomModal());
        
        // أحداث منطقة الإدخال
        this.elements.cancelReplyBtn.addEventListener('click', () => this.cancelReply());
        this.elements.emojiBtn.addEventListener('click', () => this.toggleEmojiPicker());
        this.elements.attachmentBtn.addEventListener('click', () => this.showAttachmentModal());
        this.elements.micBtn.addEventListener('click', () => this.toggleRecording());
        this.elements.themeBtn.addEventListener('click', () => this.toggleTheme());
        
        this.elements.messageInput.addEventListener('input', (e) => {
            this.updateCharCount(e.target.value.length);
            this.handleTyping();
        });
        
        this.elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        
        // أحداث الشريط الجانبي الأيمن
        this.elements.toggleOnlineOnly.addEventListener('click', () => this.toggleOnlineFilter());
        this.elements.refreshUsersBtn.addEventListener('click', () => this.refreshUsersList());
        this.elements.toggleSidebarBtn.addEventListener('click', () => this.toggleSidebar('right'));
        
        this.elements.usersSearch.addEventListener('input', (e) => {
            this.filterUsers(e.target.value);
            this.elements.clearSearchBtn.style.display = e.target.value ? 'block' : 'none';
        });
        
        this.elements.clearSearchBtn.addEventListener('click', () => {
            this.elements.usersSearch.value = '';
            this.filterUsers('');
            this.elements.clearSearchBtn.style.display = 'none';
        });
        
        this.elements.roleFilter.addEventListener('change', (e) => {
            this.filterUsersByRole(e.target.value);
        });
        
        // أحداث إغلاق النوافذ
        this.setupModalCloseEvents();
        
        // أحداث النقر خارج النوافذ
        document.addEventListener('click', (e) => {
            this.handleOutsideClick(e);
        });
        
        // أحداث لوحة المفاتيح
        document.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });
        
        // أحداث التمرير
        this.elements.messagesContainer.addEventListener('scroll', () => {
            this.handleScroll();
        });
        
        // أحداث السحب والإفلات
        this.setupDragAndDrop();
    }
    
    setupModalCloseEvents() {
        const modals = [
            'profileModal', 'editProfileModal', 'settingsModal', 'notificationsModal',
            'privateChatModal', 'friendsModal', 'wallModal', 'activeListModal',
            'richListModal', 'subscriptionsModal', 'sendGoldModal', 'giftRoleModal',
            'punishmentsModal', 'systemLogsModal', 'attachmentModal', 'emojiModal',
            'recordingModal', 'previewModal', 'confirmModal'
        ];
        
        modals.forEach(modal => {
            const closeBtn = this.elements[`close${modal.charAt(0).toUpperCase() + modal.slice(1)}`];
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.hideModal(modal));
            }
        });
    }
    
    setupEmojiPicker() {
        // مجموعة الإيموجي
        const emojis = {
            smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚'],
            people: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👍', '👎', '✊'],
            animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆'],
            food: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🥦', '🥬'],
            activities: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳'],
            objects: ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🎮', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '🎥', '📽️']
        };
        
        // إنشاء واجهة محرر الإيموجي
        let html = '<div class="emoji-categories">';
        Object.keys(emojis).forEach(category => {
            const icon = {
                smileys: '😀',
                people: '👋',
                animals: '🐶',
                food: '🍎',
                activities: '⚽',
                objects: '⌚'
            }[category];
            
            html += `<button class="emoji-category" data-category="${category}">${icon}</button>`;
        });
        html += '</div>';
        
        html += '<div class="emoji-grid">';
        // عرض الإيموجي الافتراضية (الوجوه)
        emojis.smileys.forEach(emoji => {
            html += `<span class="emoji-item" data-emoji="${emoji}">${emoji}</span>`;
        });
        html += '</div>';
        
        this.elements.emojiContainer.innerHTML = html;
        
        // أحداث التبويبات
        this.elements.emojiContainer.querySelectorAll('.emoji-category').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                this.showEmojiCategory(category, emojis);
            });
        });
        
        // أحدث الإيموجي الفردية
        this.elements.emojiContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('emoji-item')) {
                this.insertEmoji(e.target.dataset.emoji);
                this.hideModal('emojiModal');
            }
        });
    }
    
    showEmojiCategory(category, emojis) {
        const grid = this.elements.emojiContainer.querySelector('.emoji-grid');
        grid.innerHTML = '';
        
        emojis[category].forEach(emoji => {
            const span = document.createElement('span');
            span.className = 'emoji-item';
            span.dataset.emoji = emoji;
            span.textContent = emoji;
            grid.appendChild(span);
        });
        
        // تحديث التبويب النشط
        this.elements.emojiContainer.querySelectorAll('.emoji-category').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
    }
    
    insertEmoji(emoji) {
        const input = this.elements.messageInput;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const text = input.value;
        
        input.value = text.substring(0, start) + emoji + text.substring(end);
        input.focus();
        input.setSelectionRange(start + emoji.length, start + emoji.length);
        
        this.updateCharCount(input.value.length);
    }
    
    setupTheme() {
        // التحقق من الثيم المحفوظ
        const savedTheme = localStorage.getItem('chatTheme');
        this.isDarkMode = savedTheme === 'dark';
        
        // تطبيق الثيم
        this.applyTheme();
        
        // تحديث زر الثيم
        this.updateThemeButton();
    }
    
    applyTheme() {
        if (this.isDarkMode) {
            document.body.setAttribute('data-theme', 'dark');
            document.body.classList.add('theme-dark');
            document.body.classList.remove('theme-light');
        } else {
            document.body.setAttribute('data-theme', 'light');
            document.body.classList.add('theme-light');
            document.body.classList.remove('theme-dark');
        }
        
        // حفظ التفضيل
        localStorage.setItem('chatTheme', this.isDarkMode ? 'dark' : 'light');
    }
    
    updateThemeButton() {
        const icon = this.elements.themeBtn.querySelector('i');
        if (this.isDarkMode) {
            icon.className = 'fas fa-sun';
            this.elements.themeBtn.title = 'التبديل للوضع الفاتح';
        } else {
            icon.className = 'fas fa-moon';
            this.elements.themeBtn.title = 'التبديل للوضع الداكن';
        }
    }
    
    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        this.applyTheme();
        this.updateThemeButton();
        this.showNotification('تم تبديل الثيم بنجاح', 'success');
    }
    
    setupAudioSystem() {
        // إعداد مشغل الصوت للبروفايل
        this.audioPlayer = new Audio();
        this.audioPlayer.volume = 0.5;
        
        // إعداد تسجيل الصوت
        this.setupAudioRecording();
    }
    
    setupAudioRecording() {
        // التحقق من دعم التسجيل
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn('⚠️ التسجيل الصوتي غير مدعوم في هذا المتصفح');
            this.elements.micBtn.disabled = true;
            this.elements.micBtn.title = 'التسجيل الصوتي غير مدعوم';
            return;
        }
        
        // طلب إذن الميكروفون
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                this.audioStream = stream;
                this.setupMediaRecorder(stream);
            })
            .catch(error => {
                console.error('❌ خطأ في الوصول للميكروفون:', error);
                this.elements.micBtn.disabled = true;
                this.elements.micBtn.title = 'يجب السماح بالوصول للميكروفون';
            });
    }
    
    setupMediaRecorder(stream) {
        try {
            this.mediaRecorder = new MediaRecorder(stream);
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                this.handleRecordingComplete(audioBlob);
                this.audioChunks = [];
            };
            
        } catch (error) {
            console.error('❌ خطأ في إعداد مسجل الصوت:', error);
            this.elements.micBtn.disabled = true;
            this.elements.micBtn.title = 'التسجيل الصوتي غير مدعوم';
        }
    }
    
    setupDragAndDrop() {
        const dropZone = this.elements.messagesArea;
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleDroppedFiles(files);
            }
        });
    }
    
    // ====== الاتصال بالسيرفر ======
    async connectToServer() {
        this.updateLoadingDetails('جاري الاتصال بالسيرفر...');
        
        return new Promise((resolve, reject) => {
            try {
                // الاتصال بخادم Socket.IO
                this.socket = io('http://localhost:3000', {
                    transports: ['websocket', 'polling'],
                    reconnection: true,
                    reconnectionAttempts: this.maxReconnectAttempts,
                    reconnectionDelay: 1000
                });
                
                // معالجة الأحداث
                this.setupSocketEvents();
                
                // التأكد من الاتصال
                this.socket.on('connect', () => {
                    console.log('✅ متصل بالسيرفر');
                    this.reconnectAttempts = 0;
                    this.showNotification('تم الاتصال بالسيرفر', 'success');
                    resolve();
                });
                
                this.socket.on('connect_error', (error) => {
                    console.error('❌ خطأ في الاتصال:', error);
                    this.handleConnectionError();
                    reject(error);
                });
                
            } catch (error) {
                console.error('❌ خطأ في الاتصال بالسيرفر:', error);
                reject(error);
            }
        });
    }
    
    setupSocketEvents() {
        // حدث الاتصال
        this.socket.on('connect', () => {
            this.onConnected();
        });
        
        // حدث قطع الاتصال
        this.socket.on('disconnect', (reason) => {
            this.onDisconnected(reason);
        });
        
        // حدث إعادة الاتصال
        this.socket.on('reconnect', (attemptNumber) => {
            this.onReconnected(attemptNumber);
        });
        
        // حدث استقبال الرسائل
        this.socket.on('newMessage', (message) => {
            this.handleNewMessage(message);
        });
        
        // حدث تحديث المستخدمين
        this.socket.on('userListUpdate', (data) => {
            this.handleUserListUpdate(data);
        });
        
        // حدث رسائل خاصة
        this.socket.on('newPrivateMessage', (message) => {
            this.handlePrivateMessage(message);
        });
        
        // حدث إشعارات
        this.socket.on('notification', (notification) => {
            this.handleNotification(notification);
        });
        
        // حدث تحديث الرتب
        this.socket.on('roleUpdate', (data) => {
            this.handleRoleUpdate(data);
        });
        
        // حدث تحديث الذهب
        this.socket.on('goldUpdate', (data) => {
            this.handleGoldUpdate(data);
        });
        
        // حدث الكتم
        this.socket.on('muted', (data) => {
            this.handleMuted(data);
        });
        
        // حدث الطرد
        this.socket.on('kicked', (data) => {
            this.handleKicked(data);
        });
        
        // حدث حذف الرسالة
        this.socket.on('messageDeleted', (data) => {
            this.handleMessageDeleted(data);
        });
        
        // حدث تأثير الدخول
        this.socket.on('joinEffect', (data) => {
            this.handleJoinEffect(data);
        });
        
        // حدث تحديث قائمة الأثرياء
        this.socket.on('richListUpdate', (list) => {
            this.handleRichListUpdate(list);
        });
        
        // حدث تحديث قائمة المتفاعلين
        this.socket.on('activeListUpdate', (list) => {
            this.handleActiveListUpdate(list);
        });
        
        // حدث تحديث المستخدمين المتصلين
        this.socket.on('onlineUsersUpdate', (data) => {
            this.handleOnlineUsersUpdate(data);
        });
        
        // حدث الخروج
        this.socket.on('userOffline', (user) => {
            this.handleUserOffline(user);
        });
        
        // حدث الخطأ
        this.socket.on('error', (error) => {
            this.handleSocketError(error);
        });
    }
    
    onConnected() {
        console.log('✅ الاتصال ناجح');
        
        // الانضمام للغرفة الافتراضية
        this.joinRoom(this.currentRoom);
        
        // تحديث حالة الاتصال
        this.updateConnectionStatus(true);
    }
    
    onDisconnected(reason) {
        console.log('❌ انقطع الاتصال:', reason);
        this.updateConnectionStatus(false);
        
        if (reason === 'io server disconnect') {
            // السيرفر قطع الاتصال، نحتاج لإعادة الاتصال يدوياً
            this.socket.connect();
        }
    }
    
    onReconnected(attemptNumber) {
        console.log(`✅ إعادة اتصال ناجحة (محاولة ${attemptNumber})`);
        this.showNotification('تمت إعادة الاتصال بالسيرفر', 'success');
        this.updateConnectionStatus(true);
        
        // إعادة الانضمام للغرفة
        this.joinRoom(this.currentRoom);
    }
    
    updateConnectionStatus(isConnected) {
        const statusElement = document.createElement('div');
        statusElement.className = `connection-status ${isConnected ? 'connected' : 'disconnected'}`;
        statusElement.innerHTML = `
            <i class="fas fa-${isConnected ? 'wifi' : 'wifi-slash'}"></i>
            <span>${isConnected ? 'متصل' : 'غير متصل'}</span>
        `;
        
        // إضافة أو تحديث شريط الحالة
        let existingStatus = document.querySelector('.connection-status');
        if (existingStatus) {
            existingStatus.replaceWith(statusElement);
        } else {
            document.body.appendChild(statusElement);
            
            // إزالة بعد 3 ثواني إذا كان متصلاً
            if (isConnected) {
                setTimeout(() => {
                    statusElement.remove();
                }, 3000);
            }
        }
    }
    
    handleConnectionError() {
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.showError('فشل الاتصال بالسيرفر. يرجى تحديث الصفحة.');
            return;
        }
        
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        this.showNotification(`جاري إعادة الاتصال... (محاولة ${this.reconnectAttempts}/${this.maxReconnectAttempts})`, 'warning');
        
        setTimeout(() => {
            this.socket.connect();
        }, delay);
    }
    
    // ====== تحميل البيانات الأولية ======
    async loadInitialData() {
        this.updateLoadingDetails('جاري تحميل البيانات...');
        
        try {
            // تحميل الغرف
            await this.loadRooms();
            
            // تحميل قوائم المستخدمين
            await this.loadUsersList();
            
            // تحميل الرسائل القديمة
            await this.loadPreviousMessages();
            
            // تحميل الإشعارات
            await this.loadNotifications();
            
            // تحميل القوائم الخاصة
            await this.loadSpecialLists();
            
        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات:', error);
            throw error;
        }
    }
    
    async loadRooms() {
        try {
            // محاكاة تحميل الغرف
            const rooms = [
                {
                    id: 'general',
                    name: 'العمومية',
                    description: 'الغرفة الرئيسية للجميع',
                    color: '#3B82F6',
                    userCount: 0,
                    icon: 'fas fa-users'
                },
                {
                    id: 'games',
                    name: 'الألعاب',
                    description: 'مناقشة الألعاب والمسابقات',
                    color: '#10B981',
                    userCount: 0,
                    icon: 'fas fa-gamepad'
                },
                {
                    id: 'friends',
                    name: 'التعارف',
                    description: 'التعارف وبناء الصداقات',
                    color: '#8B5CF6',
                    userCount: 0,
                    icon: 'fas fa-heart'
                },
                {
                    id: 'tech',
                    name: 'التقنية',
                    description: 'مناقشة المواضيع التقنية',
                    color: '#F59E0B',
                    userCount: 0,
                    icon: 'fas fa-laptop-code'
                }
            ];
            
            this.rooms = rooms;
            this.renderRoomsList();
            
        } catch (error) {
            console.error('❌ خطأ في تحميل الغرف:', error);
        }
    }
    
    renderRoomsList() {
        this.elements.roomsList.innerHTML = '';
        
        this.rooms.forEach(room => {
            const roomElement = document.createElement('div');
            roomElement.className = `room-item ${room.id === this.currentRoom ? 'active' : ''}`;
            roomElement.dataset.roomId = room.id;
            
            roomElement.innerHTML = `
                <div class="room-item-icon" style="background: ${room.color}">
                    <i class="${room.icon}"></i>
                </div>
                <div class="room-item-info">
                    <div class="room-item-name">${room.name}</div>
                    <div class="room-item-description">${room.description}</div>
                </div>
                <div class="room-item-count">${room.userCount}</div>
            `;
            
            roomElement.addEventListener('click', () => {
                this.joinRoom(room.id);
            });
            
            this.elements.roomsList.appendChild(roomElement);
        });
        
        // إظهار زر إنشاء غرفة للمشرفين فما فوق
        const allowedRoles = ['مالك', 'اونر', 'ادمن'];
        if (allowedRoles.includes(this.currentUser.role)) {
            this.elements.createRoomSection.style.display = 'block';
        }
    }
    
    async loadUsersList() {
        try {
            // محاكاة تحميل المستخدمين
            const users = [
                {
                    username: 'محمد',
                    role: 'مالك',
                    serial: 1,
                    isOnline: true,
                    avatar: 'https://ui-avatars.com/api/?name=محمد&background=FFD700&color=333',
                    nameColor: '#FFD700',
                    points: 1000,
                    gold: 999999,
                    gender: 'ذكر',
                    age: 25,
                    country: 'السعودية'
                },
                {
                    username: 'أحمد',
                    role: 'ادمن',
                    serial: 3,
                    isOnline: true,
                    avatar: 'https://ui-avatars.com/api/?name=أحمد&background=8B5CF6&color=fff',
                    nameColor: '#8B5CF6',
                    points: 500,
                    gold: 20000,
                    gender: 'ذكر',
                    age: 22,
                    country: 'مصر'
                },
                {
                    username: 'سارة',
                    role: 'عضو مميز',
                    serial: 5,
                    isOnline: true,
                    avatar: 'https://ui-avatars.com/api/?name=سارة&background=10B981&color=fff',
                    nameColor: '#10B981',
                    points: 300,
                    gold: 8000,
                    gender: 'أنثى',
                    age: 20,
                    country: 'الإمارات'
                },
                {
                    username: 'خالد',
                    role: 'عضو',
                    serial: 8,
                    isOnline: false,
                    avatar: 'https://ui-avatars.com/api/?name=خالد&background=3B82F6&color=fff',
                    nameColor: '#3B82F6',
                    points: 150,
                    gold: 1200,
                    gender: 'ذكر',
                    age: 28,
                    country: 'الكويت'
                }
            ];
            
            // إضافة المستخدمين الحاليين
            users.forEach(user => {
                this.users.set(user.username, user);
                if (user.isOnline) {
                    this.onlineUsers.set(user.username, user);
                }
            });
            
            // إضافة المستخدم الحالي إذا لم يكن موجوداً
            if (!this.users.has(this.currentUser.username)) {
                this.users.set(this.currentUser.username, this.currentUser);
                this.onlineUsers.set(this.currentUser.username, this.currentUser);
            }
            
            this.renderUsersList();
            this.updateUsersStats();
            
        } catch (error) {
            console.error('❌ خطأ في تحميل قائمة المستخدمين:', error);
        }
    }
    
    renderUsersList() {
        this.elements.usersList.innerHTML = '';
        
        const searchTerm = this.elements.usersSearch.value.toLowerCase();
        const roleFilter = this.elements.roleFilter.value;
        const showOnlineOnly = this.elements.toggleOnlineOnly.classList.contains('active');
        
        let filteredUsers = Array.from(this.users.values());
        
        // تطبيق الفلتر
        if (searchTerm) {
            filteredUsers = filteredUsers.filter(user => 
                user.username.toLowerCase().includes(searchTerm)
            );
        }
        
        if (roleFilter !== 'all') {
            filteredUsers = filteredUsers.filter(user => user.role === roleFilter);
        }
        
        if (showOnlineOnly) {
            filteredUsers = filteredUsers.filter(user => user.isOnline);
        }
        
        // ترتيب المستخدمين حسب الرتبة ثم الاسم
        filteredUsers.sort((a, b) => {
            const roleOrder = { 'مالك': 6, 'اونر': 5, 'ادمن': 4, 'عضو مميز': 3, 'عضو': 2, 'ضيف': 1 };
            if (roleOrder[b.role] !== roleOrder[a.role]) {
                return roleOrder[b.role] - roleOrder[a.role];
            }
            return a.username.localeCompare(b.username);
        });
        
        // عرض المستخدمين
        filteredUsers.forEach(user => {
            const userElement = this.createUserListItem(user);
            this.elements.usersList.appendChild(userElement);
        });
        
        // عرض/إخفاء رسالة عدم وجود مستخدمين
        this.elements.emptyUsers.style.display = filteredUsers.length === 0 ? 'block' : 'none';
    }
    
    createUserListItem(user) {
        const userElement = document.createElement('div');
        userElement.className = `user-list-item ${user.isOnline ? 'online' : 'offline'}`;
        userElement.dataset.username = user.username;
        
        // تحديد لون الرتبة
        const roleColors = {
            'مالك': '#FFD700',
            'اونر': '#FF6B6B',
            'ادمن': '#8B5CF6',
            'عضو مميز': '#10B981',
            'عضو': '#3B82F6',
            'ضيف': '#6B7280'
        };
        
        const nameColor = user.nameColor || roleColors[user.role] || '#000000';
        
        userElement.innerHTML = `
            <div class="user-list-avatar">
                <img src="${user.avatar}" alt="${user.username}">
                <div class="user-list-status ${user.isOnline ? 'online' : 'offline'}"></div>
            </div>
            <div class="user-list-info">
                <div class="user-list-name" style="color: ${nameColor}">
                    ${user.username}
                    ${user.role === 'مالك' ? '<i class="fas fa-crown role-icon"></i>' : ''}
                    ${user.role === 'اونر' ? '<i class="fas fa-fire role-icon"></i>' : ''}
                    ${user.role === 'ادمن' ? '<i class="fas fa-shield-alt role-icon"></i>' : ''}
                    ${user.role === 'عضو مميز' ? '<i class="fas fa-star role-icon"></i>' : ''}
                </div>
                <div class="user-list-role">${user.role} #${user.serial}</div>
                <div class="user-list-stats">
                    <div class="user-list-stat" title="النقاط">
                        <i class="fas fa-fire"></i>
                        <span>${user.points}</span>
                    </div>
                    <div class="user-list-stat" title="الذهب">
                        <i class="fas fa-coins"></i>
                        <span>${user.gold}</span>
                    </div>
                </div>
            </div>
            <div class="user-list-actions">
                ${user.username !== this.currentUser.username ? `
                    <button class="user-action-btn" onclick="chatSystem.sendPrivateMessage('${user.username}')" title="مراسلة خاصة">
                        <i class="fas fa-envelope"></i>
                    </button>
                    <button class="user-action-btn" onclick="chatSystem.showUserProfile('${user.username}')" title="عرض البروفايل">
                        <i class="fas fa-user"></i>
                    </button>
                ` : ''}
                ${this.canManageUser(user) ? `
                    <button class="user-action-btn danger" onclick="chatSystem.showPunishmentsModal('${user.username}')" title="إدارة العقوبات">
                        <i class="fas fa-gavel"></i>
                    </button>
                ` : ''}
            </div>
        `;
        
        // إضافة حدث النقر لعرض البروفايل
        userElement.addEventListener('click', (e) => {
            if (!e.target.closest('.user-list-actions')) {
                this.showUserProfile(user.username);
            }
        });
        
        return userElement;
    }
    
    canManageUser(targetUser) {
        const userRole = this.currentUser.role;
        const targetRole = targetUser.role;
        
        const roleHierarchy = {
            'مالك': 6,
            'اونر': 5,
            'ادمن': 4,
            'عضو مميز': 3,
            'عضو': 2,
            'ضيف': 1
        };
        
        // المالك يستطيع إدارة الكل
        if (userRole === 'مالك') return true;
        
        // الاونر يستطيع إدارة الكل ما عدا المالك
        if (userRole === 'اونر' && targetRole !== 'مالك') return true;
        
        // الادمن يستطيع إدارة العضو المميز فما دون
        if (userRole === 'ادمن' && roleHierarchy[targetRole] <= 3) return true;
        
        return false;
    }
    
    updateUsersStats() {
        const totalUsers = this.users.size;
        const onlineUsers = Array.from(this.users.values()).filter(u => u.isOnline).length;
        const offlineUsers = totalUsers - onlineUsers;
        
        this.elements.connectedCount.textContent = onlineUsers;
        this.elements.offlineCount.textContent = offlineUsers;
        this.elements.totalUsers.textContent = totalUsers;
        this.elements.onlineCount.querySelector('span').textContent = onlineUsers;
    }
    
    async loadPreviousMessages() {
        try {
            // محاكاة تحميل الرسائل القديمة
            const messages = [
                {
                    id: '1',
                    type: 'system',
                    content: 'مرحباً بكم في الشات المتقدم!',
                    timestamp: new Date(Date.now() - 3600000),
                    roomId: 'general'
                },
                {
                    id: '2',
                    type: 'text',
                    content: 'أهلاً بالجميع! كيف حالكم؟',
                    sender: 'محمد',
                    senderRole: 'مالك',
                    senderColor: '#FFD700',
                    senderAvatar: 'https://ui-avatars.com/api/?name=محمد&background=FFD700&color=333',
                    timestamp: new Date(Date.now() - 1800000),
                    roomId: 'general'
                },
                {
                    id: '3',
                    type: 'text',
                    content: 'الحمد لله، كل شيء بخير. شكراً على الاستضافة!',
                    sender: 'أحمد',
                    senderRole: 'ادمن',
                    senderColor: '#8B5CF6',
                    senderAvatar: 'https://ui-avatars.com/api/?name=أحمد&background=8B5CF6&color=fff',
                    timestamp: new Date(Date.now() - 900000),
                    roomId: 'general'
                }
            ];
            
            this.messages = messages;
            this.renderMessages();
            
        } catch (error) {
            console.error('❌ خطأ في تحميل الرسائل:', error);
        }
    }
    
    async loadNotifications() {
        try {
            // محاكاة تحميل الإشعارات
            this.notifications = [
                {
                    id: '1',
                    type: 'welcome',
                    title: 'مرحباً بك!',
                    message: 'مرحباً بك في الشات المتقدم. استمتع بتجربتك!',
                    timestamp: new Date(),
                    read: false
                }
            ];
            
            this.updateNotificationBadge();
            
        } catch (error) {
            console.error('❌ خطأ في تحميل الإشعارات:', error);
        }
    }
    
    async loadSpecialLists() {
        try {
            // محاكاة تحميل القوائم الخاصة
            this.richList = [
                { username: 'محمد', gold: 999999, role: 'مالك' },
                { username: 'أحمد', gold: 20000, role: 'ادمن' },
                { username: 'سارة', gold: 8000, role: 'عضو مميز' }
            ];
            
            this.activeList = [
                { username: 'محمد', points: 1000, role: 'مالك' },
                { username: 'أحمد', points: 500, role: 'ادمن' },
                { username: 'سارة', points: 300, role: 'عضو مميز' }
            ];
            
        } catch (error) {
            console.error('❌ خطأ في تحميل القوائم الخاصة:', error);
        }
    }
    
    // ====== إدارة الغرف ======
    joinRoom(roomId) {
        if (!this.socket || !this.socket.connected) {
            this.showError('غير متصل بالسيرفر');
            return;
        }
        
        if (roomId === this.currentRoom) return;
        
        // تحديث الغرفة الحالية
        this.currentRoom = roomId;
        
        // تحديث واجهة الغرفة
        this.updateRoomUI(roomId);
        
        // إرسال طلب الانضمام للغرفة
        this.socket.emit('joinRoom', {
            token: this.currentUser.token,
            roomId: roomId
        });
        
        // تحديث قائمة الغرف
        this.updateRoomsList();
        
        // مسح الرسائل القديمة
        this.messages = [];
        this.elements.messagesContainer.innerHTML = '';
        
        // إضافة رسالة ترحيبية
        this.addWelcomeMessage(roomId);
    }
    
    updateRoomUI(roomId) {
        const room = this.rooms.find(r => r.id === roomId);
        if (room) {
            this.elements.currentRoomName.textContent = room.name;
            
            // تحديث أيقونة الغرفة
            const roomIcon = this.elements.currentRoomName.parentElement.querySelector('.room-icon');
            if (roomIcon) {
                roomIcon.style.background = room.color;
            }
        }
    }
    
    updateRoomsList() {
        const roomItems = this.elements.roomsList.querySelectorAll('.room-item');
        roomItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.roomId === this.currentRoom) {
                item.classList.add('active');
            }
        });
    }
    
    addWelcomeMessage(roomId) {
        const room = this.rooms.find(r => r.id === roomId);
        if (!room) return;
        
        const welcomeMessage = {
            id: 'welcome',
            type: 'system',
            content: `مرحباً بك في غرفة ${room.name}!`,
            timestamp: new Date(),
            roomId: roomId
        };
        
        this.addMessageToUI(welcomeMessage);
    }
    
    // ====== إدارة الرسائل ======
    sendMessage() {
        const content = this.elements.messageInput.value.trim();
        if (!content) return;
        
        // التحقق من الكتم
        if (this.isUserMuted()) {
            this.showError('أنت مكتم حالياً ولا يمكنك إرسال الرسائل');
            return;
        }
        
        // إرسال الرسالة عبر السيرفر
        this.socket.emit('sendMessage', {
            token: this.currentUser.token,
            roomId: this.currentRoom,
            content: content,
            replyTo: this.replyToMessageId
        });
        
        // إضافة الرسالة محلياً (مؤقتة)
        const tempMessage = {
            id: 'temp-' + Date.now(),
            type: 'text',
            content: content,
            sender: this.currentUser.username,
            senderRole: this.currentUser.role,
            senderColor: this.currentUser.nameColor,
            senderAvatar: this.currentUser.avatar,
            timestamp: new Date(),
            roomId: this.currentRoom,
            status: 'sending',
            replyTo: this.replyToMessageId
        };
        
        this.addMessageToUI(tempMessage);
        
        // مسح حقل الإدخال
        this.elements.messageInput.value = '';
        this.updateCharCount(0);
        
        // إلغاء الرد إذا كان موجوداً
        this.cancelReply();
        
        // التمرير لأسفل
        this.scrollToBottom();
    }
    
    handleNewMessage(message) {
        // التحقق من أن الرسالة للغرفة الحالية
        if (message.roomId !== this.currentRoom) return;
        
        // إضافة الرسالة
        this.messages.push(message);
        this.addMessageToUI(message);
        
        // تحديث عداد الرسائل
        this.elements.messageCount.textContent = this.messages.length;
        
        // تشغيل صوت الرسالة (إذا كانت ليست من المستخدم نفسه)
        if (message.sender !== this.currentUser.username) {
            this.playMessageSound();
        }
        
        // التمرير لأسفل إذا كان المستخدم في الأسفل
        if (this.isAtBottom()) {
            this.scrollToBottom();
        }
    }
    
    addMessageToUI(message) {
        const messageElement = this.createMessageElement(message);
        
        // إضافة للواجهة
        this.elements.messagesContainer.appendChild(messageElement);
        
        // إضافة تأثير ظهور
        setTimeout(() => {
            messageElement.classList.add('visible');
        }, 10);
    }
    
    createMessageElement(message) {
        const messageElement = document.createElement('div');
        
        if (message.type === 'system') {
            messageElement.className = 'system-message';
            messageElement.innerHTML = `
                <div class="system-content">${message.content}</div>
                <div class="message-time">${this.formatTime(message.timestamp)}</div>
            `;
            return messageElement;
        }
        
        const isOwnMessage = message.sender === this.currentUser.username;
        messageElement.className = `message ${isOwnMessage ? 'sent' : 'received'}`;
        
        // تحديد فئة الرتبة
        const roleClass = `role-${message.senderRole.replace(' ', '-').toLowerCase()}`;
        
        // تحديد أيقونة الرتبة
        const roleIcon = {
            'مالك': '<i class="fas fa-crown role-icon"></i>',
            'اونر': '<i class="fas fa-fire role-icon"></i>',
            'ادمن': '<i class="fas fa-shield-alt role-icon"></i>',
            'عضو مميز': '<i class="fas fa-star role-icon"></i>',
            'عضو': '',
            'ضيف': ''
        }[message.senderRole] || '';
        
        // إنشاء محتوى الرسالة
        let messageContent = message.content;
        
        // معالجة الروابط
        messageContent = this.processLinks(messageContent);
        
        // معالجة الإيموجي
        messageContent = this.processEmojis(messageContent);
        
        // التحقق من الرسالة المقتبسة
        let replySection = '';
        if (message.replyTo) {
            const repliedMessage = this.messages.find(m => m.id === message.replyTo);
            if (repliedMessage) {
                replySection = `
                    <div class="quoted-message">
                        <div class="quoted-sender">${repliedMessage.sender}</div>
                        <div class="quoted-content">${repliedMessage.content.substring(0, 100)}${repliedMessage.content.length > 100 ? '...' : ''}</div>
                    </div>
                `;
            }
        }
        
        messageElement.innerHTML = `
            <div class="message-avatar ${message.senderRole === 'ادمن' || message.senderRole === 'اونر' || message.senderRole === 'مالك' ? 'animated-frame' : ''} ${this.currentUser.profileGlow ? 'profile-glow' : ''}">
                <img src="${message.senderAvatar}" 
                     alt="${message.sender}" 
                     class="avatar-img"
                     onclick="chatSystem.showUserProfile('${message.sender}')"
                     style="${message.senderColor && message.senderColor !== '#000000' ? `border-color: ${message.senderColor}` : ''}">
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-sender ${roleClass}" 
                          onclick="chatSystem.showUserProfile('${message.sender}')"
                          style="${message.senderColor && message.senderColor !== '#000000' ? `color: ${message.senderColor}` : ''}">
                        ${roleIcon}${message.sender}
                    </span>
                    <span class="message-time">${this.formatTime(message.timestamp)}</span>
                    <div class="message-actions">
                        ${!isOwnMessage ? `
                            <button class="message-action-btn" onclick="chatSystem.replyToMessage('${message.id}')" title="رد">
                                <i class="fas fa-reply"></i>
                            </button>
                            <button class="message-action-btn" onclick="chatSystem.sendPrivateMessage('${message.sender}')" title="مراسلة خاصة">
                                <i class="fas fa-envelope"></i>
                            </button>
                        ` : ''}
                        ${this.canDeleteMessage(message) ? `
                            <button class="message-action-btn danger" onclick="chatSystem.deleteMessage('${message.id}')" title="حذف">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="message-bubble">
                    ${replySection}
                    <div class="message-text">${messageContent}</div>
                    ${message.status ? `
                        <div class="message-status ${message.status}">
                            <i class="fas fa-${message.status === 'sent' ? 'check' : 'exclamation'}"></i>
                            ${message.status === 'sending' ? 'جاري الإرسال...' : message.status === 'sent' ? 'تم الإرسال' : 'خطأ في الإرسال'}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        return messageElement;
    }
    
    processLinks(text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, url => {
            // التحقق إذا كان رابط يوتيوب
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                const videoId = this.extractYouTubeId(url);
                if (videoId) {
                    return `
                        <div class="youtube-embed" onclick="chatSystem.previewYouTube('${videoId}')">
                            <img src="https://img.youtube.com/vi/${videoId}/0.jpg" class="youtube-thumbnail" alt="فيديو يوتيوب">
                            <div class="youtube-info">
                                <div class="youtube-title">فيديو يوتيوب</div>
                                <div class="youtube-channel">${url}</div>
                            </div>
                        </div>
                    `;
                }
            }
            
            // روابط عادية
            return `<a href="${url}" target="_blank" class="message-link">${url}</a>`;
        });
    }
    
    extractYouTubeId(url) {
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[7].length === 11) ? match[7] : null;
    }
    
    processEmojis(text) {
        // تحويل رموز الإيموجي النصية
        const emojiMap = {
            ':)': '😊',
            ':(': '😔',
            ':D': '😃',
            ':P': '😛',
            ';)': '😉',
            ':|': '😐',
            ':/': '😕',
            ':O': '😮',
            ':*': '😘',
            '<3': '❤️'
        };
        
        let processedText = text;
        Object.keys(emojiMap).forEach(key => {
            const regex = new RegExp(this.escapeRegExp(key), 'g');
            processedText = processedText.replace(regex, emojiMap[key]);
        });
        
        return processedText;
    }
    
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    canDeleteMessage(message) {
        const userRole = this.currentUser.role;
        const senderRole = message.senderRole;
        
        // المالك يستطيع حذف كل الرسائل
        if (userRole === 'مالك') return true;
        
        // الاونر يستطيع حذف كل الرسائل ما عدا رسائل المالك
        if (userRole === 'اونر' && senderRole !== 'مالك') return true;
        
        // الادمن يستطيع حذف رسائل العضو المميز فما دون
        const roleHierarchy = {
            'مالك': 6,
            'اونر': 5,
            'ادمن': 4,
            'عضو مميز': 3,
            'عضو': 2,
            'ضيف': 1
        };
        
        if (userRole === 'ادمن' && roleHierarchy[senderRole] <= 3) return true;
        
        // المستخدم يستطيع حذف رسائله الخاصة
        if (message.sender === this.currentUser.username) return true;
        
        return false;
    }
    
    deleteMessage(messageId) {
        if (!this.socket || !this.socket.connected) {
            this.showError('غير متصل بالسيرفر');
            return;
        }
        
        this.showConfirm('هل تريد حذف هذه الرسالة؟', () => {
            this.socket.emit('deleteMessage', {
                token: this.currentUser.token,
                messageId: messageId,
                roomId: this.currentRoom
            });
        });
    }
    
    handleMessageDeleted(data) {
        // إزالة الرسالة من الواجهة
        const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
        if (messageElement) {
            messageElement.style.opacity = '0.5';
            messageElement.innerHTML = '<div class="message-deleted">تم حذف هذه الرسالة</div>';
        }
        
        // إزالة من القائمة المحلية
        this.messages = this.messages.filter(m => m.id !== data.messageId);
    }
    
    replyToMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;
        
        this.replyToMessageId = messageId;
        
        // إظهار معاينة الرد
        this.elements.replySender.textContent = message.sender;
        this.elements.replyMessage.textContent = message.content.substring(0, 50) + (message.content.length > 50 ? '...' : '');
        this.elements.replyPreview.style.display = 'flex';
        
        // التركيز على حقل الإدخال
        this.elements.messageInput.focus();
    }
    
    cancelReply() {
        this.replyToMessageId = null;
        this.elements.replyPreview.style.display = 'none';
    }
    
    // ====== إدارة المستخدمين ======
    handleUserListUpdate(data) {
        if (data.roomId !== this.currentRoom) return;
        
        // تحديث المستخدمين المتصلين
        data.users.forEach(userData => {
            const user = this.users.get(userData.username);
            if (user) {
                user.isOnline = true;
                this.onlineUsers.set(userData.username, user);
            }
        });
        
        this.renderUsersList();
        this.updateUsersStats();
    }
    
    handleOnlineUsersUpdate(data) {
        if (data.roomId !== this.currentRoom) return;
        
        this.elements.onlineCount.querySelector('span').textContent = data.users.length;
    }
    
    handleUserOffline(user) {
        const existingUser = this.users.get(user.username);
        if (existingUser) {
            existingUser.isOnline = false;
            this.onlineUsers.delete(user.username);
            
            this.renderUsersList();
            this.updateUsersStats();
        }
    }
    
    filterUsers(searchTerm) {
        this.renderUsersList();
    }
    
    filterUsersByRole(role) {
        this.renderUsersList();
    }
    
    toggleOnlineFilter() {
        this.elements.toggleOnlineOnly.classList.toggle('active');
        this.renderUsersList();
    }
    
    refreshUsersList() {
        if (!this.socket || !this.socket.connected) {
            this.showError('غير متصل بالسيرفر');
            return;
        }
        
        // إرسال طلب تحديث قائمة المستخدمين
        this.socket.emit('getUsersList', {
            token: this.currentUser.token,
            roomId: this.currentRoom
        });
        
        // إضافة تأثير التحديث
        this.elements.refreshUsersBtn.querySelector('i').className = 'fas fa-spinner fa-spin';
        setTimeout(() => {
            this.elements.refreshUsersBtn.querySelector('i').className = 'fas fa-sync-alt';
        }, 1000);
    }
    
    // ====== البروفايل والمعلومات ======
    showUserProfile(username) {
        const user = this.users.get(username) || this.currentUser;
        if (!user) return;
        
        // تحديد ألوان الرتبة
        const roleColors = {
            'مالك': '#FFD700',
            'اونر': '#FF6B6B',
            'ادمن': '#8B5CF6',
            'عضو مميز': '#10B981',
            'عضو': '#3B82F6',
            'ضيف': '#6B7280'
        };
        
        const roleBgColors = {
            'مالك': 'linear-gradient(135deg, #FFD700, #FFA500)',
            'اونر': 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
            'ادمن': 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
            'عضو مميز': 'linear-gradient(135deg, #10B981, #059669)',
            'عضو': 'linear-gradient(135deg, #3B82F6, #2563EB)',
            'ضيف': 'linear-gradient(135deg, #6B7280, #4B5563)'
        };
        
        const canEdit = username === this.currentUser.username || this.currentUser.role === 'مالك';
        
        let profileHTML = `
            <div class="profile-header">
                <div class="profile-avatar ${user.role === 'ادمن' || user.role === 'اونر' || user.role === 'مالك' ? 'animated-frame' : ''} ${user.profileGlow ? 'profile-glow' : ''}" 
                     style="${user.frameAnimation ? 'border: 3px solid transparent;' : ''}">
                    <img src="${user.avatar}" alt="${user.username}">
                </div>
                <h2 class="profile-name" style="color: ${user.nameColor || roleColors[user.role]}">${user.username}</h2>
                <div class="profile-role" style="background: ${roleBgColors[user.role]}; color: ${user.role === 'مالك' ? '#333' : 'white'}">
                    ${user.role}
                </div>
                <div class="profile-status">
                    <span class="status-dot ${user.isOnline ? 'online' : 'offline'}"></span>
                    <span>${user.isOnline ? 'متصل الآن' : 'غير متصل'}</span>
                </div>
            </div>
            
            <div class="profile-info">
                <div class="info-item">
                    <div class="info-label">
                        <i class="fas fa-id-card"></i>
                        <span>الرقم التسلسلي</span>
                    </div>
                    <div class="info-value">${user.serial}</div>
                </div>
                
                <div class="info-item">
                    <div class="info-label">
                        <i class="fas fa-venus-mars"></i>
                        <span>الجنس</span>
                    </div>
                    <div class="info-value">${user.gender || 'غير محدد'}</div>
                </div>
                
                <div class="info-item">
                    <div class="info-label">
                        <i class="fas fa-birthday-cake"></i>
                        <span>العمر</span>
                    </div>
                    <div class="info-value">${user.age || 'غير محدد'}</div>
                </div>
                
                <div class="info-item">
                    <div class="info-label">
                        <i class="fas fa-globe"></i>
                        <span>البلد</span>
                    </div>
                    <div class="info-value">${user.country || 'غير محدد'}</div>
                </div>
                
                <div class="info-item">
                    <div class="info-label">
                        <i class="fas fa-calendar-alt"></i>
                        <span>تاريخ الانضمام</span>
                    </div>
                    <div class="info-value">${this.formatDate(user.joinDate)}</div>
                </div>
                
                <div class="info-item">
                    <div class="info-label">
                        <i class="fas fa-clock"></i>
                        <span>آخر ظهور</span>
                    </div>
                    <div class="info-value">${user.lastSeen ? this.formatTime(user.lastSeen) : 'غير معروف'}</div>
                </div>
            </div>
            
            <div class="profile-stats">
                <div class="stat-card">
                    <i class="fas fa-fire"></i>
                    <div class="value">${user.points || 0}</div>
                    <div class="label">نقاط التفاعل</div>
                </div>
                
                <div class="stat-card">
                    <i class="fas fa-coins"></i>
                    <div class="value">${user.gold || 0}</div>
                    <div class="label">الذهب</div>
                </div>
                
                <div class="stat-card">
                    <i class="fas fa-heart"></i>
                    <div class="value">${user.likesReceived || 0}</div>
                    <div class="label">الإعجابات</div>
                </div>
            </div>
            
            <div class="profile-actions">
        `;
        
        // إضافة زر الإعجاب إذا لم يكن المستخدم نفسه
        if (username !== this.currentUser.username) {
            const hasLiked = user.likesGiven && user.likesGiven.includes(username);
            profileHTML += `
                <button class="profile-btn secondary" onclick="chatSystem.likeUser('${username}')" ${hasLiked ? 'disabled' : ''}>
                    <i class="fas fa-heart"></i>
                    ${hasLiked ? 'أعجبت من قبل' : 'إعجاب'}
                </button>
            `;
        }
        
        // إضافة زر المراسلة الخاصة إذا لم يكن المستخدم نفسه
        if (username !== this.currentUser.username) {
            profileHTML += `
                <button class="profile-btn primary" onclick="chatSystem.sendPrivateMessage('${username}')">
                    <i class="fas fa-envelope"></i>
                    مراسلة خاصة
                </button>
            `;
        }
        
        // إضافة زر التعديل إذا كان المستخدم نفسه أو المالك
        if (canEdit) {
            profileHTML += `
                <button class="profile-btn secondary" onclick="chatSystem.showEditProfile('${username}')">
                    <i class="fas fa-edit"></i>
                    تعديل الملف
                </button>
            `;
        }
        
        // إضافة زر إرسال ذهب إذا كان المالك
        if (this.currentUser.role === 'مالك' && username !== this.currentUser.username) {
            profileHTML += `
                <button class="profile-btn gold" onclick="chatSystem.showSendGoldModal('${username}')">
                    <i class="fas fa-gift"></i>
                    إرسال ذهب
                </button>
            `;
        }
        
        // إضافة زر إهداء رتبة إذا كان المالك أو الاونر
        if ((this.currentUser.role === 'مالك' || this.currentUser.role === 'اونر') && username !== this.currentUser.username) {
            profileHTML += `
                <button class="profile-btn vip" onclick="chatSystem.showGiftRoleModal('${username}')">
                    <i class="fas fa-crown"></i>
                    إهداء رتبة
                </button>
            `;
        }
        
        profileHTML += `</div>`;
        
        this.elements.profileContainer.innerHTML = profileHTML;
        this.showModal('profileModal');
    }
    
    likeUser(username) {
        if (!this.socket || !this.socket.connected) {
            this.showError('غير متصل بالسيرفر');
            return;
        }
        
        this.socket.emit('likeUser', {
            token: this.currentUser.token,
            targetUsername: username
        });
    }
    
    showEditProfile(username) {
        const user = username === this.currentUser.username ? this.currentUser : this.users.get(username);
        if (!user) return;
        
        const canEditNameColor = ['عضو مميز', 'ادمن', 'اونر', 'مالك'].includes(this.currentUser.role);
        const canEditProfileBg = ['عضو مميز', 'ادمن', 'اونر', 'مالك'].includes(this.currentUser.role);
        const canEditProfileGlow = ['عضو مميز', 'ادمن', 'اونر', 'مالك'].includes(this.currentUser.role);
        const canEditFrameAnimation = ['ادمن', 'اونر', 'مالك'].includes(this.currentUser.role);
        
        let editHTML = `
            <div class="form-section">
                <h4><i class="fas fa-user-edit"></i> المعلومات الأساسية</h4>
                
                <div class="form-group">
                    <label>البلد</label>
                    <select id="editCountry" class="form-control">
                        <option value="السعودية" ${user.country === 'السعودية' ? 'selected' : ''}>السعودية</option>
                        <option value="مصر" ${user.country === 'مصر' ? 'selected' : ''}>مصر</option>
                        <option value="الإمارات" ${user.country === 'الإمارات' ? 'selected' : ''}>الإمارات</option>
                        <option value="الكويت" ${user.country === 'الكويت' ? 'selected' : ''}>الكويت</option>
                        <option value="قطر" ${user.country === 'قطر' ? 'selected' : ''}>قطر</option>
                        <option value="عمان" ${user.country === 'عمان' ? 'selected' : ''}>عمان</option>
                        <option value="البحرين" ${user.country === 'البحرين' ? 'selected' : ''}>البحرين</option>
                        <option value="العراق" ${user.country === 'العراق' ? 'selected' : ''}>العراق</option>
                        <option value="الأردن" ${user.country === 'الأردن' ? 'selected' : ''}>الأردن</option>
                        <option value="لبنان" ${user.country === 'لبنان' ? 'selected' : ''}>لبنان</option>
                        <option value="فلسطين" ${user.country === 'فلسطين' ? 'selected' : ''}>فلسطين</option>
                        <option value="سوريا" ${user.country === 'سوريا' ? 'selected' : ''}>سوريا</option>
                        <option value="اليمن" ${user.country === 'اليمن' ? 'selected' : ''}>اليمن</option>
                        <option value="السودان" ${user.country === 'السودان' ? 'selected' : ''}>السودان</option>
                        <option value="الجزائر" ${user.country === 'الجزائر' ? 'selected' : ''}>الجزائر</option>
                        <option value="المغرب" ${user.country === 'المغرب' ? 'selected' : ''}>المغرب</option>
                        <option value="تونس" ${user.country === 'تونس' ? 'selected' : ''}>تونس</option>
                        <option value="ليبيا" ${user.country === 'ليبيا' ? 'selected' : ''}>ليبيا</option>
                        <option value="غير محدد" ${!user.country || user.country === 'غير محدد' ? 'selected' : ''}>غير محدد</option>
                    </select>
                </div>
            </div>
        `;
        
        if (canEditNameColor) {
            editHTML += `
                <div class="form-section">
                    <h4><i class="fas fa-palette"></i> تخصيص المظهر</h4>
                    
                    <div class="form-group">
                        <label>لون الاسم</label>
                        <div class="color-picker">
                            <input type="color" id="editNameColor" value="${user.nameColor || '#000000'}">
                            <span class="color-value" id="nameColorValue">${user.nameColor || '#000000'}</span>
                        </div>
                        <div class="hint">اختر اللون الذي تريد أن يظهر به اسمك في الشات</div>
                    </div>
                </div>
            `;
        }
        
        if (canEditProfileBg) {
            editHTML += `
                <div class="form-group">
                    <label>خلفية البروفايل</label>
                    <select id="editProfileBg" class="form-control">
                        <option value="">بدون خلفية</option>
                        <option value="bg1.jpg" ${user.profileBg === 'bg1.jpg' ? 'selected' : ''}>خلفية 1</option>
                        <option value="bg2.jpg" ${user.profileBg === 'bg2.jpg' ? 'selected' : ''}>خلفية 2</option>
                        <option value="bg3.jpg" ${user.profileBg === 'bg3.jpg' ? 'selected' : ''}>خلفية 3</option>
                        <option value="vip_bg.jpg" ${user.profileBg === 'vip_bg.jpg' ? 'selected' : ''}>خلفية VIP</option>
                        <option value="gold_bg.jpg" ${user.profileBg === 'gold_bg.jpg' ? 'selected' : ''}>خلفية ذهبية</option>
                    </select>
                    <div class="hint">اختر خلفية لصفحة بروفايلك</div>
                </div>
            `;
        }
        
        if (canEditProfileGlow) {
            editHTML += `
                <div class="form-group">
                    <div class="checkbox-group">
                        <input type="checkbox" id="editProfileGlow" ${user.profileGlow ? 'checked' : ''}>
                        <label for="editProfileGlow">توهج البروفايل</label>
                    </div>
                    <div class="hint">إضافة توهج حول صورتك الرمزية</div>
                </div>
            `;
        }
        
        if (canEditFrameAnimation) {
            editHTML += `
                <div class="form-group">
                    <label>إطار الصورة المتحرك</label>
                    <select id="editFrameAnimation" class="form-control">
                        <option value="">بدون إطار</option>
                        <option value="frame1.gif" ${user.frameAnimation === 'frame1.gif' ? 'selected' : ''}>إطار ناري</option>
                        <option value="frame2.gif" ${user.frameAnimation === 'frame2.gif' ? 'selected' : ''}>إطار مائي</option>
                        <option value="frame3.gif" ${user.frameAnimation === 'frame3.gif' ? 'selected' : ''}>إطار كهربائي</option>
                        <option value="admin_frame.gif" ${user.frameAnimation === 'admin_frame.gif' ? 'selected' : ''}>إطار ادمن</option>
                        <option value="gold_frame.gif" ${user.frameAnimation === 'gold_frame.gif' ? 'selected' : ''}>إطار ذهبي</option>
                    </select>
                    <div class="hint">اختر إطاراً متحركاً لصورتك الرمزية</div>
                </div>
            `;
        }
        
        editHTML += `
            <div class="form-actions">
                <button class="btn primary" onclick="chatSystem.saveProfile('${username}')">
                    <i class="fas fa-save"></i>
                    حفظ التغييرات
                </button>
                <button class="btn secondary" onclick="chatSystem.hideModal('editProfileModal')">
                    <i class="fas fa-times"></i>
                    إلغاء
                </button>
            </div>
        `;
        
        this.elements.editProfileContainer.innerHTML = editHTML;
        
        // إعداد أحداث منتقي الألوان
        const colorPicker = document.getElementById('editNameColor');
        const colorValue = document.getElementById('nameColorValue');
        
        if (colorPicker && colorValue) {
            colorPicker.addEventListener('input', (e) => {
                colorValue.textContent = e.target.value;
            });
        }
        
        this.showModal('editProfileModal');
    }
    
    saveProfile(username) {
        const updates = {
            country: document.getElementById('editCountry')?.value,
            nameColor: document.getElementById('editNameColor')?.value,
            profileBg: document.getElementById('editProfileBg')?.value,
            profileGlow: document.getElementById('editProfileGlow')?.checked,
            frameAnimation: document.getElementById('editFrameAnimation')?.value
        };
        
        // إرسال التحديثات للسيرفر
        if (this.socket && this.socket.connected) {
            this.socket.emit('updateProfile', {
                token: this.currentUser.token,
                targetUsername: username,
                updates: updates
            });
        }
        
        // تحديث محلياً
        const user = username === this.currentUser.username ? this.currentUser : this.users.get(username);
        if (user) {
            Object.assign(user, updates);
            
            // إذا كان المستخدم الحالي، تحديث localStorage
            if (username === this.currentUser.username) {
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                this.updateUserInterface();
            }
        }
        
        this.hideModal('editProfileModal');
        this.showNotification('تم تحديث الملف الشخصي بنجاح', 'success');
    }
    
    // ====== المحادثات الخاصة ======
    sendPrivateMessage(username) {
        this.hideModal('privateChatModal');
        
        // فتح نافذة محادثة خاصة
        this.openPrivateChatWindow(username);
    }
    
    openPrivateChatWindow(username) {
        // إنشاء نافذة محادثة خاصة
        const chatWindow = document.createElement('div');
        chatWindow.className = 'private-chat-window';
        chatWindow.dataset.username = username;
        
        const user = this.users.get(username);
        const userColor = user?.nameColor || '#000000';
        
        chatWindow.innerHTML = `
            <div class="private-chat-header" style="border-color: ${userColor}">
                <div class="private-chat-user">
                    <img src="${user?.avatar || 'https://ui-avatars.com/api/?name=' + username + '&background=3B82F6&color=fff'}" 
                         alt="${username}"
                         class="private-chat-avatar">
                    <div class="private-chat-info">
                        <div class="private-chat-name" style="color: ${userColor}">${username}</div>
                        <div class="private-chat-status">يكتب الآن...</div>
                    </div>
                </div>
                <div class="private-chat-actions">
                    <button class="private-chat-btn" onclick="chatSystem.closePrivateChat('${username}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="private-chat-messages" id="privateMessages_${username}">
                <!-- الرسائل تظهر هنا -->
            </div>
            <div class="private-chat-input">
                <textarea placeholder="اكتب رسالتك هنا..." rows="1"></textarea>
                <button class="private-chat-send">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(chatWindow);
        
        // إعداد الأحداث
        this.setupPrivateChatEvents(chatWindow, username);
    }
    
    setupPrivateChatEvents(chatWindow, username) {
        const input = chatWindow.querySelector('textarea');
        const sendBtn = chatWindow.querySelector('.private-chat-send');
        const messagesContainer = chatWindow.querySelector('.private-chat-messages');
        
        sendBtn.addEventListener('click', () => {
            this.sendPrivateMessageText(username, input.value, messagesContainer);
            input.value = '';
        });
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendPrivateMessageText(username, input.value, messagesContainer);
                input.value = '';
            }
        });
        
        // تحميل الرسائل السابقة
        this.loadPrivateMessages(username, messagesContainer);
    }
    
    sendPrivateMessageText(receiver, content, container) {
        if (!content.trim()) return;
        
        if (!this.socket || !this.socket.connected) {
            this.showError('غير متصل بالسيرفر');
            return;
        }
        
        // إرسال الرسالة
        this.socket.emit('sendPrivateMessage', {
            token: this.currentUser.token,
            receiver: receiver,
            content: content
        });
        
        // إضافة الرسالة محلياً
        this.addPrivateMessageToUI({
            sender: this.currentUser.username,
            receiver: receiver,
            content: content,
            timestamp: new Date(),
            isOwn: true
        }, container);
    }
    
    handlePrivateMessage(message) {
        // زيادة عداد الرسائل الخاصة
        this.updatePrivateBadge();
        
        // إظهار إشعار
        this.showNotification(`رسالة خاصة من ${message.sender}`, 'info');
        
        // تشغيل صوت التنبيه
        this.playNotificationSound();
        
        // إضافة الرسالة إذا كانت النافذة مفتوحة
        const chatWindow = document.querySelector(`.private-chat-window[data-username="${message.sender}"]`);
        if (chatWindow) {
            const container = chatWindow.querySelector('.private-chat-messages');
            this.addPrivateMessageToUI({
                ...message,
                isOwn: false
            }, container);
        }
    }
    
    addPrivateMessageToUI(message, container) {
        const messageElement = document.createElement('div');
        messageElement.className = `private-message ${message.isOwn ? 'sent' : 'received'}`;
        
        messageElement.innerHTML = `
            <div class="private-message-content">
                <div class="private-message-text">${message.content}</div>
                <div class="private-message-time">${this.formatTime(message.timestamp)}</div>
            </div>
        `;
        
        container.appendChild(messageElement);
        container.scrollTop = container.scrollHeight;
    }
    
    loadPrivateMessages(username, container) {
        // محاكاة تحميل الرسائل السابقة
        const messages = [
            {
                sender: username,
                content: 'مرحباً! كيف حالك؟',
                timestamp: new Date(Date.now() - 3600000),
                isOwn: false
            },
            {
                sender: this.currentUser.username,
                content: 'أهلاً! الحمد لله، كل شيء بخير. وأنت؟',
                timestamp: new Date(Date.now() - 1800000),
                isOwn: true
            }
        ];
        
        messages.forEach(msg => {
            this.addPrivateMessageToUI(msg, container);
        });
    }
    
    closePrivateChat(username) {
        const chatWindow = document.querySelector(`.private-chat-window[data-username="${username}"]`);
        if (chatWindow) {
            chatWindow.remove();
        }
    }
    
    updatePrivateBadge() {
        const count = parseInt(this.elements.privateBadge.textContent) || 0;
        this.elements.privateBadge.textContent = count + 1;
        this.elements.privateBadge.style.display = count + 1 > 0 ? 'flex' : 'none';
    }
    
    // ====== نظام الذهب والرتب ======
    showSendGoldModal(username) {
        if (this.currentUser.role !== 'مالك') {
            this.showError('هذه الميزة للمالك فقط');
            return;
        }
        
        const user = this.users.get(username);
        if (!user) return;
        
        const modalHTML = `
            <div class="send-gold-form">
                <div class="form-group">
                    <label>المستلم: ${username}</label>
                </div>
                
                <div class="form-group">
                    <label>المبلغ</label>
                    <input type="number" id="goldAmount" class="form-control" min="1" max="100000" value="1000">
                    <div class="hint">أدخل المبلغ الذي تريد إرساله (1 - 100,000)</div>
                </div>
                
                <div class="form-group">
                    <label>الرسالة (اختياري)</label>
                    <textarea id="goldMessage" class="form-control" rows="3" placeholder="رسالة مصاحبة..."></textarea>
                </div>
                
                <div class="form-actions">
                    <button class="btn gold" onclick="chatSystem.sendGold('${username}')">
                        <i class="fas fa-paper-plane"></i>
                        إرسال الذهب
                    </button>
                    <button class="btn secondary" onclick="chatSystem.hideModal('sendGoldModal')">
                        <i class="fas fa-times"></i>
                        إلغاء
                    </button>
                </div>
            </div>
        `;
        
        this.elements.sendGoldContainer.innerHTML = modalHTML;
        this.showModal('sendGoldModal');
    }
    
    sendGold(username) {
        const amount = parseInt(document.getElementById('goldAmount')?.value);
        const message = document.getElementById('goldMessage')?.value;
        
        if (!amount || amount < 1 || amount > 100000) {
            this.showError('المبلغ غير صالح');
            return;
        }
        
        if (!this.socket || !this.socket.connected) {
            this.showError('غير متصل بالسيرفر');
            return;
        }
        
        this.socket.emit('sendGold', {
            token: this.currentUser.token,
            targetUsername: username,
            amount: amount,
            message: message
        });
        
        this.hideModal('sendGoldModal');
        this.showNotification(`تم إرسال ${amount} ذهب إلى ${username}`, 'success');
        
        // إضافة تأثير الذهب
        this.createGoldEffect(amount);
    }
    
    handleGoldUpdate(data) {
        // تحديث ذهب المستخدم إذا كان هو المستلم
        if (data.receiver === this.currentUser.username) {
            this.currentUser.gold = (this.currentUser.gold || 0) + data.amount;
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            
            // إظهار تأثير
            this.createGoldEffect(data.amount);
            this.showNotification(`لقد استلمت ${data.amount} ذهب من ${data.sender}`, 'success');
        }
        
        // تحديث قائمة الأثرياء
        this.updateRichList();
    }
    
    showGiftRoleModal(username) {
        const allowedRoles = this.currentUser.role === 'مالك' 
            ? ['عضو مميز', 'ادمن', 'اونر']
            : ['عضو مميز', 'ادمن'];
        
        const user = this.users.get(username);
        if (!user) return;
        
        let optionsHTML = '';
        allowedRoles.forEach(role => {
            if (this.getRoleLevel(role) > this.getRoleLevel(user.role)) {
                optionsHTML += `<option value="${role}">${role}</option>`;
            }
        });
        
        if (!optionsHTML) {
            this.showError('لا يمكن إهداء رتبة أعلى من رتبة المستخدم الحالية');
            return;
        }
        
        const modalHTML = `
            <div class="gift-role-form">
                <div class="form-group">
                    <label>المستلم: ${username}</label>
                    <div class="current-role">الرتبة الحالية: ${user.role}</div>
                </div>
                
                <div class="form-group">
                    <label>الرتبة المهداة</label>
                    <select id="giftRole" class="form-control">
                        ${optionsHTML}
                    </select>
                    <div class="hint">اختر الرتبة التي تريد إهداءها</div>
                </div>
                
                <div class="form-actions">
                    <button class="btn vip" onclick="chatSystem.giftRole('${username}')">
                        <i class="fas fa-gift"></i>
                        إهداء الرتبة
                    </button>
                    <button class="btn secondary" onclick="chatSystem.hideModal('giftRoleModal')">
                        <i class="fas fa-times"></i>
                        إلغاء
                    </button>
                </div>
            </div>
        `;
        
        this.elements.giftRoleContainer.innerHTML = modalHTML;
        this.showModal('giftRoleModal');
    }
    
    giftRole(username) {
        const role = document.getElementById('giftRole')?.value;
        if (!role) return;
        
        if (!this.socket || !this.socket.connected) {
            this.showError('غير متصل بالسيرفر');
            return;
        }
        
        this.socket.emit('giftRole', {
            token: this.currentUser.token,
            targetUsername: username,
            targetRole: role
        });
        
        this.hideModal('giftRoleModal');
    }
    
    handleRoleUpdate(data) {
        // تحديث رتبة المستخدم في القائمة
        const user = this.users.get(data.username);
        if (user) {
            user.role = data.newRole;
            this.renderUsersList();
        }
        
        // إظهار إشعار
        this.showNotification(data.message, 'info');
    }
    
    getRoleLevel(role) {
        const levels = {
            'مالك': 6,
            'اونر': 5,
            'ادمن': 4,
            'عضو مميز': 3,
            'عضو': 2,
            'ضيف': 1
        };
        return levels[role] || 0;
    }
    
    // ====== نظام العقوبات ======
    showPunishmentsModal(username) {
        const user = this.users.get(username);
        if (!user) return;
        
        // التحقق من الصلاحيات
        if (!this.canManageUser(user)) {
            this.showError('لا تملك صلاحية لإدارة هذا المستخدم');
            return;
        }
        
        const modalHTML = `
            <div class="punishments-form">
                <div class="form-group">
                    <label>المستخدم: ${username}</label>
                    <div class="user-role">الرتبة: ${user.role}</div>
                </div>
                
                <div class="punishment-options">
                    <div class="punishment-option">
                        <h4><i class="fas fa-microphone-slash"></i> كتم</h4>
                        <div class="duration-options">
                            <label class="duration-option">
                                <input type="radio" name="muteDuration" value="5m" checked>
                                <span>5 دقائق</span>
                            </label>
                            <label class="duration-option">
                                <input type="radio" name="muteDuration" value="1d">
                                <span>يوم واحد</span>
                            </label>
                            <label class="duration-option">
                                <input type="radio" name="muteDuration" value="forever">
                                <span>للأبد</span>
                            </label>
                        </div>
                        <button class="btn warning" onclick="chatSystem.muteUser('${username}')">
                            <i class="fas fa-microphone-slash"></i>
                            كتم المستخدم
                        </button>
                    </div>
                    
                    <div class="punishment-option">
                        <h4><i class="fas fa-door-open"></i> طرد</h4>
                        <div class="duration-options">
                            <label class="duration-option">
                                <input type="radio" name="kickDuration" value="5m" checked>
                                <span>5 دقائق</span>
                            </label>
                            <label class="duration-option">
                                <input type="radio" name="kickDuration" value="1d">
                                <span>يوم واحد</span>
                            </label>
                            <label class="duration-option">
                                <input type="radio" name="kickDuration" value="forever">
                                <span>للأبد</span>
                            </label>
                        </div>
                        <button class="btn danger" onclick="chatSystem.kickUser('${username}')">
                            <i class="fas fa-door-open"></i>
                            طرد المستخدم
                        </button>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button class="btn secondary" onclick="chatSystem.hideModal('punishmentsModal')">
                        <i class="fas fa-times"></i>
                        إلغاء
                    </button>
                </div>
            </div>
        `;
        
        this.elements.punishmentsContainer.innerHTML = modalHTML;
        this.showModal('punishmentsModal');
    }
    
    muteUser(username) {
        const duration = document.querySelector('input[name="muteDuration"]:checked')?.value;
        if (!duration) return;
        
        if (!this.socket || !this.socket.connected) {
            this.showError('غير متصل بالسيرفر');
            return;
        }
        
        this.socket.emit('muteUser', {
            token: this.currentUser.token,
            targetUsername: username,
            duration: duration,
            roomId: this.currentRoom
        });
        
        this.hideModal('punishmentsModal');
        this.showNotification(`تم كتم ${username} لمدة ${duration}`, 'success');
    }
    
    kickUser(username) {
        const duration = document.querySelector('input[name="kickDuration"]:checked')?.value;
        if (!duration) return;
        
        if (!this.socket || !this.socket.connected) {
            this.showError('غير متصل بالسيرفر');
            return;
        }
        
        this.socket.emit('kickUser', {
            token: this.currentUser.token,
            targetUsername: username,
            duration: duration,
            roomId: this.currentRoom
        });
        
        this.hideModal('punishmentsModal');
        this.showNotification(`تم طرد ${username} لمدة ${duration}`, 'success');
    }
    
    handleMuted(data) {
        if (data.target === this.currentUser.username) {
            this.showError(data.message);
            this.elements.messageInput.disabled = true;
            this.elements.messageInput.placeholder = 'أنت مكتم حالياً';
            this.elements.sendBtn.disabled = true;
        }
    }
    
    handleKicked(data) {
        if (data.target === this.currentUser.username && data.roomId === this.currentRoom) {
            this.showError(data.message);
            this.joinRoom('general');
        }
    }
    
    isUserMuted() {
        // التحقق من حالة الكتم
        return false; // محاكاة
    }
    
    // ====== القوائم الخاصة ======
    showWall() {
        let wallHTML = `
            <div class="wall-header">
                <button class="btn primary" onclick="chatSystem.createWallPost()">
                    <i class="fas fa-plus"></i>
                    منشور جديد
                </button>
            </div>
            
            <div class="wall-posts">
        `;
        
        if (this.wallPosts.length === 0) {
            wallHTML += `
                <div class="empty-wall">
                    <i class="fas fa-newspaper"></i>
                    <h3>لا توجد منشورات بعد</h3>
                    <p>كن أول من ينشر على الحائط!</p>
                </div>
            `;
        } else {
            this.wallPosts.forEach(post => {
                wallHTML += this.createWallPostHTML(post);
            });
        }
        
        wallHTML += `</div>`;
        
        this.elements.wallContainer.innerHTML = wallHTML;
        this.showModal('wallModal');
    }
    
    createWallPost() {
        const modalHTML = `
            <div class="create-post-form">
                <div class="form-group">
                    <label>المحتوى</label>
                    <textarea id="postContent" class="form-control" rows="5" placeholder="ماذا تفكر؟"></textarea>
                </div>
                
                <div class="form-actions">
                    <button class="btn primary" onclick="chatSystem.publishWallPost()">
                        <i class="fas fa-paper-plane"></i>
                        نشر
                    </button>
                    <button class="btn secondary" onclick="chatSystem.hideModal('wallModal')">
                        <i class="fas fa-times"></i>
                        إلغاء
                    </button>
                </div>
            </div>
        `;
        
        this.elements.wallContainer.innerHTML = modalHTML;
    }
    
    publishWallPost() {
        const content = document.getElementById('postContent')?.value;
        if (!content?.trim()) return;
        
        const post = {
            id: 'post-' + Date.now(),
            author: this.currentUser.username,
            authorAvatar: this.currentUser.avatar,
            content: content,
            timestamp: new Date(),
            likes: 0,
            comments: []
        };
        
        this.wallPosts.unshift(post);
        this.showWall();
        this.showNotification('تم نشر المنشور بنجاح', 'success');
    }
    
    createWallPostHTML(post) {
        return `
            <div class="wall-post">
                <div class="post-header">
                    <img src="${post.authorAvatar}" alt="${post.author}" class="post-avatar">
                    <div class="post-author">
                        <div class="post-name">${post.author}</div>
                        <div class="post-time">${this.formatTime(post.timestamp)}</div>
                    </div>
                </div>
                <div class="post-content">${post.content}</div>
                <div class="post-actions">
                    <button class="post-action" onclick="chatSystem.likePost('${post.id}')">
                        <i class="fas fa-heart"></i>
                        <span>${post.likes}</span>
                    </button>
                    <button class="post-action" onclick="chatSystem.commentOnPost('${post.id}')">
                        <i class="fas fa-comment"></i>
                        <span>${post.comments.length}</span>
                    </button>
                </div>
            </div>
        `;
    }
    
    showActiveList() {
        let activeHTML = `
            <div class="active-list-header">
                <h4><i class="fas fa-trophy"></i> أفضل 3 متفاعلين</h4>
                <div class="list-info">يتم تحديث القائمة تلقائياً</div>
            </div>
            
            <div class="active-list-items">
        `;
        
        if (this.activeList.length === 0) {
            activeHTML += `
                <div class="empty-list">
                    <i class="fas fa-users"></i>
                    <p>لا توجد بيانات بعد</p>
                </div>
            `;
        } else {
            this.activeList.forEach((user, index) => {
                const medal = ['🥇', '🥈', '🥉'][index] || '•';
                
                activeHTML += `
                    <div class="active-item">
                        <div class="active-rank">${medal}</div>
                        <img src="${user.avatar || 'https://ui-avatars.com/api/?name=' + user.username + '&background=3B82F6&color=fff'}" 
                             alt="${user.username}" 
                             class="active-avatar">
                        <div class="active-info">
                            <div class="active-name">${user.username}</div>
                            <div class="active-role">${user.role}</div>
                        </div>
                        <div class="active-points">
                            <i class="fas fa-fire"></i>
                            <span>${user.points} نقطة</span>
                        </div>
                    </div>
                `;
            });
        }
        
        activeHTML += `</div>`;
        
        this.elements.activeListContainer.innerHTML = activeHTML;
        this.showModal('activeListModal');
    }
    
    handleActiveListUpdate(list) {
        this.activeList = list;
    }
    
    showRichList() {
        let richHTML = `
            <div class="rich-list-header">
                <h4><i class="fas fa-crown"></i> أفضل 3 أثرياء</h4>
                <div class="list-info">يتم تحديث القائمة تلقائياً</div>
            </div>
            
            <div class="rich-list-items">
        `;
        
        if (this.richList.length === 0) {
            richHTML += `
                <div class="empty-list">
                    <i class="fas fa-coins"></i>
                    <p>لا توجد بيانات بعد</p>
                </div>
            `;
        } else {
            this.richList.forEach((user, index) => {
                const medal = ['🥇', '🥈', '🥉'][index] || '•';
                
                richHTML += `
                    <div class="rich-item">
                        <div class="rich-rank">${medal}</div>
                        <img src="${user.avatar || 'https://ui-avatars.com/api/?name=' + user.username + '&background=FFD700&color=333'}" 
                             alt="${user.username}" 
                             class="rich-avatar">
                        <div class="rich-info">
                            <div class="rich-name">${user.username}</div>
                            <div class="rich-role">${user.role}</div>
                        </div>
                        <div class="rich-gold">
                            <i class="fas fa-coins"></i>
                            <span>${user.gold} ذهب</span>
                        </div>
                    </div>
                `;
            });
        }
        
        richHTML += `</div>`;
        
        this.elements.richListContainer.innerHTML = richHTML;
        this.showModal('richListModal');
    }
    
    handleRichListUpdate(list) {
        this.richList = list;
    }
    
    showSubscriptions() {
        const subscriptionsHTML = `
            <div class="subscriptions-plans">
                <div class="plan-card">
                    <div class="plan-header vip">
                        <h3><i class="fas fa-star"></i> عضو مميز</h3>
                        <div class="plan-price">5,000 <span>ذهب</span></div>
                    </div>
                    <div class="plan-features">
                        <div class="feature"><i class="fas fa-check"></i> تلوين الاسم</div>
                        <div class="feature"><i class="fas fa-check"></i> خلفية البروفايل</div>
                        <div class="feature"><i class="fas fa-check"></i> توهج البروفايل</div>
                        <div class="feature"><i class="fas fa-check"></i> تأثير دخول خاص</div>
                    </div>
                    <button class="plan-btn vip" onclick="chatSystem.buySubscription('عضو مميز', 5000)">
                        <i class="fas fa-shopping-cart"></i>
                        شراء الآن
                    </button>
                </div>
                
                <div class="plan-card">
                    <div class="plan-header admin">
                        <h3><i class="fas fa-shield-alt"></i> ادمن</h3>
                        <div class="plan-price">20,000 <span>ذهب</span></div>
                    </div>
                    <div class="plan-features">
                        <div class="feature"><i class="fas fa-check"></i> كل مميزات العضو المميز</div>
                        <div class="feature"><i class="fas fa-check"></i> إطار صورة متحرك</div>
                        <div class="feature"><i class="fas fa-check"></i> صلاحيات إدارية</div>
                        <div class="feature"><i class="fas fa-check"></i> تأثير دخول متقدم</div>
                    </div>
                    <button class="plan-btn admin" onclick="chatSystem.buySubscription('ادمن', 20000)">
                        <i class="fas fa-shopping-cart"></i>
                        شراء الآن
                    </button>
                </div>
            </div>
            
            <div class="subscriptions-info">
                <h4><i class="fas fa-info-circle"></i> معلومات مهمة</h4>
                <ul>
                    <li>الذهب يمكن الحصول عليه من المالك فقط</li>
                    <li>الاشتراكات دائمة ولا تنتهي</li>
                    <li>يمكنك الترقية لاشتراك أعلى في أي وقت</li>
                    <li>للأسئلة والاستفسارات راسل المالك</li>
                </ul>
            </div>
        `;
        
        this.elements.subscriptionsContainer.innerHTML = subscriptionsHTML;
        this.showModal('subscriptionsModal');
    }
    
    buySubscription(role, price) {
        if (this.currentUser.gold < price) {
            this.showError(`رصيدك غير كافي. تحتاج ${price} ذهب`);
            return;
        }
        
        this.showConfirm(`هل تريد شراء رتبة ${role} مقابل ${price} ذهب؟`, () => {
            if (!this.socket || !this.socket.connected) {
                this.showError('غير متصل بالسيرفر');
                return;
            }
            
            this.socket.emit('buyRole', {
                token: this.currentUser.token,
                targetRole: role
            });
            
            this.hideModal('subscriptionsModal');
        });
    }
    
    // ====== الإشعارات ======
    showNotifications() {
        let notificationsHTML = `
            <div class="notifications-header">
                <h4>الإشعارات</h4>
                <div class="notifications-actions">
                    <button class="btn-small" onclick="chatSystem.markAllNotificationsAsRead()">
                        تعيين الكل كمقروء
                    </button>
                </div>
            </div>
            
            <div class="notifications-list-content">
        `;
        
        if (this.notifications.length === 0) {
            notificationsHTML += `
                <div class="empty-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <p>لا توجد إشعارات</p>
                </div>
            `;
        } else {
            this.notifications.forEach(notification => {
                notificationsHTML += this.createNotificationHTML(notification);
            });
        }
        
        notificationsHTML += `</div>`;
        
        this.elements.notificationsList.innerHTML = notificationsHTML;
        this.showModal('notificationsModal');
    }
    
    createNotificationHTML(notification) {
        const iconClass = {
            'welcome': 'fas fa-bell text-primary',
            'message': 'fas fa-envelope text-info',
            'like': 'fas fa-heart text-danger',
            'gold': 'fas fa-coins text-warning',
            'role': 'fas fa-crown text-success',
            'system': 'fas fa-info-circle text-secondary'
        }[notification.type] || 'fas fa-bell';
        
        return `
            <div class="notification-item ${notification.read ? 'read' : 'unread'}">
                <div class="notification-header">
                    <i class="${iconClass}"></i>
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-time">${this.formatTime(notification.timestamp)}</div>
                </div>
                <div class="notification-content">${notification.message}</div>
                ${!notification.read ? `
                    <div class="notification-actions">
                        <button class="btn-small" onclick="chatSystem.markNotificationAsRead('${notification.id}')">
                            تعيين كمقروء
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    handleNotification(notification) {
        // إضافة الإشعار للقائمة
        this.notifications.unshift({
            id: 'notif-' + Date.now(),
            ...notification,
            timestamp: new Date(),
            read: false
        });
        
        // تحديث العداد
        this.updateNotificationBadge();
        
        // إظهار إشعار فوري
        this.showToastNotification(notification);
    }
    
    showToastNotification(notification) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(notification.type)}"></i>
            <div class="toast-content">
                <div class="toast-title">${notification.title || 'إشعار جديد'}</div>
                <div class="toast-message">${notification.message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(toast);
        
        // إضافة أنيميشن
        setTimeout(() => toast.classList.add('show'), 10);
        
        // إزالة بعد 5 ثواني
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }
    
    getNotificationIcon(type) {
        const icons = {
            'welcome': 'bell',
            'message': 'envelope',
            'like': 'heart',
            'gold': 'coins',
            'role': 'crown',
            'system': 'info-circle'
        };
        return icons[type] || 'bell';
    }
    
    updateNotificationBadge() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        this.elements.notificationBadge.textContent = unreadCount;
        this.elements.notificationBadge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
    
    markNotificationAsRead(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (notification) {
            notification.read = true;
            this.updateNotificationBadge();
            this.showNotifications();
        }
    }
    
    markAllNotificationsAsRead() {
        this.notifications.forEach(n => n.read = true);
        this.updateNotificationBadge();
        this.showNotifications();
    }
    
    // ====== الإعدادات ======
    showSettings() {
        const settingsHTML = `
            <div class="settings-group">
                <h4><i class="fas fa-user-cog"></i> إعدادات الحساب</h4>
                
                <div class="setting-item">
                    <div class="setting-info">
                        <div class="setting-name">تحديث تلقائي للقوائم</div>
                        <div class="setting-description">تحديث قائمة المستخدمين والرسائل تلقائياً</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="autoRefresh" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                
                <div class="setting-item">
                    <div class="setting-info">
                        <div class="setting-name">أصوات التنبيهات</div>
                        <div class="setting-description">تشغيل أصوات التنبيهات للرسائل والإشعارات</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="notificationSounds" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                
                <div class="setting-item">
                    <div class="setting-info">
                        <div class="setting-name">إشعارات الدخول والخروج</div>
                        <div class="setting-description">إظهار إشعارات دخول وخروج المستخدمين</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="joinLeaveNotifications" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            
            <div class="settings-group">
                <h4><i class="fas fa-display"></i> إعدادات الواجهة</h4>
                
                <div class="setting-item">
                    <div class="setting-info">
                        <div class="setting-name">الوضع الداكن</div>
                        <div class="setting-description">تبديل الواجهة للوضع الداكن</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="darkMode" ${this.isDarkMode ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                
                <div class="setting-item">
                    <div class="setting-info">
                        <div class="setting-name">دمج الرسائل المتتالية</div>
                        <div class="setting-description">دمج الرسائل المتتالية من نفس المرسل</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="mergeMessages" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                
                <div class="setting-item">
                    <div class="setting-info">
                        <div class="setting-name">عرض الصور المصغرة</div>
                        <div class="setting-description">عرض معاينة مصغرة للصور المرفقة</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="showThumbnails" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            
            <div class="settings-group">
                <h4><i class="fas fa-shield-alt"></i> الخصوصية والأمان</h4>
                
                <div class="setting-item">
                    <div class="setting-info">
                        <div class="setting-name">قبول طلبات الصداقة</div>
                        <div class="setting-description">السماح للمستخدمين بإرسال طلبات صداقة</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="acceptFriendRequests" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                
                <div class="setting-item">
                    <div class="setting-info">
                        <div class="setting-name">الرسائل الخاصة</div>
                        <div class="setting-description">السماح للمستخدمين بإرسال رسائل خاصة لك</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="allowPrivateMessages" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                
                <div class="setting-item">
                    <div class="setting-info">
                        <div class="setting-name">عرض حالة الاتصال</div>
                        <div class="setting-description">إظهار حالتك (متصل/غير متصل) للمستخدمين الآخرين</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="showOnlineStatus" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            
            <div class="settings-actions">
                <button class="btn danger" onclick="chatSystem.logout()">
                    <i class="fas fa-sign-out-alt"></i>
                    تسجيل الخروج
                </button>
                
                <button class="btn secondary" onclick="chatSystem.hideModal('settingsModal')">
                    <i class="fas fa-times"></i>
                    إغلاق
                </button>
            </div>
        `;
        
        this.elements.settingsContainer.innerHTML = settingsHTML;
        
        // إعداد أحداث التبديل
        const darkModeToggle = document.getElementById('darkMode');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('change', (e) => {
                this.isDarkMode = e.target.checked;
                this.applyTheme();
                this.updateThemeButton();
            });
        }
        
        this.showModal('settingsModal');
    }
    
    logout() {
        this.showConfirm('هل تريد تسجيل الخروج؟', () => {
            // قطع الاتصال بالسيرفر
            if (this.socket) {
                this.socket.disconnect();
            }
            
            // مسح بيانات المستخدم
            localStorage.removeItem('currentUser');
            localStorage.removeItem('userToken');
            
            // التوجيه للصفحة الرئيسية
            window.location.href = '/';
        });
    }
    
    // ====== مساعدات وأدوات ======
    showModal(modalId) {
        const modal = this.elements[modalId];
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    
    hideModal(modalId) {
        const modal = this.elements[modalId];
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
    
    showConfirm(message, onConfirm) {
        const confirmHTML = `
            <div class="confirm-content">
                <div class="confirm-icon">
                    <i class="fas fa-question-circle"></i>
                </div>
                <div class="confirm-message">${message}</div>
                <div class="confirm-actions">
                    <button class="btn primary" onclick="chatSystem.confirmAction(true)">
                        نعم
                    </button>
                    <button class="btn secondary" onclick="chatSystem.confirmAction(false)">
                        لا
                    </button>
                </div>
            </div>
        `;
        
        this.elements.confirmContainer.innerHTML = confirmHTML;
        this.confirmCallback = onConfirm;
        this.showModal('confirmModal');
    }
    
    confirmAction(confirmed) {
        this.hideModal('confirmModal');
        if (confirmed && this.confirmCallback) {
            this.confirmCallback();
        }
        this.confirmCallback = null;
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <div class="content">
                <p>${message}</p>
            </div>
            <button class="close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        this.elements.notificationsContainer.appendChild(notification);
        
        // إزالة تلقائية بعد 5 ثواني
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
    
    updateCharCount(count) {
        this.elements.charCount.textContent = count;
        this.elements.charCount.className = count > 900 ? 'warning' : '';
    }
    
    handleTyping() {
        if (!this.isTyping) {
            this.isTyping = true;
            if (this.socket && this.socket.connected) {
                this.socket.emit('typing', {
                    token: this.currentUser.token,
                    roomId: this.currentRoom
                });
            }
        }
        
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.isTyping = false;
            if (this.socket && this.socket.connected) {
                this.socket.emit('stopTyping', {
                    token: this.currentUser.token,
                    roomId: this.currentRoom
                });
            }
        }, 1000);
    }
    
    toggleRecording() {
        if (!this.mediaRecorder) {
            this.showError('التسجيل الصوتي غير مدعوم');
            return;
        }
        
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }
    
    startRecording() {
        if (!this.mediaRecorder || this.mediaRecorder.state === 'recording') return;
        
        this.audioChunks = [];
        this.mediaRecorder.start();
        this.isRecording = true;
        
        // تحديث واجهة التسجيل
        this.showRecordingModal();
        
        // تحديث زر الميكروفون
        this.elements.micBtn.classList.add('active');
        this.elements.micBtn.querySelector('i').className = 'fas fa-stop';
        this.elements.micBtn.title = 'إيقاف التسجيل';
    }
    
    stopRecording() {
        if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') return;
        
        this.mediaRecorder.stop();
        this.isRecording = false;
        
        // تحديث زر الميكروفون
        this.elements.micBtn.classList.remove('active');
        this.elements.micBtn.querySelector('i').className = 'fas fa-microphone';
        this.elements.micBtn.title = 'تسجيل صوتي';
    }
    
    showRecordingModal() {
        const modalHTML = `
            <div class="recording-interface">
                <div class="recording-status">
                    <div class="recording-indicator">
                        <div class="pulse-circle"></div>
                        <i class="fas fa-microphone"></i>
                    </div>
                    <div class="recording-text">جاري التسجيل...</div>
                </div>
                
                <div class="recording-timer">
                    <span id="recordingTime">00:00</span>
                </div>
                
                <div class="recording-controls">
                    <button class="btn danger" onclick="chatSystem.stopRecording()">
                        <i class="fas fa-stop"></i>
                        إيقاف التسجيل
                    </button>
                    
                    <button class="btn secondary" onclick="chatSystem.cancelRecording()">
                        <i class="fas fa-times"></i>
                        إلغاء
                    </button>
                </div>
            </div>
        `;
        
        this.elements.recordingContainer.innerHTML = modalHTML;
        this.showModal('recordingModal');
        
        // بدء عداد الوقت
        this.startRecordingTimer();
    }
    
    startRecordingTimer() {
        let seconds = 0;
        this.recordingTimer = setInterval(() => {
            seconds++;
            const timeElement = document.getElementById('recordingTime');
            if (timeElement) {
                const minutes = Math.floor(seconds / 60);
                const remainingSeconds = seconds % 60;
                timeElement.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
            }
            
            // إيقاف تلقائي بعد 60 ثانية
            if (seconds >= 60) {
                this.stopRecording();
            }
        }, 1000);
    }
    
    cancelRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }
        
        this.isRecording = false;
        clearInterval(this.recordingTimer);
        this.hideModal('recordingModal');
        
        this.elements.micBtn.classList.remove('active');
        this.elements.micBtn.querySelector('i').className = 'fas fa-microphone';
        this.elements.micBtn.title = 'تسجيل صوتي';
    }
    
    handleRecordingComplete(audioBlob) {
        clearInterval(this.recordingTimer);
        this.hideModal('recordingModal');
        
        // تحويل الـ Blob لـ URL
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // عرض معاينة التسجيل
        this.showRecordingPreview(audioUrl, audioBlob);
    }
    
    showRecordingPreview(audioUrl, audioBlob) {
        const modalHTML = `
            <div class="recording-preview">
                <div class="preview-header">
                    <h4><i class="fas fa-play-circle"></i> معاينة التسجيل</h4>
                </div>
                
                <div class="preview-audio">
                    <audio controls src="${audioUrl}"></audio>
                </div>
                
                <div class="preview-actions">
                    <button class="btn primary" onclick="chatSystem.sendRecording('${audioUrl}')">
                        <i class="fas fa-paper-plane"></i>
                        إرسال التسجيل
                    </button>
                    
                    <button class="btn secondary" onclick="chatSystem.hideModal('recordingModal')">
                        <i class="fas fa-times"></i>
                        إلغاء
                    </button>
                </div>
            </div>
        `;
        
        this.elements.recordingContainer.innerHTML = modalHTML;
        this.currentRecording = { url: audioUrl, blob: audioBlob };
        this.showModal('recordingModal');
    }
    
    sendRecording(audioUrl) {
        // هنا يجب رفع التسجيل للسيرفر
        // حالياً نرسل الـ URL فقط للعرض
        this.sendMessageWithAttachment('audio', audioUrl);
        this.hideModal('recordingModal');
        this.currentRecording = null;
    }
    
    sendMessageWithAttachment(type, url) {
        // إرسال رسالة مع مرفق
        const message = {
            type: type,
            content: url,
            sender: this.currentUser.username,
            timestamp: new Date()
        };
        
        // محاكاة الإرسال
        this.handleNewMessage(message);
    }
    
    showAttachmentModal() {
        const modalHTML = `
            <div class="attachment-options">
                <div class="attachment-option" onclick="chatSystem.attachImage()">
                    <div class="option-icon">
                        <i class="fas fa-image"></i>
                    </div>
                    <div class="option-text">صورة</div>
                </div>
                
                <div class="attachment-option" onclick="chatSystem.attachYouTube()">
                    <div class="option-icon">
                        <i class="fab fa-youtube"></i>
                    </div>
                    <div class="option-text">فيديو يوتيوب</div>
                </div>
                
                <div class="attachment-option" onclick="chatSystem.toggleRecording()">
                    <div class="option-icon">
                        <i class="fas fa-microphone"></i>
                    </div>
                    <div class="option-text">تسجيل صوتي</div>
                </div>
            </div>
            
            <div class="attachment-actions">
                <button class="btn secondary" onclick="chatSystem.hideModal('attachmentModal')">
                    <i class="fas fa-times"></i>
                    إلغاء
                </button>
            </div>
        `;
        
        this.elements.attachmentContainer.innerHTML = modalHTML;
        this.showModal('attachmentModal');
    }
    
    attachImage() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.previewAttachment('image', event.target.result);
                };
                reader.readAsDataURL(file);
            }
        };
        
        input.click();
        this.hideModal('attachmentModal');
    }
    
    attachYouTube() {
        const url = prompt('أدخل رابط فيديو اليوتيوب:');
        if (url) {
            const videoId = this.extractYouTubeId(url);
            if (videoId) {
                this.previewAttachment('youtube', url);
            } else {
                this.showError('رابط اليوتيوب غير صالح');
            }
        }
    }
    
    previewAttachment(type, content) {
        const previewId = 'attach-' + Date.now();
        
        let previewHTML = '';
        if (type === 'image') {
            previewHTML = `
                <img src="${content}" alt="صورة مرفقة" class="attachment-preview-img">
            `;
        } else if (type === 'youtube') {
            const videoId = this.extractYouTubeId(content);
            previewHTML = `
                <div class="youtube-preview">
                    <img src="https://img.youtube.com/vi/${videoId}/0.jpg" alt="فيديو يوتيوب">
                    <div class="youtube-preview-info">فيديو يوتيوب</div>
                </div>
            `;
        }
        
        const previewElement = document.createElement('div');
        previewElement.className = 'attachment-preview-item';
        previewElement.id = previewId;
        previewElement.innerHTML = `
            ${previewHTML}
            <button class="remove-attachment" onclick="chatSystem.removeAttachment('${previewId}')">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        this.elements.attachmentsPreview.appendChild(previewElement);
        
        // تخزين بيانات المرفق
        if (!this.attachments) this.attachments = [];
        this.attachments.push({
            id: previewId,
            type: type,
            content: content
        });
    }
    
    removeAttachment(id) {
        const element = document.getElementById(id);
        if (element) {
            element.remove();
        }
        
        if (this.attachments) {
            this.attachments = this.attachments.filter(att => att.id !== id);
        }
    }
    
    handleDroppedFiles(files) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.previewAttachment('image', event.target.result);
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    toggleEmojiPicker() {
        const modal = this.elements.emojiModal;
        if (modal.classList.contains('active')) {
            this.hideModal('emojiModal');
        } else {
            // وضع منتقي الإيموجي بجانب زر الإيموجي
            const btnRect = this.elements.emojiBtn.getBoundingClientRect();
            modal.style.position = 'fixed';
            modal.style.bottom = (window.innerHeight - btnRect.top + 10) + 'px';
            modal.style.left = btnRect.left + 'px';
            this.showModal('emojiModal');
        }
    }
    
    toggleSidebar(side) {
        if (side === 'left') {
            this.elements.sidebarLeft.classList.toggle('active');
        } else if (side === 'right') {
            this.isSidebarHidden = !this.isSidebarHidden;
            this.elements.sidebarRight.classList.toggle('active');
            
            // تحديث زر التبديل
            const icon = this.elements.toggleSidebarBtn.querySelector('i');
            icon.className = this.isSidebarHidden ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
            this.elements.toggleSidebarBtn.title = this.isSidebarHidden ? 'إظهار القائمة' : 'إخفاء القائمة';
        }
    }
    
    handleOutsideClick(e) {
        // إغلاق النوافذ عند النقر خارجها
        const modals = ['emojiModal', 'attachmentModal', 'recordingModal'];
        
        modals.forEach(modalId => {
            const modal = this.elements[modalId];
            if (modal.classList.contains('active') && !modal.contains(e.target) && 
                !this.elements[`${modalId.replace('Modal', 'Btn')}`]?.contains(e.target)) {
                this.hideModal(modalId);
            }
        });
        
        // إغلاق القوائم الجانبية عند النقر خارجها
        if (!this.elements.sidebarLeft.contains(e.target) && !this.elements.mainMenuBtn.contains(e.target)) {
            this.elements.sidebarLeft.classList.remove('active');
        }
        
        if (!this.elements.sidebarRight.contains(e.target) && !this.elements.toggleSidebarBtn.contains(e.target)) {
            this.elements.sidebarRight.classList.remove('active');
        }
    }
    
    handleKeyDown(e) {
        // إغلاق النوافذ بالزر ESC
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal.active');
            if (activeModal) {
                const modalId = activeModal.id;
                this.hideModal(modalId);
            }
        }
        
        // التركيز على حقل الإدخال بالزر /
        if (e.key === '/' && !e.target.matches('input, textarea')) {
            e.preventDefault();
            this.elements.messageInput.focus();
        }
    }
    
    handleScroll() {
        // التحميل التلقائي للرسائل القديمة
        const container = this.elements.messagesContainer;
        if (container.scrollTop === 0 && this.messages.length < 100) {
            this.loadMoreMessages();
        }
    }
    
    loadMoreMessages() {
        // محاكاة تحميل المزيد من الرسائل
        console.log('جاري تحميل المزيد من الرسائل...');
    }
    
    isAtBottom() {
        const container = this.elements.messagesContainer;
        return container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    }
    
    scrollToBottom() {
        const container = this.elements.messagesContainer;
        container.scrollTop = container.scrollHeight;
    }
    
    renderMessages() {
        this.elements.messagesContainer.innerHTML = '';
        this.messages.forEach(message => {
            this.addMessageToUI(message);
        });
        this.scrollToBottom();
    }
    
    // ====== التأثيرات البصرية ======
    createEffect(type, message) {
        const effect = document.createElement('div');
        effect.className = `effect ${type}-effect`;
        
        switch(type) {
            case 'gold':
                effect.innerHTML = `
                    <div class="effect-content">
                        <i class="fas fa-crown"></i>
                        <div class="effect-message">${message}</div>
                    </div>
                `;
                break;
                
            case 'fire':
                effect.innerHTML = `
                    <div class="effect-content">
                        <i class="fas fa-fire"></i>
                        <div class="effect-message">${message}</div>
                    </div>
                `;
                break;
                
            case 'sparkle':
                effect.innerHTML = `
                    <div class="effect-content">
                        <i class="fas fa-sparkles"></i>
                        <div class="effect-message">${message}</div>
                    </div>
                `;
                break;
                
            case 'vip':
                effect.innerHTML = `
                    <div class="effect-content">
                        <i class="fas fa-star"></i>
                        <div class="effect-message">${message}</div>
                    </div>
                `;
                break;
        }
        
        this.elements.effectsContainer.appendChild(effect);
        
        // إزالة التأثير بعد الأنيميشن
        setTimeout(() => {
            effect.remove();
        }, 3000);
    }
    
    createGoldEffect(amount) {
        // إنشاء جزيئات ذهب
        for (let i = 0; i < amount / 100; i++) {
            setTimeout(() => {
                const coin = document.createElement('div');
                coin.className = 'gold-coin';
                coin.style.cssText = `
                    left: ${Math.random() * 100}vw;
                    top: -20px;
                    animation-duration: ${Math.random() * 1 + 0.5}s;
                `;
                
                this.elements.effectsContainer.appendChild(coin);
                
                setTimeout(() => {
                    coin.remove();
                }, 2000);
            }, i * 50);
        }
    }
    
    handleJoinEffect(data) {
        if (data.username === this.currentUser.username) return;
        
        this.createEffect(data.effect, data.message);
    }
    
    // ====== الصوتيات ======
    playMessageSound() {
        this.playSound('message');
    }
    
    playNotificationSound() {
        this.playSound('notification');
    }
    
    playSound(type) {
        if (type === 'message') {
            // صوت الرسالة
            const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-message-pop-alert-2354.mp3');
            audio.volume = 0.3;
            audio.play().catch(e => console.log('لا يمكن تشغيل الصوت:', e));
        } else if (type === 'notification') {
            // صوت الإشعار
            const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3');
            audio.volume = 0.2;
            audio.play().catch(e => console.log('لا يمكن تشغيل الصوت:', e));
        }
    }
    
    // ====== التنسيق ======
    formatTime(date) {
        if (!date) return '';
        
        const d = new Date(date);
        const now = new Date();
        const diff = now - d;
        
        if (diff < 60000) { // أقل من دقيقة
            return 'الآن';
        } else if (diff < 3600000) { // أقل من ساعة
            const minutes = Math.floor(diff / 60000);
            return `منذ ${minutes} دقيقة`;
        } else if (diff < 86400000) { // أقل من يوم
            const hours = Math.floor(diff / 3600000);
            return `منذ ${hours} ساعة`;
        } else {
            return d.toLocaleTimeString('ar-EG', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            });
        }
    }
    
    formatDate(date) {
        if (!date) return '';
        
        const d = new Date(date);
        return d.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    // ====== مساعدات التحميل ======
    updateLoadingDetails(text) {
        if (this.elements.loadingDetails) {
            this.elements.loadingDetails.textContent = text;
        }
    }
    
    hideLoading() {
        setTimeout(() => {
            this.elements.loadingOverlay.classList.add('hidden');
            this.elements.chatWrapper.style.display = 'flex';
            
            setTimeout(() => {
                this.elements.loadingOverlay.style.display = 'none';
            }, 300);
        }, 500);
    }
    
    handleSocketError(error) {
        console.error('❌ خطأ في السيرفر:', error);
        this.showError(error.message || 'حدث خطأ في السيرفر');
    }
    
    showCreateRoomModal() {
        // تنفيذ إنشاء غرفة جديدة
        this.showNotification('ميزة إنشاء غرفة جديدة قريباً', 'info');
    }
    
    showFriendRequests() {
        // تنفيذ عرض طلبات الصداقة
        this.showNotification('ميزة طلبات الصداقة قريباً', 'info');
    }
    
    previewYouTube(videoId) {
        const modalHTML = `
            <div class="youtube-preview-modal">
                <div class="youtube-player">
                    <iframe 
                        width="560" 
                        height="315" 
                        src="https://www.youtube.com/embed/${videoId}" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                    </iframe>
                </div>
            </div>
        `;
        
        this.elements.previewContainer.innerHTML = modalHTML;
        this.showModal('previewModal');
    }
}

// ====== بدء النظام ======
let chatSystem;

document.addEventListener('DOMContentLoaded', () => {
    chatSystem = new ChatSystem();
    
    // جعل النظام متاحاً عالمياً
    window.chatSystem = chatSystem;
    
    // إضافة أنيميشن للصفحة
    document.body.classList.add('loaded');
});
