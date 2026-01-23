// متغيرات الشات
let socket = null;
let currentUser = null;
let currentRoom = 'general';
let typingTimeout = null;
let onlineUsers = [];
let allUsers = [];

// تهيئة الشات
async function initChat() {
    try {
        // تحميل بيانات المستخدم
        const savedUser = localStorage.getItem('chatUser');
        if (!savedUser) {
            window.location.href = 'index.html';
            return;
        }
        
        currentUser = JSON.parse(savedUser);
        console.log('المستخدم الحالي:', currentUser);
        
        // تحميل الثيم المحفوظ
        loadTheme();
        
        // عرض معلومات المستخدم
        displayUserInfo();
        
        // إعداد واجهة المستخدم
        setupUI();
        
        // الاتصال بالسيرفر
        await connectToServer();
        
        // تحميل جميع المستخدمين
        await loadAllUsers();
        
        // إعداد المستمعين للأحداث
        setupEventListeners();
        
        // إظهار إشعار الترحيب
        showNotification(`مرحباً ${currentUser.username}!`, 'success', 'fas fa-comments');
        
    } catch (error) {
        console.error('خطأ في تهيئة الشات:', error);
        showNotification('حدث خطأ في تحميل الشات', 'error', 'fas fa-exclamation-triangle');
    }
}

// عرض معلومات المستخدم
function displayUserInfo() {
    if (!currentUser) return;
    
    // تحديث الصورة الشخصية
    const profilePic = document.getElementById('current-profile-pic');
    profilePic.src = currentUser.profilePic || getDefaultAvatar(currentUser.username, currentUser.gender);
    profilePic.alt = currentUser.username;
    
    // تحديث الاسم والرتبة
    const usernameEl = document.getElementById('current-username');
    const roleEl = document.getElementById('current-role');
    
    usernameEl.textContent = currentUser.username;
    usernameEl.title = currentUser.username;
    
    roleEl.textContent = currentUser.role;
    roleEl.className = 'role';
    roleEl.classList.add(`${getRoleClass(currentUser.role)}-badge`);
    
    // إضافة أيقونة الرتبة
    const roleIcon = getRoleIcon(currentUser.role);
    if (roleIcon) {
        roleEl.innerHTML = `${roleIcon} ${currentUser.role}`;
    }
}

// الاتصال بالسيرفر
async function connectToServer() {
    return new Promise((resolve, reject) => {
        // عرض مؤشر التحميل
        showLoading(true);
        
        // الاتصال بالسيرفر
        socket = io({
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            timeout: 20000
        });
        
        // عند الاتصال الناجح
        socket.on('connect', () => {
            console.log('✅ تم الاتصال بالسيرفر بنجاح');
            showLoading(false);
            
            // إرسال بيانات الانضمام
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
        
        // عند خطأ الاتصال
        socket.on('connect_error', (error) => {
            console.error('❌ خطأ في الاتصال:', error);
            showLoading(false);
            
            showNotification(
                'تعذر الاتصال بالسيرفر. تأكد من تشغيله وحاول مرة أخرى.',
                'error',
                'fas fa-exclamation-triangle'
            );
            
            reject(error);
        });
        
        // استقبال رسالة الترحيب
        socket.on('welcome', (data) => {
            console.log('رسالة ترحيب:', data.message);
            showLoading(false);
        });
    });
}

// تحميل جميع المستخدمين
async function loadAllUsers() {
    try {
        const response = await fetch('/api/all-users');
        const data = await response.json();
        
        if (data.success) {
            allUsers = data.users;
            updateAllUsersList();
        }
    } catch (error) {
        console.error('خطأ في تحميل المستخدمين:', error);
    }
}

// تحديث قائمة جميع المستخدمين
function updateAllUsersList() {
    const allUsersList = document.getElementById('all-users-list');
    if (!allUsersList) return;
    
    allUsersList.innerHTML = '';
    
    // ترتيب المستخدمين حسب الرتبة ثم الترتيب الأبجدي
    const sortedUsers = [...allUsers].sort((a, b) => {
        const roleOrder = { 'مالك': 1, 'وزير': 2, 'وزيرة': 2, 'عضو مميز': 3, 'عضو': 4, 'زائر': 5 };
        const roleA = roleOrder[a.role] || 6;
        const roleB = roleOrder[b.role] || 6;
        
        if (roleA !== roleB) return roleA - roleB;
        return a.username.localeCompare(b.username);
    });
    
    sortedUsers.forEach(user => {
        const isOnline = onlineUsers.some(onlineUser => onlineUser.username === user.username);
        
        const userItem = document.createElement('div');
        userItem.className = `user-item ${isOnline ? '' : 'offline'}`;
        userItem.onclick = () => openProfileModal(user.username);
        
        userItem.innerHTML = `
            <span class="status" style="background: ${isOnline ? '#28a745' : '#6c757d'}"></span>
            <img src="${user.profilePic || getDefaultAvatar(user.username, user.gender)}" 
                 class="user-avatar" 
                 alt="${user.username}"
                 onerror="this.src='${getDefaultAvatar(user.username, user.gender)}'">
            <div class="user-details">
                <div class="user-name">
                    ${user.username}
                    <span class="user-role ${getRoleClass(user.role)}-badge">
                        ${getRoleIcon(user.role)} ${user.role}
                    </span>
                </div>
                <div class="user-meta">
                    <span>#${user.serial || 'غير معروف'}</span>
                    •
                    <span>${user.interaction || 0} تفاعل</span>
                    •
                    <span>${isOnline ? '🟢 متصل' : '⚫ غير متصل'}</span>
                </div>
            </div>
            ${currentUser.role === 'مالك' && user.username !== currentUser.username ? 
                `<button class="message-action" onclick="event.stopPropagation(); openRoleManagement('${user.username}')" 
                        title="إدارة الرتبة">
                    <i class="fas fa-crown"></i>
                </button>` : ''}
        `;
        
        allUsersList.appendChild(userItem);
    });
}

// تحديث قائمة المتصلين
function updateOnlineUsersList(users) {
    onlineUsers = users;
    const onlineUsersList = document.getElementById('online-users-list');
    
    if (!onlineUsersList) return;
    
    onlineUsersList.innerHTML = '';
    
    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.onclick = () => openProfileModal(user.username);
        
        userItem.innerHTML = `
            <span class="status"></span>
            <img src="${user.profilePic || getDefaultAvatar(user.username, user.gender)}" 
                 class="user-avatar" 
                 alt="${user.username}"
                 onerror="this.src='${getDefaultAvatar(user.username, user.gender)}'">
            <div class="user-details">
                <div class="user-name">
                    ${user.username}
                    <span class="user-role ${getRoleClass(user.role)}-badge">
                        ${getRoleIcon(user.role)} ${user.role}
                    </span>
                </div>
                <div class="user-meta">
                    <span>${user.isGuest ? 'زائر' : `#${user.serial || 'غير معروف'}`}</span>
                    •
                    <span>${user.gender === 'أنثى' ? '👩' : '👨'}</span>
                </div>
            </div>
            ${currentUser.role === 'مالك' && user.username !== currentUser.username ? 
                `<button class="message-action" onclick="event.stopPropagation(); openRoleManagement('${user.username}')" 
                        title="إدارة الرتبة">
                    <i class="fas fa-crown"></i>
                </button>` : ''}
        `;
        
        onlineUsersList.appendChild(userItem);
    });
    
    // تحديث قائمة جميع المستخدمين أيضاً
    updateAllUsersList();
}

// إعداد واجهة المستخدم
function setupUI() {
    // زر إظهار/إخفاء الشريط الجانبي
    document.getElementById('toggle-sidebar').onclick = toggleSidebar;
    
    // زر فتح البروفايل
    document.getElementById('current-profile-pic').onclick = () => {
        openProfileModal(currentUser.username);
    };
    
    // زر الإعدادات
    document.querySelector('[title="بروفايلك"]').onclick = () => {
        openProfileModal(currentUser.username);
    };
    
    // زر الأكثر تفاعلاً
    document.querySelector('[title="الأكثر تفاعلاً"]').onclick = showTopUsers;
    
    // إعداد زر الإرسال
    document.getElementById('send-btn').onclick = sendMessage;
    
    // إعداد حقل الإدخال
    const messageInput = document.getElementById('message-input');
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
                room: currentRoom
            });
            
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                if (socket && socket.connected) {
                    socket.emit('typing', {
                        username: currentUser.username,
                        isTyping: false,
                        room: currentRoom
                    });
                }
            }, 1000);
        }
        
        // ضبط ارتفاع حقل الإدخال
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + 'px';
    };
    
    // إعداد أزرار المرفقات
    setupAttachmentButtons();
    
    // إعداد أزرار الإجراءات السريعة
    setupQuickActions();
    
    // إعداد أقسام الشريط الجانبي القابلة للطي
    setupCollapsibleSections();
}

// إعداد المستمعين للأحداث
function setupEventListeners() {
    if (!socket) return;
    
    // استقبال الرسائل الجديدة
    socket.on('new-message', (message) => {
        addMessageToChat(message);
    });
    
    // تحديث قائمة المتصلين
    socket.on('online-users-updated', (users) => {
        updateOnlineUsersList(users);
    });
    
    // عند دخول مستخدم جديد
    socket.on('user-joined', (user) => {
        showNotification(`${user.username} انضم للشات`, 'success', 'fas fa-user-plus');
    });
    
    // عند خروج مستخدم
    socket.on('user-left', (user) => {
        showNotification(`${user.username} غادر الشات`, 'warning', 'fas fa-door-open');
    });
    
    // عند الكتابة
    socket.on('user-typing', (data) => {
        showTypingIndicator(data);
    });
    
    // عند ذكر المستخدم
    socket.on('mentioned', (data) => {
        if (data.by !== currentUser.username) {
            showNotification(`تم ذكرك بواسطة ${data.by}`, 'warning', 'fas fa-at');
            playSound('mention');
        }
    });
    
    // عند تحديث الرتبة
    socket.on('role-updated', (data) => {
        if (currentUser) {
            currentUser.role = data.newRole;
            localStorage.setItem('chatUser', JSON.stringify(currentUser));
            displayUserInfo();
            showNotification('تم تحديث رتبتك', 'success', 'fas fa-crown');
        }
    });
    
    // عند انقطاع الاتصال
    socket.on('disconnect', () => {
        showNotification('تم قطع الاتصال بالسيرفر', 'error', 'fas fa-plug');
    });
    
    // عند إعادة الاتصال
    socket.on('reconnect', () => {
        showNotification('تم إعادة الاتصال بالسيرفر', 'success', 'fas fa-wifi');
        
        // إعادة إرسال بيانات الانضمام
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

// إرسال رسالة
function sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();
    
    if (!message || !socket || !currentUser) return;
    
    // إرسال الرسالة
    socket.emit('send-message', {
        username: currentUser.username,
        text: message,
        room: currentRoom
    });
    
    // مسح حقل الإدخال
    input.value = '';
    input.style.height = '55px';
    
    // إعلام بالتوقف عن الكتابة
    if (socket.connected) {
        socket.emit('typing', {
            username: currentUser.username,
            isTyping: false,
            room: currentRoom
        });
    }
    
    // إزالة مؤشر الكتابة
    document.getElementById('typing-indicator').style.display = 'none';
}

// إضافة رسالة للشات
function addMessageToChat(message) {
    const messagesContainer = document.getElementById('chat-messages');
    const isSelf = message.username === currentUser.username;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isSelf ? 'self' : ''} ${getRoleClass(message.userInfo.role)}`;
    
    const roleClass = getRoleClass(message.userInfo.role);
    const roleIcon = getRoleIcon(message.userInfo.role);
    
    messageElement.innerHTML = `
        <div class="message-user">
            <img src="${message.userInfo.profilePic || getDefaultAvatar(message.username, message.userInfo.gender)}" 
                 alt="${message.username}"
                 onclick="openProfileModal('${message.username}')">
            <span class="role-badge ${roleClass}-badge">
                ${roleIcon} ${message.userInfo.role}
            </span>
        </div>
        <div class="message-content">
            <div class="message-header">
                <h4 onclick="openProfileModal('${message.username}')">
                    ${message.username}
                </h4>
                <span class="message-time">${message.timestamp}</span>
            </div>
            <div class="message-text">${formatMessage(message.text)}</div>
            <div class="message-actions">
                <button class="message-action" title="رد">
                    <i class="fas fa-reply"></i>
                </button>
                <button class="message-action" title="تفاصيل">
                    <i class="fas fa-info-circle"></i>
                </button>
                ${currentUser.role === 'مالك' || currentUser.role === 'وزير' || currentUser.role === 'وزيرة' ? 
                    `<button class="message-action" title="حذف" onclick="deleteMessage(${message.id})">
                        <i class="fas fa-trash"></i>
                    </button>` : ''}
            </div>
        </div>
    `;
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // تشغيل صوت عند استقبال رسالة جديدة
    if (!isSelf) {
        playSound('message');
    }
}

// فتح نافذة البروفايل
async function openProfileModal(username) {
    try {
        const response = await fetch(`/api/user/${username}`);
        const data = await response.json();
        
        if (!data.success) {
            showNotification('المستخدم غير موجود', 'error', 'fas fa-user-slash');
            return;
        }
        
        const user = data.user;
        const isCurrentUser = username === currentUser.username;
        
        // إنشاء نافذة البروفايل
        const modal = document.createElement('div');
        modal.className = 'profile-modal active';
        modal.id = 'profile-modal';
        
        modal.innerHTML = `
            <div class="profile-content">
                <div class="profile-header">
                    ${user.coverPhoto ? 
                        `<img src="${user.coverPhoto}" class="profile-cover" alt="غلاف">` : 
                        '<div class="profile-cover" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>'
                    }
                    <img src="${user.profilePic || getDefaultAvatar(username, user.gender)}" 
                         class="profile-picture" 
                         alt="${username}"
                         onclick="changeProfilePicture('${username}')">
                    <button class="close-profile" onclick="closeProfileModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="profile-body">
                    <h2 class="profile-name">
                        ${username}
                        <span class="profile-role ${getRoleClass(user.role)}-badge">
                            ${getRoleIcon(user.role)} ${user.role}
                        </span>
                    </h2>
                    
                    <div class="profile-meta">
                        <span><i class="fas fa-hashtag"></i> #${user.serial || 'غير معروف'}</span>
                        <span><i class="fas ${user.gender === 'أنثى' ? 'fa-venus' : 'fa-mars'}"></i> ${user.gender || 'غير محدد'}</span>
                        <span><i class="fas fa-birthday-cake"></i> ${user.age || '--'} سنة</span>
                        <span><i class="fas ${user.isOnline ? 'fa-circle text-success' : 'fa-circle text-secondary'}"></i> ${user.isOnline ? 'متصل' : 'غير متصل'}</span>
                    </div>
                    
                    <div class="profile-bio">
                        <i class="fas fa-quote-left"></i> ${user.bio || 'لا يوجد وصف شخصي'} <i class="fas fa-quote-right"></i>
                    </div>
                    
                    <div class="profile-stats">
                        <div class="stat">
                            <div class="stat-value">${user.interaction || 0}</div>
                            <div class="stat-label">تفاعل</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value">${user.friends ? user.friends.length : 0}</div>
                            <div class="stat-label">أصدقاء</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value">${new Date(user.joinDate).toLocaleDateString('ar-EG')}</div>
                            <div class="stat-label">تاريخ الانضمام</div>
                        </div>
                    </div>
                    
                    <div class="profile-actions">
                        ${isCurrentUser ? `
                            <button class="profile-btn" onclick="editProfile()">
                                <i class="fas fa-edit"></i> تعديل البروفايل
                            </button>
                            <button class="profile-btn secondary" onclick="closeProfileModal()">
                                <i class="fas fa-times"></i> إغلاق
                            </button>
                        ` : `
                            <button class="profile-btn" onclick="sendPrivateMessage('${username}')">
                                <i class="fas fa-comment"></i> مراسلة
                            </button>
                            <button class="profile-btn" onclick="sendFriendRequest('${username}')">
                                <i class="fas fa-user-plus"></i> إضافة صديق
                            </button>
                            ${currentUser.role === 'مالк' ? `
                                <button class="profile-btn secondary" onclick="openRoleManagement('${username}')">
                                    <i class="fas fa-crown"></i> إدارة الرتبة
                                </button>
                            ` : ''}
                        `}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // منع التمرير خلف النافذة
        document.body.style.overflow = 'hidden';
        
    } catch (error) {
        console.error('خطأ في فتح البروفايل:', error);
        showNotification('حدث خطأ في تحميل البروفايل', 'error', 'fas fa-exclamation-triangle');
    }
}

// إدارة الرتب
let roleManagementTarget = '';

function openRoleManagement(username) {
    roleManagementTarget = username;
    
    const modal = document.createElement('div');
    modal.className = 'profile-modal active';
    modal.id = 'role-modal';
    
    modal.innerHTML = `
        <div class="profile-content" style="max-width: 400px;">
            <div class="profile-header">
                <h2 style="color: white;"><i class="fas fa-crown"></i> إدارة الرتبة</h2>
                <button class="close-profile" onclick="closeRoleManagement()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="profile-body">
                <p style="margin-bottom: 20px; color: #666;">
                    تعديل رتبة المستخدم: <strong>${username}</strong>
                </p>
                
                <div class="form-group">
                    <label>الرتبة الحالية</label>
                    <div class="current-role-display ${getRoleClass(currentUser.role)}-badge" style="padding: 10px; text-align: center; margin: 10px 0;">
                        ${getRoleIcon(currentUser.role)} ${currentUser.role}
                    </div>
                </div>
                
                <div class="form-group">
                    <label>الرتبة الجديدة</label>
                    <select id="new-role-select" class="form-control">
                        <option value="عضو">👤 عضو</option>
                        <option value="عضو مميز">🌟 عضو مميز</option>
                        <option value="وزير">⭐ وزير</option>
                        <option value="وزيرة">⭐ وزيرة</option>
                        ${currentUser.role === 'مالك' ? '<option value="مالك">👑 مالك</option>' : ''}
                    </select>
                </div>
                
                <div class="profile-actions">
                    <button class="profile-btn" onclick="updateRole()">
                        <i class="fas fa-save"></i> حفظ التغييرات
                    </button>
                    <button class="profile-btn secondary" onclick="closeRoleManagement()">
                        <i class="fas fa-times"></i> إلغاء
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

async function updateRole() {
    if (!roleManagementTarget) return;
    
    const newRole = document.getElementById('new-role-select').value;
    
    try {
        const response = await fetch('/api/update-role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adminUsername: currentUser.username,
                targetUsername: roleManagementTarget,
                newRole: newRole
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success', 'fas fa-check-circle');
            closeRoleManagement();
            
            // تحديث قائمة المستخدمين
            await loadAllUsers();
        } else {
            showNotification(data.message, 'error', 'fas fa-exclamation-circle');
        }
    } catch (error) {
        showNotification('خطأ في تحديث الرتبة', 'error', 'fas fa-exclamation-circle');
    }
}

function closeRoleManagement() {
    const modal = document.getElementById('role-modal');
    if (modal) {
        modal.remove();
    }
    roleManagementTarget = '';
    document.body.style.overflow = 'auto';
}

// إغلاق نافذة البروفايل
function closeProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (modal) {
        modal.remove();
    }
    document.body.style.overflow = 'auto';
}

// إعداد أزرار المرفقات
function setupAttachmentButtons() {
    // زر الصور
    document.querySelector('[title="إرسال صورة"]').onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                uploadImage(file);
            }
        };
        input.click();
    };
    
    // زر الملفات
    document.querySelector('[title="إرسال ملف"]').onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                uploadFile(file);
            }
        };
        input.click();
    };
    
    // زر التسجيل الصوتي
    document.querySelector('[title="تسجيل صوتي"]').onclick = () => {
        showNotification('ميزة التسجيل الصوتي قريباً', 'info', 'fas fa-microphone');
    };
}

// إعداد أزرار الإجراءات السريعة
function setupQuickActions() {
    // زر الثيمات
    document.querySelector('[title="الثيمات"]').onclick = openThemeSelector;
    
    // زر الإعدادات
    document.querySelector('[title="الإعدادات"]').onclick = openSettings;
    
    // زر الخروج
    document.querySelector('[title="خروج"]').onclick = logout;
}

// إعداد الأقسام القابلة للطي
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

// وظائف مساعدة
function getRoleClass(role) {
    const roleMap = {
        'مالك': 'owner',
        'وزير': 'minister',
        'وزيرة': 'minister',
        'عضو مميز': 'vip',
        'عضو': 'member',
        'زائر': 'guest'
    };
    return roleMap[role] || 'member';
}

function getRoleIcon(role) {
    const icons = {
        'مالك': '👑',
        'وزير': '⭐',
        'وزيرة': '⭐',
        'عضو مميز': '🌟',
        'عضو': '👤',
        'زائر': '👣'
    };
    return icons[role] || '';
}

function getDefaultAvatar(username, gender) {
    const color = gender === 'أنثى' ? 'FF69B4' : '1E90FF';
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}&backgroundColor=${color}`;
}

function formatMessage(text) {
    // تحويل الروابط إلى روابط قابلة للنقر
    text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="message-link">$1</a>');
    
    // تنسيق المنشن
    text = text.replace(/@(\w+)/g, '<span class="mention" onclick="openProfileModal(\'$1\')">@$1</span>');
    
    // الحفاظ على المسافات والسطور الجديدة
    text = text.replace(/\n/g, '<br>');
    
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

function showNotification(message, type = 'info', icon = 'fas fa-info-circle') {
    // إزالة الإشعارات القديمة
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    notification.innerHTML = `
        <i class="${icon}"></i>
        <div class="notification-content">
            <div class="notification-title">${type === 'success' ? 'نجاح' : type === 'error' ? 'خطأ' : 'ملاحظة'}</div>
            <div class="notification-message">${message}</div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // إزالة الإشعار بعد 5 ثواني
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideInRight 0.3s reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

function playSound(type) {
    try {
        const audio = new Audio();
        
        switch(type) {
            case 'message':
                audio.src = 'https://assets.mixkit.co/sfx/preview/mixkit-message-pop-alert-2354.mp3';
                break;
            case 'mention':
                audio.src = 'https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3';
                break;
            default:
                return;
        }
        
        audio.volume = 0.3;
        audio.play();
    } catch (error) {
        console.error('خطأ في تشغيل الصوت:', error);
    }
}

function showLoading(show) {
    let overlay = document.getElementById('loading-overlay');
    
    if (!overlay && show) {
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="loading-spinner"></div>';
        document.body.appendChild(overlay);
    }
    
    if (overlay) {
        overlay.classList.toggle('active', show);
    }
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
}

function loadTheme() {
    const savedTheme = localStorage.getItem('chatTheme') || 'light';
    document.body.className = savedTheme;
    
    // تحديث ألوان CSS حسب الثيم
    const root = document.documentElement;
    if (savedTheme === 'dark') {
        root.style.setProperty('--message-bg', '#2d2d2d');
        root.style.setProperty('--sidebar-bg', '#1e1e1e');
        root.style.setProperty('--chat-bg', '#121212');
    } else {
        root.style.setProperty('--message-bg', '#ffffff');
        root.style.setProperty('--sidebar-bg', '#ffffff');
        root.style.setProperty('--chat-bg', '#f5f7fb');
    }
}

function openThemeSelector() {
    const selector = document.getElementById('theme-selector');
    if (!selector) {
        createThemeSelector();
    }
    document.getElementById('theme-selector').classList.toggle('active');
}

function createThemeSelector() {
    const selector = document.createElement('div');
    selector.id = 'theme-selector';
    selector.className = 'theme-selector';
    
    selector.innerHTML = `
        <h4><i class="fas fa-palette"></i> اختر الثيم</h4>
        <div class="theme-grid">
            <div class="theme-option" style="background: #f8f9fa;" onclick="changeTheme('light')" title="فاتح"></div>
            <div class="theme-option" style="background: #212529;" onclick="changeTheme('dark')" title="داكن"></div>
            <div class="theme-option" style="background: linear-gradient(135deg, #667eea, #764ba2);" onclick="changeTheme('purple')" title="بنفسجي"></div>
            <div class="theme-option" style="background: linear-gradient(135deg, #f093fb, #f5576c);" onclick="changeTheme('pink')" title="وردي"></div>
            <div class="theme-option" style="background: linear-gradient(135deg, #4facfe, #00f2fe);" onclick="changeTheme('blue')" title="أزرق"></div>
            <div class="theme-option" style="background: linear-gradient(135deg, #43e97b, #38f9d7);" onclick="changeTheme('green')" title="أخضر"></div>
        </div>
    `;
    
    document.body.appendChild(selector);
}

function changeTheme(themeName) {
    document.body.className = themeName;
    localStorage.setItem('chatTheme', themeName);
    
    // تحديث ألوان CSS
    const root = document.documentElement;
    if (themeName === 'dark') {
        root.style.setProperty('--message-bg', '#2d2d2d');
        root.style.setProperty('--sidebar-bg', '#1e1e1e');
        root.style.setProperty('--chat-bg', '#121212');
    } else {
        root.style.setProperty('--message-bg', '#ffffff');
        root.style.setProperty('--sidebar-bg', '#ffffff');
        root.style.setProperty('--chat-bg', '#f5f7fb');
    }
    
    showNotification(`تم تغيير الثيم إلى ${themeName}`, 'success', 'fas fa-palette');
    document.getElementById('theme-selector').classList.remove('active');
}

function openSettings() {
    showNotification('شاشة الإعدادات قريباً', 'info', 'fas fa-cog');
}

function showTopUsers() {
    // فرز المستخدمين حسب التفاعل
    const topUsers = [...allUsers]
        .filter(user => user.interaction > 0)
        .sort((a, b) => b.interaction - a.interaction)
        .slice(0, 3);
    
    if (topUsers.length === 0) {
        showNotification('لا يوجد مستخدمين متفاعلين بعد', 'info', 'fas fa-trophy');
        return;
    }
    
    const message = topUsers.map((user, index) => 
        `${index + 1}. ${user.username} - ${user.interaction} تفاعل`
    ).join('\n');
    
    alert(`🏆 الأعلى تفاعلاً:\n\n${message}`);
}

function logout() {
    if (confirm('هل تريد تسجيل الخروج؟ سيتم إغلاق جميع الجلسات.')) {
        if (socket) {
            socket.disconnect();
        }
        
        localStorage.removeItem('chatUser');
        localStorage.removeItem('chatTheme');
        
        window.location.href = 'index.html';
    }
}

// وظائف الملفات المرفوعة (محاكاة)
function uploadImage(file) {
    showNotification(`تم اختيار صورة: ${file.name}`, 'info', 'fas fa-image');
    // هنا يمكن إضافة كود رفع الصورة للسيرفر
}

function uploadFile(file) {
    showNotification(`تم اختيار ملف: ${file.name}`, 'info', 'fas fa-file');
    // هنا يمكن إضافة كود رفع الملف للسيرفر
}

// وظائف أخرى (محاكاة)
function editProfile() {
    showNotification('ميزة تعديل البروفايل قريباً', 'info', 'fas fa-edit');
}

function changeProfilePicture(username) {
    showNotification('ميزة تغيير الصورة قريباً', 'info', 'fas fa-camera');
}

function sendPrivateMessage(username) {
    showNotification(`فتح محادثة خاصة مع ${username}`, 'info', 'fas fa-comment');
}

function sendFriendRequest(username) {
    showNotification(`تم إرسال طلب صداقة لـ ${username}`, 'success', 'fas fa-user-plus');
}

function deleteMessage(messageId) {
    if (confirm('هل تريد حذف هذه الرسالة؟')) {
        showNotification('تم حذف الرسالة', 'success', 'fas fa-trash');
        // هنا يمكن إضافة كود حذف الرسالة من السيرفر
    }
}

// تهيئة الشات عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', initChat);

// إغلاق القوائم عند النقر خارجها
document.addEventListener('click', (e) => {
    const themeSelector = document.getElementById('theme-selector');
    if (themeSelector && !themeSelector.contains(e.target) && !e.target.closest('[title="الثيمات"]')) {
        themeSelector.classList.remove('active');
    }
    
    // إغلاق الشريط الجانبي عند النقر خارجها على الجوال
    if (window.innerWidth <= 1024) {
        const sidebar = document.querySelector('.sidebar');
        const toggleBtn = document.getElementById('toggle-sidebar');
        if (sidebar && sidebar.classList.contains('active') && 
            !sidebar.contains(e.target) && 
            e.target !== toggleBtn && 
            !toggleBtn.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    }
});
